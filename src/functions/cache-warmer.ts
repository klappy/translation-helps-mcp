/**
 * Intelligent Cache Warming System
 *
 * Preloads frequently accessed resources during low-traffic periods
 * to ensure optimal cache hit ratios and minimize cold cache misses.
 *
 * Based on Task 10 of the implementation plan
 * Created for Performance Optimization (Phase 4)
 */

import type { PlatformHandler } from "./platform-adapter.js";

/**
 * Resource identifier for cache warming
 */
interface ResourceIdentifier {
  endpoint: string;
  language: string;
  reference?: string;
  organization?: string;
  resourceType?: string;
}

/**
 * Access pattern analysis data
 */
interface AccessPattern {
  resource: ResourceIdentifier;
  accessCount: number;
  lastAccessed: string;
  averageResponseTime: number;
  priority: "high" | "medium" | "low";
  timeDistribution: {
    hour: number;
    count: number;
  }[];
  seasonality: {
    dayOfWeek: number;
    factor: number;
  }[];
}

/**
 * Cache warming strategy configuration
 */
interface WarmingStrategy {
  resources: ResourceIdentifier[];
  schedule: CronExpression;
  priority: "high" | "medium" | "low";
  conditions: WarmingCondition[];
  maxConcurrency: number;
  rateLimitRespectMs: number;
}

/**
 * Cron expression for scheduling
 */
interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

/**
 * Conditions for cache warming
 */
interface WarmingCondition {
  type: "time_range" | "cache_hit_rate" | "load_threshold" | "seasonal";
  operator: "gt" | "lt" | "eq" | "between";
  value: number | number[];
  description: string;
}

/**
 * Cache warming execution result
 */
interface WarmingResult {
  strategyId: string;
  startTime: string;
  endTime: string;
  totalResources: number;
  successfulWarming: number;
  failedWarming: number;
  averageResponseTime: number;
  rateLimitHits: number;
  errors: Array<{ resource: ResourceIdentifier; error: string }>;
  metrics: {
    cacheHitRateImprovement: number;
    estimatedUserBenefit: number; // ms saved
    bandwidthUsed: number; // bytes
  };
}

/**
 * Warming job configuration
 */
interface WarmingJob {
  id: string;
  strategy: WarmingStrategy;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string;
  runCount: number;
  successRate: number;
}

/**
 * Default warming strategies for common patterns
 */
