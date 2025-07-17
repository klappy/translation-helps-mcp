/**
 * Cache Manager for Netlify Functions
 * Supports both Redis (Upstash) and in-memory caching
 * IMPLEMENTS: Multi-level caching with resource-specific TTLs (documented pattern)
 */
// DEBUGGING MODE: SHORT TTLs TO PREVENT CACHE INTERFERENCE
const CACHE_TTLS = {
    organizations: 30, // 30 seconds - was 1 hour (debugging mode)
    languages: 30, // 30 seconds - was 1 hour (debugging mode)
    resources: 15, // 15 seconds - was 5 minutes (debugging mode)
    fileContent: 30, // 30 seconds - was 10 minutes (debugging mode)
    metadata: 20, // 20 seconds - was 30 minutes (debugging mode)
    deduplication: 10, // 10 seconds - was 1 minute (debugging mode)
};
// CACHING DISABLED FOR DEBUGGING
export class CacheManager {
    constructor() {
        console.log("🚨 CACHING COMPLETELY DISABLED FOR DEBUGGING");
    }
    get(key) {
        return null; // Always miss
    }
    set(key, value, ttl) {
        // Do nothing - no caching
    }
    delete(key) {
        // Do nothing
    }
    clear() {
        // Do nothing
    }
    // Add missing methods as no-ops
    async getWithDeduplication(key, fetcher, cacheType) {
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
    async getOrganizations(key) {
        return null;
    }
    async setOrganizations(key, value) { }
    async getLanguages(key) {
        return null;
    }
    async setLanguages(key, value) { }
    async getResourceMetadata(key) {
        return null;
    }
    async setResourceMetadata(key, value) { }
    async getFileContent(key) {
        return null;
    }
    async setFileContent(key, value) { }
}
// Export singleton instance
export const cache = new CacheManager();
