/**
 * Performance Monitoring System
 *
 * Comprehensive monitoring of request/response times, bottleneck detection,
 * and performance optimization insights for the Translation Helps Platform.
 *
 * Based on Task 12 of the implementation plan
 * Created for Performance Optimization (Phase 4)
 */

import type { PlatformHandler } from "./platform-adapter.js";

/**
 * Performance metrics for individual requests
 */
interface RequestMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  timestamp: number;
  responseTime: number;
  statusCode: number;
  contentSize: number;
  cacheHit: boolean;
  compressed: boolean;
  userAgent?: string;
  geographic?: string;
}

/**
 * Aggregated performance statistics
 */
interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  compressionRate: number;
  slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
  fastestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
  bottlenecks: Array<{ type: string; description: string; impact: number }>;
  recommendations: string[];
  timeRange: { start: string; end: string };
}

/**
 * Performance alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  responseTimeThreshold: number; // ms
  errorRateThreshold: number; // percentage
  slowEndpointThreshold: number; // ms
  alertCallback?: (alert: PerformanceAlert) => void;
}

/**
 * Performance alert
 */
interface PerformanceAlert {
  type: "slow_response" | "high_error_rate" | "slow_endpoint" | "memory_leak";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  endpoint?: string;
}

/**
 * Performance insights for optimization
 */
interface PerformanceInsights {
  cacheOptimization: {
    missedOpportunities: number;
    potentialSavings: number; // ms
    recommendations: string[];
  };
  compressionOptimization: {
    uncompressedRequests: number;
    potentialBandwidthSavings: number; // bytes
    recommendations: string[];
  };
  endpointOptimization: {
    slowEndpoints: Array<{ endpoint: string; issue: string; recommendation: string }>;
  };
  resourceOptimization: {
    heavyResponses: Array<{ endpoint: string; size: number; recommendation: string }>;
  };
}

