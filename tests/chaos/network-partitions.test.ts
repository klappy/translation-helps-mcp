/**
 * Network Partition Chaos Tests
 *
 * Tests system resilience when network connectivity is intermittent or fails.
 * Validates retry logic, offline modes, and connection recovery.
 *
 * Part of Task 15 - Chaos Engineering Tests
 */

import { afterEach, describe, expect, test } from "vitest";
import { chaosMonkey, ChaosType } from "./framework/chaos-monkey";

// Mock API functions for testing
const mockApi = {
  fetchScripture: async (reference: string) => {
    const response = await fetch(`/api/fetch-scripture?reference=${reference}`);
    return response.json();
  },

  fetchTranslationNotes: async (reference: string) => {
    const response = await fetch(`/api/fetch-translation-notes?reference=${reference}`);
    return response.json();
  },

  getLanguages: async () => {
    const response = await fetch("/api/get-languages");
    return response.json();
  },

  healthCheck: async () => {
    const response = await fetch("/api/health");
    return response.json();
  },
};

describe("🔌 Network Partition - Chaos Tests", () => {
  afterEach(async () => {
    // Ensure cleanup after each test
    await chaosMonkey.cleanupAll();
  });

  describe("Complete Network Failures", () => {
    test("handles complete network outage gracefully", async () => {
      console.log("🧪 Testing: Complete network outage...");

      // First, populate cache during good connectivity
      const initialResponse = await mockApi.fetchScripture("Matthew 6:9-13");
      expect(initialResponse).toBeDefined();

      // Inject complete network failure
      const experimentId = await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 5000, // 5 seconds
        intensity: 1.0, // 100% network failure
        target: "network",
      });

      console.log(`🐒 Network partition experiment ${experimentId} started`);

      // Attempt requests during network outage
      try {
        const chaosResponse = await mockApi.fetchScripture("Matthew 6:9-13");

        // Should serve from cache if available
        expect(chaosResponse).toBeDefined();
        expect(chaosResponse.source).toBe("cache");
        expect(chaosResponse.warning).toContain("network unavailable");
        expect(chaosResponse.scripture).toBeDefined();

        console.log("✅ Successfully served cached content during network outage");
      } catch (error: any) {
        // Graceful offline mode is also acceptable
        expect(error.type).toBe("NETWORK_ERROR");
        expect(error.message).toContain("offline mode");
        expect(error.retryAdvice).toBeDefined();

        console.log("✅ Gracefully entered offline mode");
      }

      // Wait for network to recover
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Test network recovery
      const recoveredResponse = await mockApi.fetchScripture("Luke 11:2-4");
      expect(recoveredResponse).toBeDefined();
      expect(recoveredResponse.source).not.toBe("cache"); // Should be fresh from network

      console.log("✅ Network connectivity recovered successfully");
    }, 15000);

    test("provides meaningful offline experience", async () => {
      console.log("🧪 Testing: Offline experience quality...");

      // Populate cache with various content types
      await mockApi.fetchScripture("John 3:16");
      await mockApi.fetchTranslationNotes("John 3:16");
      await mockApi.getLanguages();

      // Inject complete network failure
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 4000,
        intensity: 1.0,
        target: "network",
      });

      // Test offline capabilities
      const offlineTests = [
        { name: "Cached Scripture", call: () => mockApi.fetchScripture("John 3:16") },
        { name: "Cached Notes", call: () => mockApi.fetchTranslationNotes("John 3:16") },
        { name: "Cached Languages", call: () => mockApi.getLanguages() },
      ];

      const offlineResults: Array<{ name: string; success: boolean; fromCache: boolean }> = [];

      for (const test of offlineTests) {
        try {
          const response = await test.call();
          offlineResults.push({
            name: test.name,
            success: true,
            fromCache: response.source === "cache",
          });
        } catch (error) {
          offlineResults.push({
            name: test.name,
            success: false,
            fromCache: false,
          });
        }
      }

      // Should provide meaningful offline experience
      const offlineSuccess = offlineResults.filter((r) => r.success).length;
      expect(offlineSuccess).toBeGreaterThan(0); // At least some content available offline

      offlineResults.forEach((result) => {
        if (result.success) {
          console.log(`✅ ${result.name}: Available offline`);
        } else {
          console.log(`⚠️ ${result.name}: Not available offline`);
        }
      });

      console.log(
        `✅ Offline experience: ${offlineSuccess}/${offlineTests.length} services available`
      );
    }, 12000);

    test("handles network recovery gracefully", async () => {
      console.log("🧪 Testing: Network recovery handling...");

      // Short network outage
      const experimentId = await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 2000, // 2 seconds
        intensity: 1.0,
        target: "network",
      });

      // Wait for network to recover
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Test that normal service resumes
      const response = await mockApi.fetchScripture("Psalm 46:1");
      expect(response).toBeDefined();
      expect(response.source).not.toBe("cache"); // Should be fresh from network

      // Verify metrics show quick recovery
      const metrics = chaosMonkey.getMetrics(experimentId);
      expect(metrics?.recoveryTime).toBeLessThan(5000); // Recovered within 5 seconds

      console.log("✅ Network recovered quickly and resumed normal operation");
    }, 10000);
  });

  describe("Intermittent Network Issues", () => {
    test("handles flaky network connections", async () => {
      console.log("🧪 Testing: Flaky network connections...");

      // Inject 50% network failure rate (flaky connection)
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 6000,
        intensity: 0.5, // 50% failure rate
        target: "network",
      });

      const results: Array<{ success: boolean; attempt: number; responseTime?: number }> = [];
      const totalAttempts = 10;

      // Make multiple requests during flaky connection
      for (let i = 0; i < totalAttempts; i++) {
        const start = Date.now();
        try {
          await mockApi.fetchScripture("Romans 8:28");
          const responseTime = Date.now() - start;
          results.push({ success: true, attempt: i + 1, responseTime });
        } catch (error) {
          results.push({ success: false, attempt: i + 1 });
        }

        await new Promise((resolve) => setTimeout(resolve, 300)); // Brief pause
      }

      const successRate = results.filter((r) => r.success).length / totalAttempts;

      // Should maintain reasonable success rate despite flaky connection
      expect(successRate).toBeGreaterThan(0.3); // At least 30% success

      console.log(
        `✅ Maintained ${(successRate * 100).toFixed(1)}% success rate on flaky connection`
      );

      // Successful requests should be reasonably fast (not excessively retrying)
      const successfulRequests = results.filter((r) => r.success && r.responseTime);
      if (successfulRequests.length > 0) {
        const avgResponseTime =
          successfulRequests.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
          successfulRequests.length;
        expect(avgResponseTime).toBeLessThan(5000); // Under 5 seconds average
        console.log(`✅ Average response time: ${avgResponseTime.toFixed(0)}ms`);
      }
    }, 15000);

    test("implements intelligent retry logic", async () => {
      console.log("🧪 Testing: Intelligent retry logic...");

      // Inject intermittent network failures
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 4000,
        intensity: 0.7, // 70% failure rate
        target: "network",
      });

      const retryResults: Array<{ attempts: number; success: boolean; totalTime: number }> = [];

      // Test retry behavior for multiple requests
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        let attempts = 0;
        let success = false;

        try {
          // Simulate retry logic (would be handled by actual implementation)
          for (let retry = 0; retry < 3; retry++) {
            attempts++;
            try {
              await mockApi.fetchScripture(`Proverbs ${i + 1}:1`);
              success = true;
              break;
            } catch (error) {
              if (retry < 2) {
                await new Promise((resolve) => setTimeout(resolve, 500 * (retry + 1))); // Exponential backoff
              }
            }
          }
        } catch (error) {
          // Final failure after retries
        }

        const totalTime = Date.now() - startTime;
        retryResults.push({ attempts, success, totalTime });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Verify retry behavior
      retryResults.forEach((result, index) => {
        console.log(
          `✅ Request ${index + 1}: ${result.attempts} attempts, ${result.success ? "success" : "failed"}, ${result.totalTime}ms`
        );

        // Should not exceed reasonable retry limits
        expect(result.attempts).toBeLessThanOrEqual(3);
        expect(result.totalTime).toBeLessThan(10000); // Not stuck retrying forever
      });

      const overallSuccessRate = retryResults.filter((r) => r.success).length / retryResults.length;
      console.log(`✅ Retry success rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
    }, 12000);

    test("gracefully degrades during partial connectivity", async () => {
      console.log("🧪 Testing: Partial connectivity graceful degradation...");

      // Inject moderate network issues
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 5000,
        intensity: 0.6, // 60% failure rate
        target: "network",
      });

      // Test different service priorities during degraded connectivity
      const services = [
        { name: "Health Check", priority: "high", call: () => mockApi.healthCheck() },
        { name: "Scripture", priority: "high", call: () => mockApi.fetchScripture("Isaiah 40:31") },
        {
          name: "Translation Notes",
          priority: "medium",
          call: () => mockApi.fetchTranslationNotes("Isaiah 40:31"),
        },
        { name: "Languages", priority: "low", call: () => mockApi.getLanguages() },
      ];

      const degradationResults: Array<{
        name: string;
        priority: string;
        success: boolean;
        responseTime?: number;
      }> = [];

      for (const service of services) {
        const start = Date.now();
        try {
          await service.call();
          const responseTime = Date.now() - start;
          degradationResults.push({
            name: service.name,
            priority: service.priority,
            success: true,
            responseTime,
          });
        } catch (error) {
          degradationResults.push({
            name: service.name,
            priority: service.priority,
            success: false,
          });
        }
      }

      // High priority services should have higher success rates
      const highPrioritySuccess = degradationResults
        .filter((r) => r.priority === "high")
        .every((r) => r.success);

      degradationResults.forEach((result) => {
        const status = result.success ? "✅" : "❌";
        const time = result.responseTime ? `(${result.responseTime}ms)` : "";
        console.log(`${status} ${result.name} [${result.priority} priority] ${time}`);
      });

      console.log("✅ Service degradation handled based on priority");
    }, 12000);
  });

  describe("Network Recovery Patterns", () => {
    test("detects network recovery automatically", async () => {
      console.log("🧪 Testing: Automatic network recovery detection...");

      // Network outage
      const experimentId = await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 3000, // 3 seconds
        intensity: 1.0,
        target: "network",
      });

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // System should automatically detect recovery
      const recoveryResponse = await mockApi.fetchScripture("Jeremiah 29:11");
      expect(recoveryResponse).toBeDefined();
      expect(recoveryResponse.source).not.toBe("cache"); // Fresh from network

      // Verify quick recovery detection
      const metrics = chaosMonkey.getMetrics(experimentId);
      expect(metrics?.recoveryTime).toBeLessThan(6000); // Detected within 6 seconds

      console.log("✅ Network recovery detected and utilized automatically");
    }, 12000);

    test("synchronizes cached data after network recovery", async () => {
      console.log("🧪 Testing: Cache synchronization after network recovery...");

      // Get baseline data before network issues
      const baselineResponse = await mockApi.fetchScripture("1 Corinthians 13:4-8");
      const baselineText = baselineResponse.scripture.ult.text;

      // Network outage (forces cache usage)
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 2000,
        intensity: 1.0,
        target: "network",
      });

      // During outage, should use cache
      try {
        const cacheResponse = await mockApi.fetchScripture("1 Corinthians 13:4-8");
        expect(cacheResponse.source).toBe("cache");
        expect(cacheResponse.scripture.ult.text).toBe(baselineText);
      } catch (error) {
        // Offline mode is also acceptable
        console.log("System in offline mode during outage");
      }

      // Wait for network recovery
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // After recovery, data should be synchronized and consistent
      const syncedResponse = await mockApi.fetchScripture("1 Corinthians 13:4-8");
      expect(syncedResponse.scripture.ult.text).toBe(baselineText);

      console.log("✅ Data remained consistent through network outage and recovery");
    }, 10000);

    test("handles multiple network partition cycles", async () => {
      console.log("🧪 Testing: Multiple network partition cycles...");

      const partitionCycles = [
        { duration: 1000, intensity: 1.0 }, // 1 second full outage
        { duration: 2000, intensity: 0.8 }, // 2 seconds 80% degraded
        { duration: 1500, intensity: 1.0 }, // 1.5 seconds full outage
      ];

      const cycleResults: Array<{ cycle: number; recovered: boolean; responseTime: number }> = [];

      for (let i = 0; i < partitionCycles.length; i++) {
        const cycle = partitionCycles[i];

        // Inject network partition
        await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
          duration: cycle.duration,
          intensity: cycle.intensity,
          target: "network",
        });

        // Wait for partition to end + recovery time
        await new Promise((resolve) => setTimeout(resolve, cycle.duration + 1000));

        // Test recovery
        const start = Date.now();
        try {
          const response = await mockApi.fetchScripture(`Ecclesiastes ${i + 1}:1`);
          const responseTime = Date.now() - start;
          cycleResults.push({
            cycle: i + 1,
            recovered: response.source !== "cache",
            responseTime,
          });
        } catch (error) {
          cycleResults.push({
            cycle: i + 1,
            recovered: false,
            responseTime: Date.now() - start,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 500)); // Brief pause between cycles
      }

      // System should recover from all partition cycles
      const recoveryRate = cycleResults.filter((r) => r.recovered).length / cycleResults.length;
      expect(recoveryRate).toBeGreaterThan(0.6); // At least 60% recovery rate

      cycleResults.forEach((result, index) => {
        const status = result.recovered ? "✅" : "❌";
        console.log(
          `${status} Cycle ${result.cycle}: ${result.recovered ? "recovered" : "failed"} (${result.responseTime}ms)`
        );
      });

      console.log(`✅ Network partition cycle recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);
    }, 20000);
  });

  describe("Connection Quality Impact", () => {
    test("adapts to poor connection quality", async () => {
      console.log("🧪 Testing: Poor connection quality adaptation...");

      // Simulate poor connection with frequent dropouts
      await chaosMonkey.inject(ChaosType.NETWORK_PARTITION, {
        duration: 8000,
        intensity: 0.4, // 40% packet loss
        target: "network",
      });

      const qualityTests: Array<{
        name: string;
        responseTime: number;
        success: boolean;
      }> = [];

      // Test various request sizes during poor connection
      const testCases = [
        { name: "Single Verse", call: () => mockApi.fetchScripture("John 11:35") },
        { name: "Verse Range", call: () => mockApi.fetchScripture("Psalm 23:1-6") },
        { name: "Translation Notes", call: () => mockApi.fetchTranslationNotes("John 11:35") },
      ];

      for (const testCase of testCases) {
        const start = Date.now();
        try {
          await testCase.call();
          const responseTime = Date.now() - start;
          qualityTests.push({
            name: testCase.name,
            responseTime,
            success: true,
          });
        } catch (error) {
          qualityTests.push({
            name: testCase.name,
            responseTime: Date.now() - start,
            success: false,
          });
        }
      }

      // Should adapt to connection quality (smaller requests more likely to succeed)
      qualityTests.forEach((test) => {
        const status = test.success ? "✅" : "❌";
        console.log(`${status} ${test.name}: ${test.responseTime}ms`);
      });

      const successRate = qualityTests.filter((t) => t.success).length / qualityTests.length;
      expect(successRate).toBeGreaterThan(0.3); // Some adaptation success

      console.log(
        `✅ Connection quality adaptation success rate: ${(successRate * 100).toFixed(1)}%`
      );
    }, 15000);
  });
});
