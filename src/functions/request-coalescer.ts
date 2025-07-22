/**
 * Request Coalescing System
 *
 * Combines multiple identical requests into a single upstream call
 * to reduce API load, improve efficiency, and prevent duplicate processing.
 *
 * Based on Task 11 of the implementation plan
 * Created for Performance Optimization (Phase 4)
 */

/**
 * Pending request information
 */
interface PendingRequest<T> {
  promise: Promise<T>;
  startTime: number;
  requestCount: number;
  resolvers: Array<{
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }>;
}

/**
 * Coalescing statistics
 */
interface CoalescingStats {
  totalRequests: number;
  coalescedRequests: number;
  uniqueRequests: number;
  coalescingRate: number; // percentage
  averageRequestsPerCoalesce: number;
  timeWindowHits: number;
  memoryUsage: number; // bytes estimate
}

/**
 * Coalescing configuration
 */
interface CoalescingConfig {
  timeoutMs: number; // How long to wait for additional requests
  maxConcurrentKeys: number; // Maximum keys to track simultaneously
  enableMetrics: boolean;
  keyGenerator?: (args: any[]) => string;
  errorHandling: "isolate" | "share"; // How to handle errors
}

/**
 * Coalescing metrics per key
 */
interface KeyMetrics {
  key: string;
  hitCount: number;
  totalRequests: number;
  averageResponseTime: number;
  lastUsed: number;
  errorCount: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CoalescingConfig = {
  timeoutMs: 50, // 50ms window for additional requests
  maxConcurrentKeys: 1000,
  enableMetrics: true,
  errorHandling: "isolate",
};

/**
 * Request Coalescer Class
 */
export class RequestCoalescer {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private config: CoalescingConfig;
  private stats: CoalescingStats;
  private keyMetrics = new Map<string, KeyMetrics>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CoalescingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalRequests: 0,
      coalescedRequests: 0,
      uniqueRequests: 0,
      coalescingRate: 0,
      averageRequestsPerCoalesce: 0,
      timeWindowHits: 0,
      memoryUsage: 0,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Coalesce a request with potential duplicates
   */
  async coalesce<T>(key: string, fetcher: () => Promise<T>, timeoutMs?: number): Promise<T> {
    const effectiveTimeout = timeoutMs || this.config.timeoutMs;

    // Update metrics
    this.stats.totalRequests++;
    this.updateKeyMetrics(key, "request");

    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    if (existing) {
      // Request is being coalesced
      this.stats.coalescedRequests++;
      this.stats.timeWindowHits++;
      existing.requestCount++;
      this.updateKeyMetrics(key, "coalesce");

      return new Promise<T>((resolve, reject) => {
        existing.resolvers.push({ resolve, reject });
      });
    }

    // Create new pending request
    const resolvers: Array<{ resolve: (value: T) => void; reject: (error: any) => void }> = [];
    const startTime = Date.now();

    const promise = this.createCoalescedRequest(key, fetcher, resolvers, effectiveTimeout);

    const pendingRequest: PendingRequest<T> = {
      promise,
      startTime,
      requestCount: 1,
      resolvers,
    };

    this.pendingRequests.set(key, pendingRequest);
    this.stats.uniqueRequests++;

    // Update coalescing rate
    this.updateCoalescingRate();

    return promise;
  }

