#!/usr/bin/env node

/**
 * Comprehensive Load Testing Suite for Translation Helps MCP
 * Tests various scenarios including individual endpoints, concurrent requests,
 * batch sizes, and stress testing
 */

import https from "https";
import http from "http";

// Configuration
const BASE_URL = "https://translation-helps-mcp.netlify.app";
const LOCAL_URL = "http://localhost:8888";

// Test scenarios
const TEST_SCENARIOS = {
  // Individual endpoint tests
  individual: [
    { endpoint: "/.netlify/functions/health", name: "Health Check" },
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - John 3:16",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=Genesis+1:1&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - Genesis 1:1",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=Psalm+23:1&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - Psalm 23:1",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Translation Notes - Titus 1:1",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-notes?reference=Matthew+5:1&language=en&organization=unfoldingWord",
      name: "Translation Notes - Matthew 5:1",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      name: "Translation Words - Genesis 1:1",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-questions?reference=Matthew+5:1&language=en&organization=unfoldingWord",
      name: "Translation Questions - Matthew 5:1",
    },
    {
      endpoint: "/.netlify/functions/get-languages?organization=unfoldingWord",
      name: "Get Languages",
    },
    {
      endpoint: "/.netlify/functions/fetch-resources?language=en&organization=unfoldingWord",
      name: "Fetch Resources",
    },
  ],

  // Mixed workload scenarios
  mixed: [
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      weight: 0.4,
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      weight: 0.3,
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      weight: 0.2,
    },
    { endpoint: "/.netlify/functions/health", weight: 0.1 },
  ],

  // Cache testing scenarios
  cache: [
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Cache Test - John 3:16",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Cache Test - Titus 1:1",
    },
  ],
};

// Performance metrics
class PerformanceMetrics {
  constructor() {
    this.requests = [];
    this.startTime = Date.now();
  }

  addRequest(endpoint, duration, statusCode, error = null) {
    this.requests.push({
      endpoint,
      duration,
      statusCode,
      error,
      timestamp: Date.now(),
    });
  }

