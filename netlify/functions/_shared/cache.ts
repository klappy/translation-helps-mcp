/**
 * Cache Manager for Netlify Functions
 * Supports both Redis (Upstash) and in-memory caching
 * IMPLEMENTS: Multi-level caching with resource-specific TTLs (documented pattern)
 */

import { Redis } from "@upstash/redis";

interface CacheItem {
  value: any;
  expiry: number;
}

// DEBUGGING MODE: SHORT TTLs TO PREVENT CACHE INTERFERENCE
const CACHE_TTLS = {
  organizations: 30, // 30 seconds - was 1 hour (debugging mode)
  languages: 30, // 30 seconds - was 1 hour (debugging mode)
  resources: 15, // 15 seconds - was 5 minutes (debugging mode)
  fileContent: 30, // 30 seconds - was 10 minutes (debugging mode)
  metadata: 20, // 20 seconds - was 30 minutes (debugging mode)
  deduplication: 10, // 10 seconds - was 1 minute (debugging mode)
} as const;

type CacheType = keyof typeof CACHE_TTLS;

// CACHING DISABLED FOR DEBUGGING
export class CacheManager {
  constructor() {
    console.log("🚨 CACHING COMPLETELY DISABLED FOR DEBUGGING");
  }

  get(key: string): any {
    return null; // Always miss
  }

  set(key: string, value: any, ttl?: number): void {
    // Do nothing - no caching
  }

  delete(key: string): void {
    // Do nothing
  }

  clear(): void {
    // Do nothing
  }

  // Add missing methods as no-ops
  async getWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType?: any
  ): Promise<T> {
    console.log(`🚨 Cache disabled - directly calling fetcher for: ${key}`);
    return fetcher();
  }

  getStats() {
    return {
      memorySize: 0,
      redisAvailable: false,
      pendingRequests: 0,
      cacheTTLs: {},
      status: "DISABLED_FOR_DEBUGGING",
    };
  }

  // Add other missing methods as no-ops
  async getOrganizations(key: string): Promise<any> {
    return null;
  }
  async setOrganizations(key: string, value: any): Promise<void> {}
  async getLanguages(key: string): Promise<any> {
    return null;
  }
  async setLanguages(key: string, value: any): Promise<void> {}
  async getResourceMetadata(key: string): Promise<any> {
    return null;
  }
  async setResourceMetadata(key: string, value: any): Promise<void> {}
  async getFileContent(key: string): Promise<any> {
    return null;
  }
  async setFileContent(key: string, value: any): Promise<void> {}
}

// Export singleton instance
export const cache = new CacheManager();
