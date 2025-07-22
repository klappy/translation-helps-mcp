/**
 * Request Coalescing System
 *
 * Combines multiple identical requests into a single upstream call to reduce
 * load on external APIs and improve overall system efficiency.
 *
 * Implements Task 11 from the implementation plan
 */

export interface CoalescingOptions {
  maxPendingTime?: number; // Maximum time to keep request pending (ms)
  enableMetrics?: boolean; // Whether to track coalescing metrics
  keyGenerator?: (args: any[]) => string; // Custom key generation function
}

export interface CoalescingMetrics {
  totalRequests: number;
  coalescedRequests: number;
  uniqueRequests: number;
  coalescingRate: number; // Percentage of requests that were coalesced
  averageWaitTime: number; // Average time requests waited for coalesced result
  currentPendingRequests: number;
  errorRate: number;
  timeWindowStats: {
    windowStart: Date;
    windowDuration: number; // milliseconds
    requestsInWindow: number;
    coalescedInWindow: number;
  };
}

export interface PendingRequest<T> {
  promise: Promise<T>;
  startTime: number;
  requestCount: number; // How many requests are sharing this promise
  key: string;
}

export interface CoalescingResult<T> {
  data: T;
  wasCoalesced: boolean;
  waitTime: number;
  requestCount: number; // How many total requests shared this result
}

/**
 * Main Request Coalescer Class
 */
export class RequestCoalescer {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private metrics: CoalescingMetrics;
  private options: Required<CoalescingOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CoalescingOptions = {}) {
    this.options = {
      maxPendingTime: options.maxPendingTime || 30000, // 30 seconds
      enableMetrics: options.enableMetrics ?? true,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
    };

    this.metrics = this.initializeMetrics();

    // Set up cleanup interval to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 5000); // Cleanup every 5 seconds

    console.log("[RequestCoalescer] Initialized with options:", this.options);
  }

  /**
   * Coalesce a request - main public method
   */
  async coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<CoalescingResult<T>> {
    const startTime = Date.now();

    if (this.options.enableMetrics) {
      this.metrics.totalRequests++;
    }

    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    if (existing) {
      // Request is already in progress - coalesce!
      existing.requestCount++;

      if (this.options.enableMetrics) {
        this.metrics.coalescedRequests++;
        this.updateCoalescingRate();
      }

      console.log(
        `[RequestCoalescer] Coalescing request for key: ${key} (${existing.requestCount} total)`
      );

      try {
        const data = await existing.promise;
        const waitTime = Date.now() - startTime;

        if (this.options.enableMetrics) {
          this.updateAverageWaitTime(waitTime);
        }

        return {
          data,
          wasCoalesced: true,
          waitTime,
          requestCount: existing.requestCount,
        };
      } catch (error) {
        if (this.options.enableMetrics) {
          this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.totalRequests;
        }
        throw error;
      }
    }

    // No pending request - create new one
    console.log(`[RequestCoalescer] Creating new request for key: ${key}`);

    const promise = fetcher().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key);
      if (this.options.enableMetrics) {
        this.metrics.currentPendingRequests = this.pendingRequests.size;
      }
    });

    const pendingRequest: PendingRequest<T> = {
      promise,
      startTime,
      requestCount: 1,
      key,
    };

    this.pendingRequests.set(key, pendingRequest);

    if (this.options.enableMetrics) {
      this.metrics.uniqueRequests++;
      this.metrics.currentPendingRequests = this.pendingRequests.size;
      this.updateTimeWindowStats();
    }

    try {
      const data = await promise;
      const waitTime = Date.now() - startTime;

      return {
        data,
        wasCoalesced: false,
        waitTime,
        requestCount: pendingRequest.requestCount,
      };
    } catch (error) {
      if (this.options.enableMetrics) {
        this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.totalRequests;
      }
      throw error;
    }
  }

  /**
   * Coalesce with automatic key generation based on function and arguments
   */
  async coalesceCall<T, Args extends any[]>(
    fn: (...args: Args) => Promise<T>,
    ...args: Args
  ): Promise<CoalescingResult<T>> {
    const key = this.generateKey(fn.name, args);
    return this.coalesce(key, () => fn(...args));
  }

  /**
   * Generate a cache key from function name and arguments
   */
  generateKey(functionName: string, args: any[]): string {
    return this.options.keyGenerator([functionName, ...args]);
  }

  /**
   * Get current coalescing metrics
   */
  getMetrics(): CoalescingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing or periodic reporting)
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      pendingRequests: this.pendingRequests.size,
      totalProcessed: this.metrics.totalRequests,
      coalescingRate: this.metrics.coalescingRate,
      isEnabled: true,
      uptime: Date.now() - this.metrics.timeWindowStats.windowStart.getTime(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Cancel all pending requests
    this.pendingRequests.clear();
    console.log("[RequestCoalescer] Destroyed and cleaned up resources");
  }

  // Private helper methods

  private initializeMetrics(): CoalescingMetrics {
    return {
      totalRequests: 0,
      coalescedRequests: 0,
      uniqueRequests: 0,
      coalescingRate: 0,
      averageWaitTime: 0,
      currentPendingRequests: 0,
      errorRate: 0,
      timeWindowStats: {
        windowStart: new Date(),
        windowDuration: 0,
        requestsInWindow: 0,
        coalescedInWindow: 0,
      },
    };
  }

  private defaultKeyGenerator(args: any[]): string {
    return JSON.stringify(args);
  }

  private updateCoalescingRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.coalescingRate =
        (this.metrics.coalescedRequests / this.metrics.totalRequests) * 100;
    }
  }

  private updateAverageWaitTime(waitTime: number): void {
    const totalWaitTime = this.metrics.averageWaitTime * (this.metrics.totalRequests - 1);
    this.metrics.averageWaitTime = (totalWaitTime + waitTime) / this.metrics.totalRequests;
  }

  private updateTimeWindowStats(): void {
    const now = Date.now();
    const windowStart = this.metrics.timeWindowStats.windowStart.getTime();

    this.metrics.timeWindowStats.windowDuration = now - windowStart;
    this.metrics.timeWindowStats.requestsInWindow = this.metrics.totalRequests;
    this.metrics.timeWindowStats.coalescedInWindow = this.metrics.coalescedRequests;
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.startTime > this.options.maxPendingTime) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`[RequestCoalescer] Cleaning up ${expiredKeys.length} expired requests`);
      expiredKeys.forEach((key) => this.pendingRequests.delete(key));

      if (this.options.enableMetrics) {
        this.metrics.currentPendingRequests = this.pendingRequests.size;
      }
    }
  }
}

