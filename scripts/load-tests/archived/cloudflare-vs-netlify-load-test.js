#!/usr/bin/env node

/**
 * Comprehensive Cloudflare vs Netlify Performance Comparison
 *
 * Tests both deployments side by side to compare:
 * - Response times
 * - Scalability under load
 * - Cache performance (with fallbacks)
 * - Cost implications
 * - Cold start behaviors
 */

import https from "https";
import http from "http";

// Platform configurations
const PLATFORMS = {
  netlify: {
    name: "Netlify",
    url: "https://translation-helps-mcp.netlify.app",
    pricing: {
      functionExecution: 0.0000002083, // per 100ms
      bandwidth: 0.0000001042, // per GB
      requests: 0.000000125, // per request
      freeTier: 125000, // free invocations per month
    },
  },
  cloudflare: {
    name: "Cloudflare Workers",
    url: "https://translation-helps-mcp.pages.dev",
    pricing: {
      requests: 0.0000005, // $0.50 per million after 100k free
      cpu: 0.000001, // per GB-second (simplified)
      freeTier: 100000, // free requests per day
    },
  },
};

// Test scenarios - Updated for SvelteKit API routes
const TEST_SCENARIOS = {
  basic: [
    { endpoint: "/api/health", name: "Health Check" },
    {
      endpoint: "/api/get-languages?organization=unfoldingWord",
      name: "Get Languages",
    },
  ],

  scripture: [
    {
      endpoint:
        "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - John 3:16",
    },
    {
      endpoint:
        "/api/fetch-scripture?reference=Genesis+1:1&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - Genesis 1:1",
    },
    {
      endpoint:
        "/api/fetch-scripture?reference=Psalm+23:1&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - Psalm 23:1",
    },
  ],

  translation: [
    {
      endpoint:
        "/api/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Translation Notes - Titus 1:1",
    },
    {
      endpoint:
        "/api/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      name: "Translation Words - Genesis 1:1",
    },
    {
      endpoint:
        "/api/fetch-translation-word-links?reference=John+3:16&language=en&organization=unfoldingWord",
      name: "Translation Word Links - John 3:16",
    },
  ],

  // Mixed workload for realistic testing
  mixed: [
    {
      endpoint:
        "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      weight: 0.3,
    },
    {
      endpoint:
        "/api/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      weight: 0.25,
    },
    {
      endpoint:
        "/api/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      weight: 0.2,
    },
    { endpoint: "/api/get-languages?organization=unfoldingWord", weight: 0.15 },
    { endpoint: "/api/health", weight: 0.1 },
  ],
};

// Performance metrics tracker
class PlatformMetrics {
  constructor(platformName) {
    this.platformName = platformName;
    this.requests = [];
    this.startTime = Date.now();
  }

  addRequest(
    endpoint,
    duration,
    statusCode,
    error = null,
    cacheStatus = "unknown",
  ) {
    this.requests.push({
      endpoint,
      duration,
      statusCode,
      error,
      cacheStatus,
      timestamp: Date.now(),
    });
  }

  getStats() {
    if (this.requests.length === 0) return null;

    const successful = this.requests.filter((r) => r.statusCode === 200);
    const durations = successful.map((r) => r.duration);

    if (durations.length === 0) return { error: "No successful requests" };

    const sorted = [...durations].sort((a, b) => a - b);

    return {
      platform: this.platformName,
      totalRequests: this.requests.length,
      successfulRequests: successful.length,
      failedRequests: this.requests.length - successful.length,
      successRate: (successful.length / this.requests.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: sorted[Math.floor(sorted.length / 2)],
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)],
      totalDuration: Date.now() - this.startTime,
      requestsPerSecond:
        successful.length / ((Date.now() - this.startTime) / 1000),
      cacheHits: this.requests.filter((r) => r.cacheStatus?.includes("hit"))
        .length,
      cacheMisses: this.requests.filter((r) => r.cacheStatus?.includes("miss"))
        .length,
    };
  }

  reset() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

// HTTP request helper with cache detection
function makeRequest(url, endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const fullUrl = `${url}${endpoint}`;

    const protocol = url.startsWith("https") ? https : http;

    const req = protocol.get(fullUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const duration = Date.now() - startTime;

        // Try to detect cache status from headers
        const cacheStatus =
          res.headers["x-cache"] ||
          res.headers["cf-cache-status"] ||
          res.headers["netlify-cache"] ||
          res.headers["cache-control"] ||
          "unknown";

        resolve({
          duration,
          statusCode: res.statusCode,
          cacheStatus,
          dataSize: data.length,
          headers: res.headers,
        });
      });
    });

    req.on("error", (error) => {
      const duration = Date.now() - startTime;
      reject({ duration, error: error.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      reject({ duration, error: "Request timeout" });
    });
  });
}