const DEFAULT_STRATEGIES: Record<string, WarmingStrategy> = {
  // High-frequency English resources
  popularEnglish: {
    resources: [
      { endpoint: "/fetch-scripture", language: "en", reference: "John 3:16" },
      { endpoint: "/fetch-scripture", language: "en", reference: "Romans 3:23" },
      { endpoint: "/fetch-scripture", language: "en", reference: "John 14:6" },
      { endpoint: "/fetch-translation-notes", language: "en", reference: "John 3:16" },
      { endpoint: "/fetch-translation-words", language: "en" },
    ],
    schedule: { minute: "0", hour: "*/2", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
    priority: "high",
    maxConcurrency: 5,
    rateLimitRespectMs: 100,
    conditions: [
      {
        type: "cache_hit_rate",
        operator: "lt",
        value: 90,
        description: "Warm when cache hit rate below 90%",
      },
    ],
  },

  // Strategic languages core resources
  strategicLanguages: {
    resources: [
      { endpoint: "/fetch-scripture", language: "es-419" },
      { endpoint: "/fetch-scripture", language: "fr" },
      { endpoint: "/fetch-scripture", language: "pt-br" },
      { endpoint: "/list-available-resources", language: "es-419" },
      { endpoint: "/list-available-resources", language: "fr" },
    ],
    schedule: { minute: "30", hour: "1,13", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
    priority: "medium",
    maxConcurrency: 3,
    rateLimitRespectMs: 200,
    conditions: [
      {
        type: "time_range",
        operator: "between",
        value: [1, 5], // 1-5 AM UTC (low traffic)
        description: "Warm during low traffic hours",
      },
    ],
  },

  // Weekend preparation
  weekendPrep: {
    resources: [
      { endpoint: "/fetch-scripture", language: "en" },
      { endpoint: "/fetch-translation-notes", language: "en" },
      { endpoint: "/fetch-translation-questions", language: "en" },
    ],
    schedule: { minute: "0", hour: "22", dayOfMonth: "*", month: "*", dayOfWeek: "5" }, // Friday 10 PM
    priority: "low",
    maxConcurrency: 2,
    rateLimitRespectMs: 500,
    conditions: [
      {
        type: "seasonal",
        operator: "eq",
        value: 5, // Friday
        description: "Prepare for weekend usage spike",
      },
    ],
  },
};

/**
 * Cache Warmer Class
 */
export class CacheWarmer {
  private accessPatterns: AccessPattern[] = [];
  private warmingJobs: WarmingJob[] = [];
  private isWarming: boolean = false;
  private warmingHistory: WarmingResult[] = [];
  private maxHistoryRetention = 100;

  constructor(
    private cacheAdapter: any, // Use unified cache
    private dcsClient: any, // DCS API client
    private performanceMonitor?: any // Optional performance monitor
  ) {
    this.initializeDefaultJobs();
  }

  /**
   * Initialize default warming jobs
   */
  private initializeDefaultJobs(): void {
    Object.entries(DEFAULT_STRATEGIES).forEach(([id, strategy]) => {
      this.warmingJobs.push({
        id,
        strategy,
        enabled: true,
        lastRun: null,
        nextRun: this.calculateNextRun(strategy.schedule),
        runCount: 0,
        successRate: 0,
      });
    });
  }

  /**
   * Analyze access patterns from logs/metrics
   */
  async analyzePatterns(timeRangeHours: number = 168): Promise<AccessPattern[]> {
    try {
      // Get performance metrics if available
      const stats = this.performanceMonitor?.getStats?.(timeRangeHours);

      if (!stats) {
        console.warn("No performance monitor available for pattern analysis");
        return this.generateDefaultPatterns();
      }

      const patterns: AccessPattern[] = [];

      // Analyze endpoint patterns
      stats.slowestEndpoints?.forEach((endpoint: any) => {
        if (endpoint.count > 10) {
          // Minimum threshold for pattern
          patterns.push({
            resource: {
              endpoint: endpoint.endpoint,
              language: "en", // Default to English for analysis
            },
            accessCount: endpoint.count,
            lastAccessed: new Date().toISOString(),
            averageResponseTime: endpoint.avgTime,
            priority: endpoint.avgTime > 1000 ? "high" : endpoint.avgTime > 500 ? "medium" : "low",
            timeDistribution: this.generateTimeDistribution(),
            seasonality: this.generateSeasonality(),
          });
        }
      });

      // Store patterns for future use
      this.accessPatterns = patterns;
      return patterns;
    } catch (error) {
      console.error("Failed to analyze access patterns:", error);
      return this.generateDefaultPatterns();
    }
  }

  /**
   * Generate default patterns when analysis is unavailable
   */
  private generateDefaultPatterns(): AccessPattern[] {
    return [
      {
        resource: { endpoint: "/fetch-scripture", language: "en" },
        accessCount: 1000,
        lastAccessed: new Date().toISOString(),
        averageResponseTime: 300,
        priority: "high",
        timeDistribution: this.generateTimeDistribution(),
        seasonality: this.generateSeasonality(),
      },
      {
        resource: { endpoint: "/fetch-translation-notes", language: "en" },
        accessCount: 500,
        lastAccessed: new Date().toISOString(),
        averageResponseTime: 450,
        priority: "medium",
        timeDistribution: this.generateTimeDistribution(),
        seasonality: this.generateSeasonality(),
      },
    ];
  }

  /**
   * Generate time distribution data
   */
  private generateTimeDistribution(): Array<{ hour: number; count: number }> {
    const distribution = [];
    for (let hour = 0; hour < 24; hour++) {
      // Simulate higher usage during business hours
      const count =
        hour >= 8 && hour <= 18
          ? Math.floor(Math.random() * 100) + 50
          : Math.floor(Math.random() * 30) + 10;
      distribution.push({ hour, count });
    }
    return distribution;
  }

  /**
   * Generate seasonality data
   */
  private generateSeasonality(): Array<{ dayOfWeek: number; factor: number }> {
    return [
      { dayOfWeek: 0, factor: 0.6 }, // Sunday
      { dayOfWeek: 1, factor: 1.0 }, // Monday
      { dayOfWeek: 2, factor: 1.1 }, // Tuesday
      { dayOfWeek: 3, factor: 1.1 }, // Wednesday
      { dayOfWeek: 4, factor: 1.0 }, // Thursday
      { dayOfWeek: 5, factor: 0.8 }, // Friday
      { dayOfWeek: 6, factor: 0.7 }, // Saturday
    ];
  }

  /**
   * Execute cache warming strategy
   */
  async warmCache(strategy: WarmingStrategy): Promise<WarmingResult> {
    const startTime = new Date().toISOString();
    const result: WarmingResult = {
      strategyId: `warming_${Date.now()}`,
      startTime,
      endTime: "",
      totalResources: strategy.resources.length,
      successfulWarming: 0,
      failedWarming: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      errors: [],
      metrics: {
        cacheHitRateImprovement: 0,
        estimatedUserBenefit: 0,
        bandwidthUsed: 0,
      },
    };

    // Check if warming conditions are met
    if (!(await this.checkWarmingConditions(strategy.conditions))) {
      console.info("Warming conditions not met, skipping");
      result.endTime = new Date().toISOString();
      return result;
    }

    console.info(`Starting cache warming for ${strategy.resources.length} resources`);
    this.isWarming = true;

    const responseTimes: number[] = [];
    let concurrentRequests = 0;

    try {
      // Process resources with concurrency control
      for (const resource of strategy.resources) {
        // Wait if at max concurrency
        while (concurrentRequests >= strategy.maxConcurrency) {
          await this.sleep(50);
        }

        // Rate limiting
        if (strategy.rateLimitRespectMs > 0) {
          await this.sleep(strategy.rateLimitRespectMs);
        }

        concurrentRequests++;

        // Warm resource asynchronously
        this.warmResource(resource)
          .then((responseTime) => {
            result.successfulWarming++;
            responseTimes.push(responseTime);
            result.metrics.bandwidthUsed += 1024; // Estimate
          })
          .catch((error) => {
            result.failedWarming++;
            result.errors.push({ resource, error: error.message });
          })
          .finally(() => {
            concurrentRequests--;
          });
      }

      // Wait for all requests to complete
      while (concurrentRequests > 0) {
        await this.sleep(100);
      }

      // Calculate metrics
      result.averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      result.metrics.estimatedUserBenefit = result.successfulWarming * result.averageResponseTime;
      result.endTime = new Date().toISOString();

      console.info(
        `Cache warming completed: ${result.successfulWarming}/${result.totalResources} successful`
      );
    } catch (error) {
      console.error("Cache warming failed:", error);
      result.errors.push({
        resource: { endpoint: "system", language: "system" },
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      this.isWarming = false;
      this.warmingHistory.push(result);

      // Trim history
      if (this.warmingHistory.length > this.maxHistoryRetention) {
        this.warmingHistory = this.warmingHistory.slice(-this.maxHistoryRetention + 10);
      }
    }

    return result;
  }

  /**
   * Warm individual resource
   */
  private async warmResource(resource: ResourceIdentifier): Promise<number> {
    const startTime = Date.now();

    try {
      // Build cache key
      const cacheKey = this.buildCacheKey(resource);

      // Check if already cached
      const cached = await this.cacheAdapter?.get?.(cacheKey);
      if (cached) {
        return Date.now() - startTime; // Already warm
      }

      // Fetch resource to warm cache
      await this.fetchResource(resource);

      return Date.now() - startTime;
    } catch (error) {
      console.warn(`Failed to warm resource ${resource.endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Fetch resource through appropriate client
   */
  private async fetchResource(resource: ResourceIdentifier): Promise<any> {
    // This would integrate with actual API handlers
    if (resource.endpoint.includes("scripture")) {
      return await this.dcsClient?.getScripture?.(resource.language, resource.reference);
    } else if (resource.endpoint.includes("translation-notes")) {
      return await this.dcsClient?.getTranslationNotes?.(resource.language, resource.reference);
    } else if (resource.endpoint.includes("available-resources")) {
      return await this.dcsClient?.getResources?.(resource.language);
    }

    // Default fallback
    return { warmed: true, timestamp: new Date().toISOString() };
  }

  /**
   * Build cache key for resource
   */
  private buildCacheKey(resource: ResourceIdentifier): string {
    const parts = [
      "api",
      resource.endpoint.replace("/", ""),
      resource.language,
      resource.reference,
      resource.organization,
      resource.resourceType,
    ].filter(Boolean);

    return parts.join(":");
  }

  /**
   * Check if warming conditions are met
   */
  private async checkWarmingConditions(conditions: WarmingCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      if (!(await this.evaluateCondition(condition))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate individual warming condition
   */
  private async evaluateCondition(condition: WarmingCondition): Promise<boolean> {
    const now = new Date();

    switch (condition.type) {
      case "time_range":
        const hour = now.getUTCHours();
        if (condition.operator === "between" && Array.isArray(condition.value)) {
          return hour >= condition.value[0] && hour <= condition.value[1];
        }
        return hour === condition.value;

      case "cache_hit_rate":
        const stats = this.performanceMonitor?.getStats?.(1);
        const hitRate = stats?.cacheHitRate || 0;
        return condition.operator === "lt"
          ? hitRate < condition.value
          : condition.operator === "gt"
            ? hitRate > condition.value
            : hitRate === condition.value;

      case "seasonal":
        const dayOfWeek = now.getUTCDay();
        return dayOfWeek === condition.value;

      case "load_threshold":
        // Could check current system load
        return true; // Default to true for now

      default:
        return true;
    }
  }

  /**
   * Calculate next run time for cron schedule
   */
  private calculateNextRun(schedule: CronExpression): string {
    // Simplified next run calculation (in production, use proper cron library)
    const now = new Date();
    const nextRun = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    return nextRun.toISOString();
  }

  /**
   * Add custom warming strategy
   */
  addWarmingStrategy(id: string, strategy: WarmingStrategy): void {
    const job: WarmingJob = {
      id,
      strategy,
      enabled: true,
      lastRun: null,
      nextRun: this.calculateNextRun(strategy.schedule),
      runCount: 0,
      successRate: 0,
    };

    // Remove existing job with same ID
    this.warmingJobs = this.warmingJobs.filter((j) => j.id !== id);
    this.warmingJobs.push(job);
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): {
    totalJobs: number;
    enabledJobs: number;
    isCurrentlyWarming: boolean;
    lastResults: WarmingResult[];
    averageSuccessRate: number;
  } {
    const enabledJobs = this.warmingJobs.filter((j) => j.enabled);
    const averageSuccessRate =
      this.warmingJobs.reduce((sum, job) => sum + job.successRate, 0) /
      Math.max(this.warmingJobs.length, 1);

    return {
      totalJobs: this.warmingJobs.length,
      enabledJobs: enabledJobs.length,
      isCurrentlyWarming: this.isWarming,
      lastResults: this.warmingHistory.slice(-10),
      averageSuccessRate,
    };
  }

  /**
   * Execute scheduled warming jobs
   */
  async executeScheduledJobs(): Promise<WarmingResult[]> {
    const now = new Date();
    const results: WarmingResult[] = [];

    for (const job of this.warmingJobs) {
      if (!job.enabled) continue;

      if (new Date(job.nextRun) <= now) {
        console.info(`Executing scheduled warming job: ${job.id}`);

        try {
          const result = await this.warmCache(job.strategy);
          results.push(result);

          job.lastRun = now.toISOString();
          job.nextRun = this.calculateNextRun(job.strategy.schedule);
          job.runCount++;
          job.successRate =
            (job.successRate * (job.runCount - 1) + (result.failedWarming === 0 ? 100 : 0)) /
            job.runCount;
        } catch (error) {
          console.error(`Warming job ${job.id} failed:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear warming history
   */
  clearHistory(): void {
    this.warmingHistory = [];
  }

  /**
   * Get access patterns
   */
  getAccessPatterns(): AccessPattern[] {
    return this.accessPatterns;
  }

  /**
   * Enable/disable warming job
   */
  setJobEnabled(jobId: string, enabled: boolean): boolean {
    const job = this.warmingJobs.find((j) => j.id === jobId);
    if (job) {
      job.enabled = enabled;
      return true;
    }
    return false;
  }
}

/**
 * Global cache warmer instance
 */
export let cacheWarmer: CacheWarmer | null = null;

/**
 * Initialize cache warmer with dependencies
 */
export function initializeCacheWarmer(
  cacheAdapter: any,
  dcsClient: any,
  performanceMonitor?: any
): CacheWarmer {
  cacheWarmer = new CacheWarmer(cacheAdapter, dcsClient, performanceMonitor);
  return cacheWarmer;
}

/**
 * Create warming middleware for handlers
 */
export function createWarmingMiddleware() {
  return (handler: PlatformHandler): PlatformHandler => {
    return async (request) => {
      // Execute scheduled warming jobs asynchronously (don't block request)
      if (cacheWarmer && !cacheWarmer.getWarmingStats().isCurrentlyWarming) {
        cacheWarmer.executeScheduledJobs().catch((error) => {
          console.warn("Background cache warming failed:", error);
        });
      }

      return handler(request);
    };
  };
}

/**
 * Export types
 */
export type {
  AccessPattern,
  CronExpression,
  ResourceIdentifier,
  WarmingCondition,
  WarmingJob,
  WarmingResult,
  WarmingStrategy,
};
