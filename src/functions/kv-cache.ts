/**
 * CloudflareKVCache - Two-tier caching with memory and KV
 * Falls back gracefully if KV is not available
 */

import { logger } from "../utils/logger.js";

interface KVNamespace {
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" }): Promise<unknown>;
  put(
    key: string,
    value: string | ArrayBuffer,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

export class CloudflareKVCache {
  private memoryCache: Map<string, { value: unknown; expires: number }> = new Map();
  private kv: KVNamespace | null = null;
  private kvAvailable = false;

  constructor(kv?: KVNamespace) {
    if (kv) {
      this.kv = kv;
      this.kvAvailable = true;
      logger.info("🚀 CloudflareKVCache initialized with KV namespace");
    } else {
      logger.warn("⚠️ CloudflareKVCache running in memory-only mode (no KV namespace)");
    }
  }

  async get(key: string): Promise<unknown> {
    // Check memory cache first
    const memItem = this.memoryCache.get(key);
    if (memItem && Date.now() < memItem.expires) {
      logger.info(`💾 Memory cache HIT for ${key}`);
      return memItem.value;
    }

    // Check KV if available
    if (this.kvAvailable && this.kv) {
      try {
        const kvValue = await this.kv.get(key, { type: "arrayBuffer" });
        if (kvValue) {
          logger.info(`☁️ KV cache HIT for ${key}`);
          // Warm memory cache with KV value
          this.memoryCache.set(key, {
            value: kvValue,
            expires: Date.now() + 300000, // 5 minutes for memory cache
          });
          return kvValue;
        }
      } catch (error) {
        logger.error(`KV get error for ${key}:`, error);
      }
    }

    logger.info(`❌ Cache MISS for ${key}`);
    return null;
  }

  async set(key: string, value: ArrayBuffer | string, ttlSeconds: number = 1800): Promise<void> {
    // Always set in memory cache
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + Math.min(ttlSeconds * 1000, 300000), // Max 5 min for memory
    });

    // Try to set in KV if available
    if (this.kvAvailable && this.kv) {
      try {
        let kvValue: string | ArrayBuffer;
        if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
          kvValue = value instanceof Uint8Array ? value.buffer : value;
        } else {
          kvValue = JSON.stringify(value);
        }

        await this.kv.put(key, kvValue, {
          expirationTtl: ttlSeconds,
        });
        logger.info(`☁️ Stored ${key} in KV with TTL ${ttlSeconds}s`);
      } catch (error) {
        logger.error(`KV put error for ${key}:`, error);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.kvAvailable && this.kv) {
      try {
        await this.kv.delete(key);
      } catch (error) {
        logger.error(`KV delete error for ${key}:`, error);
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.kvAvailable && this.kv) {
      logger.warn("KV clear called without prefixes - skipping full wipe for safety");
    }
  }

  /**
   * Delete all KV keys matching the provided prefixes. Memory cache is also cleared.
   * Returns the number of KV keys deleted.
   */
  async clearPrefixes(prefixes: string[] = ["zip:", "catalog:"]): Promise<number> {
    this.memoryCache.clear();
    let deletedCount = 0;

    if (!this.kvAvailable || !this.kv) {
      return deletedCount;
    }

    try {
      for (const prefix of prefixes) {
        // Attempt to list up to 1000 keys per prefix
        const list = await this.kv.list({ prefix, limit: 1000 });
        const keys = list?.keys || [];
        for (const { name } of keys) {
          try {
            await this.kv.delete(name);
            deletedCount++;
          } catch (error) {
            logger.error(`KV delete error for ${name}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error("KV clearPrefixes error:", error);
    }

    logger.warn(`☁️ KV prefixes cleared: ${deletedCount} keys deleted`);
    return deletedCount;
  }

  getStats() {
    return {
      memorySize: this.memoryCache.size,
      kvAvailable: this.kvAvailable,
      cacheType: this.kvAvailable ? "two-tier" : "memory-only",
    };
  }
}

// Singleton instance - will be initialized with KV namespace if available
let kvCacheInstance: CloudflareKVCache | null = null;

export function initializeKVCache(kv?: KVNamespace): CloudflareKVCache {
  if (!kvCacheInstance) {
    kvCacheInstance = new CloudflareKVCache(kv);
  }
  return kvCacheInstance;
}

export function getKVCache(): CloudflareKVCache {
  if (!kvCacheInstance) {
    kvCacheInstance = new CloudflareKVCache();
  }
  return kvCacheInstance;
}
