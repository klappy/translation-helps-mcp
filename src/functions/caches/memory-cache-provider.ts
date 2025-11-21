/**
 * Memory Cache Provider
 *
 * Fastest cache tier using in-process memory storage.
 * Always available and never fails.
 * Ideal for frequently accessed data that can tolerate loss on restart.
 */

import { BaseCacheProvider, type CacheStats } from "./cache-provider.js";
import { logger } from "../../utils/logger.js";

interface CacheItem {
  value: unknown;
  expiry: number;
  createdAt: number;
}

export class MemoryCacheProvider extends BaseCacheProvider {
  name = "memory";
  priority = 100; // Highest priority - fastest

  private cache = new Map<string, CacheItem>();
  private hits = 0;
  private misses = 0;

  async get(key: string): Promise<unknown> {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (Date.now() < item.expiry) {
        this.hits++;
        logger.info(`💾 Memory cache HIT for ${key}`);
        return item.value;
      } else {
        // Expired
        this.cache.delete(key);
        this.misses++;
        logger.info(`⏰ Memory cache EXPIRED for ${key}`);
      }
    } else {
      this.misses++;
      logger.info(`❌ Memory cache MISS for ${key}`);
    }
    return null;
  }

  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    const ttlMs = ttl * 1000; // Convert seconds to milliseconds
    const item: CacheItem = {
      value,
      expiry: Date.now() + ttlMs,
      createdAt: Date.now(),
    };

    this.cache.set(key, item);
    logger.info(`💾 Memory cache SET for ${key} (TTL: ${ttl}s)`);
  }

  async has(key: string): Promise<boolean> {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (Date.now() < item.expiry) {
        return true;
      } else {
        // Expired
        this.cache.delete(key);
        return false;
      }
    }
    return false;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    logger.info(`🗑️ Memory cache DELETE for ${key}`);
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info(`🧹 Memory cache CLEARED (${size} items)`);
  }

  async isAvailable(): Promise<boolean> {
    // Memory cache is always available
    return true;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now >= item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info(`🧹 Memory cache cleanup: removed ${cleaned} expired items`);
    }
  }

  /**
   * Get statistics about this cache provider
   */
  async getStats(): Promise<CacheStats> {
    // Clean up expired items first
    this.cleanup();

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    // Calculate approximate size
    let sizeBytes = 0;
    for (const item of this.cache.values()) {
      // Rough estimation of memory size
      try {
        const json = JSON.stringify(item.value);
        sizeBytes += json.length * 2; // Rough estimate (UTF-16)
      } catch {
        // If we can't stringify, estimate conservatively
        sizeBytes += 1000;
      }
    }

    return {
      provider: this.name,
      itemCount: this.cache.size,
      sizeBytes,
      hitRate,
      available: true,
    };
  }
}
