/**
 * Unified Caching System with Pluggable Providers
 *
 * Replaces the original unified-cache.ts with a pluggable, configurable
 * cache chain system that supports dynamic provider management.
 */

import { logger } from "../utils/logger.js";
import { getVersion } from "../version.js";
import { CacheChain, type CacheChainConfig } from "./caches/cache-chain.js";
import { MemoryCacheProvider } from "./caches/memory-cache-provider.js";
import { KVCacheProvider } from "./caches/kv-cache-provider.js";
import { FSCacheProvider } from "./caches/fs-cache-provider.js";
import type { CacheProvider } from "./caches/cache-provider.js";

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

  // Check headers for explicit cache bypass
  const cacheControl =
    headers["cache-control"] || headers["Cache-Control"] || "";
  if (cacheControl.includes("no-store")) {
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

// Unified TTL configuration
const UNIFIED_CACHE_TTLS = {
  apiResponse: 600, // 10 minutes
  organizations: 3600, // 1 hour
  languages: 3600, // 1 hour
  resources: 300, // 5 minutes
  fileContent: 1800, // 30 minutes
  metadata: 900, // 15 minutes
  transformedResponse: 0, // Disabled
  deduplication: 60, // 1 minute
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
  provider?: string;
}

/**
 * Unified Cache Manager with Pluggable Providers
 */
export class UnifiedCacheManager {
  private cacheChain: CacheChain;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private appVersion: string;
  private stats = {
    hits: 0,
    misses: 0,
    bypasses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config?: CacheChainConfig, kv?: any) {
    this.appVersion = getVersion();

    // Initialize cache chain with providers
    const providers: CacheProvider[] = [];

    // Always add memory provider
    providers.push(new MemoryCacheProvider());

    // Add KV provider if available
    if (kv) {
      providers.push(new KVCacheProvider(kv));
    }

    // Add FS provider if in Node.js environment
    if (
      typeof process !== "undefined" &&
      process.env?.USE_FS_CACHE === "true"
    ) {
      providers.push(new FSCacheProvider());
    }

    // Initialize cache chain
    this.cacheChain = new CacheChain({
      providers,
      ...config,
    });

    logger.info(
      `🚀 Unified cache v2 initialized with app version: ${this.appVersion}`,
    );
  }

  private getVersionedKey(key: string, cacheType?: UnifiedCacheType): string {
    const baseKey = cacheType ? `${cacheType}:${key}` : key;
    return `v${this.appVersion}:${baseKey}`;
  }

  async get<T = any>(
    key: string,
    cacheType: UnifiedCacheType = "apiResponse",
    bypassOptions?: CacheBypassOptions,
  ): Promise<CacheResult<T>> {
    const fullKey = this.getVersionedKey(key, cacheType);

    // Hard-disable response-level caching by policy
    if (cacheType === "apiResponse") {
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
        bypassReason: "apiResponse caching disabled",
      };
    }

    // Check if cache should be bypassed
    if (bypassOptions && shouldBypassCache(bypassOptions)) {
      this.stats.bypasses++;
      logger.warn(`🚫 Cache bypass for: ${key} (${cacheType})`);
      return {
        value: null,
        cached: false,
        cacheKey: fullKey,
        bypassReason: "Cache bypass requested",
      };
    }

    // Try to get from cache chain
    const value = await this.cacheChain.get(fullKey);

    if (value !== null && value !== undefined) {
      this.stats.hits++;
      const ttl = UNIFIED_CACHE_TTLS[cacheType];
      return {
        value: value as T,
        cached: true,
        cacheKey: fullKey,
        cacheType: "chain",
        ttlSeconds: ttl,
        version: this.appVersion,
      };
    }

    this.stats.misses++;
    return {
      value: null,
      cached: false,
      cacheKey: fullKey,
    };
  }

  async set(
    key: string,
    value: any,
    cacheType: UnifiedCacheType = "apiResponse",
    customTtl?: number,
  ): Promise<void> {
    // Hard-disable response-level caching by policy
    if (cacheType === "apiResponse") {
      logger.debug("Skipping set for apiResponse cache (disabled)", { key });
      return;
    }

    const fullKey = this.getVersionedKey(key, cacheType);
    const ttl = customTtl || UNIFIED_CACHE_TTLS[cacheType];

    await this.cacheChain.set(fullKey, value, ttl);
    this.stats.sets++;

    logger.info(`💾 Cached: ${key} (${cacheType}) for ${ttl}s`);
  }

  async delete(key: string, cacheType?: UnifiedCacheType): Promise<void> {
    const fullKey = this.getVersionedKey(key, cacheType);
    await this.cacheChain.delete(fullKey);
    this.stats.deletes++;
    logger.info(`🗑️ Deleted from cache: ${key} (${cacheType})`);
  }

  async clear(): Promise<void> {
    await this.cacheChain.clear();
    logger.info(`🧹 Cleared cache`);
  }

  async clearByType(cacheType: UnifiedCacheType): Promise<void> {
    // This would require filtering keys, which is expensive
    // For now, just log it
    logger.info(
      `🧹 Clearing cache type: ${cacheType} (not fully implemented yet)`,
    );
  }

  async getWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: UnifiedCacheType = "apiResponse",
    bypassOptions?: CacheBypassOptions,
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
      logger.debug(`⏳ Waiting for pending request: ${key}`);
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

  /**
   * Get the cache chain for advanced configuration
   */
  getCacheChain(): CacheChain {
    return this.cacheChain;
  }

  /**
   * Configure cache providers
   */
  async configureCacheProviders(config: CacheChainConfig): Promise<void> {
    await this.cacheChain.configure(config);
  }

  /**
   * Get active cache providers
   */
  getActiveProviders(): string[] {
    return this.cacheChain.getActiveProviders();
  }

  /**
   * Add a cache provider
   */
  async addProvider(provider: CacheProvider, position?: number): Promise<void> {
    await this.cacheChain.addProvider(provider, position);
  }

  /**
   * Remove a cache provider
   */
  removeProvider(name: string): void {
    this.cacheChain.removeProvider(name);
  }

  /**
   * Reorder cache providers
   */
  reorderProviders(order: string[]): void {
    this.cacheChain.reorderProviders(order);
  }

  async getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(1)
        : "0.0";

    const providerStats = await this.cacheChain.getStats();

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      pendingRequests: this.pendingRequests.size,
      cacheTTLs: UNIFIED_CACHE_TTLS,
      appVersion: this.appVersion,
      status: "UNIFIED_CACHE_V2_PLUGGABLE",
      providers: providerStats,
      activeProviders: this.cacheChain.getActiveProviders(),
    };
  }

  // Helper method to generate cache headers for HTTP responses
  generateCacheHeaders(
    cacheResult: CacheResult,
    defaultMaxAge: number = 300,
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (cacheResult.cached) {
      headers["X-Cache"] = "HIT";
      headers["X-Cache-TTL"] = `${cacheResult.ttlSeconds}`;
      headers["X-Cache-Expires"] = cacheResult.expiresAt || "";
      headers["Cache-Control"] =
        `public, max-age=${Math.max(0, cacheResult.ttlSeconds || 0)}`;
      if (cacheResult.provider) {
        headers["X-Cache-Provider"] = cacheResult.provider;
      }
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

// Export singleton - will be initialized in platform-specific code
let unifiedCacheInstance: UnifiedCacheManager | null = null;

export function initializeUnifiedCache(
  config?: CacheChainConfig,
  kv?: any,
): UnifiedCacheManager {
  unifiedCacheInstance = new UnifiedCacheManager(config, kv);
  return unifiedCacheInstance;
}

export function getUnifiedCache(): UnifiedCacheManager {
  if (!unifiedCacheInstance) {
    unifiedCacheInstance = new UnifiedCacheManager();
  }
  return unifiedCacheInstance;
}

// Legacy compatibility
export const unifiedCache = getUnifiedCache();
export { unifiedCache as cache };
export type { UnifiedCacheType as CacheType };
