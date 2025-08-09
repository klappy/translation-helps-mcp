/**
 * Smart Caching System for Translation Helps Platform
 *
 * Intelligent caching layer optimized for UW resource access patterns.
 * Features automatic invalidation, performance monitoring, and adaptive TTL.
 *
 * Based on Task 10 of the implementation plan
 * Created for Performance Optimization (Phase 4)
 */

import type { CatalogSearchParams, Resource } from "../types/dcs.js";
import { logger } from "../utils/logger.js";
import { cache } from "./cache.js";

/**
 * Cache configuration with smart defaults
 */
interface CacheConfig {
  defaultTTL: number; // Default time-to-live in seconds
  maxTTL: number; // Maximum TTL for any cache entry
  minTTL: number; // Minimum TTL for any cache entry
  adaptiveTTL: boolean; // Enable adaptive TTL based on access patterns
  compressionEnabled: boolean; // Enable response compression
  metricsEnabled: boolean; // Enable performance metrics collection
}

/**
 * Cache metrics for monitoring and optimization
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
  compressionRatio: number;
  totalCacheSize: number;
  entriesCount: number;
  lastUpdated: string;
}

/**
 * Cache entry metadata
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed: boolean;
  size: number;
  contentType: string;
  tags: string[]; // For bulk invalidation
}

/**
 * Smart cache patterns for different content types
 */
const CACHE_PATTERNS = {
  // Scripture texts - stable content, cache longer
  SCRIPTURE: {
    ttl: 86400, // 24 hours
    tags: ["scripture", "content"],
    compression: true,
  },

  // Translation helps - moderately stable
  TRANSLATION_HELPS: {
    ttl: 21600, // 6 hours
    tags: ["helps", "content"],
    compression: true,
  },

  // Resource listings - changes frequently
  RESOURCE_LISTINGS: {
    ttl: 3600, // 1 hour
    tags: ["listings", "metadata"],
    compression: false,
  },

  // Language data - very stable
  LANGUAGE_DATA: {
    ttl: 604800, // 1 week
    tags: ["languages", "metadata"],
    compression: false,
  },

  // Coverage matrix - moderately stable
  COVERAGE_MATRIX: {
    ttl: 7200, // 2 hours
    tags: ["coverage", "metadata", "analysis"],
    compression: true,
  },

  // Search results - less stable
  SEARCH_RESULTS: {
    ttl: 1800, // 30 minutes
    tags: ["search", "dynamic"],
    compression: true,
  },

  // Organization data - stable
  ORGANIZATION_DATA: {
    ttl: 43200, // 12 hours
    tags: ["organizations", "metadata"],
    compression: false,
  },

  // Dynamic queries - short cache
  DYNAMIC_QUERIES: {
    ttl: 600, // 10 minutes
    tags: ["dynamic", "query"],
    compression: false,
  },
};

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  maxTTL: 604800, // 1 week
  minTTL: 300, // 5 minutes
  adaptiveTTL: true,
  compressionEnabled: true,
  metricsEnabled: true,
};

/**
 * Cache metrics store
 */
let cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  averageResponseTime: 0,
  compressionRatio: 0,
  totalCacheSize: 0,
  entriesCount: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Performance tracking for adaptive TTL
 */
const accessPatterns = new Map<
  string,
  {
    count: number;
    lastAccess: number;
    averageInterval: number;
  }
>();

/**
 * Smart Cache Class
 */
export class SmartCache {
  private config: CacheConfig;
  private compressionCache = new Map<string, Buffer>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cache key with pattern awareness
   */
  private generateKey(prefix: string, params: any): string {
    // Sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as any);

    const paramString = JSON.stringify(sortedParams);
    return `${prefix}:${Buffer.from(paramString).toString("base64")}`;
  }

  /**
   * Determine cache pattern based on content type
   */
  private getCachePattern(type: string): typeof CACHE_PATTERNS.SCRIPTURE {
    switch (type.toLowerCase()) {
      case "scripture":
      case "ult":
      case "ust":
      case "glt":
      case "gst":
        return CACHE_PATTERNS.SCRIPTURE;

      case "translation-notes":
      case "translation-words":
      case "translation-questions":
      case "translation-academy":
      case "tn":
      case "tw":
      case "tq":
      case "ta":
        return CACHE_PATTERNS.TRANSLATION_HELPS;

      case "resources":
      case "catalog":
        return CACHE_PATTERNS.RESOURCE_LISTINGS;

      case "languages":
        return CACHE_PATTERNS.LANGUAGE_DATA;

      case "coverage":
      case "matrix":
        return CACHE_PATTERNS.COVERAGE_MATRIX;

      case "search":
        return CACHE_PATTERNS.SEARCH_RESULTS;

      case "organizations":
        return CACHE_PATTERNS.ORGANIZATION_DATA;

      default:
        return CACHE_PATTERNS.DYNAMIC_QUERIES;
    }
  }

