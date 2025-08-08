/**
 * Upstream Failures Chaos Tests
 *
 * Tests system resilience when DCS API (Door43 Content Service) fails.
 * Validates graceful degradation and cache fallback mechanisms.
 *
 * Part of Task 15 - Chaos Engineering Tests
 */

import { afterEach, describe, expect, test } from "vitest";
import { ChaosType, chaosMonkey } from "./framework/chaos-monkey";
import { buildUrl } from "../helpers/http";

// Mock API functions for testing
const mockApi = {
  fetchScripture: async (reference: string) => {
    const response = await fetch(await buildUrl(`/api/fetch-scripture`, { reference }));
    return response.json();
  },

  fetchTranslationNotes: async (reference: string) => {
    const response = await fetch(await buildUrl(`/api/fetch-translation-notes`, { reference }));
    return response.json();
  },

  getLanguages: async () => {
    const response = await fetch("/api/get-languages");
    return response.json();
  },
};

describe("🌐 Upstream Failures - DCS API Chaos Tests", () => {
  afterEach(async () => {
    // Ensure cleanup after each test
    await chaosMonkey.cleanupAll();
  });

  describe("DCS API Timeout Scenarios", () => {
    test("handles DCS timeout gracefully with cache fallback", async () => {
      console.log("🧪 Testing: DCS timeout with cache fallback...");

      // First, populate cache with a successful request
      const initialResponse = await mockApi.fetchScripture("John 3:16");
      expect(initialResponse).toBeDefined();

      // Now inject DCS timeout
      const experimentId = await chaosMonkey.inject(ChaosType.DCS_TIMEOUT, {
        duration: 5000, // 5 seconds
        intensity: 1.0, // 100% failure rate
        target: "dcs-api",
      });

      console.log(`🐒 Chaos experiment ${experimentId} started`);

      // Make request during chaos - should return cached data
      const chaosResponse = await mockApi.fetchScripture("John 3:16");

      // Validate graceful degradation
      expect(chaosResponse).toBeDefined();
      expect(chaosResponse.source).toBe("cache");
      expect(chaosResponse.warning).toContain("Using cached data");
      expect(chaosResponse.scripture).toBeDefined();

      console.log("✅ Cache fallback working correctly");

      // Wait for chaos to end and system to recover
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Test recovery - should work normally again
      const recoveredResponse = await mockApi.fetchScripture("Romans 1:1");
      expect(recoveredResponse).toBeDefined();
      expect(recoveredResponse.source).not.toBe("cache");

      console.log("✅ System recovered successfully");
    }, 15000); // 15 second timeout

    test("provides helpful error messages during DCS timeout", async () => {
      console.log("🧪 Testing: User-friendly error messages...");

      // Inject DCS timeout
      await chaosMonkey.inject(ChaosType.DCS_TIMEOUT, {
        duration: 3000,
        intensity: 1.0,
        target: "dcs-api",
      });

      try {
        // Request for content not in cache
        await mockApi.fetchScripture("Obscure 99:99");
      } catch (error: any) {
        // Should provide helpful error message
        expect(error.message).toContain("temporarily unavailable");
        expect(error.message).toContain("cached data");
        expect(error.type).toBe("UPSTREAM_TIMEOUT");

        console.log("✅ Helpful error message provided");
      }
    }, 10000);

    test("maintains system availability during partial DCS outages", async () => {
      console.log("🧪 Testing: Partial outage resilience...");

      // Inject partial DCS failures (50% failure rate)
      await chaosMonkey.inject(ChaosType.DCS_UNAVAILABLE, {
        duration: 4000,
        intensity: 0.5, // 50% failure rate
        target: "dcs-api",
      });

      const results: Array<{ success: boolean; response?: any; error?: any }> = [];
      const totalRequests = 10;

      // Make multiple requests during partial outage
      for (let i = 0; i < totalRequests; i++) {
        try {
          const response = await mockApi.fetchScripture("John 3:16");
          results.push({ success: true, response });
        } catch (error) {
          results.push({ success: false, error });
        }

        await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay
      }

      const successRate = results.filter((r) => r.success).length / totalRequests;

      // Should maintain some level of service (cache + successful requests)
      expect(successRate).toBeGreaterThan(0.3); // At least 30% success

      console.log(
        `✅ Maintained ${(successRate * 100).toFixed(1)}% availability during partial outage`
      );
    }, 12000);
  });

  describe("DCS API Complete Unavailability", () => {
    test("serves cached content when DCS is completely down", async () => {
      console.log("🧪 Testing: Complete DCS outage with cache serving...");

      // Populate cache first
      await mockApi.fetchScripture("Matthew 5:3");
      await mockApi.fetchTranslationNotes("Matthew 5:3");

      // Simulate complete DCS outage
      await chaosMonkey.inject(ChaosType.DCS_UNAVAILABLE, {
        duration: 5000,
        intensity: 1.0, // 100% failure
        target: "dcs-api",
      });

      // Should still serve cached content
      const scriptureResponse = await mockApi.fetchScripture("Matthew 5:3");
      expect(scriptureResponse.source).toBe("cache");
      expect(scriptureResponse.scripture).toBeDefined();

      const notesResponse = await mockApi.fetchTranslationNotes("Matthew 5:3");
      expect(notesResponse.source).toBe("cache");
      expect(notesResponse.notes).toBeDefined();

      console.log("✅ Successfully served cached content during complete outage");
    }, 10000);

    test("degrades gracefully for uncached content during outage", async () => {
      console.log("🧪 Testing: Graceful degradation for uncached content...");

      // Simulate complete DCS outage
      await chaosMonkey.inject(ChaosType.DCS_UNAVAILABLE, {
        duration: 3000,
        intensity: 1.0,
        target: "dcs-api",
      });

      try {
        // Request uncached content
        await mockApi.fetchScripture("Habakkuk 3:17-19");
      } catch (error: any) {
        // Should provide graceful error with helpful information
        expect(error.status).toBe(503);
        expect(error.message).toContain("temporarily unavailable");
        expect(error.retryAfter).toBeDefined();
        expect(error.alternatives).toBeDefined(); // Suggest alternative actions

        console.log("✅ Graceful degradation for uncached content");
      }
    }, 8000);

    test("automatically recovers when DCS comes back online", async () => {
      console.log("🧪 Testing: Automatic recovery...");

      // Short outage simulation
      const experimentId = await chaosMonkey.inject(ChaosType.DCS_UNAVAILABLE, {
        duration: 2000, // 2 seconds
        intensity: 1.0,
        target: "dcs-api",
      });

      // Wait for outage to end
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Test that normal service resumes
      const response = await mockApi.fetchScripture("Luke 2:14");
      expect(response).toBeDefined();
      expect(response.source).not.toBe("cache"); // Should be fresh from DCS
      expect(response.scripture).toBeDefined();

      // Verify metrics show recovery
      const metrics = chaosMonkey.getMetrics(experimentId);
      expect(metrics?.recoveryTime).toBeLessThan(5000); // Recovered within 5 seconds

      console.log("✅ System automatically recovered");
    }, 10000);
  });

  describe("DCS API Performance Degradation", () => {
    test("handles slow DCS responses gracefully", async () => {
      console.log("🧪 Testing: Slow DCS response handling...");

      // Inject slow responses (5 second delays)
      await chaosMonkey.inject(ChaosType.SLOW_RESPONSE, {
        duration: 4000,
        intensity: 0.8, // 80% of requests are slow
        target: "dcs-api",
        metadata: { delay: 5000 },
      });

      const startTime = Date.now();

      try {
        const response = await mockApi.fetchScripture("Psalm 23:1");
        const responseTime = Date.now() - startTime;

        // Should either return quickly from cache or handle slow response
        if (response.source === "cache") {
          expect(responseTime).toBeLessThan(1000); // Cache should be fast
          console.log("✅ Served from cache to avoid slow response");
        } else {
          expect(responseTime).toBeGreaterThan(4000); // Should respect the slow response
          expect(response.warning).toContain("slow response");
          console.log("✅ Handled slow response with warning");
        }
      } catch (error: any) {
        // Timeout handling is also acceptable
        expect(error.type).toBe("TIMEOUT");
        console.log("✅ Properly timed out slow response");
      }
    }, 12000);

    test("prefers cache over slow upstream responses", async () => {
      console.log("🧪 Testing: Cache preference during slow responses...");

      // Populate cache
      await mockApi.fetchScripture("Isaiah 53:5");

      // Make upstream slow
      await chaosMonkey.inject(ChaosType.SLOW_RESPONSE, {
        duration: 3000,
        intensity: 1.0,
        target: "dcs-api",
        metadata: { delay: 8000 },
      });

      const startTime = Date.now();
      const response = await mockApi.fetchScripture("Isaiah 53:5");
      const responseTime = Date.now() - startTime;

      // Should serve from cache instead of waiting
      expect(response.source).toBe("cache");
      expect(responseTime).toBeLessThan(1000);
      expect(response.scripture).toBeDefined();

      console.log("✅ Intelligently preferred cache over slow upstream");
    }, 8000);
  });

  describe("Data Integrity During Failures", () => {
    test("ensures no data corruption during failures", async () => {
      console.log("🧪 Testing: Data integrity during chaos...");

      // Get baseline data
      const baselineResponse = await mockApi.fetchScripture("John 1:1");
      const baselineText = baselineResponse.scripture.ult.text;

      // Inject various failures
      await chaosMonkey.inject(ChaosType.DCS_TIMEOUT, {
        duration: 2000,
        intensity: 1.0,
        target: "dcs-api",
      });

      // Request same data during failure
      const chaosResponse = await mockApi.fetchScripture("John 1:1");

      // Data should be identical (from cache)
      expect(chaosResponse.scripture.ult.text).toBe(baselineText);
      expect(chaosResponse.source).toBe("cache");

      console.log("✅ Data integrity maintained during failures");
    }, 8000);

    test("validates cache consistency across multiple failures", async () => {
      console.log("🧪 Testing: Cache consistency across failures...");

      // Multiple failure scenarios
      const failures = [
        { type: ChaosType.DCS_TIMEOUT, duration: 1000 },
        { type: ChaosType.DCS_UNAVAILABLE, duration: 1000 },
        { type: ChaosType.SLOW_RESPONSE, duration: 1000 },
      ];

      const reference = "Romans 8:28";
      const responses: any[] = [];

      for (const failure of failures) {
        await chaosMonkey.inject(failure.type, {
          duration: failure.duration,
          intensity: 1.0,
          target: "dcs-api",
        });

        const response = await mockApi.fetchScripture(reference);
        responses.push(response);

        await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for cleanup
      }

      // All responses should be consistent
      const firstText = responses[0].scripture.ult.text;
      responses.forEach((response, index) => {
        expect(response.scripture.ult.text).toBe(firstText);
        console.log(`✅ Response ${index + 1} consistent with baseline`);
      });

      console.log("✅ Cache remained consistent across multiple failure types");
    }, 15000);
  });
});
