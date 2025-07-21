/**
 * Unified Caching System with Cache Bypass Support
 *
 * This replaces the inconsistent multi-layer caching with a single,
 * unified system that supports cache bypass via headers and query params.
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
  return "4.3.0"; // Only as absolute fallback
}

// Cache bypass detection
export interface CacheBypassOptions {
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}

export function shouldBypassCache(options: CacheBypassOptions): boolean {
  const { queryParams = {}, headers = {} } = options;

  // Check query parameters for cache bypass
  if (
    queryParams.nocache === "true" ||
    queryParams.bypass === "true" ||
    queryParams.fresh === "true" ||
    queryParams._cache === "false"
  ) {
    return true;
  }

  // Check headers for cache bypass
  const cacheControl = headers["cache-control"] || headers["Cache-Control"] || "";
  if (
    cacheControl.includes("no-cache") ||
    cacheControl.includes("no-store") ||
    cacheControl.includes("max-age=0")
  ) {
    return true;
  }

  // Check for custom cache bypass headers
  if (
    headers["x-cache-bypass"] === "true" ||
    headers["x-force-refresh"] === "true" ||
    headers["X-Cache-Bypass"] === "true" ||
    headers["X-Force-Refresh"] === "true"
  ) {
    return true;
  }

  return false;
}

interface CacheItem {
  value: any;
  expiry: number;
  version: string;
  createdAt: number;
  lastAccessed: number;
}

// Unified TTL configuration
const UNIFIED_CACHE_TTLS = {
  // API Response level (what users see)
  apiResponse: 600, // 10 minutes - frequent enough for good UX

  // Service level (internal data processing)
  organizations: 3600, // 1 hour - rarely changes
  languages: 3600, // 1 hour - rarely changes
  resources: 300, // 5 minutes - might change with new content
  fileContent: 1800, // 30 minutes - USFM files don't change often
  metadata: 900, // 15 minutes - catalog info

  // Transformed data (processed responses)
  transformedResponse: 1800, // 30 minutes - processed scripture/notes

  // Short-lived caches for deduplication
  deduplication: 60, // 1 minute - just to prevent duplicate requests
} as const;

type UnifiedCacheType = keyof typeof UNIFIED_CACHE_TTLS;

export interface CacheResult<T = any> {
  value: T | null;
  cached: boolean;
  cacheKey?: string;
  cacheType?: string;
  expiresAt?: string;
  ttlSeconds?: number;
  version?: string;
  bypassReason?: string;
}

export class UnifiedCacheManager {
  private memoryCache = new Map<string, CacheItem>();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private appVersion: string;
  private stats = {
    hits: 0,
    misses: 0,
    bypasses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor() {
    this.appVersion = getVersionFromPackageJson();
    console.log(`🚀 Unified cache initialized with app version: ${this.appVersion}`);
  }

  private getVersionedKey(key: string, cacheType?: UnifiedCacheType): string {
    const baseKey = cacheType ? `${cacheType}:${key}` : key;
    return `v${this.appVersion}:${baseKey}`;
  }

  async get<T = any>(
    key: string,
    cacheType: UnifiedCacheType = "apiResponse",
    bypassOptions?: CacheBypassOptions
  ): Promise<CacheResult<T>> {
    const fullKey = this.getVersionedKey(key, cacheType);

    // Check if cache should be bypassed
    if (bypassOptions && shouldBypassCache(bypassOptions)) {
      this.stats.bypasses++;
      console.log(`🚫 Cache bypass for: ${key} (${cacheType})`);
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
        bypassReason: "Cache bypass requested",
      };
    }

    const item = this.memoryCache.get(fullKey);

    if (!item) {
      this.stats.misses++;
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
      };
    }

    // Check version compatibility
    if (item.version !== this.appVersion) {
      this.memoryCache.delete(fullKey);
      this.stats.misses++;
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
        bypassReason: "Version mismatch",
      };
    }

    // Check expiry
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(fullKey);
      this.stats.misses++;
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
        bypassReason: "Expired",
      };
    }

    // Update last accessed
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return {
      value: item.value,
      cached: true,
      cacheKey: fullKey,
      cacheType: "memory",
      expiresAt: new Date(item.expiry).toISOString(),
      ttlSeconds: Math.round((item.expiry - Date.now()) / 1000),
      version: this.appVersion,
    };
  }

  async set(
    key: string,
    value: any,
    cacheType: UnifiedCacheType = "apiResponse",
    customTtl?: number
  ): Promise<void> {
    const fullKey = this.getVersionedKey(key, cacheType);
    const ttl = customTtl || UNIFIED_CACHE_TTLS[cacheType];
    const expiry = Date.now() + ttl * 1000;

    const cacheItem: CacheItem = {
      value,
      expiry,
      version: this.appVersion,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    this.memoryCache.set(fullKey, cacheItem);
    this.stats.sets++;

    console.log(`💾 Cached: ${key} (${cacheType}) for ${ttl}s`);
  }

  async delete(key: string, cacheType?: UnifiedCacheType): Promise<void> {
    const fullKey = this.getVersionedKey(key, cacheType);
    const deleted = this.memoryCache.delete(fullKey);
    if (deleted) {
      this.stats.deletes++;
      console.log(`🗑️ Deleted from cache: ${key} (${cacheType})`);
    }
  }

  async clear(): Promise<void> {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    console.log(`🧹 Cleared ${size} cache entries`);
  }

  async clearByType(cacheType: UnifiedCacheType): Promise<void> {
    const prefix = `v${this.appVersion}:${cacheType}:`;
    let deleted = 0;

    for (const [key] of this.memoryCache) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
        deleted++;
      }
    }

    console.log(`🧹 Cleared ${deleted} entries of type: ${cacheType}`);
  }

  async getWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: UnifiedCacheType = "apiResponse",
    bypassOptions?: CacheBypassOptions
  ): Promise<{ data: T; fromCache: boolean; cacheInfo: CacheResult<T> }> {
    const fullKey = this.getVersionedKey(key, cacheType);

    // Check cache first
    const cacheResult = await this.get<T>(key, cacheType, bypassOptions);
    if (cacheResult.value !== null) {
      return {
        data: cacheResult.value,
        fromCache: true,
        cacheInfo: cacheResult,
      };
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(fullKey)) {
      console.log(`⏳ Waiting for pending request: ${key}`);
      const result = (await this.pendingRequests.get(fullKey)) as T;
      return {
        data: result,
        fromCache: false,
        cacheInfo: { ...cacheResult, value: result },
      };
    }

    // Start new request
    const requestPromise = fetcher()
      .then(async (result) => {
        // Only cache if we're not bypassing
        if (!bypassOptions || !shouldBypassCache(bypassOptions)) {
          await this.set(key, result, cacheType);
        }
        this.pendingRequests.delete(fullKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(fullKey);
        throw error;
      });

    this.pendingRequests.set(fullKey, requestPromise);
    const result = await requestPromise;

    return {
      data: result,
      fromCache: false,
      cacheInfo: { ...cacheResult, value: result },
    };
  }

  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)
        : "0.0";

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      pendingRequests: this.pendingRequests.size,
      cacheTTLs: UNIFIED_CACHE_TTLS,
      appVersion: this.appVersion,
      status: "UNIFIED_MEMORY_CACHE",
    };
  }

  // Helper method to generate cache headers for HTTP responses
  generateCacheHeaders(
    cacheResult: CacheResult,
    defaultMaxAge: number = 300
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (cacheResult.cached) {
      headers["X-Cache"] = "HIT";
      headers["X-Cache-TTL"] = `${cacheResult.ttlSeconds}`;
      headers["X-Cache-Expires"] = cacheResult.expiresAt || "";
      headers["Cache-Control"] = `public, max-age=${Math.max(0, cacheResult.ttlSeconds || 0)}`;
    } else {
      headers["X-Cache"] = "MISS";
      headers["Cache-Control"] = `public, max-age=${defaultMaxAge}`;

      if (cacheResult.bypassReason) {
        headers["X-Cache-Bypass"] = cacheResult.bypassReason;
      }
    }

    headers["X-Cache-Version"] = this.appVersion;
    return headers;
  }
}

// Export singleton instance
export const unifiedCache = new UnifiedCacheManager();

// Legacy compatibility - gradually replace cache with unifiedCache
export { unifiedCache as cache };
export type { UnifiedCacheType as CacheType };