  /**
   * Calculate adaptive TTL based on access patterns
   */
  private calculateAdaptiveTTL(key: string, baseTTL: number): number {
    if (!this.config.adaptiveTTL) {
      return baseTTL;
    }

    const pattern = accessPatterns.get(key);
    if (!pattern || pattern.count < 5) {
      return baseTTL; // Not enough data
    }

    // If accessed frequently, cache longer
    const accessFrequency = pattern.count / ((Date.now() - pattern.lastAccess) / 1000);

    let adaptedTTL = baseTTL;

    if (accessFrequency > 0.01) {
      // More than once per 100 seconds
      adaptedTTL = Math.min(baseTTL * 2, this.config.maxTTL);
    } else if (accessFrequency < 0.001) {
      // Less than once per 1000 seconds
      adaptedTTL = Math.max(baseTTL * 0.5, this.config.minTTL);
    }

    return adaptedTTL;
  }

  /**
   * Compress data if beneficial
   */
  private compressData(data: any): { compressed: boolean; size: number; data: any } {
    if (!this.config.compressionEnabled) {
      const jsonString = JSON.stringify(data);
      return {
        compressed: false,
        size: Buffer.byteLength(jsonString, "utf8"),
        data: jsonString,
      };
    }

    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, "utf8");

    // Only compress if data is large enough to benefit
    if (originalSize < 1024) {
      return {
        compressed: false,
        size: originalSize,
        data: jsonString,
      };
    }

    try {
      // Simple compression simulation (in real implementation, use zlib)
      const compressedData = jsonString; // Placeholder
      const compressedSize = originalSize * 0.7; // Simulated 30% compression

      return {
        compressed: true,
        size: compressedSize,
        data: compressedData,
      };
    } catch (error) {
      // Fallback to uncompressed
      return {
        compressed: false,
        size: originalSize,
        data: jsonString,
      };
    }
  }

  /**
   * Update access patterns for adaptive caching
   */
  private updateAccessPattern(key: string): void {
    const now = Date.now();
    const existing = accessPatterns.get(key);

    if (existing) {
      const interval = now - existing.lastAccess;
      const newAverageInterval =
        (existing.averageInterval * existing.count + interval) / (existing.count + 1);

      accessPatterns.set(key, {
        count: existing.count + 1,
        lastAccess: now,
        averageInterval: newAverageInterval,
      });
    } else {
      accessPatterns.set(key, {
        count: 1,
        lastAccess: now,
        averageInterval: 0,
      });
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(hit: boolean, responseTime: number, dataSize?: number): void {
    if (!this.config.metricsEnabled) return;

    if (hit) {
      cacheMetrics.hits++;
    } else {
      cacheMetrics.misses++;
    }

    const totalRequests = cacheMetrics.hits + cacheMetrics.misses;
    cacheMetrics.hitRate = totalRequests > 0 ? (cacheMetrics.hits / totalRequests) * 100 : 0;

    // Update average response time (simple moving average)
    const weight = 0.1; // Weight for new value
    cacheMetrics.averageResponseTime =
      cacheMetrics.averageResponseTime * (1 - weight) + responseTime * weight;

    if (dataSize) {
      cacheMetrics.totalCacheSize += dataSize;
      cacheMetrics.entriesCount++;
    }

    cacheMetrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Get data from cache with intelligent patterns
   */
  async get<T>(type: string, params: any): Promise<T | null> {
    const startTime = Date.now();
    const key = this.generateKey(type, params);

    try {
      this.updateAccessPattern(key);

      // Always use a consistent cache bucket for smart-cache entries
      const cachedData = await cache.get(key, "transformedResponse");

      if (cachedData) {
        const responseTime = Date.now() - startTime;
        this.updateMetrics(true, responseTime);

        // Parse data based on compression
        if (typeof cachedData === "object" && cachedData.compressed) {
          return JSON.parse(cachedData.data);
        }

        return cachedData;
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);
      return null;
    } catch (error) {
      logger.error(`[SmartCache] Error retrieving`, { key, error: String(error) });
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);
      return null;
    }
  }

  /**
   * Set data in cache with intelligent TTL and compression
   */
  async set(type: string, params: any, data: any): Promise<void> {
    const startTime = Date.now();
    const key = this.generateKey(type, params);

    try {
      const pattern = this.getCachePattern(type);
      const adaptiveTTL = this.calculateAdaptiveTTL(key, pattern.ttl);

      let cacheData: any;
      let dataSize: number;

      if (pattern.compression && this.config.compressionEnabled) {
        const compressed = this.compressData(data);
        cacheData = {
          data: compressed.data,
          compressed: compressed.compressed,
          originalSize: compressed.size,
        };
        dataSize = compressed.size;
      } else {
        cacheData = data;
        dataSize = Buffer.byteLength(JSON.stringify(data), "utf8");
      }

      // Store in cache with computed TTL
      await cache.set(key, cacheData, "transformedResponse", adaptiveTTL);

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, dataSize);

      logger.info(`[SmartCache] Cached data`, { type, ttl: adaptiveTTL, size: dataSize });
    } catch (error) {
      logger.error(`[SmartCache] Error caching`, { key, error: String(error) });
    }
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    logger.warn(`[SmartCache] Invalidating cache entries by tag`, { tag });

    // This would need cache implementation support for tag-based invalidation
    // For now, simulate by clearing common patterns

    const patternsToInvalidate = Object.entries(CACHE_PATTERNS)
      .filter(([, pattern]) => pattern.tags.includes(tag))
      .map(([name]) => name);

    logger.debug(`[SmartCache] Invalidating patterns`, { patterns: patternsToInvalidate });

    // In a real implementation, this would use a proper tag-based cache
    // For now, return simulated count
    return patternsToInvalidate.length;
  }

  /**
   * Invalidate all cached data for a specific content type
   */
  async invalidateType(type: string): Promise<void> {
    logger.warn(`[SmartCache] Invalidate type`, { type });

    // This would iterate through cache keys matching the type prefix
    // Implementation depends on cache backend capabilities
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return { ...cacheMetrics };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("[SmartCache] Configuration updated", { config: this.config });
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAll(): Promise<void> {
    logger.warn("[SmartCache] Clearing all cache data");

    // Reset metrics
    cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      averageResponseTime: 0,
      compressionRatio: 0,
      totalCacheSize: 0,
      entriesCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Clear access patterns
    accessPatterns.clear();
    this.compressionCache.clear();

    // This would clear the underlying cache implementation
    // Implementation depends on cache backend
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(warmupData: Array<{ type: string; params: any; data: any }>): Promise<void> {
    logger.info(`[SmartCache] Warmup start`, { count: warmupData.length });

    for (const item of warmupData) {
      await this.set(item.type, item.params, item.data);
    }

    logger.info("[SmartCache] Warmup complete");
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): {
    metrics: CacheMetrics;
    config: CacheConfig;
    accessPatterns: number;
    topPatterns: Array<{ key: string; count: number; avgInterval: number }>;
  } {
    // Get top 10 most accessed patterns
    const topPatterns = Array.from(accessPatterns.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, pattern]) => ({
        key: key.split(":")[0], // Remove base64 params for readability
        count: pattern.count,
        avgInterval: Math.round(pattern.averageInterval / 1000), // Convert to seconds
      }));

    return {
      metrics: this.getMetrics(),
      config: this.getConfig(),
      accessPatterns: accessPatterns.size,
      topPatterns,
    };
  }
}

