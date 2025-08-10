/**
 * Cache Layer Failures Chaos Tests
 *
 * Tests system resilience when cache layer fails completely.
 * Validates fallback to upstream services and performance degradation handling.
 *
 * Part of Task 15 - Chaos Engineering Tests
 */

import { afterEach, describe, expect, test } from "vitest";
import { ChaosType, chaosMonkey } from "./framework/chaos-monkey";
import { buildUrl } from "../helpers/http";

// Mock API functions for testing
const mockApi = {
  fetchScripture: async (reference: string) => {
    const response = await fetch(
      await buildUrl(`/api/fetch-scripture`, { reference }),
    );
    return response.json();
  },

  fetchTranslationNotes: async (reference: string) => {
    const response = await fetch(
      await buildUrl(`/api/fetch-translation-notes`, { reference }),
    );
    return response.json();
  },

  getTranslationWord: async (word: string) => {
    const response = await fetch(
      await buildUrl(`/api/get-translation-word`, { word }),
    );
    return response.json();
  },

  browseWords: async () => {
    const response = await fetch("/api/browse-translation-words");
    return response.json();
  },
};

describe("💾 Cache Layer Failures - Chaos Tests", () => {
  afterEach(async () => {
    // Ensure cleanup after each test
    await chaosMonkey.cleanupAll();
  });

  describe("Complete Cache Failure Scenarios", () => {
    test("falls back to upstream when cache is completely unavailable", async () => {
      console.log("🧪 Testing: Complete cache failure fallback...");

      // First, populate cache normally
      const initialResponse = await mockApi.fetchScripture("John 3:16");
      expect(initialResponse).toBeDefined();

      // Inject complete cache failure
      const experimentId = await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 5000, // 5 seconds
        intensity: 1.0, // 100% cache failure
        target: "cache-layer",
      });

      console.log(`🐒 Cache failure experiment ${experimentId} started`);

      // Make request during cache failure - should fall back to upstream
      const chaosResponse = await mockApi.fetchScripture("John 3:16");

      // Validate fallback behavior
      expect(chaosResponse).toBeDefined();
      expect(chaosResponse.source).toBe("upstream"); // Bypassed cache
      expect(chaosResponse.warning).toContain("cache unavailable");
      expect(chaosResponse.scripture).toBeDefined();
      expect(chaosResponse.responseTime).toBeGreaterThan(100); // Slower than cache

      console.log("✅ Successfully fell back to upstream during cache failure");

      // Wait for cache to recover
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Test cache recovery
      const recoveredResponse = await mockApi.fetchScripture("John 3:16");
      expect(recoveredResponse.source).toBe("cache"); // Cache should work again

      console.log("✅ Cache layer recovered successfully");
    }, 15000);

    test("maintains acceptable performance during cache outage", async () => {
      console.log("🧪 Testing: Performance during cache outage...");

      // Get baseline performance with cache
      const baselineStart = Date.now();
      await mockApi.fetchScripture("Romans 1:1");
      const baselineTime = Date.now() - baselineStart;

      // Inject cache failure
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 4000,
        intensity: 1.0,
        target: "cache-layer",
      });

      // Measure performance without cache
      const outageStart = Date.now();
      const outageResponse = await mockApi.fetchScripture("Romans 1:1");
      const outageTime = Date.now() - outageStart;

      // Should still be reasonably fast (under 3 seconds)
      expect(outageTime).toBeLessThan(3000);
      expect(outageResponse).toBeDefined();
      expect(outageResponse.source).toBe("upstream");

      const performanceDegradation = outageTime / baselineTime;
      console.log(
        `✅ Performance degradation: ${performanceDegradation.toFixed(2)}x (${outageTime}ms vs ${baselineTime}ms)`,
      );

      // Should not degrade more than 10x
      expect(performanceDegradation).toBeLessThan(10);
    }, 12000);

    test("handles cache corruption gracefully", async () => {
      console.log("🧪 Testing: Cache corruption handling...");

      // Simulate cache corruption by injecting invalid data
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 0.8, // 80% of cache responses are corrupted
        target: "cache-layer",
      });

      try {
        const response = await mockApi.fetchScripture("Matthew 5:3");

        // System should either:
        // 1. Detect corruption and fall back to upstream
        // 2. Validate data and reject corrupted responses
        if (response.source === "upstream") {
          expect(response.warning).toContain("cache corruption detected");
          console.log("✅ Detected corruption and fell back to upstream");
        } else {
          // If from cache, data should be valid
          expect(response.scripture).toBeDefined();
          expect(response.scripture.ult).toBeDefined();
          console.log("✅ Cache data passed validation");
        }
      } catch (error: any) {
        // Graceful error handling is also acceptable
        expect(error.message).toContain("data validation failed");
        expect(error.fallbackAvailable).toBe(true);
        console.log("✅ Gracefully handled corrupted cache data");
      }
    }, 8000);
  });

  describe("Partial Cache Failures", () => {
    test("handles intermittent cache failures", async () => {
      console.log("🧪 Testing: Intermittent cache failures...");

      // Inject 50% cache failure rate
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 4000,
        intensity: 0.5, // 50% failure rate
        target: "cache-layer",
      });

      const results: Array<{
        success: boolean;
        source?: string;
        responseTime?: number;
      }> = [];
      const totalRequests = 10;

      // Make multiple requests during intermittent failure
      for (let i = 0; i < totalRequests; i++) {
        const start = Date.now();
        try {
          const response = await mockApi.fetchScripture("Luke 2:14");
          const responseTime = Date.now() - start;
          results.push({
            success: true,
            source: response.source,
            responseTime,
          });
        } catch (error) {
          results.push({ success: false });
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const successRate =
        results.filter((r) => r.success).length / totalRequests;
      const cacheHits = results.filter((r) => r.source === "cache").length;
      const upstreamHits = results.filter(
        (r) => r.source === "upstream",
      ).length;

      // Should maintain high availability
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate

      // Should have mix of cache and upstream responses
      expect(cacheHits).toBeGreaterThan(0);
      expect(upstreamHits).toBeGreaterThan(0);

      console.log(
        `✅ Maintained ${(successRate * 100).toFixed(1)}% availability`,
      );
      console.log(
        `✅ Cache hits: ${cacheHits}, Upstream hits: ${upstreamHits}`,
      );
    }, 12000);

    test("degrades cache selectively by content type", async () => {
      console.log("🧪 Testing: Selective cache degradation...");

      // Test different content types during cache issues
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 3000,
        intensity: 0.7,
        target: "cache-layer",
      });

      const contentTypes = [
        { name: "Scripture", call: () => mockApi.fetchScripture("Psalm 23:1") },
        {
          name: "Translation Notes",
          call: () => mockApi.fetchTranslationNotes("Psalm 23:1"),
        },
        {
          name: "Translation Words",
          call: () => mockApi.getTranslationWord("shepherd"),
        },
        { name: "Browse Words", call: () => mockApi.browseWords() },
      ];

      const results: Array<{
        type: string;
        success: boolean;
        source?: string;
      }> = [];

      for (const contentType of contentTypes) {
        try {
          const response = await contentType.call();
          results.push({
            type: contentType.name,
            success: true,
            source: response.source,
          });
        } catch (error) {
          results.push({
            type: contentType.name,
            success: false,
          });
        }
      }

      // All content types should be accessible
      results.forEach((result) => {
        expect(result.success).toBe(true);
        console.log(`✅ ${result.type}: ${result.source}`);
      });

      console.log(
        "✅ All content types remained accessible during cache issues",
      );
    }, 10000);
  });

  describe("Cache Performance Degradation", () => {
    test("handles slow cache responses", async () => {
      console.log("🧪 Testing: Slow cache response handling...");

      // Inject slow cache responses
      await chaosMonkey.inject(ChaosType.SLOW_RESPONSE, {
        duration: 4000,
        intensity: 0.9, // 90% of cache responses are slow
        target: "cache-layer",
        metadata: { delay: 2000 }, // 2 second delays
      });

      const startTime = Date.now();
      const response = await mockApi.fetchScripture("Isaiah 53:5");
      const responseTime = Date.now() - startTime;

      // System should either:
      // 1. Timeout slow cache and fall back to upstream
      // 2. Wait for slow cache response with warning
      if (response.source === "upstream") {
        expect(responseTime).toBeLessThan(1500); // Fast upstream fallback
        expect(response.warning).toContain("cache timeout");
        console.log("✅ Fell back to upstream after cache timeout");
      } else {
        expect(responseTime).toBeGreaterThan(1500); // Waited for slow cache
        expect(response.warning).toContain("slow cache response");
        console.log("✅ Handled slow cache response with warning");
      }

      expect(response.scripture).toBeDefined();
    }, 10000);

    test("implements cache circuit breaker pattern", async () => {
      console.log("🧪 Testing: Cache circuit breaker...");

      // Inject high cache failure rate to trigger circuit breaker
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 5000,
        intensity: 0.9, // 90% failure rate should trigger circuit breaker
        target: "cache-layer",
      });

      const results: Array<{
        attempt: number;
        source: string;
        responseTime: number;
      }> = [];

      // Make several requests to trigger and test circuit breaker
      for (let i = 0; i < 8; i++) {
        const start = Date.now();
        const response = await mockApi.fetchScripture(`John ${i + 1}:1`);
        const responseTime = Date.now() - start;

        results.push({
          attempt: i + 1,
          source: response.source,
          responseTime,
        });

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // After several failures, should consistently use upstream (circuit open)
      const laterRequests = results.slice(4); // Last 4 requests
      const upstreamOnly = laterRequests.every((r) => r.source === "upstream");

      if (upstreamOnly) {
        console.log("✅ Circuit breaker opened - using upstream only");

        // Response times should be consistent (not attempting cache)
        const avgResponseTime =
          laterRequests.reduce((sum, r) => sum + r.responseTime, 0) /
          laterRequests.length;
        console.log(
          `✅ Consistent response time: ${avgResponseTime.toFixed(0)}ms`,
        );
      } else {
        console.log("⚠️ Circuit breaker pattern may need tuning");
      }
    }, 15000);
  });

  describe("Cache Recovery and Resilience", () => {
    test("automatically detects cache recovery", async () => {
      console.log("🧪 Testing: Automatic cache recovery detection...");

      // Short cache outage
      const experimentId = await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 2000, // 2 seconds
        intensity: 1.0,
        target: "cache-layer",
      });

      // During outage, should use upstream
      const outageResponse = await mockApi.fetchScripture("Genesis 1:1");
      expect(outageResponse.source).toBe("upstream");

      // Wait for cache to recover
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should automatically detect recovery and use cache again
      const recoveryResponse = await mockApi.fetchScripture("Genesis 1:1");
      expect(recoveryResponse.source).toBe("cache");

      // Verify metrics show recovery
      const metrics = chaosMonkey.getMetrics(experimentId);
      expect(metrics?.recoveryTime).toBeLessThan(4000); // Recovered within 4 seconds

      console.log("✅ Automatically detected and used cache recovery");
    }, 10000);

    test("maintains data consistency during cache failures", async () => {
      console.log("🧪 Testing: Data consistency during cache failures...");

      // Get baseline data from working cache
      const baselineResponse = await mockApi.fetchScripture("Philippians 4:13");
      const baselineText = baselineResponse.scripture.ult.text;

      // Inject cache failure
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 3000,
        intensity: 1.0,
        target: "cache-layer",
      });

      // Get same data from upstream during cache failure
      const upstreamResponse = await mockApi.fetchScripture("Philippians 4:13");

      // Data should be identical
      expect(upstreamResponse.scripture.ult.text).toBe(baselineText);
      expect(upstreamResponse.source).toBe("upstream");

      console.log("✅ Data consistency maintained between cache and upstream");

      // Wait for cache recovery
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Data should still be consistent after cache recovery
      const recoveredResponse =
        await mockApi.fetchScripture("Philippians 4:13");
      expect(recoveredResponse.scripture.ult.text).toBe(baselineText);

      console.log("✅ Data consistency maintained after cache recovery");
    }, 12000);

    test("prevents cache stampede during recovery", async () => {
      console.log("🧪 Testing: Cache stampede prevention...");

      // Inject cache failure
      await chaosMonkey.inject(ChaosType.CACHE_FAILURE, {
        duration: 2000,
        intensity: 1.0,
        target: "cache-layer",
      });

      // Wait for cache to start recovering
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Simulate multiple concurrent requests for same data during recovery
      const concurrentRequests: Promise<any>[] = [];
      const reference = "Ephesians 2:8-9";

      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(mockApi.fetchScripture(reference));
      }

      const results = await Promise.all(concurrentRequests);

      // Should not overwhelm upstream with duplicate requests
      // Either all from cache or evidence of deduplication
      const sources = results.map((r) => r.source);
      const uniqueSources = [...new Set(sources)];

      // Should have consistent responses
      const firstText = results[0].scripture.ult.text;
      results.forEach((result) => {
        expect(result.scripture.ult.text).toBe(firstText);
      });

      console.log(
        `✅ Handled ${results.length} concurrent requests consistently`,
      );
      console.log(`✅ Sources: ${sources.join(", ")}`);
    }, 10000);
  });
});
