/**
 * In-Memory Cache Adapter for SvelteKit/Cloudflare
 */

import { CacheAdapter } from "../platform-adapter";

interface CacheItem {
  value: any;
  expiry: number;
  createdAt: number;
}

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheItem>();

  async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (Date.now() < item.expiry) {
        return item.value;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  async set(key: string, value: any, ttl: number = 3600000): Promise<void> {
    const item: CacheItem = {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now(),
    };

    this.cache.set(key, item);
  }

  // Helper method to clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now >= item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      platform: "memory",
    };
  }
}
