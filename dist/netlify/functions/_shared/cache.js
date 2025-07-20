/**
 * Enhanced Cache Manager for Netlify Functions
 * Uses Netlify Blobs for persistent caching with fallback to in-memory cache
 * IMPLEMENTS: App versioning, original TTLs with 24hr cap, and orphan prevention
 */
import { getStore } from "@netlify/blobs";
import { readFileSync } from "fs";
import { join } from "path";
// Read version from package.json
function getAppVersion() {
    try {
        const packageJsonPath = join(process.cwd(), "package.json");
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return packageJson.version;
    }
    catch (error) {
        console.warn("Failed to read version from package.json, using fallback");
        return "3.5.0"; // Fallback version
    }
}
// ORIGINAL TTLs with 24-hour maximum cap for safety
const MAX_TTL = 86400; // 24 hours maximum
const CACHE_TTLS = {
    organizations: Math.min(3600, MAX_TTL), // 1 hour (original value)
    languages: Math.min(3600, MAX_TTL), // 1 hour (original value)
    resources: Math.min(300, MAX_TTL), // 5 minutes (original value)
    fileContent: Math.min(600, MAX_TTL), // 10 minutes (original value)
    metadata: Math.min(1800, MAX_TTL), // 30 minutes (original value)
    deduplication: Math.min(60, MAX_TTL), // 1 minute (original value)
    transformedResponse: Math.min(600, MAX_TTL), // 10 minutes for processed responses
};
export class CacheManager {
    store = null;
    memoryCache = new Map();
    pendingRequests = new Map();
    useNetlifyBlobs = true;
    appVersion;
    constructor() {
        this.appVersion = getAppVersion();
        // Check if we're in local development
        const isLocalDev = process.env.NETLIFY_LOCAL === "true";
        if (isLocalDev) {
            console.log("🏠 Local development detected - using in-memory cache (Netlify Blobs not supported locally)");
            this.useNetlifyBlobs = false;
        }
        else {
            // Production: Use manual configuration since automatic doesn't work
            try {
                this.store = getStore({
                    name: "translation-helps-cache",
                    siteID: process.env.NETLIFY_SITE_ID || "",
                    token: process.env.NETLIFY_API_TOKEN || "",
                    apiURL: "https://api.netlify.com",
                });
                console.log("🚀 Netlify Blobs cache initialized successfully");
            }
            catch (error) {
                console.warn("⚠️ Netlify Blobs failed, falling back to in-memory cache:", error.message);
                this.useNetlifyBlobs = false;
            }
        }
        const cacheType = this.useNetlifyBlobs ? "Netlify Blobs" : "in-memory";
        console.log(`📦 Cache initialized with app version: ${this.appVersion} (${cacheType})`);
    }
    getVersionedKey(key, cacheType) {
        // Include app version in all cache keys to prevent stale data across deployments
        const baseKey = cacheType ? `${cacheType}:${key}` : key;
        return `v${this.appVersion}:${baseKey}`;
    }
    async get(key, cacheType) {
        const fullKey = this.getVersionedKey(key, cacheType);
        if (this.useNetlifyBlobs) {
            try {
                const item = await this.store?.get(fullKey);
                if (!item) {
                    console.log(`❌ Cache miss: ${fullKey}`);
                    return null;
                }
                const cacheItem = JSON.parse(item);
                // Check version compatibility
                if (cacheItem.version !== this.appVersion) {
                    console.log(`🔄 Version mismatch, invalidating: ${fullKey} (cached: ${cacheItem.version}, current: ${this.appVersion})`);
                    await this.delete(key, cacheType);
                    return null;
                }
                if (Date.now() > cacheItem.expiry) {
                    console.log(`⏰ Cache expired: ${fullKey}`);
                    await this.delete(key, cacheType);
                    return null;
                }
                console.log(`✅ Cache hit: ${fullKey}`);
                return cacheItem.value;
            }
            catch (error) {
                console.error(`❌ Netlify Blobs get error: ${fullKey}`, error.message);
                // Fall back to memory cache
                this.useNetlifyBlobs = false;
            }
        }
        // Memory cache fallback
        const item = this.memoryCache.get(fullKey);
        if (!item) {
            console.log(`❌ Memory cache miss: ${fullKey}`);
            return null;
        }
        // Check version compatibility
        if (item.data.version !== this.appVersion) {
            console.log(`🔄 Version mismatch, invalidating memory: ${fullKey}`);
            this.memoryCache.delete(fullKey);
            return null;
        }
        if (Date.now() > item.expires) {
            console.log(`⏰ Memory cache expired: ${fullKey}`);
            this.memoryCache.delete(fullKey);
            return null;
        }
        console.log(`✅ Memory cache hit: ${fullKey}`);
        return item.data.value;
    }
    async getWithCacheInfo(key, cacheType) {
        const fullKey = this.getVersionedKey(key, cacheType);
        if (this.useNetlifyBlobs) {
            try {
                const item = await this.store?.get(fullKey);
                if (!item) {
                    console.log(`❌ Cache miss: ${fullKey}`);
                    return { value: null, cached: false };
                }
                const cacheItem = JSON.parse(item);
                // Check version compatibility
                if (cacheItem.version !== this.appVersion) {
                    console.log(`🔄 Version mismatch, invalidating: ${fullKey}`);
                    await this.delete(key, cacheType);
                    return { value: null, cached: false };
                }
                if (Date.now() > cacheItem.expiry) {
                    console.log(`⏰ Cache expired: ${fullKey}`);
                    await this.delete(key, cacheType);
                    return { value: null, cached: false };
                }
                console.log(`✅ Cache hit: ${fullKey}`);
                const expiresAt = new Date(cacheItem.expiry).toISOString();
                const ttlSeconds = Math.round((cacheItem.expiry - Date.now()) / 1000);
                return {
                    value: cacheItem.value,
                    cached: true,
                    cacheType: "netlify-blobs",
                    expiresAt,
                    ttlSeconds,
                    version: cacheItem.version,
                };
            }
            catch (error) {
                console.error(`❌ Netlify Blobs get error: ${fullKey}`, error.message);
                // Fall back to memory cache
                this.useNetlifyBlobs = false;
            }
        }
        // Memory cache fallback
        const item = this.memoryCache.get(fullKey);
        if (!item) {
            console.log(`❌ Memory cache miss: ${fullKey}`);
            return { value: null, cached: false };
        }
        // Check version compatibility
        if (item.data.version !== this.appVersion) {
            console.log(`🔄 Version mismatch, invalidating memory: ${fullKey}`);
            this.memoryCache.delete(fullKey);
            return { value: null, cached: false };
        }
        if (Date.now() > item.expires) {
            console.log(`⏰ Memory cache expired: ${fullKey}`);
            this.memoryCache.delete(fullKey);
            return { value: null, cached: false };
        }
        console.log(`✅ Memory cache hit: ${fullKey}`);
        const expiresAt = new Date(item.expires).toISOString();
        const ttlSeconds = Math.round((item.expires - Date.now()) / 1000);
        return {
            value: item.data.value,
            cached: true,
            cacheType: "memory",
            expiresAt,
            ttlSeconds,
            version: item.data.version,
        };
    }
    async set(key, value, cacheType, customTtl) {
        const fullKey = this.getVersionedKey(key, cacheType);
        // Conservative TTL enforcement - always respect the maximum
        const baseTtl = CACHE_TTLS[cacheType || "fileContent"];
        const ttl = customTtl ? Math.min(customTtl, MAX_TTL) : baseTtl;
        const expiry = Date.now() + ttl * 1000;
        if (this.useNetlifyBlobs) {
            try {
                const cacheItem = {
                    value,
                    expiry,
                    version: this.appVersion,
                    createdAt: Date.now(),
                };
                await this.store?.set(fullKey, JSON.stringify(cacheItem), {
                    ttl: ttl,
                });
                console.log(`💾 Cached in Netlify Blobs: ${fullKey} (TTL: ${ttl}s, v${this.appVersion})`);
                return;
            }
            catch (error) {
                console.error(`❌ Netlify Blobs set error: ${fullKey}`, error.message);
                // Fall back to memory cache
                this.useNetlifyBlobs = false;
            }
        }
        // Memory cache fallback
        const cacheItem = {
            value,
            expiry,
            version: this.appVersion,
            createdAt: Date.now(),
        };
        this.memoryCache.set(fullKey, { data: cacheItem, expires: expiry });
        console.log(`💾 Cached in memory: ${fullKey} (TTL: ${ttl}s, v${this.appVersion})`);
    }
    async delete(key, cacheType) {
        const fullKey = this.getVersionedKey(key, cacheType);
        if (this.useNetlifyBlobs) {
            try {
                await this.store?.delete(fullKey);
                console.log(`🗑️ Deleted from Netlify Blobs: ${fullKey}`);
                return;
            }
            catch (error) {
                console.error(`❌ Netlify Blobs delete error: ${fullKey}`, error.message);
                this.useNetlifyBlobs = false;
            }
        }
        // Memory cache fallback
        this.memoryCache.delete(fullKey);
        console.log(`🗑️ Deleted from memory: ${fullKey}`);
    }
    async clear() {
        if (this.useNetlifyBlobs) {
            try {
                await this.store?.clear();
                console.log("🧹 Netlify Blobs cache cleared");
                return;
            }
            catch (error) {
                console.error("❌ Netlify Blobs clear error", error.message);
                this.useNetlifyBlobs = false;
            }
        }
        // Memory cache fallback
        this.memoryCache.clear();
        console.log("🧹 Memory cache cleared");
    }
    /**
     * Clear cache entries from previous app versions to prevent orphaned keys
     */
    async clearOldVersions() {
        if (!this.useNetlifyBlobs) {
            console.log("⚠️ Cannot clear old versions without Netlify Blobs");
            return;
        }
        try {
            // Note: Netlify Blobs doesn't have a way to list all keys for pattern matching
            // But versioned keys will naturally expire based on TTL
            console.log(`🧹 Old version cache entries will expire naturally (current: v${this.appVersion})`);
        }
        catch (error) {
            console.error("❌ Error clearing old versions", error.message);
        }
    }
    async getWithDeduplication(key, fetcher, cacheType) {
        const fullKey = this.getVersionedKey(key, cacheType);
        // Check if there's already a pending request for this key
        if (this.pendingRequests.has(fullKey)) {
            console.log(`🔄 Deduplicating request: ${fullKey}`);
            return this.pendingRequests.get(fullKey);
        }
        // Check cache first
        const cached = await this.get(key, cacheType);
        if (cached) {
            return cached;
        }
        // Create new request promise
        const requestPromise = fetcher()
            .then(async (result) => {
            // Cache the result
            await this.set(key, result, cacheType);
            // Remove from pending requests
            this.pendingRequests.delete(fullKey);
            return result;
        })
            .catch((error) => {
            // Remove from pending requests on error
            this.pendingRequests.delete(fullKey);
            throw error;
        });
        // Store the pending request
        this.pendingRequests.set(fullKey, requestPromise);
        return requestPromise;
    }
    getStats() {
        return {
            memorySize: this.memoryCache.size,
            netlifyBlobsEnabled: this.useNetlifyBlobs,
            pendingRequests: this.pendingRequests.size,
            cacheTTLs: CACHE_TTLS,
            maxTTL: MAX_TTL,
            appVersion: this.appVersion,
            status: this.useNetlifyBlobs ? "NETLIFY_BLOBS_ENABLED" : "MEMORY_CACHE_FALLBACK",
        };
    }
    // Specific cache methods for different resource types
    async getOrganizations(key) {
        return this.get(key, "organizations");
    }
    async setOrganizations(key, value) {
        return this.set(key, value, "organizations");
    }
    async getLanguages(key) {
        return this.get(key, "languages");
    }
    async setLanguages(key, value) {
        return this.set(key, value, "languages");
    }
    async getResourceMetadata(key) {
        return this.get(key, "metadata");
    }
    async setResourceMetadata(key, value) {
        return this.set(key, value, "metadata");
    }
    async getFileContent(key) {
        return this.get(key, "fileContent");
    }
    async getFileContentWithCacheInfo(key) {
        return this.getWithCacheInfo(key, "fileContent");
    }
    async setFileContent(key, value) {
        return this.set(key, value, "fileContent");
    }
    // New methods for transformed responses
    async getTransformedResponse(key) {
        return this.get(key, "transformedResponse");
    }
    async setTransformedResponse(key, value) {
        return this.set(key, value, "transformedResponse");
    }
    async getTransformedResponseWithCacheInfo(key) {
        return this.getWithCacheInfo(key, "transformedResponse");
    }
}
// Export singleton instance
export const cache = new CacheManager();
