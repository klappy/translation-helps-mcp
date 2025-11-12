/**
 * Door43 Upstream Provider
 *
 * Upstream source provider that fetches data from Door43 Content Service.
 * This is a read-only provider that always tries to fetch fresh data.
 * Should always be last in the cache chain (priority: 0).
 */

import { BaseCacheProvider, type CacheStats } from "./cache-provider.js";
import { logger } from "../../utils/logger.js";

export class Door43Provider extends BaseCacheProvider {
  name = "door43";
  priority = 0; // Lowest priority - always last, upstream source

  private hits = 0;
  private misses = 0;
  private networkAvailable: boolean | null = null;
  private lastNetworkCheck: number = 0;
  private readonly NETWORK_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Check if network is available by trying to reach Door43
   */
  private async checkNetwork(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (
      this.networkAvailable !== null &&
      now - this.lastNetworkCheck < this.NETWORK_CHECK_INTERVAL
    ) {
      return this.networkAvailable;
    }

    try {
      // Try a quick HEAD request to Door43
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://git.door43.org", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.networkAvailable = response.ok;
      this.lastNetworkCheck = now;

      if (this.networkAvailable) {
        logger.info("🌐 Door43 network check: ONLINE");
      } else {
        logger.warn("⚠️ Door43 network check: OFFLINE");
      }

      return this.networkAvailable;
    } catch (_error) {
      this.networkAvailable = false;
      this.lastNetworkCheck = now;
      logger.warn("⚠️ Door43 network check: OFFLINE (error)");
      return false;
    }
  }

  /**
   * Get is not implemented for Door43Provider
   * This provider doesn't cache - it's meant to be used by higher-level
   * services that know how to fetch from Door43 APIs
   */
  async get(key: string): Promise<unknown> {
    // Door43Provider doesn't implement get directly
    // It's a marker that the cache chain should continue to
    // the actual Door43 fetching logic in the services
    this.misses++;
    logger.info(`🔄 Door43 provider: pass-through for ${key}`);
    return null;
  }

  /**
   * Set is a no-op for Door43Provider
   * Cannot write to upstream source
   */
  async set(_key: string, _value: unknown, _ttl?: number): Promise<void> {
    // No-op: cannot write to upstream
    logger.debug(`Door43 provider: ignoring set (read-only)`);
  }

  /**
   * Has always returns false to force fetching
   * This ensures we always try to get fresh data from upstream
   */
  async has(_key: string): Promise<boolean> {
    return false;
  }

  /**
   * Delete is a no-op for Door43Provider
   */
  async delete(_key: string): Promise<void> {
    // No-op: cannot delete from upstream
    logger.debug(`Door43 provider: ignoring delete (read-only)`);
  }

  /**
   * Clear is a no-op for Door43Provider
   */
  async clear(): Promise<void> {
    // No-op: cannot clear upstream
    logger.debug("Door43 provider: ignoring clear (read-only)");
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Check if Door43 is available (network check)
   */
  async isAvailable(): Promise<boolean> {
    return await this.checkNetwork();
  }

  /**
   * Get statistics about this provider
   */
  async getStats(): Promise<CacheStats> {
    const available = await this.isAvailable();
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      provider: this.name,
      hitRate,
      available,
    };
  }

  /**
   * Force a network check (useful for testing)
   */
  async forceNetworkCheck(): Promise<boolean> {
    this.networkAvailable = null;
    this.lastNetworkCheck = 0;
    return await this.checkNetwork();
  }
}