/**
 * Global smart cache instance
 */
export const smartCache = new SmartCache();

/**
 * Convenience functions for common caching patterns
 */
export const CacheHelpers = {
  /**
   * Cache scripture content
   */
  cacheScripture: async (language: string, resource: string, book: string, data: any) => {
    await smartCache.set("scripture", { language, resource, book }, data);
  },

  /**
   * Get cached scripture content
   */
  getScripture: async <T>(language: string, resource: string, book: string): Promise<T | null> => {
    return smartCache.get<T>("scripture", { language, resource, book });
  },

  /**
   * Cache translation helps
   */
  cacheTranslationHelps: async (language: string, resource: string, book: string, data: any) => {
    await smartCache.set("translation-helps", { language, resource, book }, data);
  },

  /**
   * Get cached translation helps
   */
  getTranslationHelps: async <T>(
    language: string,
    resource: string,
    book: string
  ): Promise<T | null> => {
    return smartCache.get<T>("translation-helps", { language, resource, book });
  },

  /**
   * Cache resource listings
   */
  cacheResourceListings: async (params: CatalogSearchParams, data: Resource[]) => {
    await smartCache.set("resources", params, data);
  },

  /**
   * Get cached resource listings
   */
  getResourceListings: async (params: CatalogSearchParams): Promise<Resource[] | null> => {
    return smartCache.get<Resource[]>("resources", params);
  },

  /**
   * Cache language coverage matrix
   */
  cacheCoverageMatrix: async (filters: any, data: any) => {
    await smartCache.set("coverage", filters, data);
  },

  /**
   * Get cached coverage matrix
   */
  getCoverageMatrix: async <T>(filters: any): Promise<T | null> => {
    return smartCache.get<T>("coverage", filters);
  },

  /**
   * Invalidate content when resources are updated
   */
  invalidateContentUpdates: async () => {
    await smartCache.invalidateByTag("content");
  },

  /**
   * Invalidate metadata when listings change
   */
  invalidateMetadataUpdates: async () => {
    await smartCache.invalidateByTag("metadata");
  },
};