// Comparison test runner
class PlatformComparison {
  constructor() {
    this.metrics = {};
    Object.keys(PLATFORMS).forEach((platform) => {
      this.metrics[platform] = new PlatformMetrics(PLATFORMS[platform].name);
    });
  }

  async runSideBySideTest(testName, endpoints) {
    console.log(`\n🔄 ${testName} - Side by Side Comparison`);
    console.log("=".repeat(80));

    for (const test of endpoints) {
      console.log(`\n📊 Testing: ${test.name}`);
      console.log("-".repeat(60));

      const results = {};

      // Test each platform
      for (const [platformKey, platform] of Object.entries(PLATFORMS)) {
        try {
          const result = await makeRequest(platform.url, test.endpoint);
          this.metrics[platformKey].addRequest(
            test.name,
            result.duration,
            result.statusCode,
            null,
            result.cacheStatus,
          );
          results[platformKey] = result;

          console.log(
            `${platform.name.padEnd(20)} | ${result.duration.toString().padStart(6)}ms | ${result.statusCode} | Cache: ${result.cacheStatus}`,
          );
        } catch (error) {
          this.metrics[platformKey].addRequest(
            test.name,
            error.duration,
            0,
            error.error,
          );
          results[platformKey] = error;

          console.log(
            `${platform.name.padEnd(20)} | ${error.duration.toString().padStart(6)}ms | ERROR | ${error.error}`,
          );
        }

        // Small delay between platform tests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Compare results
      if (
        results.netlify &&
        results.cloudflare &&
        results.netlify.duration &&
        results.cloudflare.duration
      ) {
        const diff = results.netlify.duration - results.cloudflare.duration;
        const faster = diff > 0 ? "Cloudflare" : "Netlify";
        const improvement = Math.abs(
          (diff /
            Math.max(results.netlify.duration, results.cloudflare.duration)) *
            100,
        );

        console.log(`🏆 Winner: ${faster} (${improvement.toFixed(1)}% faster)`);
      }

      // Delay between different tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async runConcurrentLoadTest(concurrency, duration = 30000) {
    console.log(
      `\n⚡ Concurrent Load Test - ${concurrency} concurrent requests for ${duration / 1000}s`,
    );
    console.log("=".repeat(80));

    // Reset metrics for clean concurrent test
    Object.values(this.metrics).forEach((metric) => metric.reset());

    const promises = [];

    // Start concurrent tests for each platform
    for (const [platformKey, platform] of Object.entries(PLATFORMS)) {
      console.log(
        `🚀 Starting ${concurrency} concurrent requests on ${platform.name}...`,
      );

      for (let i = 0; i < concurrency; i++) {
        const promise = this.runConcurrentLoop(
          platformKey,
          platform.url,
          duration,
        );
        promises.push(promise);
      }
    }

    await Promise.all(promises);

    console.log(`\n📈 Load Test Complete`);
    this.printLoadTestComparison();
  }

  async runConcurrentLoop(platformKey, url, duration) {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      // Select random endpoint based on weights
      const random = Math.random();
      let cumulativeWeight = 0;
      let selectedTest = null;

      for (const test of TEST_SCENARIOS.mixed) {
        cumulativeWeight += test.weight;
        if (random <= cumulativeWeight) {
          selectedTest = test;
          break;
        }
      }

      try {
        const result = await makeRequest(url, selectedTest.endpoint);
        this.metrics[platformKey].addRequest(
          `Concurrent-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          result.duration,
          result.statusCode,
          null,
          result.cacheStatus,
        );
      } catch (error) {
        this.metrics[platformKey].addRequest(
          `Concurrent-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          error.duration,
          0,
          error.error,
        );
      }

      // Random delay between requests (100-500ms)
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 400),
      );
    }
  }

  async runColdStartTest() {
    console.log(`\n🧊 Cold Start Performance Test`);
    console.log("=".repeat(80));

    // Test each platform after a delay to simulate cold start
    for (const [platformKey, platform] of Object.entries(PLATFORMS)) {
      console.log(`\n❄️  Testing cold start for ${platform.name}...`);

      // Wait to ensure cold start
      await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute wait

      const testStart = Date.now();
      try {
        const result = await makeRequest(platform.url, "/api/health");
        const coldStartTime = Date.now() - testStart;

        console.log(`${platform.name} cold start: ${coldStartTime}ms`);

        // Follow up with a warm request
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const warmStart = Date.now();
        await makeRequest(platform.url, "/api/health");
        const warmTime = Date.now() - warmStart;

        console.log(`${platform.name} warm request: ${warmTime}ms`);
        console.log(`Cold start penalty: ${coldStartTime - warmTime}ms`);
      } catch (error) {
        console.log(`${platform.name} cold start failed: ${error.error}`);
      }
    }
  }

  calculateCosts(stats, platform) {
    if (!stats || stats.error) return { error: "No data" };

    const platformConfig = PLATFORMS[platform];
    if (!platformConfig) return { error: "Unknown platform" };

    let monthlyCost = 0;
    const requestsPerMonth = stats.totalRequests * 30; // Extrapolate daily to monthly

    if (platform === "netlify") {
      const executionCost =
        (stats.averageDuration / 100) *
        platformConfig.pricing.functionExecution;
      const requestCost = platformConfig.pricing.requests;
      const costPerRequest = executionCost + requestCost;

      if (requestsPerMonth > platformConfig.pricing.freeTier) {
        monthlyCost =
          (requestsPerMonth - platformConfig.pricing.freeTier) * costPerRequest;
      }
    } else if (platform === "cloudflare") {
      const dailyRequests = stats.totalRequests;
      if (dailyRequests > platformConfig.pricing.freeTier) {
        const billableDaily = dailyRequests - platformConfig.pricing.freeTier;
        monthlyCost = billableDaily * 30 * platformConfig.pricing.requests;
      }
    }

    return {
      costPerRequest: monthlyCost / requestsPerMonth || 0,
      monthlyCost,
      requestsPerMonth,
      freeTierCovered: requestsPerMonth <= platformConfig.pricing.freeTier,
    };
  }

  printLoadTestComparison() {
    console.log(`\n📊 LOAD TEST COMPARISON`);
    console.log("=".repeat(80));

    for (const [platformKey, platform] of Object.entries(PLATFORMS)) {
      const stats = this.metrics[platformKey].getStats();
      if (!stats || stats.error) continue;

      console.log(`\n🔷 ${platform.name} Results:`);
      console.log(
        `   Requests: ${stats.totalRequests} (${stats.successRate.toFixed(1)}% success)`,
      );
      console.log(`   Average Response: ${stats.averageDuration.toFixed(0)}ms`);
      console.log(`   Median Response: ${stats.medianDuration.toFixed(0)}ms`);
      console.log(`   95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
      console.log(`   Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(
        `   Cache Hits: ${stats.cacheHits} | Cache Misses: ${stats.cacheMisses}`,
      );
    }

    // Direct comparison
    const netlifyStats = this.metrics.netlify.getStats();
    const cloudflareStats = this.metrics.cloudflare.getStats();

    if (
      netlifyStats &&
      cloudflareStats &&
      !netlifyStats.error &&
      !cloudflareStats.error
    ) {
      console.log(`\n🏆 HEAD-TO-HEAD COMPARISON:`);

      const avgDiff =
        netlifyStats.averageDuration - cloudflareStats.averageDuration;
      const rpsDiff =
        cloudflareStats.requestsPerSecond - netlifyStats.requestsPerSecond;

      console.log(`   Average Response Time:`);
      console.log(`     Netlify: ${netlifyStats.averageDuration.toFixed(0)}ms`);
      console.log(
        `     Cloudflare: ${cloudflareStats.averageDuration.toFixed(0)}ms`,
      );
      console.log(
        `     Difference: ${avgDiff > 0 ? "Cloudflare" : "Netlify"} faster by ${Math.abs(avgDiff).toFixed(0)}ms`,
      );

      console.log(`   Throughput:`);
      console.log(
        `     Netlify: ${netlifyStats.requestsPerSecond.toFixed(2)} req/s`,
      );
      console.log(
        `     Cloudflare: ${cloudflareStats.requestsPerSecond.toFixed(2)} req/s`,
      );
      console.log(
        `     Difference: ${rpsDiff > 0 ? "Cloudflare" : "Netlify"} higher by ${Math.abs(rpsDiff).toFixed(2)} req/s`,
      );
    }
  }

  printFinalComparison() {
    console.log(`\n📋 FINAL PLATFORM COMPARISON REPORT`);
    console.log("=".repeat(80));

    for (const [platformKey, platform] of Object.entries(PLATFORMS)) {
      const stats = this.metrics[platformKey].getStats();
      const costs = this.calculateCosts(stats, platformKey);

      console.log(`\n🔷 ${platform.name.toUpperCase()} SUMMARY:`);

      if (stats && !stats.error) {
        console.log(`   📊 Performance:`);
        console.log(`      Total Requests: ${stats.totalRequests}`);
        console.log(`      Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(
          `      Average Response: ${stats.averageDuration.toFixed(0)}ms`,
        );
        console.log(`      95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
        console.log(
          `      Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`,
        );

        console.log(`   💰 Cost Analysis:`);
        if (costs.error) {
          console.log(`      Error calculating costs: ${costs.error}`);
        } else {
          console.log(
            `      Cost per Request: $${costs.costPerRequest.toFixed(8)}`,
          );
          console.log(`      Monthly Cost: $${costs.monthlyCost.toFixed(4)}`);
          console.log(
            `      Free Tier: ${costs.freeTierCovered ? "COVERED" : "EXCEEDED"}`,
          );
        }
      } else {
        console.log(`   ❌ No valid performance data`);
      }
    }

    // Recommendations
    console.log(`\n🎯 RECOMMENDATIONS:`);

    const netlifyStats = this.metrics.netlify.getStats();
    const cloudflareStats = this.metrics.cloudflare.getStats();

    if (
      netlifyStats &&
      cloudflareStats &&
      !netlifyStats.error &&
      !cloudflareStats.error
    ) {
      const betterPerformance =
        cloudflareStats.averageDuration < netlifyStats.averageDuration
          ? "Cloudflare"
          : "Netlify";
      const betterThroughput =
        cloudflareStats.requestsPerSecond > netlifyStats.requestsPerSecond
          ? "Cloudflare"
          : "Netlify";

      console.log(`   🏃 Performance Winner: ${betterPerformance}`);
      console.log(`   🚀 Throughput Winner: ${betterThroughput}`);

      if (cloudflareStats.averageDuration < netlifyStats.averageDuration) {
        const improvement =
          ((netlifyStats.averageDuration - cloudflareStats.averageDuration) /
            netlifyStats.averageDuration) *
          100;
        console.log(
          `   📈 Cloudflare is ${improvement.toFixed(1)}% faster on average`,
        );
      } else {
        const improvement =
          ((cloudflareStats.averageDuration - netlifyStats.averageDuration) /
            cloudflareStats.averageDuration) *
          100;
        console.log(
          `   📈 Netlify is ${improvement.toFixed(1)}% faster on average`,
        );
      }
    }

    console.log(`\n⚠️  NEXT STEPS:`);
    console.log(`   1. Implement Cloudflare KV for persistent caching`);
    console.log(`   2. Monitor real-world usage patterns`);
    console.log(`   3. Consider multi-platform deployment strategy`);
    console.log(`   4. Optimize based on actual cost vs performance needs`);
  }
}

// Main execution
async function main() {
  console.log(`🚀 Translation Helps MCP - Cloudflare vs Netlify Comparison`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const comparison = new PlatformComparison();

  try {
    // Test basic endpoints
    await comparison.runSideBySideTest("Basic Endpoints", TEST_SCENARIOS.basic);

    // Test scripture endpoints (high-value)
    await comparison.runSideBySideTest(
      "Scripture Endpoints",
      TEST_SCENARIOS.scripture,
    );

    // Test translation endpoints
    await comparison.runSideBySideTest(
      "Translation Endpoints",
      TEST_SCENARIOS.translation,
    );

    // Run concurrent load tests
    await comparison.runConcurrentLoadTest(10, 20000); // 10 concurrent for 20s
    await comparison.runConcurrentLoadTest(25, 20000); // 25 concurrent for 20s

    // Print final comparison
    comparison.printFinalComparison();

    console.log("\n✅ Platform comparison complete!");
  } catch (error) {
    console.error("❌ Comparison failed:", error);
    process.exit(1);
  }
}

// Export for programmatic use
export { PlatformComparison, PlatformMetrics, PLATFORMS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
