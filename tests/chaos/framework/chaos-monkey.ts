/**
 * Chaos Engineering Framework
 *
 * Provides controlled failure injection for testing system resilience.
 * Validates graceful degradation and automatic recovery capabilities.
 *
 * Implements Task 15 from implementation plan - Chaos Engineering Tests
 */

export interface ChaosConfig {
  duration: number;
  intensity: number;
  target: string;
  metadata?: Record<string, any>;
}

export interface ChaosResult {
  id: string;
  type: ChaosType;
  config: ChaosConfig;
  startTime: number;
  endTime?: number;
  status: "active" | "completed" | "failed";
  metrics: ChaosMetrics;
}

export interface ChaosMetrics {
  requestsAffected: number;
  errorRate: number;
  responseTimeIncrease: number;
  cacheHitRate: number;
  recoveryTime?: number;
}

export enum ChaosType {
  DCS_TIMEOUT = "dcs-timeout",
  DCS_UNAVAILABLE = "dcs-unavailable",
  CACHE_FAILURE = "cache-failure",
  NETWORK_PARTITION = "network-partition",
  SLOW_RESPONSE = "slow-response",
  INVALID_DATA = "invalid-data",
  MEMORY_PRESSURE = "memory-pressure",
  RATE_LIMIT_OVERFLOW = "rate-limit-overflow",
}

export class ChaosMonkey {
  private activeExperiments: Map<string, ChaosResult> = new Map();
  private originalFetch: typeof fetch;
  private metricsCollector: ChaosMetricsCollector;

  constructor() {
    this.originalFetch = global.fetch;
    this.metricsCollector = new ChaosMetricsCollector();
  }