/**
 * Default alert configuration
 */
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  responseTimeThreshold: 2000, // 2 seconds
  errorRateThreshold: 5, // 5%
  slowEndpointThreshold: 5000, // 5 seconds
};

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private alertConfig: AlertConfig;
  private maxMetricsHistory: number = 10000; // Keep last 10k requests

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...alertConfig };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract endpoint from URL path
   */
  private extractEndpoint(path: string): string {
    // Normalize path by removing query parameters and dynamic segments
    const cleanPath = path.split("?")[0];

    // Replace common dynamic segments with placeholders
    return cleanPath
      .replace(/\/[a-z]{2,3}\//, "/:language/") // Language codes
      .replace(/\/\d+\//, "/:id/") // Numeric IDs
      .replace(/\/[A-Z]{3}\//, "/:book/") // Book codes
      .replace(/\/\d+(-\d+)?\//, "/:chapter/") // Chapter/verse ranges
      .toLowerCase();
  }

  /**
   * Check if a value is an outlier using IQR method
   */
  private isOutlier(value: number, values: number[]): boolean {
    if (values.length < 4) return false;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;

    return value > q3 + 1.5 * iqr || value < q1 - 1.5 * iqr;
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * Detect performance bottlenecks
   */
  private detectBottlenecks(
    stats: PerformanceStats
  ): Array<{ type: string; description: string; impact: number }> {
    const bottlenecks: Array<{ type: string; description: string; impact: number }> = [];

    // High response times
    if (stats.averageResponseTime > 1000) {
      bottlenecks.push({
        type: "slow_response",
        description: `Average response time is ${stats.averageResponseTime.toFixed(0)}ms (target: <1000ms)`,
        impact: Math.min(10, Math.floor(stats.averageResponseTime / 100)),
      });
    }

    // High error rate
    if (stats.errorRate > 2) {
      bottlenecks.push({
        type: "high_errors",
        description: `Error rate is ${stats.errorRate.toFixed(1)}% (target: <2%)`,
        impact: Math.min(10, Math.floor(stats.errorRate * 2)),
      });
    }

    // Low cache hit rate
    if (stats.cacheHitRate < 60) {
      bottlenecks.push({
        type: "poor_caching",
        description: `Cache hit rate is ${stats.cacheHitRate.toFixed(1)}% (target: >60%)`,
        impact: Math.floor((60 - stats.cacheHitRate) / 10),
      });
    }

    // Low compression rate for large responses
    if (stats.compressionRate < 70) {
      bottlenecks.push({
        type: "poor_compression",
        description: `Compression rate is ${stats.compressionRate.toFixed(1)}% (target: >70%)`,
        impact: Math.floor((70 - stats.compressionRate) / 15),
      });
    }

    // Slow endpoints
    const verySlowEndpoints = stats.slowestEndpoints.filter((ep) => ep.avgTime > 3000);
    if (verySlowEndpoints.length > 0) {
      bottlenecks.push({
        type: "slow_endpoints",
        description: `${verySlowEndpoints.length} endpoints averaging >3s response time`,
        impact: Math.min(10, verySlowEndpoints.length * 2),
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    stats: PerformanceStats,
    insights: PerformanceInsights
  ): string[] {
    const recommendations: string[] = [];

    // Cache recommendations
    if (stats.cacheHitRate < 60) {
      recommendations.push("Increase cache TTL for stable content like scripture texts");
      recommendations.push("Implement cache warming for frequently accessed resources");
    }

    if (insights.cacheOptimization.missedOpportunities > 100) {
      recommendations.push("Add caching for translation helps endpoints");
    }

    // Compression recommendations
    if (stats.compressionRate < 70) {
      recommendations.push("Enable compression for JSON responses >1KB");
      recommendations.push("Use Brotli compression for modern clients");
    }

    // Performance recommendations
    if (stats.averageResponseTime > 1000) {
      recommendations.push("Optimize database queries for resource fetching");
      recommendations.push("Implement response streaming for large content");
    }

    // Endpoint-specific recommendations
    const slowEndpoints = stats.slowestEndpoints.filter((ep) => ep.avgTime > 2000);
    if (slowEndpoints.length > 0) {
      recommendations.push(
        `Optimize slow endpoints: ${slowEndpoints.map((ep) => ep.endpoint).join(", ")}`
      );
    }

    // Error rate recommendations
    if (stats.errorRate > 2) {
      recommendations.push("Implement better error handling and retry logic");
      recommendations.push("Add circuit breakers for external API calls");
    }

    return recommendations;
  }

  /**
   * Generate performance insights
   */
  private generateInsights(): PerformanceInsights {
    const recentMetrics = this.metrics.slice(-1000); // Last 1000 requests

    // Cache optimization insights
    const cacheMisses = recentMetrics.filter((m) => !m.cacheHit).length;
    const avgResponseTimeForMisses =
      recentMetrics.filter((m) => !m.cacheHit).reduce((sum, m) => sum + m.responseTime, 0) /
      Math.max(1, cacheMisses);

    const avgResponseTimeForHits =
      recentMetrics.filter((m) => m.cacheHit).reduce((sum, m) => sum + m.responseTime, 0) /
      Math.max(1, recentMetrics.filter((m) => m.cacheHit).length);

    const potentialCacheSavings =
      cacheMisses * Math.max(0, avgResponseTimeForMisses - avgResponseTimeForHits);

    // Compression optimization insights
    const uncompressedRequests = recentMetrics.filter(
      (m) => !m.compressed && m.contentSize > 1024
    ).length;
    const avgUncompressedSize =
      recentMetrics
        .filter((m) => !m.compressed && m.contentSize > 1024)
        .reduce((sum, m) => sum + m.contentSize, 0) / Math.max(1, uncompressedRequests);

    const potentialBandwidthSavings = uncompressedRequests * avgUncompressedSize * 0.3; // 30% compression

    // Endpoint optimization insights
    const endpointStats = new Map<string, { times: number[]; sizes: number[] }>();

    for (const metric of recentMetrics) {
      if (!endpointStats.has(metric.endpoint)) {
        endpointStats.set(metric.endpoint, { times: [], sizes: [] });
      }
      const stats = endpointStats.get(metric.endpoint)!;
      stats.times.push(metric.responseTime);
      stats.sizes.push(metric.contentSize);
    }

    const slowEndpoints = Array.from(endpointStats.entries())
      .filter(([, stats]) => stats.times.reduce((a, b) => a + b, 0) / stats.times.length > 2000)
      .map(([endpoint, stats]) => ({
        endpoint,
        issue: "Slow average response time",
        recommendation: "Review query optimization and caching strategy",
      }));

    const heavyResponses = Array.from(endpointStats.entries())
      .filter(([, stats]) => stats.sizes.reduce((a, b) => a + b, 0) / stats.sizes.length > 100000) // >100KB
      .map(([endpoint, stats]) => ({
        endpoint,
        size: stats.sizes.reduce((a, b) => a + b, 0) / stats.sizes.length,
        recommendation: "Implement pagination or compression",
      }));

    return {
      cacheOptimization: {
        missedOpportunities: cacheMisses,
        potentialSavings: Math.round(potentialCacheSavings),
        recommendations: [
          "Increase cache TTL for scripture content",
          "Implement cache warming for popular resources",
        ],
      },
      compressionOptimization: {
        uncompressedRequests,
        potentialBandwidthSavings: Math.round(potentialBandwidthSavings),
        recommendations: [
          "Enable compression for responses >1KB",
          "Use Brotli for better compression ratios",
        ],
      },
      endpointOptimization: {
        slowEndpoints,
      },
      resourceOptimization: {
        heavyResponses,
      },
    };
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: RequestMetrics): void {
    if (!this.alertConfig.enabled) return;

    const alerts: PerformanceAlert[] = [];

    // Slow response alert
    if (metrics.responseTime > this.alertConfig.responseTimeThreshold) {
      alerts.push({
        type: "slow_response",
        severity:
          metrics.responseTime > this.alertConfig.responseTimeThreshold * 2 ? "critical" : "high",
        message: `Slow response: ${metrics.responseTime}ms for ${metrics.endpoint}`,
        value: metrics.responseTime,
        threshold: this.alertConfig.responseTimeThreshold,
        timestamp: new Date().toISOString(),
        endpoint: metrics.endpoint,
      });
    }

    // Check recent error rate
    const recentMetrics = this.metrics.slice(-100); // Last 100 requests
    if (recentMetrics.length >= 10) {
      const errorCount = recentMetrics.filter((m) => m.statusCode >= 400).length;
      const errorRate = (errorCount / recentMetrics.length) * 100;

      if (errorRate > this.alertConfig.errorRateThreshold) {
        alerts.push({
          type: "high_error_rate",
          severity: errorRate > this.alertConfig.errorRateThreshold * 2 ? "critical" : "high",
          message: `High error rate: ${errorRate.toFixed(1)}% in last 100 requests`,
          value: errorRate,
          threshold: this.alertConfig.errorRateThreshold,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Trigger alert callbacks
    for (const alert of alerts) {
      if (this.alertConfig.alertCallback) {
        this.alertConfig.alertCallback(alert);
      } else {
        console.warn(`[PerformanceAlert] ${alert.severity.toUpperCase()}: ${alert.message}`);
      }
    }
  }

  /**
   * Record performance metrics for a request
   */
  recordMetrics({
    endpoint,
    method = "GET",
    responseTime,
    statusCode,
    contentSize = 0,
    cacheHit = false,
    compressed = false,
    userAgent,
    geographic,
  }: Omit<RequestMetrics, "requestId" | "timestamp">): void {
    const metrics: RequestMetrics = {
      requestId: this.generateRequestId(),
      endpoint: this.extractEndpoint(endpoint),
      method,
      timestamp: Date.now(),
      responseTime,
      statusCode,
      contentSize,
      cacheHit,
      compressed,
      userAgent,
      geographic,
    };

    // Add to metrics history
    this.metrics.push(metrics);

    // Trim history if too large
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory + 1000);
    }

    // Check for alerts
    this.checkAlerts(metrics);
  }

  /**
   * Get performance statistics
   */
  getStats(timeRangeHours: number = 24): PerformanceStats {
    const cutoffTime = Date.now() - timeRangeHours * 60 * 60 * 1000;
    const relevantMetrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);

    if (relevantMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        compressionRate: 0,
        slowestEndpoints: [],
        fastestEndpoints: [],
        bottlenecks: [],
        recommendations: [],
        timeRange: {
          start: new Date(cutoffTime).toISOString(),
          end: new Date().toISOString(),
        },
      };
    }

    // Calculate basic statistics
    const responseTimes = relevantMetrics.map((m) => m.responseTime).sort((a, b) => a - b);
    const totalRequests = relevantMetrics.length;
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
    const medianResponseTime = this.calculatePercentile(responseTimes, 50);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    const errorCount = relevantMetrics.filter((m) => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    const cacheHits = relevantMetrics.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;

    const compressedRequests = relevantMetrics.filter((m) => m.compressed).length;
    const compressionRate = (compressedRequests / totalRequests) * 100;

    // Calculate endpoint statistics
    const endpointStats = new Map<string, { times: number[]; count: number }>();

    for (const metric of relevantMetrics) {
      if (!endpointStats.has(metric.endpoint)) {
        endpointStats.set(metric.endpoint, { times: [], count: 0 });
      }
      const stats = endpointStats.get(metric.endpoint)!;
      stats.times.push(metric.responseTime);
      stats.count++;
    }

    const endpointAvgTimes = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length),
        count: stats.count,
      }))
      .filter((ep) => ep.count >= 5); // Only include endpoints with at least 5 requests

    const slowestEndpoints = endpointAvgTimes.sort((a, b) => b.avgTime - a.avgTime).slice(0, 10);

    const fastestEndpoints = endpointAvgTimes.sort((a, b) => a.avgTime - b.avgTime).slice(0, 10);

    // Build complete stats object
    const stats: PerformanceStats = {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      medianResponseTime: Math.round(medianResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      errorRate: Math.round(errorRate * 10) / 10,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      compressionRate: Math.round(compressionRate * 10) / 10,
      slowestEndpoints,
      fastestEndpoints,
      bottlenecks: [],
      recommendations: [],
      timeRange: {
        start: new Date(cutoffTime).toISOString(),
        end: new Date().toISOString(),
      },
    };

    // Generate insights and recommendations
    const insights = this.generateInsights();
    stats.bottlenecks = this.detectBottlenecks(stats);
    stats.recommendations = this.generateRecommendations(stats, insights);

    return stats;
  }

  /**
   * Get detailed performance insights
   */
  getInsights(): PerformanceInsights {
    return this.generateInsights();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(newConfig: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newConfig };
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Create middleware to automatically track performance
   */
  createMiddleware(): (handler: PlatformHandler) => PlatformHandler {
    return (handler: PlatformHandler) => {
      return async (context, headers = {}) => {
        const startTime = Date.now();
        let statusCode = 200;
        let contentSize = 0;
        let cacheHit = false;
        let compressed = false;

        try {
          const response = await handler(context, headers);

          statusCode = response.statusCode;
          contentSize = response.body ? Buffer.byteLength(response.body, "utf8") : 0;
          cacheHit = response.headers?.["X-Cache-Status"] === "HIT";
          compressed = !!response.headers?.["Content-Encoding"];

          return response;
        } catch (error) {
          statusCode = 500;
          throw error;
        } finally {
          const responseTime = Date.now() - startTime;

          this.recordMetrics({
            endpoint: context.path || "/unknown",
            method: context.method || "GET",
            responseTime,
            statusCode,
            contentSize,
            cacheHit,
            compressed,
            userAgent: headers["User-Agent"] as string,
            geographic: headers["CF-IPCountry"] as string, // Cloudflare header
          });
        }
      };
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility function to wrap any handler with performance monitoring
 */
export function withPerformanceMonitoring(handler: PlatformHandler): PlatformHandler {
  return performanceMonitor.createMiddleware()(handler);
}

/**
 * Export types for external use
 */
export type {
  AlertConfig,
  PerformanceAlert,
  PerformanceInsights,
  PerformanceStats,
  RequestMetrics,
};
