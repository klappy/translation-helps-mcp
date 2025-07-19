/**
 * Cache Manager for Netlify Functions
 * Uses Netlify Blobs for persistent caching with fallback to in-memory cache
 * IMPLEMENTS: Multi-level caching with resource-specific TTLs
 */

import { getStore } from "@netlify/blobs";

interface CacheItem {
  value: any;
  expiry: number;
}

// PRODUCTION TTLs - much longer for better performance
const CACHE_TTLS = {
  organizations: 3600, // 1 hour
  languages: 3600, // 1 hour
  resources: 300, // 5 minutes
  fileContent: 600, // 10 minutes
  metadata: 1800, // 30 minutes
  deduplication: 60, // 1 minute
} as const;

type CacheType = keyof typeof CACHE_TTLS;

export class CacheManager {
  private store: any;
  private memoryCache: Map<string, CacheItem> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private useNetlifyBlobs: boolean = true;

  constructor() {
    try {
      this.store = getStore("translation-helps-cache");
      console.log("🚀 Netlify Blobs cache initialized");
    } catch (error) {
      console.log(
        "⚠️ Netlify Blobs failed, falling back to in-memory cache:",
        (error as Error).message
      );
      this.useNetlifyBlobs = false;
    }
  }

  private getKey(key: string, cacheType?: CacheType): string {
    return cacheType ? `${cacheType}:${key}` : key;
  }

  async get(key: string, cacheType?: CacheType): Promise<any> {
    const fullKey = this.getKey(key, cacheType);

    if (this.useNetlifyBlobs) {
      try {
        const item = await this.store.get(fullKey);
        if (!item) {
          console.log(`❌ Cache miss: ${fullKey}`);
          return null;
        }

        const cacheItem: CacheItem = JSON.parse(item);
        if (Date.now() > cacheItem.expiry) {
          console.log(`⏰ Cache expired: ${fullKey}`);
          await this.delete(key, cacheType);
          return null;
        }

        console.log(`✅ Cache hit: ${fullKey}`);
        return cacheItem.value;
      } catch (error) {
        console.error(`❌ Netlify Blobs get error: ${fullKey}`, (error as Error).message);
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

    if (Date.now() > item.expiry) {
      console.log(`⏰ Memory cache expired: ${fullKey}`);
      this.memoryCache.delete(fullKey);
      return null;
    }

    console.log(`✅ Memory cache hit: ${fullKey}`);
    return item.value;
  }

  async getWithCacheInfo(
    key: string,
    cacheType?: CacheType
  ): Promise<{
    value: any;
    cached: boolean;
    cacheType?: string;
    expiresAt?: string;
    ttlSeconds?: number;
  }> {
    const fullKey = this.getKey(key, cacheType);

    if (this.useNetlifyBlobs) {
      try {
        const item = await this.store.get(fullKey);
        if (!item) {
          console.log(`❌ Cache miss: ${fullKey}`);
          return { value: null, cached: false };
        }

        const cacheItem: CacheItem = JSON.parse(item);
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
        };
      } catch (error) {
        console.error(`❌ Netlify Blobs get error: ${fullKey}`, (error as Error).message);
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

    if (Date.now() > item.expiry) {
      console.log(`⏰ Memory cache expired: ${fullKey}`);
      this.memoryCache.delete(fullKey);
      return { value: null, cached: false };
    }

    console.log(`✅ Memory cache hit: ${fullKey}`);
    const expiresAt = new Date(item.expiry).toISOString();
    const ttlSeconds = Math.round((item.expiry - Date.now()) / 1000);
    return {
      value: item.value,
      cached: true,
      cacheType: "memory",
      expiresAt,
      ttlSeconds,
    };
  }

  async set(key: string, value: any, cacheType?: CacheType, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key, cacheType);
    const expiry = Date.now() + (ttl || CACHE_TTLS[cacheType || "fileContent"]) * 1000;

    if (this.useNetlifyBlobs) {
      try {
        const cacheItem: CacheItem = { value, expiry };
        await this.store.set(fullKey, JSON.stringify(cacheItem), {
          ttl: ttl || CACHE_TTLS[cacheType || "fileContent"],
        });
        console.log(
          `💾 Cached in Netlify Blobs: ${fullKey} (TTL: ${ttl || CACHE_TTLS[cacheType || "fileContent"]}s)`
        );
        return;
      } catch (error) {
        console.error(`❌ Netlify Blobs set error: ${fullKey}`, (error as Error).message);
        // Fall back to memory cache
        this.useNetlifyBlobs = false;
      }
    }

    // Memory cache fallback
    const cacheItem: CacheItem = { value, expiry };
    this.memoryCache.set(fullKey, cacheItem);
    console.log(
      `💾 Cached in memory: ${fullKey} (TTL: ${ttl || CACHE_TTLS[cacheType || "fileContent"]}s)`
    );
  }

  async delete(key: string, cacheType?: CacheType): Promise<void> {
    const fullKey = this.getKey(key, cacheType);

    if (this.useNetlifyBlobs) {
      try {
        await this.store.delete(fullKey);
        console.log(`🗑️ Deleted from Netlify Blobs: ${fullKey}`);
        return;
      } catch (error) {
        console.error(`❌ Netlify Blobs delete error: ${fullKey}`, (error as Error).message);
        this.useNetlifyBlobs = false;
      }
    }

    // Memory cache fallback
    this.memoryCache.delete(fullKey);
    console.log(`🗑️ Deleted from memory: ${fullKey}`);
  }

  async clear(): Promise<void> {
    if (this.useNetlifyBlobs) {
      try {
        await this.store.clear();
        console.log("🧹 Netlify Blobs cache cleared");
        return;
      } catch (error) {
        console.error("❌ Netlify Blobs clear error", (error as Error).message);
        this.useNetlifyBlobs = false;
      }
    }

    // Memory cache fallback
    this.memoryCache.clear();
    console.log("🧹 Memory cache cleared");
  }

  async getWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType?: CacheType
  ): Promise<T> {
    const fullKey = this.getKey(key, cacheType);

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(fullKey)) {
      console.log(`🔄 Deduplicating request: ${fullKey}`);
      return this.pendingRequests.get(fullKey) as Promise<T>;
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
      status: this.useNetlifyBlobs ? "NETLIFY_BLOBS_ENABLED" : "MEMORY_CACHE_FALLBACK",
    };
  }

  // Specific cache methods for different resource types
  async getOrganizations(key: string): Promise<any> {
    return this.get(key, "organizations");
  }

  async setOrganizations(key: string, value: any): Promise<void> {
    return this.set(key, value, "organizations");
  }

  async getLanguages(key: string): Promise<any> {
    return this.get(key, "languages");
  }

  async setLanguages(key: string, value: any): Promise<void> {
    return this.set(key, value, "languages");
  }

  async getResourceMetadata(key: string): Promise<any> {
    return this.get(key, "metadata");
  }

  async setResourceMetadata(key: string, value: any): Promise<void> {
    return this.set(key, value, "metadata");
  }

  async getFileContent(key: string): Promise<any> {
    return this.get(key, "fileContent");
  }

  async getFileContentWithCacheInfo(
    key: string
  ): Promise<{
    value: any;
    cached: boolean;
    cacheType?: string;
    expiresAt?: string;
    ttlSeconds?: number;
  }> {
    return this.getWithCacheInfo(key, "fileContent");
  }

  async setFileContent(key: string, value: any): Promise<void> {
    return this.set(key, value, "fileContent");
  }
}

// Export singleton instance
export const cache = new CacheManager();
