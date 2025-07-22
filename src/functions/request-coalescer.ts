/**
 * Request Coalescing System
 * 
 * Combines multiple identical requests into a single upstream call to reduce load
 * and improve performance when multiple users request the same resource simultaneously.
 * 
 * Based on Task 11 of the implementation plan.
 */

import { ErrorCode } from '../constants/terminology';

export interface CoalescerOptions {
  maxWaitTime: number; // Maximum time to wait for additional requests (ms)
  maxBatchSize: number; // Maximum number of requests to batch together
  keyGenerator: (args: any) => string; // Function to generate cache key
  deduplicate: boolean; // Whether to deduplicate identical requests
}

export interface PendingRequest<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  requestId: string;
}

export interface CoalescingStats {
  totalRequests: number;
  coalescedRequests: number;
  upstreamCalls: number;
  averageWaitTime: number;
  coalescingRatio: number; // Percentage of requests that were coalesced
  errorRate: number;
}

export class RequestCoalescer<T> {
  private pendingRequests = new Map<string, PendingRequest<T>[]>();
  private activeRequests = new Map<string, Promise<T>>();
  private stats: CoalescingStats = {
    totalRequests: 0,
    coalescedRequests: 0,
    upstreamCalls: 0,
    averageWaitTime: 0,
    coalescingRatio: 0,
    errorRate: 0
  };
  private options: CoalescerOptions;

  constructor(options: Partial<CoalescerOptions> = {}) {
    this.options = {
      maxWaitTime: 100, // 100ms default
      maxBatchSize: 10,
      keyGenerator: (args) => JSON.stringify(args),
      deduplicate: true,
      ...options
    };
  }

  /**
   * Coalesce requests with the same key
   */
  async coalesce<Args>(
    key: string,
    fetcher: (args: Args) => Promise<T>,
    args: Args
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    this.stats.totalRequests++;

    // Check if there's already an active request for this key
    const activeRequest = this.activeRequests.get(key);
    if (activeRequest) {
      this.stats.coalescedRequests++;
      
      try {
        const result = await activeRequest;
        this.updateWaitTime(startTime);
        return result;
      } catch (error) {
        this.stats.errorRate = this.calculateErrorRate();
        throw error;
      }
    }

    // Check if there are pending requests for this key
    const pendingList = this.pendingRequests.get(key);
    if (pendingList && pendingList.length > 0) {
      // Add this request to the pending list
      return this.addToPendingList(key, requestId, startTime);
    }

    // No existing requests - create new request and start coalescing window
    return this.createNewRequest(key, fetcher, args, requestId, startTime);
  }

  /**
   * Add request to pending list
   */
  private addToPendingList(key: string, requestId: string, startTime: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const pendingRequest: PendingRequest<T> = {
        promise: Promise.resolve({} as T), // Placeholder
        resolve,
        reject,
        timestamp: startTime,
        requestId
      };

      const pendingList = this.pendingRequests.get(key) || [];
      pendingList.push(pendingRequest);
      this.pendingRequests.set(key, pendingList);

      this.stats.coalescedRequests++;
    });
  }

  /**
   * Create new request and start coalescing window
   */
  private createNewRequest<Args>(
    key: string,
    fetcher: (args: Args) => Promise<T>,
    args: Args,
    requestId: string,
    startTime: number
  ): Promise<T> {
    // Create the main promise that will handle the actual request
    const mainPromise = new Promise<T>((resolve, reject) => {
      // Start coalescing window
      const pendingList: PendingRequest<T>[] = [{
        promise: Promise.resolve({} as T), // Placeholder
        resolve,
        reject,
        timestamp: startTime,
        requestId
      }];
      
      this.pendingRequests.set(key, pendingList);

      // Wait for coalescing window or max batch size
      setTimeout(async () => {
        await this.executeBatchRequest(key, fetcher, args);
      }, this.options.maxWaitTime);
    });

    // Track active request
    this.activeRequests.set(key, mainPromise);

    // Clean up after completion
    mainPromise
      .finally(() => {
        this.activeRequests.delete(key);
        this.pendingRequests.delete(key);
      });

    return mainPromise;
  }

  /**
   * Execute the batched request
   */
  private async executeBatchRequest<Args>(
    key: string,
    fetcher: (args: Args) => Promise<T>,
    args: Args
  ): Promise<void> {
    const pendingList = this.pendingRequests.get(key);
    if (!pendingList || pendingList.length === 0) {
      return;
    }

    this.stats.upstreamCalls++;

    try {
      // Execute the actual request
      const result = await fetcher(args);
      
      // Resolve all pending requests with the same result
      pendingList.forEach(pending => {
        this.updateWaitTime(pending.timestamp);
        pending.resolve(result);
      });

      // Update coalescing ratio
      this.stats.coalescingRatio = (this.stats.coalescedRequests / this.stats.totalRequests) * 100;

    } catch (error) {
      // Reject all pending requests with the same error
      pendingList.forEach(pending => {
        pending.reject(error as Error);
      });

      this.stats.errorRate = this.calculateErrorRate();
    }
  }

  /**
   * Update average wait time statistics
   */
  private updateWaitTime(startTime: number): void {
    const waitTime = Date.now() - startTime;
    const totalWaitTime = this.stats.averageWaitTime * (this.stats.totalRequests - 1);
    this.stats.averageWaitTime = (totalWaitTime + waitTime) / this.stats.totalRequests;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.stats.upstreamCalls === 0) return 0;
    return (this.stats.errorRate * (this.stats.upstreamCalls - 1) + 1) / this.stats.upstreamCalls;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get coalescing statistics
   */
  getStats(): CoalescingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      coalescedRequests: 0,
      upstreamCalls: 0,
      averageWaitTime: 0,
      coalescingRatio: 0,
      errorRate: 0
    };
  }

  /**
   * Clear all pending requests (useful for shutdown)
   */
  clearPending(): void {
    for (const [key, pendingList] of this.pendingRequests) {
      pendingList.forEach(pending => {
        pending.reject(new Error('Request coalescer is shutting down'));
      });
    }
    this.pendingRequests.clear();
    this.activeRequests.clear();
  }
}

