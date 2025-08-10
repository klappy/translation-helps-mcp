#!/usr/bin/env node

/**
 * Comprehensive Load Testing Framework
 *
 * Tests API performance with proper cache control:
 * - Cached performance (normal requests)
 * - Uncached performance (with cache bypass)
 * - Mixed workload testing
 * - Cache effectiveness analysis
 */

import https from "https";

// Test configuration
const TEST_CONFIG = {
  baseUrl: "http://localhost:5173", // Local development server
  endpoints: [
    {
      path: "/api/health",
      name: "Health Check",
      params: {},
      expectedCacheability: "low", // Health checks usually aren't cached long
    },
    {
      path: "/api/get-languages",
      name: "Languages",
      params: { organization: "unfoldingWord" },
      expectedCacheability: "high", // Language list rarely changes
    },
    {
      path: "/api/fetch-scripture",
      name: "Scripture - John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        translation: "all",
      },
      expectedCacheability: "high", // Scripture text doesn't change
    },
    {
      path: "/api/fetch-translation-notes",
      name: "Translation Notes - Titus 1:1",
      params: {
        reference: "Titus 1:1",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedCacheability: "high", // Translation notes don't change
    },
    {
      path: "/api/fetch-translation-words",
      name: "Translation Words - Genesis 1:1",
      params: {
        reference: "Genesis 1:1",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedCacheability: "medium", // Word definitions might change occasionally
    },
  ],
  concurrencyLevels: [1, 5, 10, 25],
  testDuration: 30000, // 30 seconds
  warmupRequests: 3, // Requests to warm up cache
};

// Cache bypass methods
const CACHE_BYPASS_METHODS = {
  queryParam: { nocache: "true" },
  header: { "X-Cache-Bypass": "true" },
  cacheControl: { "Cache-Control": "no-cache" },
};

class LoadTestResult {
  constructor() {
    this.requests = [];
    this.startTime = Date.now();
  }

  addRequest(
    endpoint,
    duration,
    statusCode,
    cacheStatus,
    error = null,
    bypassMethod = null,
  ) {
    this.requests.push({
      endpoint,
      duration,
      statusCode,
      cacheStatus,
      error,
      bypassMethod,
      timestamp: Date.now(),
    });
  }

  getStats() {
    if (this.requests.length === 0) return null;

    const successful = this.requests.filter((r) => r.statusCode === 200);
    const durations = successful.map((r) => r.duration);

    if (durations.length === 0) return { error: "No successful requests" };

    const sorted = [...durations].sort((a, b) => a - b);
    const totalDuration = Date.now() - this.startTime;

    // Cache statistics
    const cacheHits = this.requests.filter(
      (r) => r.cacheStatus?.includes("HIT") || r.cacheStatus?.includes("hit"),
    ).length;

    const cacheMisses = this.requests.filter(
      (r) => r.cacheStatus?.includes("MISS") || r.cacheStatus?.includes("miss"),
    ).length;

    const bypassed = this.requests.filter((r) => r.bypassMethod).length;

    return {
      totalRequests: this.requests.length,
      successfulRequests: successful.length,
      failedRequests: this.requests.length - successful.length,
      successRate: (successful.length / this.requests.length) * 100,

      // Response time statistics
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: sorted[Math.floor(sorted.length / 2)],
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)],

      // Throughput
      totalDuration,
      requestsPerSecond: successful.length / (totalDuration / 1000),

      // Cache statistics
      cacheHits,
      cacheMisses,
      cacheHitRate:
        cacheHits + cacheMisses > 0
          ? (cacheHits / (cacheHits + cacheMisses)) * 100
          : 0,
      bypassedRequests: bypassed,

      // Cache performance breakdown
      cachedRequests: this.requests.filter((r) =>
        r.cacheStatus?.includes("HIT"),
      ),
      uncachedRequests: this.requests.filter(
        (r) => r.cacheStatus?.includes("MISS") || r.bypassMethod,
      ),
    };
  }

  reset() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