  getStats() {
    if (this.requests.length === 0) return null;

    const durations = this.requests.map((r) => r.duration);
    const successful = this.requests.filter((r) => r.statusCode === 200);
    const failed = this.requests.filter((r) => r.statusCode !== 200);
    const errors = this.requests.filter((r) => r.error);

    return {
      totalRequests: this.requests.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRequests: errors.length,
      successRate: (successful.length / this.requests.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: this.getMedian(durations),
      p95Duration: this.getPercentile(durations, 95),
      p99Duration: this.getPercentile(durations, 99),
      totalDuration: Date.now() - this.startTime,
      requestsPerSecond: this.requests.length / ((Date.now() - this.startTime) / 1000),
    };
  }

  getMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  getPercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  reset() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

// HTTP request helper
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
        resolve({
          duration,
          statusCode: res.statusCode,
          data: data.substring(0, 200) + "...", // Truncate for logging
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

// Test runner
class LoadTester {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.metrics = new PerformanceMetrics();
  }

  async runIndividualTests() {
    console.log("\n🔍 Running Individual Endpoint Tests...");
    console.log("=".repeat(60));

    for (const test of TEST_SCENARIOS.individual) {
      try {
        const result = await makeRequest(this.baseUrl, test.endpoint);
        this.metrics.addRequest(test.name, result.duration, result.statusCode);

        console.log(
          `✅ ${test.name.padEnd(35)} | ${result.duration.toString().padStart(6)}ms | ${result.statusCode}`
        );
      } catch (error) {
        this.metrics.addRequest(test.name, error.duration, 0, error.error);
        console.log(
          `❌ ${test.name.padEnd(35)} | ${error.duration.toString().padStart(6)}ms | ERROR: ${error.error}`
        );
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async runConcurrentTests(concurrency, duration = 30000) {
    console.log(
      `\n⚡ Running Concurrent Tests (${concurrency} concurrent requests for ${duration / 1000}s)...`
    );
    console.log("=".repeat(60));

    const startTime = Date.now();
    const promises = [];

    // Create concurrent request loops
    for (let i = 0; i < concurrency; i++) {
      const promise = this.runConcurrentLoop(duration);
      promises.push(promise);
    }

    await Promise.all(promises);

    const totalTime = Date.now() - startTime;
    console.log(`\n📊 Concurrent Test Complete (${totalTime}ms total)`);
  }

  async runConcurrentLoop(duration) {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      // Randomly select from mixed workload
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
        const result = await makeRequest(this.baseUrl, selectedTest.endpoint);
        this.metrics.addRequest(
          `Concurrent-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          result.duration,
          result.statusCode
        );
      } catch (error) {
        this.metrics.addRequest(
          `Concurrent-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          error.duration,
          0,
          error.error
        );
      }

      // Random delay between 100-500ms
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));
    }
  }

  async runBatchTests(batchSizes = [5, 10, 20, 50, 100]) {
    console.log("\n📦 Running Batch Size Tests...");
    console.log("=".repeat(60));

    for (const batchSize of batchSizes) {
      console.log(`\n🔄 Testing batch size: ${batchSize}`);
      this.metrics.reset();

      const startTime = Date.now();
      const promises = [];

      // Create batch of requests
      for (let i = 0; i < batchSize; i++) {
        const test = TEST_SCENARIOS.individual[i % TEST_SCENARIOS.individual.length];
        const promise = makeRequest(this.baseUrl, test.endpoint)
          .then((result) => {
            this.metrics.addRequest(test.name, result.duration, result.statusCode);
          })
          .catch((error) => {
            this.metrics.addRequest(test.name, error.duration, 0, error.error);
          });
        promises.push(promise);
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const stats = this.metrics.getStats();
      console.log(
        `   Duration: ${totalTime}ms | Avg: ${stats.averageDuration.toFixed(0)}ms | Success: ${stats.successRate.toFixed(1)}%`
      );
    }
  }

  async runCacheTests() {
    console.log("\n💾 Running Cache Performance Tests...");
    console.log("=".repeat(60));

    for (const test of TEST_SCENARIOS.cache) {
      console.log(`\n🔄 Testing cache for: ${test.name}`);
      this.metrics.reset();

      // First request (cache miss)
      try {
        const result1 = await makeRequest(this.baseUrl, test.endpoint);
        this.metrics.addRequest(`${test.name} (Miss)`, result1.duration, result1.statusCode);
        console.log(`   Cache Miss: ${result1.duration}ms`);
      } catch (error) {
        this.metrics.addRequest(`${test.name} (Miss)`, error.duration, 0, error.error);
        console.log(`   Cache Miss: ERROR - ${error.error}`);
      }

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Second request (cache hit)
      try {
        const result2 = await makeRequest(this.baseUrl, test.endpoint);
        this.metrics.addRequest(`${test.name} (Hit)`, result2.duration, result2.statusCode);
        console.log(`   Cache Hit:  ${result2.duration}ms`);
      } catch (error) {
        this.metrics.addRequest(`${test.name} (Hit)`, error.duration, 0, error.error);
        console.log(`   Cache Hit:  ERROR - ${error.error}`);
      }
    }
  }

  async runStressTest(maxConcurrency = 200, duration = 60000) {
    console.log(
      `\n💥 Running Stress Test (${maxConcurrency} max concurrent, ${duration / 1000}s duration)...`
    );
    console.log("=".repeat(60));

    this.metrics.reset();
    const startTime = Date.now();

    // Gradually increase load
    const phases = [
      { concurrency: 10, duration: 10000 },
      { concurrency: 25, duration: 10000 },
      { concurrency: 50, duration: 10000 },
      { concurrency: 100, duration: 10000 },
      { concurrency: maxConcurrency, duration: 20000 },
    ];

    for (const phase of phases) {
      console.log(
        `\n📈 Phase: ${phase.concurrency} concurrent requests for ${phase.duration / 1000}s`
      );
      await this.runConcurrentTests(phase.concurrency, phase.duration);
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n💥 Stress Test Complete (${totalTime}ms total)`);
  }

  printFinalReport() {
    const stats = this.metrics.getStats();
    if (!stats) return;

    console.log("\n📊 FINAL PERFORMANCE REPORT");
    console.log("=".repeat(60));
    console.log(`Total Requests:     ${stats.totalRequests}`);
    console.log(
      `Successful:         ${stats.successfulRequests} (${stats.successRate.toFixed(1)}%)`
    );
    console.log(`Failed:             ${stats.failedRequests}`);
    console.log(`Errors:             ${stats.errorRequests}`);
    console.log(`Total Duration:     ${stats.totalDuration}ms`);
    console.log(`Requests/Second:    ${stats.requestsPerSecond.toFixed(2)}`);
    console.log("");
    console.log("Response Times:");
    console.log(`  Average:          ${stats.averageDuration.toFixed(0)}ms`);
    console.log(`  Median:           ${stats.medianDuration.toFixed(0)}ms`);
    console.log(`  95th Percentile:  ${stats.p95Duration.toFixed(0)}ms`);
    console.log(`  99th Percentile:  ${stats.p99Duration.toFixed(0)}ms`);
    console.log(`  Min:              ${stats.minDuration}ms`);
    console.log(`  Max:              ${stats.maxDuration}ms`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const useLocal = args.includes("--local");
  const baseUrl = useLocal ? LOCAL_URL : BASE_URL;

  console.log(`🚀 Translation Helps MCP Load Testing Suite`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const tester = new LoadTester(baseUrl);

  try {
    // Run all test suites
    await tester.runIndividualTests();
    await tester.runBatchTests();
    await tester.runCacheTests();
    await tester.runConcurrentTests(10, 15000); // 10 concurrent for 15s
    await tester.runStressTest(100, 30000); // Stress test with 100 max concurrent

    // Print final report
    tester.printFinalReport();
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LoadTester, PerformanceMetrics };