/**
 * Global coalescer instances for different resource types
 */
export const scriptureCoalescer = new RequestCoalescer({
  maxWaitTime: 50, // Shorter wait for scripture (high priority)
  maxBatchSize: 20,
  keyGenerator: (args: any) => `scripture:${args.reference}:${args.language}:${args.translation}`,
  deduplicate: true
});

export const translationNotesCoalescer = new RequestCoalescer({
  maxWaitTime: 100,
  maxBatchSize: 15,
  keyGenerator: (args: any) => `tn:${args.reference}:${args.language}:${args.organization}`,
  deduplicate: true
});

export const translationWordsCoalescer = new RequestCoalescer({
  maxWaitTime: 150, // Longer wait for less time-sensitive requests
  maxBatchSize: 10,
  keyGenerator: (args: any) => `tw:${args.word}:${args.language}:${args.organization}`,
  deduplicate: true
});

export const catalogCoalescer = new RequestCoalescer({
  maxWaitTime: 200,
  maxBatchSize: 5,
  keyGenerator: (args: any) => `catalog:${args.organization || 'default'}:${args.language || 'all'}`,
  deduplicate: true
});

/**
 * Utility function to create a coalesced wrapper for any async function
 */
export function createCoalescedFunction<Args, Result>(
  fetcher: (args: Args) => Promise<Result>,
  options: Partial<CoalescerOptions> = {}
): (args: Args) => Promise<Result> {
  const coalescer = new RequestCoalescer<Result>(options);
  
  return async (args: Args): Promise<Result> => {
    const key = options.keyGenerator ? options.keyGenerator(args) : JSON.stringify(args);
    return coalescer.coalesce(key, fetcher, args);
  };
}

/**
 * Express/Serverless middleware for request coalescing
 */
export function coalescingMiddleware<Args, Result>(
  coalescer: RequestCoalescer<Result>,
  keyExtractor: (req: any) => string,
  fetcher: (args: Args) => Promise<Result>,
  argsExtractor: (req: any) => Args
) {
  return async (req: any, res: any, next: any) => {
    try {
      const key = keyExtractor(req);
      const args = argsExtractor(req);
      
      const result = await coalescer.coalesce(key, fetcher, args);
      
      // Add coalescing headers
      const stats = coalescer.getStats();
      res.setHeader('X-Request-Coalesced', stats.coalescedRequests > 0 ? 'true' : 'false');
      res.setHeader('X-Coalescing-Ratio', `${stats.coalescingRatio.toFixed(2)}%`);
      res.setHeader('X-Upstream-Calls', stats.upstreamCalls.toString());
      
      req.coalescedResult = result;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Health check for coalescing system
 */
export function getCoalescingHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  stats: {
    scripture: CoalescingStats;
    translationNotes: CoalescingStats;
    translationWords: CoalescingStats;
    catalog: CoalescingStats;
  };
  summary: {
    totalRequests: number;
    totalCoalescedRequests: number;
    overallCoalescingRatio: number;
    averageErrorRate: number;
  };
} {
  const scriptureStats = scriptureCoalescer.getStats();
  const tnStats = translationNotesCoalescer.getStats();
  const twStats = translationWordsCoalescer.getStats();
  const catalogStats = catalogCoalescer.getStats();

  const totalRequests = scriptureStats.totalRequests + tnStats.totalRequests + 
                       twStats.totalRequests + catalogStats.totalRequests;
  const totalCoalesced = scriptureStats.coalescedRequests + tnStats.coalescedRequests + 
                        twStats.coalescedRequests + catalogStats.coalescedRequests;
  
  const overallRatio = totalRequests > 0 ? (totalCoalesced / totalRequests) * 100 : 0;
  const avgErrorRate = (scriptureStats.errorRate + tnStats.errorRate + 
                       twStats.errorRate + catalogStats.errorRate) / 4;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (avgErrorRate > 0.05) status = 'degraded'; // > 5% error rate
  if (avgErrorRate > 0.1 || overallRatio < 10) status = 'unhealthy'; // > 10% error rate or poor coalescing

  return {
    status,
    stats: {
      scripture: scriptureStats,
      translationNotes: tnStats,
      translationWords: twStats,
      catalog: catalogStats
    },
    summary: {
      totalRequests,
      totalCoalescedRequests: totalCoalesced,
      overallCoalescingRatio: overallRatio,
      averageErrorRate: avgErrorRate
    }
  };
}