// HTTP request helper with cache control
function makeRequest(endpoint, params = {}, bypassMethod = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Build URL with parameters
    const url = new URL(endpoint.path, TEST_CONFIG.baseUrl);
    const allParams = { ...endpoint.params, ...params };

    // Add cache bypass parameters if specified
    if (bypassMethod === "queryParam") {
      Object.assign(allParams, CACHE_BYPASS_METHODS.queryParam);
    }

    // Set query parameters
    Object.entries(allParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Prepare headers
    const requestHeaders = { ...headers };
    if (bypassMethod === "header") {
      Object.assign(requestHeaders, CACHE_BYPASS_METHODS.header);
    } else if (bypassMethod === "cacheControl") {
      Object.assign(requestHeaders, CACHE_BYPASS_METHODS.cacheControl);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      headers: requestHeaders,
    };

    const req = (url.protocol === "https:" ? https : require("http")).get(
      options,
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const duration = Date.now() - startTime;

          // Extract cache status from headers
          const cacheStatus =
            res.headers["x-cache"] ||
            res.headers["x-cache-status"] ||
            res.headers["cf-cache-status"] ||
            "unknown";

          resolve({
            duration,
            statusCode: res.statusCode,
            cacheStatus,
            dataSize: data.length,
            headers: res.headers,
            bypassMethod,
          });
        });
      },
    );

    req.on("error", (error) => {
      const duration = Date.now() - startTime;
      reject({ duration, error: error.message, bypassMethod });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      reject({ duration, error: "Request timeout", bypassMethod });
    });
  });
}

class ComprehensiveLoadTester {
  constructor() {
    this.results = {
      cached: new LoadTestResult(),
      uncached: new LoadTestResult(),
      mixed: new LoadTestResult(),
    };
  }

