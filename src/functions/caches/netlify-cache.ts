/**
 * Netlify Cache Adapter using Netlify Blobs
 */

import { getStore } from "@netlify/blobs";
import { CacheAdapter } from "../platform-adapter";

interface CacheItem {
  value: any;
  expiry: number;
  createdAt: number;
}

export class NetlifyCacheAdapter implements CacheAdapter {
  private store = getStore({ name: "cache" });
  private memoryCache = new Map<string, CacheItem>();

  async get(key: string): Promise<any> {
    // Try memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key)!;
      if (Date.now() < item.expiry) {
        return item.value;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Try Netlify Blobs
    try {
      const blobData = await this.store.get(key);
      if (blobData) {
        const item: CacheItem = JSON.parse(blobData);
        if (Date.now() < item.expiry) {
          // Update memory cache
          this.memoryCache.set(key, item);
          return item.value;
        } else {
          // Expired, clean up
          await this.store.delete(key);
        }
      }
    } catch (error) {
      console.warn("Netlify Blobs read failed:", error);
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600000): Promise<void> {
    const item: CacheItem = {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now(),
    };

    // Store in memory cache
    this.memoryCache.set(key, item);

    // Store in Netlify Blobs
    try {
      await this.store.set(key, JSON.stringify(item));
    } catch (error) {
      console.warn("Netlify Blobs write failed:", error);
    }
  }
}
