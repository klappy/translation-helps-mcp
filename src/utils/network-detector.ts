/**
 * Network Detection Utility
 *
 * Detects online/offline state and provides utilities for waiting
 * for network availability. Used by cache providers and services
 * to gracefully handle offline scenarios.
 */

import { logger } from "./logger.js";

type NetworkStatusCallback = (isOnline: boolean) => void;

export class NetworkDetector {
  private isOnlineCache: boolean | null = null;
  private lastCheck: number = 0;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly TIMEOUT = 5000; // 5 seconds for network check
  private listeners: Set<NetworkStatusCallback> = new Set();

  /**
   * Check if network is available by trying to reach Door43
   */
  async isOnline(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (
      this.isOnlineCache !== null &&
      now - this.lastCheck < this.CHECK_INTERVAL
    ) {
      return this.isOnlineCache;
    }

    try {
      // Try a quick HEAD request to Door43
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch("https://git.door43.org", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const wasOffline = this.isOnlineCache === false;
      this.isOnlineCache = response.ok;
      this.lastCheck = now;

      if (this.isOnlineCache) {
        if (wasOffline) {
          logger.info("🌐 Network status: BACK ONLINE");
          this.notifyListeners(true);
        } else {
          logger.info("🌐 Network status: ONLINE");
        }
      } else {
        logger.warn("⚠️ Network status: OFFLINE (bad response)");
        this.notifyListeners(false);
      }

      return this.isOnlineCache;
    } catch (_error) {
      const wasOnline = this.isOnlineCache === true;
      this.isOnlineCache = false;
      this.lastCheck = now;

      if (wasOnline) {
        logger.warn("⚠️ Network status: WENT OFFLINE");
        this.notifyListeners(false);
      } else {
        logger.warn("⚠️ Network status: OFFLINE");
      }

      return false;
    }
  }

  /**
   * Force a network check (bypassing cache)
   */
  async forceCheck(): Promise<boolean> {
    this.isOnlineCache = null;
    this.lastCheck = 0;
    return await this.isOnline();
  }

  /**
   * Wait for network to become available
   * @param timeout Maximum time to wait in milliseconds
   * @param checkInterval How often to check in milliseconds
   */
  async waitForOnline(
    timeout: number = 30000,
    checkInterval: number = 2000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const online = await this.forceCheck();
      if (online) {
        logger.info("🌐 Network available!");
        return true;
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    logger.warn(`⚠️ Network wait timeout after ${timeout}ms`);
    return false;
  }

  /**
   * Register a callback for network status changes
   */
  onStatusChange(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(isOnline);
      } catch (error) {
        logger.error("Error in network status listener", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get cached status without checking
   */
  getCachedStatus(): boolean | null {
    return this.isOnlineCache;
  }

  /**
   * Clear cached status
   */
  clearCache(): void {
    this.isOnlineCache = null;
    this.lastCheck = 0;
  }
}

// Export singleton instance
export const networkDetector = new NetworkDetector();

// Export convenience functions
export const isOnline = () => networkDetector.isOnline();
export const forceNetworkCheck = () => networkDetector.forceCheck();
export const waitForOnline = (timeout?: number, checkInterval?: number) =>
  networkDetector.waitForOnline(timeout, checkInterval);
export const onNetworkStatusChange = (callback: NetworkStatusCallback) =>
  networkDetector.onStatusChange(callback);
