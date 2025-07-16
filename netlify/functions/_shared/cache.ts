/**
 * Cache Manager for Netlify Functions
 * Supports both Redis (Upstash) and in-memory caching
 */

import { Redis } from '@upstash/redis';

interface CacheItem {
  value: any;
  expiry: number;
}

class CacheManager {
  private redis?: Redis;
  private memoryCache: Map<string, CacheItem> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    
    // Initialize Redis if credentials are provided
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log('Cache: Redis initialized');
      } catch (error) {
        console.warn('Cache: Failed to initialize Redis, falling back to memory cache:', error);
      }
    } else {
      console.log('Cache: Using memory cache only (Redis credentials not provided)');
    }
  }

  async get(key: string): Promise<any> {
    if (!this.enabled) return null;

    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() < memoryItem.expiry) {
      return memoryItem.value;
    }

    // Clean up expired memory cache item
    if (memoryItem) {
      this.memoryCache.delete(key);
    }

    // Check Redis if available
    if (this.redis) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          // Store in memory cache for faster subsequent access
          this.memoryCache.set(key, {
            value,
            expiry: Date.now() + 300000 // 5 minutes
          });
          return value;
        }
      } catch (error) {
        console.warn('Cache: Redis get error:', error);
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.enabled) return;

    const expiry = Date.now() + (ttl * 1000);

    // Store in memory cache
    this.memoryCache.set(key, { value, expiry });

    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        console.warn('Cache: Redis set error:', error);
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from Redis if available
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn('Cache: Redis delete error:', error);
      }
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) return;

    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis if available
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn('Cache: Redis clear error:', error);
      }
    }
  }

  getStats(): { memorySize: number; redisAvailable: boolean } {
    return {
      memorySize: this.memoryCache.size,
      redisAvailable: !!this.redis
    };
  }
}

// Export singleton instance
export const cache = new CacheManager(); 