  /**
   * Inject controlled failure into system
   */
  async inject(type: ChaosType, config: ChaosConfig): Promise<string> {
    const experimentId = `chaos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const experiment: ChaosResult = {
      id: experimentId,
      type,
      config,
      startTime: Date.now(),
      status: "active",
      metrics: {
        requestsAffected: 0,
        errorRate: 0,
        responseTimeIncrease: 0,
        cacheHitRate: 0,
      },
    };

    this.activeExperiments.set(experimentId, experiment);

    console.log(`🐒 Chaos Monkey: Injecting ${type} for ${config.duration}ms`);

    // Apply the chaos injection
    await this.applyChaosByType(type, config, experimentId);

    // Auto-cleanup after duration
    setTimeout(() => {
      this.cleanup(experimentId);
    }, config.duration);

    return experimentId;
  }

  /**
   * Stop specific chaos experiment
   */
  async cleanup(experimentId: string): Promise<void> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return;

    experiment.endTime = Date.now();
    experiment.status = "completed";

    // Calculate recovery time
    const recoveryStartTime = Date.now();
    await this.waitForRecovery();
    experiment.metrics.recoveryTime = Date.now() - recoveryStartTime;

    console.log(`🐒 Chaos Monkey: Cleaned up ${experiment.type} (${experimentId})`);

    // Remove chaos injection
    this.removeChaosInjection(experiment.type);

    this.activeExperiments.delete(experimentId);
  }

  /**
   * Stop all active chaos experiments
   */
  async cleanupAll(): Promise<void> {
    const activeIds = Array.from(this.activeExperiments.keys());

    for (const id of activeIds) {
      await this.cleanup(id);
    }

    // Restore original fetch
    global.fetch = this.originalFetch;

    console.log("🐒 Chaos Monkey: All experiments cleaned up");
  }

  /**
   * Get metrics for specific experiment
   */
  getMetrics(experimentId: string): ChaosMetrics | null {
    const experiment = this.activeExperiments.get(experimentId);
    return experiment ? experiment.metrics : null;
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): ChaosResult[] {
    return Array.from(this.activeExperiments.values());
  }

  private async applyChaosByType(
    type: ChaosType,
    config: ChaosConfig,
    experimentId: string
  ): Promise<void> {
    switch (type) {
      case ChaosType.DCS_TIMEOUT:
        await this.injectDcsTimeout(config, experimentId);
        break;
      case ChaosType.DCS_UNAVAILABLE:
        await this.injectDcsUnavailable(config, experimentId);
        break;
      case ChaosType.CACHE_FAILURE:
        await this.injectCacheFailure(config, experimentId);
        break;
      case ChaosType.NETWORK_PARTITION:
        await this.injectNetworkPartition(config, experimentId);
        break;
      case ChaosType.SLOW_RESPONSE:
        await this.injectSlowResponse(config, experimentId);
        break;
      case ChaosType.INVALID_DATA:
        await this.injectInvalidData(config, experimentId);
        break;
      default:
        throw new Error(`Unknown chaos type: ${type}`);
    }
  }

  private async injectDcsTimeout(config: ChaosConfig, experimentId: string): Promise<void> {
    // Mock fetch to simulate DCS API timeouts
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();

      if (url.includes("content.bibletranslationtools.org") || url.includes("git.door43.org")) {
        // Simulate timeout by hanging for duration then throwing
        await new Promise((resolve) => setTimeout(resolve, 30000));
        throw new Error("Request timeout - DCS API unavailable");
      }

      return this.originalFetch(input, init);
    };
  }

  private async injectDcsUnavailable(config: ChaosConfig, experimentId: string): Promise<void> {
    // Mock fetch to simulate DCS API returning 503
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();

      if (url.includes("content.bibletranslationtools.org") || url.includes("git.door43.org")) {
        // Simulate service unavailable
        if (Math.random() < config.intensity) {
          return new Response("Service Unavailable", {
            status: 503,
            statusText: "Service Unavailable",
          });
        }
      }

      return this.originalFetch(input, init);
    };
  }

  private async injectCacheFailure(config: ChaosConfig, experimentId: string): Promise<void> {
    // This would integrate with actual cache implementation
    // For now, simulate by forcing cache misses
    console.log("🐒 Simulating cache layer failure - all requests will bypass cache");

    // Mock cache responses to always miss
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await this.originalFetch(input, init);

      // Remove cache headers to simulate cache failure
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      newResponse.headers.delete("cache-control");
      newResponse.headers.delete("etag");
      newResponse.headers.set("x-cache-status", "CACHE_FAILURE");

      return newResponse;
    };
  }

  private async injectNetworkPartition(config: ChaosConfig, experimentId: string): Promise<void> {
    // Simulate intermittent network connectivity
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Random network failures based on intensity
      if (Math.random() < config.intensity) {
        throw new Error("Network Error: Connection failed");
      }

      return this.originalFetch(input, init);
    };
  }

  private async injectSlowResponse(config: ChaosConfig, experimentId: string): Promise<void> {
    // Add artificial delays to responses
    const delayMs = config.metadata?.delay || 5000;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Add delay before request
      if (Math.random() < config.intensity) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      return this.originalFetch(input, init);
    };
  }

  private async injectInvalidData(config: ChaosConfig, experimentId: string): Promise<void> {
    // Return corrupted or invalid JSON responses
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await this.originalFetch(input, init);

      if (Math.random() < config.intensity) {
        // Return corrupted JSON
        const corruptedData = '{"invalid": "json" missing bracket';
        return new Response(corruptedData, {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      }

      return response;
    };
  }

  private removeChaosInjection(type: ChaosType): void {
    // Restore original fetch function
    global.fetch = this.originalFetch;
  }

  private async waitForRecovery(): Promise<void> {
    // Test system recovery by making a simple request
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          console.log(`🐒 System recovered after ${attempts + 1} attempts`);
          return;
        }
      } catch (error) {
        // Continue trying
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.warn("🐒 System may not have fully recovered");
  }
}

/**
 * Metrics collection for chaos experiments
 */
class ChaosMetricsCollector {
  private metrics: Map<string, any[]> = new Map();

  recordRequest(experimentId: string, success: boolean, responseTime: number): void {
    if (!this.metrics.has(experimentId)) {
      this.metrics.set(experimentId, []);
    }

    this.metrics.get(experimentId)!.push({
      timestamp: Date.now(),
      success,
      responseTime,
    });
  }

  getMetrics(experimentId: string): ChaosMetrics {
    const data = this.metrics.get(experimentId) || [];
    const totalRequests = data.length;
    const failedRequests = data.filter((d) => !d.success).length;
    const avgResponseTime = data.reduce((sum, d) => sum + d.responseTime, 0) / totalRequests || 0;

    return {
      requestsAffected: totalRequests,
      errorRate: failedRequests / totalRequests,
      responseTimeIncrease: avgResponseTime,
      cacheHitRate: 0, // Would be calculated from actual cache metrics
    };
  }
}

// Global chaos monkey instance
export const chaosMonkey = new ChaosMonkey();

// Cleanup on process exit
process.on("exit", () => {
  chaosMonkey.cleanupAll();
});

process.on("SIGINT", () => {
  chaosMonkey.cleanupAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  chaosMonkey.cleanupAll();
  process.exit(0);
});
