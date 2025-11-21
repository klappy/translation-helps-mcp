/**
 * CacheProvider Interface
 *
 * Pluggable cache provider system that allows different cache implementations
 * to be added, removed, and reordered at runtime. Each provider implements
 * this interface and can be chained together in a configurable fallback system.
 */

/**
 * Base interface for all cache providers
 */
export interface CacheProvider {
  /**
   * Unique name identifier for this provider
   */
  name: string;

  /**
   * Priority for default ordering (higher = checked first)
   * - Memory: 100 (fastest)
   * - FS: 75 (offline capable)
   * - KV: 50 (persistent, online)
   * - Door43: 0 (upstream source, always last)
   */
  priority: number;

  /**
   * Retrieve a value from the cache
   * @param key - Cache key
   * @returns The cached value or null if not found
   */
  get(key: string): Promise<unknown>;

  /**
   * Store a value in the cache
   * @param key - Cache key
   * @param value - Value to store
   * @param ttl - Optional time-to-live in seconds
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Check if a key exists in the cache
   * @param key - Cache key
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete a specific key from the cache
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all entries from this cache
   */
  clear(): Promise<void>;

  /**
   * Check if this provider is currently available
   * @returns True if the provider can be used
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Statistics about cache usage
 */
export interface CacheStats {
  provider: string;
  itemCount?: number;
  sizeBytes?: number;
  hitRate?: number;
  available: boolean;
}

/**
 * Base abstract class providing common functionality for cache providers
 */
export abstract class BaseCacheProvider implements CacheProvider {
  abstract name: string;
  abstract priority: number;

  abstract get(key: string): Promise<unknown>;
  abstract set(key: string, value: unknown, ttl?: number): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get statistics about this cache provider
   */
  async getStats(): Promise<CacheStats> {
    return {
      provider: this.name,
      available: await this.isAvailable(),
    };
  }
}
