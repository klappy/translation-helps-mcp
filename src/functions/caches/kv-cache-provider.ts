/**
 * Cloudflare KV Cache Provider
 *
 * Persistent cache using Cloudflare KV storage.
 * Available only when KV namespace is provided (Cloudflare Workers environment).
 * Gracefully skips if unavailable.
 */

import { BaseCacheProvider, type CacheStats } from "./cache-provider.js";
import { logger } from "../../utils/logger.js";

interface KVNamespace {
  get(
    key: string,
    options?: { type?: "text" | "json" | "arrayBuffer" },
  ): Promise<unknown>;
  put(
    key: string,
    value: string | ArrayBuffer,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
  }): Promise<{ keys: Array<{ name: string }> }>;
}

export class KVCacheProvider extends BaseCacheProvider {
  name = "kv";
  priority = 50; // Medium priority - persistent but network-dependent

  private kv: KVNamespace | null = null;
  private hits = 0;
  private misses = 0;

  constructor(kv?: KVNamespace) {
    super();
    if (kv) {
      this.kv = kv;
      logger.info("🚀 KVCacheProvider initialized with KV namespace");
    } else {
      logger.warn("⚠️ KVCacheProvider: no KV namespace provided");
    }
  }

  async get(key: string): Promise<unknown> {
    if (!this.kv) {
      return null;
    }

    try {
      const kvStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const kvValue = await this.kv.get(key, { type: "arrayBuffer" });
      const kvMs = Math.max(
        1,
        Math.round(
          (typeof performance !== "undefined"
            ? performance.now()
            : Date.now()) - kvStart,
        ),
      );

      if (kvValue) {
        this.hits++;
        logger.info(`☁️ KV cache HIT for ${key} in ${kvMs}ms`);
        return kvValue;
      }

      this.misses++;
      logger.info(`❌ KV cache MISS for ${key} in ${kvMs}ms`);
      return null;
    } catch (error) {
      logger.error("KV get error", { key, error: String(error) });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 1800): Promise<void> {
    if (!this.kv) {
      return;
    }

    try {
      let kvValue: string | ArrayBuffer;
      if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
        kvValue = value instanceof Uint8Array ? value.buffer : value;
      } else {
        kvValue = JSON.stringify(value);
      }

      await this.kv.put(key, kvValue, {
        expirationTtl: ttl,
      });
      logger.info(`☁️ KV cache SET for ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error("KV set error", { key, error: String(error) });
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.kv) {
      return false;
    }

    try {
      const value = await this.kv.get(key);
      return value !== null;
    } catch (error) {
      logger.error("KV has error", { key, error: String(error) });
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) {
      return;
    }

    try {
      await this.kv.delete(key);
      logger.info(`🗑️ KV cache DELETE for ${key}`);
    } catch (error) {
      logger.error("KV delete error", { key, error: String(error) });
    }
  }

  async clear(): Promise<void> {
    if (!this.kv) {
      return;
    }

    try {
      // List all keys and delete them
      // Note: This is expensive and should be used sparingly
      const limit = 1000;
      let cursor: string | undefined;
      let deleted = 0;

      do {
        const list = await this.kv.list({
          limit,
          ...(cursor && { cursor }),
        });

        for (const key of list.keys) {
          await this.kv.delete(key.name);
          deleted++;
        }

        cursor = (list as any).cursor;
      } while (cursor);

      this.hits = 0;
      this.misses = 0;
      logger.info(`🧹 KV cache CLEARED (${deleted} items)`);
    } catch (error) {
      logger.error("KV clear error", { error: String(error) });
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.kv !== null;
  }

  /**
   * Get statistics about this cache provider
   */
  async getStats(): Promise<CacheStats> {
    const available = await this.isAvailable();
    if (!available) {
      return {
        provider: this.name,
        available: false,
      };
    }

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    // KV doesn't provide item count or size easily without listing all keys
    // which is expensive, so we just return what we have
    return {
      provider: this.name,
      hitRate,
      available: true,
    };
  }
}
