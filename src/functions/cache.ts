/**
 * Simple Memory Cache for src/functions services
 * No external dependencies - compatible with all platforms
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
 */
function getVersionFromPackageJson(): string {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return packageJson.version;
    }
  } catch (error) {
    console.warn("Failed to read version from ROOT package.json, using fallback");
  }
  return "4.2.0"; // Only as absolute fallback
}

interface CacheItem {
  value: any;
  expiry: number;
  version: string;
  createdAt: number;
}

// Original TTLs with 24-hour maximum cap for safety
const MAX_TTL = 86400; // 24 hours maximum
const CACHE_TTLS = {
  organizations: Math.min(3600, MAX_TTL), // 1 hour
  languages: Math.min(3600, MAX_TTL), // 1 hour
  resources: Math.min(300, MAX_TTL), // 5 minutes
  fileContent: Math.min(600, MAX_TTL), // 10 minutes
  metadata: Math.min(1800, MAX_TTL), // 30 minutes
  deduplication: Math.min(60, MAX_TTL), // 1 minute
  transformedResponse: Math.min(600, MAX_TTL), // 10 minutes for processed responses
} as const;

type CacheType = keyof typeof CACHE_TTLS;

export class CacheManager {
  private memoryCache = new Map<string, { data: any; expires: number }>();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private appVersion: string;

  constructor() {
    this.appVersion = getVersionFromPackageJson();
    console.log(`📦 Simple memory cache initialized with app version: ${this.appVersion}`);
  }

  private getVersionedKey(key: string, cacheType?: CacheType): string {
    const baseKey = cacheType ? `${cacheType}:${key}` : key;
    return `v${this.appVersion}:${baseKey}`;
  }

  async get(key: string, cacheType?: CacheType): Promise<any> {
    const fullKey = this.getVersionedKey(key, cacheType);
    const item = this.memoryCache.get(fullKey);

    if (!item) {
      return null;
    }

    if (item.data.version !== this.appVersion) {
      this.memoryCache.delete(fullKey);
      return null;
    }

    if (Date.now() > item.expires) {
      this.memoryCache.delete(fullKey);
      return null;
    }

    return item.data.value;
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
    version?: string;
  }> {
    const value = await this.get(key, cacheType);
    if (!value) {
      return { value: null, cached: false };
    }

    const fullKey = this.getVersionedKey(key, cacheType);
    const item = this.memoryCache.get(fullKey);
    const expiresAt = new Date(item!.expires).toISOString();
    const ttlSeconds = Math.round((item!.expires - Date.now()) / 1000);

    return {
      value,
      cached: true,
      cacheType: "memory",
      expiresAt,
      ttlSeconds,
      version: this.appVersion,
    };
  }

  async set(key: string, value: any, cacheType?: CacheType, customTtl?: number): Promise<void> {
    const fullKey = this.getVersionedKey(key, cacheType);
    const baseTtl = CACHE_TTLS[cacheType || "fileContent"];
    const ttl = customTtl ? Math.min(customTtl, MAX_TTL) : baseTtl;
    const expiry = Date.now() + ttl * 1000;

    const cacheItem: CacheItem = {
      value,
      expiry,
      version: this.appVersion,
      createdAt: Date.now(),
    };

    this.memoryCache.set(fullKey, { data: cacheItem, expires: expiry });
  }

  async delete(key: string, cacheType?: CacheType): Promise<void> {
    const fullKey = this.getVersionedKey(key, cacheType);
    this.memoryCache.delete(fullKey);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  async clearOldVersions(): Promise<void> {
    // Memory cache entries will naturally expire
  }

  async getWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType?: CacheType
  ): Promise<T> {
    const fullKey = this.getVersionedKey(key, cacheType);

    if (this.pendingRequests.has(fullKey)) {
      return this.pendingRequests.get(fullKey) as Promise<T>;
    }

    const cached = await this.get(key, cacheType);
    if (cached) {
      return cached;
    }

    const requestPromise = fetcher()
      .then(async (result) => {
        await this.set(key, result, cacheType);
        this.pendingRequests.delete(fullKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(fullKey);
        throw error;
      });

    this.pendingRequests.set(fullKey, requestPromise);
    return requestPromise;
  }

  getStats() {
    return {
      memorySize: this.memoryCache.size,
      netlifyBlobsEnabled: false,
      pendingRequests: this.pendingRequests.size,
      cacheTTLs: CACHE_TTLS,
      maxTTL: MAX_TTL,
      appVersion: this.appVersion,
      status: "MEMORY_CACHE_ONLY",
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

  async getFileContentWithCacheInfo(key: string): Promise<{
    value: any;
    cached: boolean;
    cacheType?: string;
    expiresAt?: string;
    ttlSeconds?: number;
    version?: string;
  }> {
    return this.getWithCacheInfo(key, "fileContent");
  }

  async setFileContent(key: string, value: any): Promise<void> {
    return this.set(key, value, "fileContent");
  }

  async getTransformedResponse(key: string): Promise<any> {
    return this.get(key, "transformedResponse");
  }

  async setTransformedResponse(key: string, value: any): Promise<void> {
    return this.set(key, value, "transformedResponse");
  }

  async getTransformedResponseWithCacheInfo(key: string): Promise<{
    value: any;
    cached: boolean;
    cacheType?: string;
    expiresAt?: string;
    ttlSeconds?: number;
    version?: string;
  }> {
    return this.getWithCacheInfo(key, "transformedResponse");
  }
}

// Export singleton instance
export const cache = new CacheManager();
