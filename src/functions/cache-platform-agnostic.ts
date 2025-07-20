/**
 * Platform-Agnostic Cache Manager
 * Works on both Netlify (with Blobs) and Cloudflare (in-memory)
 * Falls back gracefully to in-memory cache when platform-specific features unavailable
 */

import { readFileSync } from "fs";
import { join } from "path";

// Read version from package.json
function getAppVersion(): string {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.warn("Failed to read version from package.json, using fallback");
    return "4.0.0"; // Updated fallback version
  }
}

interface CacheItem {
  value: any;
  expiry: number;
  version: string;
  createdAt: number;
}

// ORIGINAL TTLs with 24-hour maximum cap for safety
const CACHE_TTLS = {
  languages: 3600000, // 1 hour
  books: 3600000, // 1 hour
  resources: 1800000, // 30 minutes
  scripture: 3600000, // 1 hour
  notes: 1800000, // 30 minutes
  questions: 1800000, // 30 minutes
  words: 1800000, // 30 minutes
  wordLinks: 1800000, // 30 minutes
  context: 900000, // 15 minutes
  references: 900000, // 15 minutes
  default: 300000, // 5 minutes default
};

const MAX_TTL = 24 * 60 * 60 * 1000; // 24 hours maximum

class PlatformAgnosticCache {
  private memoryCache = new Map<string, CacheItem>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };
  private appVersion: string;
  private isNetlifyBlobsAvailable = false;
  private netlifyStore: any = null;

  constructor() {
    this.appVersion = getAppVersion();
    // Initialize Netlify Blobs asynchronously
    this.initializeNetlifyBlobs().catch((error) => {
      console.warn("Failed to initialize Netlify Blobs:", error);
    });
  }

  private async initializeNetlifyBlobs() {
    try {
      // Try to import Netlify Blobs dynamically (only works on Netlify)
      const netlifyBlobs = await import("@netlify/blobs");
      this.netlifyStore = netlifyBlobs.getStore();
      this.isNetlifyBlobsAvailable = true;
      console.log("📦 Cache initialized with Netlify Blobs support");
    } catch (error) {
      // Fallback to in-memory cache (works everywhere)
      this.isNetlifyBlobsAvailable = false;
      console.log("📦 Cache initialized with in-memory cache (Netlify Blobs not available)");
    }
  }

  private createKey(category: string, key: string): string {
    return `${this.appVersion}:${category}:${key}`;
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiry;
  }

  private isVersionMismatch(item: CacheItem): boolean {
    return item.version !== this.appVersion;
  }

  async get(category: string, key: string): Promise<any> {
    const cacheKey = this.createKey(category, key);

    try {
      let item: CacheItem | null = null;

      // Try Netlify Blobs first if available
      if (this.isNetlifyBlobsAvailable && this.netlifyStore) {
        try {
          const blobData = await this.netlifyStore.get(cacheKey);
          if (blobData) {
            item = JSON.parse(blobData);
          }
        } catch (error) {
          // Fall back to memory cache
          console.warn("Netlify Blobs read failed, falling back to memory cache:", error);
        }
      }

      // Fall back to memory cache
      if (!item && this.memoryCache.has(cacheKey)) {
        item = this.memoryCache.get(cacheKey)!;
      }

      if (!item) {
        this.stats.misses++;
        return null;
      }

      // Check for expiry or version mismatch
      if (this.isExpired(item) || this.isVersionMismatch(item)) {
        await this.delete(category, key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return item.value;
    } catch (error) {
      console.error("Cache get error:", error);
      this.stats.errors++;
      return null;
    }
  }

  async set(category: string, key: string, value: any, customTtl?: number): Promise<void> {
    const cacheKey = this.createKey(category, key);
    const ttl = Math.min(customTtl || CACHE_TTLS[category] || CACHE_TTLS.default, MAX_TTL);

    const item: CacheItem = {
      value,
      expiry: Date.now() + ttl,
      version: this.appVersion,
      createdAt: Date.now(),
    };

    try {
      // Store in memory cache (always available)
      this.memoryCache.set(cacheKey, item);

      // Try to store in Netlify Blobs if available
      if (this.isNetlifyBlobsAvailable && this.netlifyStore) {
        try {
          await this.netlifyStore.set(cacheKey, JSON.stringify(item));
        } catch (error) {
          console.warn("Netlify Blobs write failed, continuing with memory cache:", error);
        }
      }

      this.stats.sets++;
    } catch (error) {
      console.error("Cache set error:", error);
      this.stats.errors++;
    }
  }

  async delete(category: string, key: string): Promise<void> {
    const cacheKey = this.createKey(category, key);

    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);

      // Try to remove from Netlify Blobs if available
      if (this.isNetlifyBlobsAvailable && this.netlifyStore) {
        try {
          await this.netlifyStore.delete(cacheKey);
        } catch (error) {
          console.warn("Netlify Blobs delete failed:", error);
        }
      }

      this.stats.deletes++;
    } catch (error) {
      console.error("Cache delete error:", error);
      this.stats.errors++;
    }
  }

  getStats() {
    return {
      ...this.stats,
      platform: this.isNetlifyBlobsAvailable ? "netlify-blobs" : "in-memory",
      version: this.appVersion,
      memoryKeys: this.memoryCache.size,
    };
  }

  // Clear only memory cache (for testing)
  clearMemory() {
    this.memoryCache.clear();
  }
}

// Export singleton instance
export const cache = new PlatformAgnosticCache();