  async warmupCache() {
    console.log(`🔥 Warming up cache...`);

    for (const endpoint of TEST_CONFIG.endpoints) {
      for (let i = 0; i < TEST_CONFIG.warmupRequests; i++) {
        try {
          const result = await makeRequest(endpoint);
          console.log(
            `   ${endpoint.name}: ${result.duration}ms (${result.cacheStatus})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.log(`   ${endpoint.name}: ERROR - ${error.error}`);
        }
      }
    }

    console.log(`✅ Cache warmup complete\n`);
  }

  async testCachedPerformance() {
    console.log(`🚀 Testing CACHED Performance (Normal Requests)`);
    console.log("=".repeat(80));

    this.results.cached.reset();

    for (const endpoint of TEST_CONFIG.endpoints) {
      console.log(`\n🔄 Testing: ${endpoint.name}`);
      console.log("-".repeat(60));

      // Run multiple requests to test cached performance
      for (let i = 0; i < 5; i++) {
        try {
          const result = await makeRequest(endpoint);
          this.results.cached.addRequest(
            endpoint.name,
            result.duration,
            result.statusCode,
            result.cacheStatus,
          );

          const cacheStatusIcon = result.cacheStatus?.includes("HIT")
            ? "🟢"
            : "🔴";
          console.log(
            `   Request ${i + 1}: ${result.duration}ms | ${result.statusCode} | ${cacheStatusIcon} ${result.cacheStatus}`,
          );
        } catch (error) {
          this.results.cached.addRequest(
            endpoint.name,
            error.duration,
            0,
            "error",
            error.error,
          );
          console.log(`   Request ${i + 1}: ERROR - ${error.error}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async testUncachedPerformance() {
    console.log(`\n🚫 Testing UNCACHED Performance (Cache Bypass)`);
    console.log("=".repeat(80));

    this.results.uncached.reset();

    for (const endpoint of TEST_CONFIG.endpoints) {
      console.log(`\n🔄 Testing: ${endpoint.name} (Cache Bypass)`);
      console.log("-".repeat(60));

      // Test different bypass methods
      const bypassMethods = ["queryParam", "header", "cacheControl"];

      for (let i = 0; i < 5; i++) {
        const bypassMethod = bypassMethods[i % bypassMethods.length];

        try {
          const result = await makeRequest(endpoint, {}, bypassMethod);
          this.results.uncached.addRequest(
            endpoint.name,
            result.duration,
            result.statusCode,
            result.cacheStatus,
            null,
            bypassMethod,
          );

          console.log(
            `   Request ${i + 1} (${bypassMethod}): ${result.duration}ms | ${result.statusCode} | ${result.cacheStatus}`,
          );
        } catch (error) {
          this.results.uncached.addRequest(
            endpoint.name,
            error.duration,
            0,
            "error",
            error.error,
            bypassMethod,
          );
          console.log(
            `   Request ${i + 1} (${bypassMethod}): ERROR - ${error.error}`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async testConcurrentLoad(concurrency, testType = "mixed") {
    console.log(
      `\n⚡ Concurrent Load Test - ${concurrency} concurrent ${testType} requests`,
    );
    console.log("=".repeat(80));

    const testResult =
      testType === "mixed"
        ? this.results.mixed
        : testType === "cached"
          ? this.results.cached
          : this.results.uncached;

    testResult.reset();

    const promises = [];
    const endTime = Date.now() + TEST_CONFIG.testDuration;

    for (let i = 0; i < concurrency; i++) {
      const promise = this.runConcurrentLoop(endTime, testType, testResult);
      promises.push(promise);
    }

    await Promise.all(promises);

    const stats = testResult.getStats();
    if (stats && !stats.error) {
      console.log(`\n📈 Results:`);
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`   Average Response: ${stats.averageDuration.toFixed(0)}ms`);
      console.log(`   Median Response: ${stats.medianDuration.toFixed(0)}ms`);
      console.log(`   95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
      console.log(`   Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`   Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
      console.log(
        `   Cache Hits: ${stats.cacheHits} | Misses: ${stats.cacheMisses} | Bypassed: ${stats.bypassedRequests}`,
      );
    }
  }

  async runConcurrentLoop(endTime, testType, testResult) {
    while (Date.now() < endTime) {
      // Select random endpoint
      const endpoint =
        TEST_CONFIG.endpoints[
          Math.floor(Math.random() * TEST_CONFIG.endpoints.length)
        ];

      // Determine bypass method based on test type
      let bypassMethod = null;
      if (testType === "uncached") {
        const methods = ["queryParam", "header", "cacheControl"];
        bypassMethod = methods[Math.floor(Math.random() * methods.length)];
      } else if (testType === "mixed") {
        // 70% cached, 30% uncached for mixed testing
        if (Math.random() < 0.3) {
          const methods = ["queryParam", "header", "cacheControl"];
          bypassMethod = methods[Math.floor(Math.random() * methods.length)];
        }
      }

      try {
        const result = await makeRequest(endpoint, {}, bypassMethod);
        testResult.addRequest(
          endpoint.name,
          result.duration,
          result.statusCode,
          result.cacheStatus,
          null,
          bypassMethod,
        );
      } catch (error) {
        testResult.addRequest(
          endpoint.name,
          error.duration,
          0,
          "error",
          error.error,
          bypassMethod,
        );
      }

      // Random delay between requests (100-500ms)
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 400),
      );
    }
  }

  printFinalComparison() {
    console.log(`\n📋 COMPREHENSIVE PERFORMANCE COMPARISON`);
    console.log("=".repeat(80));

    const cachedStats = this.results.cached.getStats();
    const uncachedStats = this.results.uncached.getStats();
    const mixedStats = this.results.mixed.getStats();

    console.log(`\n🔷 CACHED PERFORMANCE:`);
    if (cachedStats && !cachedStats.error) {
      console.log(
        `   Average Response: ${cachedStats.averageDuration.toFixed(0)}ms`,
      );
      console.log(
        `   95th Percentile: ${cachedStats.p95Duration.toFixed(0)}ms`,
      );
      console.log(`   Cache Hit Rate: ${cachedStats.cacheHitRate.toFixed(1)}%`);
      console.log(
        `   Requests/Second: ${cachedStats.requestsPerSecond.toFixed(2)}`,
      );
    }

    console.log(`\n🔶 UNCACHED PERFORMANCE:`);
    if (uncachedStats && !uncachedStats.error) {
      console.log(
        `   Average Response: ${uncachedStats.averageDuration.toFixed(0)}ms`,
      );
      console.log(
        `   95th Percentile: ${uncachedStats.p95Duration.toFixed(0)}ms`,
      );
      console.log(
        `   Cache Hit Rate: ${uncachedStats.cacheHitRate.toFixed(1)}%`,
      );
      console.log(
        `   Requests/Second: ${uncachedStats.requestsPerSecond.toFixed(2)}`,
      );
    }

    console.log(`\n📊 MIXED WORKLOAD:`);
    if (mixedStats && !mixedStats.error) {
      console.log(
        `   Average Response: ${mixedStats.averageDuration.toFixed(0)}ms`,
      );
      console.log(`   95th Percentile: ${mixedStats.p95Duration.toFixed(0)}ms`);
      console.log(`   Cache Hit Rate: ${mixedStats.cacheHitRate.toFixed(1)}%`);
      console.log(
        `   Requests/Second: ${mixedStats.requestsPerSecond.toFixed(2)}`,
      );
    }

    // Calculate cache effectiveness
    if (
      cachedStats &&
      uncachedStats &&
      !cachedStats.error &&
      !uncachedStats.error
    ) {
      const cacheSpeedup =
        ((uncachedStats.averageDuration - cachedStats.averageDuration) /
          uncachedStats.averageDuration) *
        100;
      const throughputIncrease =
        ((cachedStats.requestsPerSecond - uncachedStats.requestsPerSecond) /
          uncachedStats.requestsPerSecond) *
        100;

      console.log(`\n🎯 CACHE EFFECTIVENESS:`);
      console.log(
        `   Speed Improvement: ${cacheSpeedup > 0 ? "+" : ""}${cacheSpeedup.toFixed(1)}%`,
      );
      console.log(
        `   Throughput Increase: ${throughputIncrease > 0 ? "+" : ""}${throughputIncrease.toFixed(1)}%`,
      );
    }

    console.log(`\n⚠️  CACHE BYPASS METHODS TESTED:`);
    console.log(`   ✅ Query Parameter: ?nocache=true`);
    console.log(`   ✅ Request Header: X-Cache-Bypass: true`);
    console.log(`   ✅ Cache-Control: no-cache`);

    console.log(`\n🎯 NEXT STEPS FOR CF KV:`);
    console.log(`   1. Implement Cloudflare KV persistent caching`);
    console.log(`   2. Test KV vs memory cache performance`);
    console.log(`   3. Measure cold start improvements with KV`);
    console.log(`   4. Compare costs between memory + KV vs memory-only`);
  }
}

// Main execution
async function main() {
  console.log(`🚀 Comprehensive Load Testing & Cache Analysis`);
  console.log(`Target: ${TEST_CONFIG.baseUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const tester = new ComprehensiveLoadTester();

  try {
    // Warm up cache first
    await tester.warmupCache();

    // Test cached performance
    await tester.testCachedPerformance();

    // Test uncached performance (with bypass)
    await tester.testUncachedPerformance();

    // Test concurrent loads at different levels
    for (const concurrency of TEST_CONFIG.concurrencyLevels) {
      await tester.testConcurrentLoad(concurrency, "cached");
      await tester.testConcurrentLoad(concurrency, "uncached");
      await tester.testConcurrentLoad(concurrency, "mixed");
    }

    // Print final comparison
    tester.printFinalComparison();

    console.log("\n✅ Comprehensive testing complete!");
  } catch (error) {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  }
}

// Export for programmatic use
export { ComprehensiveLoadTester, makeRequest, TEST_CONFIG };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
