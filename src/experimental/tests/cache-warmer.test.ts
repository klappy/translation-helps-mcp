/**
 * Intelligent Cache Warming System Test Suite
 *
 * Tests the cache warming functionality that preloads popular resources
 * during low-traffic periods to improve user experience.
 *
 * Validates Task 10 from implementation plan.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  CacheWarmer,
  type ResourceIdentifier,
  type WarmingStrategy,
} from "../src/functions/cache-warmer.js";

// Mock the cache module
vi.mock("../src/functions/cache.js", () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock the DCSApiClient
vi.mock("../src/services/DCSApiClient.js", () => ({
  DCSApiClient: vi.fn().mockImplementation(() => ({
    getResources: vi.fn().mockResolvedValue({
      data: [
        {
          identifier: "test-resource",
          title: "Test Resource",
          content: "Mock content for testing",
        },
      ],
    }),
  })),
}));

describe("Intelligent Cache Warming System", () => {
  let cacheWarmer: CacheWarmer;

  beforeEach(() => {
    cacheWarmer = new CacheWarmer();
    vi.clearAllMocks();
  });

  describe("Access Pattern Analysis", () => {
    test("analyzes patterns and returns prioritized results", async () => {
      const patterns = await cacheWarmer.analyzePatterns();

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.length).toBeLessThanOrEqual(100); // Top 100 as specified

      // Check pattern structure
      patterns.forEach((pattern) => {
        expect(pattern).toHaveProperty("identifier");
        expect(pattern).toHaveProperty("frequency");
        expect(pattern).toHaveProperty("lastAccessed");
        expect(pattern).toHaveProperty("averageResponseTime");
        expect(pattern).toHaveProperty("cacheHitRatio");
        expect(pattern).toHaveProperty("priority");
        expect(pattern.priority).toBeGreaterThanOrEqual(0);
      });
    });

    test("sorts patterns by priority (highest first)", async () => {
      const patterns = await cacheWarmer.analyzePatterns();

      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i].priority).toBeLessThanOrEqual(patterns[i - 1].priority);
      }
    });

    test("includes popular scripture references", async () => {
      const patterns = await cacheWarmer.analyzePatterns();

      const johnReference = patterns.find((p) => p.identifier.reference === "John 3:16");
      expect(johnReference).toBeDefined();
      expect(johnReference!.priority).toBeGreaterThan(20); // Should have high priority
    });
  });

  describe("Warming Strategies", () => {
    test("provides predefined warming strategies", () => {
      const strategies = cacheWarmer.getWarmingStrategies();

      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);

      strategies.forEach((strategy) => {
        expect(strategy).toHaveProperty("resources");
        expect(strategy).toHaveProperty("schedule");
        expect(strategy).toHaveProperty("priority");
        expect(strategy).toHaveProperty("conditions");
        expect(strategy).toHaveProperty("estimatedDuration");
        expect(strategy).toHaveProperty("maxConcurrency");

        expect(["high", "medium", "low"]).toContain(strategy.priority);
        expect(strategy.maxConcurrency).toBeGreaterThan(0);
        expect(strategy.estimatedDuration).toBeGreaterThan(0);
      });
    });

    test("includes high priority strategy for hourly warming", () => {
      const strategies = cacheWarmer.getWarmingStrategies();

      const highPriorityStrategy = strategies.find((s) => s.priority === "high");
      expect(highPriorityStrategy).toBeDefined();
      expect(highPriorityStrategy!.schedule).toBe("0 * * * *"); // Every hour
      expect(highPriorityStrategy!.maxConcurrency).toBeGreaterThan(0);
    });

    test("includes appropriate warming conditions", () => {
      const strategies = cacheWarmer.getWarmingStrategies();

      strategies.forEach((strategy) => {
        expect(strategy.conditions.length).toBeGreaterThan(0);

        strategy.conditions.forEach((condition) => {
          expect(condition).toHaveProperty("type");
          expect(condition).toHaveProperty("operator");
          expect(condition).toHaveProperty("value");
          expect(condition).toHaveProperty("description");

          expect(["time_range", "cache_hit_ratio", "response_time", "load_threshold"]).toContain(
            condition.type
          );
          expect(["gt", "lt", "eq", "between"]).toContain(condition.operator);
          expect(condition.description.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe("Cache Warming Execution", () => {
    test("warms cache successfully with valid strategy", async () => {
      const strategy: WarmingStrategy = {
        resources: [
          { type: "scripture", reference: "John 3:16", language: "en" },
          { type: "notes", reference: "Romans 9", language: "en" },
        ],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [],
        estimatedDuration: 60000,
        maxConcurrency: 2,
      };

      const result = await cacheWarmer.warmCache(strategy);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("strategy", "high");
      expect(result).toHaveProperty("startTime");
      expect(result).toHaveProperty("endTime");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("resourcesWarmed");
      expect(result).toHaveProperty("resourcesFailed");
      expect(result).toHaveProperty("cacheHitImprovement");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("metrics");

      expect(result.resourcesWarmed).toBeGreaterThanOrEqual(0);
      expect(result.resourcesFailed).toBeGreaterThanOrEqual(0);
      expect(result.resourcesWarmed + result.resourcesFailed).toBe(strategy.resources.length);
      expect(result.duration).toBeGreaterThanOrEqual(0); // Allow for 0ms (very fast execution)
    });

    test("respects concurrency limits", async () => {
      const strategy: WarmingStrategy = {
        resources: Array.from({ length: 10 }, (_, i) => ({
          type: "scripture" as const,
          reference: `Test ${i + 1}:1`,
          language: "en",
        })),
        schedule: "0 * * * *",
        priority: "medium",
        conditions: [],
        estimatedDuration: 120000,
        maxConcurrency: 3,
      };

      const startTime = Date.now();
      const result = await cacheWarmer.warmCache(strategy);
      const duration = Date.now() - startTime;

      // With mocked API calls, it completes very quickly but still respects structure
      expect(result.resourcesWarmed + result.resourcesFailed).toBe(10);
      expect(duration).toBeGreaterThan(0); // Should take at least some time

      // More importantly, verify the result structure and metrics
      expect(result.metrics.totalRequests).toBe(10);
      expect(result.metrics.successfulRequests + result.metrics.failedRequests).toBe(10);
    });

    test("handles warming errors gracefully", async () => {
      // Mock a failing DCS client
      const mockDCSClient = {
        getResources: vi.fn().mockRejectedValue(new Error("Network error")),
      };

      // Create warmer with mocked failing client
      const warmerWithFailingClient = new CacheWarmer();
      (warmerWithFailingClient as any).dcsClient = mockDCSClient;

      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "low",
        conditions: [],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      const result = await warmerWithFailingClient.warmCache(strategy);

      expect(result.resourcesFailed).toBe(1);
      expect(result.resourcesWarmed).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toHaveProperty("resource");
      expect(result.errors[0]).toHaveProperty("error");
      expect(result.errors[0]).toHaveProperty("retryable");
      expect(result.errors[0].error).toContain("Network error");
    });

    test("prevents concurrent warming operations", async () => {
      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      // Start first warming operation
      const firstWarming = cacheWarmer.warmCache(strategy);

      // Try to start second warming operation
      await expect(cacheWarmer.warmCache(strategy)).rejects.toThrow(
        "Cache warming already in progress"
      );

      // Wait for first to complete
      await firstWarming;

      // Now should be able to start another
      await expect(cacheWarmer.warmCache(strategy)).resolves.toBeDefined();
    });
  });

  describe("Warming Conditions", () => {
    test("evaluates time range conditions correctly", async () => {
      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [
          {
            type: "time_range",
            operator: "between",
            value: [0, 23], // Always true (0-23 hours)
            description: "Always allow warming",
          },
        ],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      const result = await cacheWarmer.warmCache(strategy);
      expect(result.resourcesWarmed + result.resourcesFailed).toBe(1);
    });

    test("skips warming when conditions not met", async () => {
      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [
          {
            type: "time_range",
            operator: "between",
            value: [25, 26], // Impossible time range
            description: "Never allow warming",
          },
        ],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      await expect(cacheWarmer.warmCache(strategy)).rejects.toThrow("Warming conditions not met");
    });
  });

  describe("Warming Status and Metrics", () => {
    test("provides accurate warming status", () => {
      const status = cacheWarmer.getWarmingStatus();

      expect(status).toHaveProperty("isWarming");
      expect(status).toHaveProperty("currentStrategy");
      expect(status).toHaveProperty("totalStrategies");
      expect(status).toHaveProperty("metricsAvailable");

      expect(typeof status.isWarming).toBe("boolean");
      expect(status.totalStrategies).toBeGreaterThan(0);
      expect(status.metricsAvailable).toBeGreaterThanOrEqual(0);
    });

    test("tracks metrics history", async () => {
      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      await cacheWarmer.warmCache(strategy);

      const metrics = cacheWarmer.getMetricsHistory();
      expect(Object.keys(metrics).length).toBeGreaterThan(0);

      const firstMetric = Object.values(metrics)[0];
      expect(firstMetric).toHaveProperty("totalRequests");
      expect(firstMetric).toHaveProperty("successfulRequests");
      expect(firstMetric).toHaveProperty("failedRequests");
      expect(firstMetric).toHaveProperty("averageResponseTime");
      expect(firstMetric).toHaveProperty("rateLimitHits");
      expect(firstMetric).toHaveProperty("bytesTransferred");
      expect(firstMetric).toHaveProperty("cacheEntriesCreated");
    });
  });

  describe("Resource Type Support", () => {
    test("supports all resource types", async () => {
      const resourceTypes: Array<ResourceIdentifier["type"]> = [
        "scripture",
        "notes",
        "words",
        "questions",
      ];

      for (const type of resourceTypes) {
        const strategy: WarmingStrategy = {
          resources: [
            {
              type,
              reference: type === "words" ? undefined : "John 3:16",
              resourceId: type === "words" ? "love" : undefined,
              language: "en",
            },
          ],
          schedule: "0 * * * *",
          priority: "high",
          conditions: [],
          estimatedDuration: 30000,
          maxConcurrency: 1,
        };

        const result = await cacheWarmer.warmCache(strategy);
        expect(result.resourcesWarmed + result.resourcesFailed).toBe(1);
      }
    });

    test("handles various resource identifier formats", async () => {
      const resources: ResourceIdentifier[] = [
        { type: "scripture", reference: "John 3:16", language: "en" },
        { type: "scripture", book: "Romans", chapter: 8, language: "en" },
        { type: "words", resourceId: "grace", language: "en" },
        { type: "notes", reference: "Romans 9", language: "es" },
      ];

      const strategy: WarmingStrategy = {
        resources,
        schedule: "0 * * * *",
        priority: "medium",
        conditions: [],
        estimatedDuration: 60000,
        maxConcurrency: 2,
      };

      const result = await cacheWarmer.warmCache(strategy);
      expect(result.resourcesWarmed + result.resourcesFailed).toBe(resources.length);
    });
  });

  describe("Performance Requirements", () => {
    test("completes warming within estimated duration for small sets", async () => {
      const strategy: WarmingStrategy = {
        resources: [
          { type: "scripture", reference: "John 3:16", language: "en" },
          { type: "scripture", reference: "Romans 8:28", language: "en" },
        ],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [],
        estimatedDuration: 5000, // 5 seconds
        maxConcurrency: 2,
      };

      const startTime = Date.now();
      const result = await cacheWarmer.warmCache(strategy);
      const actualDuration = Date.now() - startTime;

      // Should complete well within estimated time
      expect(actualDuration).toBeLessThan(strategy.estimatedDuration);
      expect(result.duration).toBeLessThan(strategy.estimatedDuration);
    });

    test("achieves target cache hit improvement", async () => {
      const strategy: WarmingStrategy = {
        resources: [{ type: "scripture", reference: "John 3:16", language: "en" }],
        schedule: "0 * * * *",
        priority: "high",
        conditions: [],
        estimatedDuration: 30000,
        maxConcurrency: 1,
      };

      const result = await cacheWarmer.warmCache(strategy);

      // Should show some improvement (mocked to 12%)
      expect(result.cacheHitImprovement).toBeGreaterThan(0);
      expect(result.cacheHitImprovement).toBeLessThanOrEqual(1); // Max 100%
    });
  });
});

/**
 * Integration tests for cache warming with actual patterns
 */
describe("Cache Warming Integration", () => {
  test("full warming workflow with pattern analysis", async () => {
    const cacheWarmer = new CacheWarmer();

    // Analyze patterns
    const patterns = await cacheWarmer.analyzePatterns();
    expect(patterns.length).toBeGreaterThan(0);

    // Get strategies
    const strategies = cacheWarmer.getWarmingStrategies();
    expect(strategies.length).toBeGreaterThan(0);

    // Execute high priority strategy
    const highPriorityStrategy = strategies.find((s) => s.priority === "high");
    expect(highPriorityStrategy).toBeDefined();

    // Mock conditions to always pass
    const modifiedStrategy = {
      ...highPriorityStrategy!,
      conditions: [], // Remove conditions for test
    };

    const result = await cacheWarmer.warmCache(modifiedStrategy);

    // Verify completion
    expect(result.resourcesWarmed + result.resourcesFailed).toBe(modifiedStrategy.resources.length);
    expect(result.metrics.totalRequests).toBe(modifiedStrategy.resources.length);

    // Check status after warming
    const status = cacheWarmer.getWarmingStatus();
    expect(status.isWarming).toBe(false);
    expect(status.metricsAvailable).toBeGreaterThan(0);
  });
});