/**
 * Higher-order function to add coalescing to any async function
 */
export function withCoalescing<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  coalescer: RequestCoalescer
): T {
  return ((...args: any[]) => {
    return coalescer.coalesceCall(fn, ...args).then((result) => result.data);
  }) as T;
}

/**
 * Decorator for adding coalescing to class methods
 */
export function Coalesceable(coalescer?: RequestCoalescer) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const instanceCoalescer = coalescer || new RequestCoalescer();

    descriptor.value = function (this: any, ...args: any[]) {
      const key = `${this.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      return instanceCoalescer
        .coalesce(key, () => originalMethod.apply(this, args))
        .then((result) => result.data);
    } as T;

    return descriptor;
  };
}

/**
 * Utility functions for common coalescing patterns
 */
export class CoalescingUtils {
  /**
   * Create a coalesced version of fetch for HTTP requests
   */
  static createCoalescedFetch(coalescer: RequestCoalescer) {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      const key = `fetch:${url}:${JSON.stringify(options || {})}`;
      const result = await coalescer.coalesce(key, () => fetch(url, options));
      return result.data;
    };
  }

  /**
   * Create key for scripture references
   */
  static scriptureKey(reference: string, language: string, version: string): string {
    return `scripture:${language}:${version}:${reference}`;
  }

  /**
   * Create key for translation resources
   */
  static resourceKey(type: string, language: string, reference?: string): string {
    const parts = ["resource", type, language];
    if (reference) parts.push(reference);
    return parts.join(":");
  }

  /**
   * Create key for catalog queries
   */
  static catalogKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `catalog:${sortedParams}`;
  }
}

// Export a default instance for convenience
export const defaultCoalescer = new RequestCoalescer({
  maxPendingTime: 30000,
  enableMetrics: true,
});

// Export middleware for platform handlers
export function createCoalescingMiddleware(coalescer: RequestCoalescer = defaultCoalescer) {
  return function coalescingMiddleware<T extends (...args: any[]) => Promise<any>>(
    handler: T,
    keyGenerator?: (args: any[]) => string
  ): T {
    return ((...args: any[]) => {
      const key = keyGenerator ? keyGenerator(args) : JSON.stringify(args);
      return coalescer.coalesce(key, () => handler(...args)).then((result) => result.data);
    }) as T;
  };
}