  /**
   * Create the actual coalesced request
   */
  private async createCoalescedRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    resolvers: Array<{ resolve: (value: T) => void; reject: (error: any) => void }>,
    timeoutMs: number
  ): Promise<T> {
    // Small delay to allow for request coalescing
    if (timeoutMs > 0) {
      await this.sleep(Math.min(timeoutMs, 10));
    }

    try {
      const result = await fetcher();

      // Resolve all waiting promises
      resolvers.forEach(({ resolve }) => resolve(result));

      // Update metrics
      const responseTime = Date.now() - this.pendingRequests.get(key)!.startTime;
      this.updateKeyMetrics(key, "success", responseTime);

      return result;
    } catch (error) {
      // Handle error based on configuration
      if (this.config.errorHandling === "share") {
        // Share error with all waiting promises
        resolvers.forEach(({ reject }) => reject(error));
      } else {
        // Isolate errors - each request gets its own error
        resolvers.forEach(({ reject }) => reject(new Error("Coalesced request failed")));
      }

      this.updateKeyMetrics(key, "error");
      throw error;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Coalesce with automatic key generation
   */
  async coalesceAuto<T>(fetcher: () => Promise<T>, ...args: any[]): Promise<T> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(args) : this.generateKey(args);

    return this.coalesce(key, fetcher);
  }

  /**
   * Generate cache key from arguments
   */
  private generateKey(args: any[]): string {
    return JSON.stringify(args);
  }

  /**
   * Update key-specific metrics
   */
  private updateKeyMetrics(
    key: string,
    type: "request" | "coalesce" | "success" | "error",
    responseTime?: number
  ): void {
    if (!this.config.enableMetrics) return;

    let metrics = this.keyMetrics.get(key);
    if (!metrics) {
      metrics = {
        key,
        hitCount: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        lastUsed: Date.now(),
        errorCount: 0,
      };
      this.keyMetrics.set(key, metrics);
    }

    metrics.lastUsed = Date.now();

    switch (type) {
      case "request":
        metrics.totalRequests++;
        break;
      case "coalesce":
        metrics.hitCount++;
        break;
      case "success":
        if (responseTime !== undefined) {
          metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
        }
        break;
      case "error":
        metrics.errorCount++;
        break;
    }

    // Update memory usage estimate
    this.updateMemoryUsage();
  }

  /**
   * Update coalescing rate calculation
   */
  private updateCoalescingRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.coalescingRate = (this.stats.coalescedRequests / this.stats.totalRequests) * 100;

      this.stats.averageRequestsPerCoalesce =
        this.stats.uniqueRequests > 0 ? this.stats.totalRequests / this.stats.uniqueRequests : 1;
    }
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    const pendingSize = this.pendingRequests.size * 200; // Rough estimate
    const metricsSize = this.keyMetrics.size * 100; // Rough estimate
    this.stats.memoryUsage = pendingSize + metricsSize;
  }

  /**
   * Get coalescing statistics
   */
  getStats(): CoalescingStats {
    this.updateCoalescingRate();
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Get top coalesced keys
   */
  getTopKeys(limit: number = 10): KeyMetrics[] {
    return Array.from(this.keyMetrics.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * Get metrics for specific key
   */
  getKeyMetrics(key: string): KeyMetrics | undefined {
    return this.keyMetrics.get(key);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.stats = {
      totalRequests: 0,
      coalescedRequests: 0,
      uniqueRequests: 0,
      coalescingRate: 0,
      averageRequestsPerCoalesce: 0,
      timeWindowHits: 0,
      memoryUsage: 0,
    };
    this.keyMetrics.clear();
  }

  /**
   * Check if a request is currently pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Cancel pending request
   */
  cancelPending(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Reject all waiting promises
      const error = new Error("Request cancelled");
      pending.resolvers.forEach(({ reject }) => reject(error));
      this.pendingRequests.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CoalescingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Start cleanup interval for old metrics
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, metrics] of this.keyMetrics.entries()) {
      if (now - metrics.lastUsed > maxAge) {
        this.keyMetrics.delete(key);
      }
    }

    // Enforce max concurrent keys limit
    if (this.keyMetrics.size > this.config.maxConcurrentKeys) {
      const entries = Array.from(this.keyMetrics.entries());
      entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

      const toDelete = entries.slice(0, entries.length - this.config.maxConcurrentKeys);
      toDelete.forEach(([key]) => this.keyMetrics.delete(key));
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Destroy coalescer and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Cancel all pending requests
    for (const key of this.pendingRequests.keys()) {
      this.cancelPending(key);
    }

    this.keyMetrics.clear();
  }
}

/**
 * Global request coalescer instance
 */
export let globalCoalescer: RequestCoalescer | null = null;

/**
 * Initialize global coalescer
 */
export function initializeCoalescer(config?: Partial<CoalescingConfig>): RequestCoalescer {
  globalCoalescer = new RequestCoalescer(config);
  return globalCoalescer;
}

/**
 * Helper function for simple coalescing
 */
export async function coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!globalCoalescer) {
    globalCoalescer = new RequestCoalescer();
  }
  return globalCoalescer.coalesce(key, fetcher);
}

/**
 * Create middleware for automatic request coalescing
 */
export function createCoalescingMiddleware(coalescer?: RequestCoalescer) {
  const coalescerInstance = coalescer || globalCoalescer || new RequestCoalescer();

  return <T>(fetcher: (...args: any[]) => Promise<T>) => {
    return async (...args: any[]): Promise<T> => {
      return coalescerInstance.coalesceAuto(() => fetcher(...args), ...args);
    };
  };
}

/**
 * Specialized coalescers for common API patterns
 */
export class APICoalescer {
  private coalescer: RequestCoalescer;

  constructor(config?: Partial<CoalescingConfig>) {
    this.coalescer = new RequestCoalescer({
      timeoutMs: 100, // Longer timeout for API calls
      maxConcurrentKeys: 500,
      ...config,
    });
  }

  /**
   * Coalesce scripture fetching
   */
  async fetchScripture(language: string, reference: string, organization?: string): Promise<any> {
    const key = `scripture:${language}:${reference}:${organization || "uw"}`;

    return this.coalescer.coalesce(key, async () => {
      // This would call the actual DCS API
      return {
        language,
        reference,
        organization,
        text: "Coalesced scripture text",
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * Coalesce translation notes fetching
   */
  async fetchTranslationNotes(
    language: string,
    reference: string,
    organization?: string
  ): Promise<any> {
    const key = `notes:${language}:${reference}:${organization || "uw"}`;

    return this.coalescer.coalesce(key, async () => {
      return {
        language,
        reference,
        organization,
        notes: ["Coalesced note 1", "Coalesced note 2"],
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * Coalesce catalog queries
   */
  async getCatalog(language?: string, subject?: string): Promise<any> {
    const key = `catalog:${language || "all"}:${subject || "all"}`;

    return this.coalescer.coalesce(key, async () => {
      return {
        language,
        subject,
        resources: ["Coalesced resource 1", "Coalesced resource 2"],
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * Get coalescer statistics
   */
  getStats(): CoalescingStats {
    return this.coalescer.getStats();
  }

  /**
   * Get top coalesced endpoints
   */
  getTopEndpoints(limit?: number): KeyMetrics[] {
    return this.coalescer.getTopKeys(limit);
  }
}

/**
 * Export types
 */
export type { CoalescingConfig, CoalescingStats, KeyMetrics, PendingRequest };
