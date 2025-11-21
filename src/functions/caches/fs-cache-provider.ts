/**
 * File System Cache Provider
 *
 * Persistent local file system cache for offline capabilities.
 * Stores resources in ~/.translation-helps-mcp/cache/
 * Available only in Node.js environment (not Cloudflare Workers).
 */

import { BaseCacheProvider, type CacheStats } from "./cache-provider.js";
import { logger } from "../../utils/logger.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

interface FSCacheItem {
  value: unknown;
  expiry: number;
  createdAt: number;
}

export class FSCacheProvider extends BaseCacheProvider {
  name = "fs";
  priority = 75; // High priority - offline capable

  private cacheDir: string;
  private available: boolean = false;
  private hits = 0;
  private misses = 0;

  constructor(cachePath?: string) {
    super();

    // Default cache directory: ~/.translation-helps-mcp/cache/
    this.cacheDir =
      cachePath ||
      path.join(os.homedir(), ".translation-helps-mcp", "cache", "data");

    // Check if we're in a Node.js environment
    this.checkAvailability();
  }

  private checkAvailability(): void {
    try {
      // Check if fs module is available and we can access the file system
      if (typeof fs.mkdirSync !== "function") {
        this.available = false;
        return;
      }

      // Try to create cache directory
      fs.mkdirSync(this.cacheDir, { recursive: true });
      this.available = true;
      logger.info(`🗂️ FSCacheProvider initialized at ${this.cacheDir}`);
    } catch (error) {
      this.available = false;
      logger.warn(
        `⚠️ FSCacheProvider unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate a safe filename from a cache key
   */
  private getFilePath(key: string): string {
    // Use SHA-256 hash to create a safe filename
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    return path.join(this.cacheDir, `${hash}.json`);
  }

  async get(key: string): Promise<unknown> {
    if (!this.available) {
      return null;
    }

    try {
      const filePath = this.getFilePath(key);

      if (!fs.existsSync(filePath)) {
        this.misses++;
        logger.info(`❌ FS cache MISS for ${key}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      const item: FSCacheItem = JSON.parse(fileContent);

      // Check if expired
      if (Date.now() > item.expiry) {
        // Delete expired file
        fs.unlinkSync(filePath);
        this.misses++;
        logger.info(`⏰ FS cache EXPIRED for ${key}`);
        return null;
      }

      this.hits++;
      logger.info(`🗂️ FS cache HIT for ${key}`);
      return item.value;
    } catch (error) {
      logger.error("FS cache get error", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const filePath = this.getFilePath(key);
      const ttlMs = ttl * 1000; // Convert seconds to milliseconds

      const item: FSCacheItem = {
        value,
        expiry: Date.now() + ttlMs,
        createdAt: Date.now(),
      };

      fs.writeFileSync(filePath, JSON.stringify(item), "utf-8");
      logger.info(`🗂️ FS cache SET for ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error("FS cache set error", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.available) {
      return false;
    }

    try {
      const filePath = this.getFilePath(key);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      // Check if expired
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const item: FSCacheItem = JSON.parse(fileContent);

      if (Date.now() > item.expiry) {
        // Delete expired file
        fs.unlinkSync(filePath);
        return false;
      }

      return true;
    } catch (error) {
      logger.error("FS cache has error", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const filePath = this.getFilePath(key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ FS cache DELETE for ${key}`);
      }
    } catch (error) {
      logger.error("FS cache delete error", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async clear(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const files = fs.readdirSync(this.cacheDir);
      let deleted = 0;

      for (const file of files) {
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          deleted++;
        }
      }

      this.hits = 0;
      this.misses = 0;
      logger.info(`🧹 FS cache CLEARED (${deleted} items)`);
    } catch (error) {
      logger.error("FS cache clear error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(this.cacheDir, file);
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const item: FSCacheItem = JSON.parse(fileContent);

          if (now > item.expiry) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch (_error) {
          // If we can't read/parse the file, delete it
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`🧹 FS cache cleanup: removed ${cleaned} expired items`);
      }
    } catch (error) {
      logger.error("FS cache cleanup error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get statistics about this cache provider
   */
  async getStats(): Promise<CacheStats> {
    if (!this.available) {
      return {
        provider: this.name,
        available: false,
      };
    }

    try {
      // Clean up expired items first
      await this.cleanup();

      const files = fs.readdirSync(this.cacheDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      let totalSize = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      const totalRequests = this.hits + this.misses;
      const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

      return {
        provider: this.name,
        itemCount: jsonFiles.length,
        sizeBytes: totalSize,
        hitRate,
        available: true,
      };
    } catch (error) {
      logger.error("FS cache stats error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        provider: this.name,
        available: true,
      };
    }
  }

  /**
   * Get the cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}
