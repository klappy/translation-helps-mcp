/**
 * Simple Memory Cache for src/functions services
 * No external dependencies - compatible with all platforms
 */

import { logger } from "../utils/logger.js";
import { getVersion } from "../version.js";

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
  fileContent: Math.min(1800, MAX_TTL), // 30 minutes (1800s) - DCS API files
  metadata: Math.min(900, MAX_TTL), // 15 minutes (align with unified cache)
  deduplication: Math.min(60, MAX_TTL), // 1 minute
  // DISABLED BY POLICY - see docs/CRITICAL_NEVER_CACHE_RESPONSES.md
  transformedResponse: 0, // Response caching is BANNED
} as const;

// Types that are BANNED from caching - see docs/CRITICAL_NEVER_CACHE_RESPONSES.md
const BANNED_CACHE_TYPES = ["transformedResponse"] as const;

type CacheType = keyof typeof CACHE_TTLS;

export class CacheManager {
  private memoryCache = new Map<string, { data: any; expires: number }>();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private appVersion: string;

  constructor() {
    this.appVersion = getVersion();
    logger.info(`Memory cache initialized`, { version: this.appVersion });
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
    cacheType?: CacheType,
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

  async set(
    key: string,
    value: any,
    cacheType?: CacheType,
    customTtl?: number,
  ): Promise<void> {
    // CRITICAL: Never cache responses - see docs/CRITICAL_NEVER_CACHE_RESPONSES.md
    if (
      cacheType &&
      BANNED_CACHE_TYPES.includes(
        cacheType as (typeof BANNED_CACHE_TYPES)[number],
      )
    ) {
      logger.debug(`Blocked attempt to cache banned type: ${cacheType}`, {
        key,
      });
      return;
    }

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
    cacheType?: CacheType,
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

  async getTransformedResponse(_key: string): Promise<any> {
    // Response-level caching is disabled by policy
    return null;
  }

  async setTransformedResponse(_key: string, _value: any): Promise<void> {
    // No-op: response-level caching is disabled
    return Promise.resolve();
  }

  async getTransformedResponseWithCacheInfo(_key: string): Promise<{
    value: any;
    cached: boolean;
    cacheType?: string;
    expiresAt?: string;
    ttlSeconds?: number;
    version?: string;
  }> {
    return {
      value: null,
      cached: false,
    };
  }
}

// Export singleton instance
export const cache = new CacheManager();
