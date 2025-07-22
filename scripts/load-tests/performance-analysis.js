#!/usr/bin/env node

/**
 * Focused Performance Analysis for Translation Helps MCP
 * Provides detailed insights into specific performance scenarios
 */

import https from "https";
import http from "http";

const BASE_URL = "https://translation-helps-mcp.netlify.app";

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
          data: data.substring(0, 200) + "...",
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

// Performance metrics
class PerformanceAnalyzer {
  constructor() {
    this.results = [];
  }

  addResult(testName, duration, statusCode, error = null) {
    this.results.push({
      testName,
      duration,
      statusCode,
      error,
      timestamp: Date.now(),
    });
  }

  getStats() {
    if (this.results.length === 0) return null;

    const durations = this.results.map((r) => r.duration);
    const successful = this.results.filter((r) => r.statusCode === 200);
    const failed = this.results.filter((r) => r.statusCode !== 200);

    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      successRate: (successful.length / this.results.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: this.getMedian(durations),
      p95Duration: this.getPercentile(durations, 95),
      p99Duration: this.getPercentile(durations, 99),
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
    this.results = [];
  }

  printResults() {
    const stats = this.getStats();
    if (!stats) return;

    console.log(`\n📊 Results: ${this.results.length} requests`);
    console.log(`Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`Average: ${stats.averageDuration.toFixed(0)}ms`);
    console.log(`Median: ${stats.medianDuration.toFixed(0)}ms`);
    console.log(`95th %: ${stats.p95Duration.toFixed(0)}ms`);
    console.log(`Min: ${stats.minDuration}ms | Max: ${stats.maxDuration}ms`);
  }
}

// Test scenarios
const TEST_SCENARIOS = {
  scripture: [
    { reference: "John+3:16", name: "John 3:16" },
    { reference: "Genesis+1:1", name: "Genesis 1:1" },
    { reference: "Psalm+23:1", name: "Psalm 23:1" },
    { reference: "Matthew+5:1", name: "Matthew 5:1" },
    { reference: "Titus+1:1", name: "Titus 1:1" },
  ],
  translationNotes: [
    { reference: "Titus+1:1", name: "Titus 1:1" },
    { reference: "Matthew+5:1", name: "Matthew 5:1" },
    { reference: "John+3:16", name: "John 3:16" },
  ],
  translationWords: [
    { reference: "Genesis+1:1", name: "Genesis 1:1" },
    { reference: "John+3:16", name: "John 3:16" },
  ],
};

async function runCachePerformanceTest() {
  console.log("\n💾 CACHE PERFORMANCE ANALYSIS");
  console.log("=".repeat(50));

  const analyzer = new PerformanceAnalyzer();

  for (const test of TEST_SCENARIOS.scripture) {
    const endpoint = `/.netlify/functions/fetch-scripture?reference=${test.reference}&language=en&organization=unfoldingWord&translation=all`;

    console.log(`\n🔄 Testing: ${test.name}`);

    // First request (cache miss)
    try {
      const result1 = await makeRequest(BASE_URL, endpoint);
      analyzer.addResult(`${test.name} (Miss)`, result1.duration, result1.statusCode);
      console.log(`   Cache Miss: ${result1.duration}ms`);
    } catch (error) {
      analyzer.addResult(`${test.name} (Miss)`, error.duration, 0, error.error);
      console.log(`   Cache Miss: ERROR - ${error.error}`);
    }

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second request (cache hit)
    try {
      const result2 = await makeRequest(BASE_URL, endpoint);
      analyzer.addResult(`${test.name} (Hit)`, result2.duration, result2.statusCode);
      console.log(`   Cache Hit:  ${result2.duration}ms`);

      const improvement = (
        ((result1.duration - result2.duration) / result1.duration) *
        100
      ).toFixed(1);
      console.log(`   Improvement: ${improvement}% faster`);
    } catch (error) {
      analyzer.addResult(`${test.name} (Hit)`, error.duration, 0, error.error);
      console.log(`   Cache Hit:  ERROR - ${error.error}`);
    }

    // Wait between different references
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  analyzer.printResults();
}

async function runConcurrentLoadTest(concurrency, duration = 30000) {
  console.log(`\n⚡ CONCURRENT LOAD TEST (${concurrency} concurrent, ${duration / 1000}s)`);
  console.log("=".repeat(50));

  const analyzer = new PerformanceAnalyzer();
  const startTime = Date.now();
  const promises = [];

  // Create concurrent request loops
  for (let i = 0; i < concurrency; i++) {
    const promise = runConcurrentLoop(duration, analyzer);
    promises.push(promise);
  }

  await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  console.log(`\n📈 Load Test Complete (${totalTime}ms total)`);
  analyzer.printResults();

  const stats = analyzer.getStats();
  console.log(`\n🚀 Performance Metrics:`);
  console.log(`Requests/Second: ${(stats.totalRequests / (totalTime / 1000)).toFixed(2)}`);
  console.log(`Average Response Time: ${stats.averageDuration.toFixed(0)}ms`);
  console.log(`95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
}

async function runConcurrentLoop(duration, analyzer) {
  const endTime = Date.now() + duration;
  const endpoints = [
    "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
    "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
    "/.netlify/functions/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
    "/.netlify/functions/health",
  ];

  while (Date.now() < endTime) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    try {
      const result = await makeRequest(BASE_URL, endpoint);
      analyzer.addResult(
        `Concurrent-${endpoint.split("?")[0].split("/").pop()}`,
        result.duration,
        result.statusCode
      );
    } catch (error) {
      analyzer.addResult(
        `Concurrent-${endpoint.split("?")[0].split("/").pop()}`,
        error.duration,
        0,
        error.error
      );
    }

    // Random delay between 200-800ms
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 600));
  }
}

async function runBatchSizeTest(batchSizes = [5, 10, 20, 50]) {
  console.log("\n📦 BATCH SIZE PERFORMANCE TEST");
  console.log("=".repeat(50));

  const endpoints = [
    "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
    "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
    "/.netlify/functions/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
    "/.netlify/functions/health",
  ];

  for (const batchSize of batchSizes) {
    console.log(`\n🔄 Testing batch size: ${batchSize}`);
    const analyzer = new PerformanceAnalyzer();

    const startTime = Date.now();
    const promises = [];

    // Create batch of requests
    for (let i = 0; i < batchSize; i++) {
      const endpoint = endpoints[i % endpoints.length];
      const promise = makeRequest(BASE_URL, endpoint)
        .then((result) => {
          analyzer.addResult(`Batch-${batchSize}`, result.duration, result.statusCode);
        })
        .catch((error) => {
          analyzer.addResult(`Batch-${batchSize}`, error.duration, 0, error.error);
        });
      promises.push(promise);
    }

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const stats = analyzer.getStats();
    console.log(
      `   Duration: ${totalTime}ms | Avg: ${stats.averageDuration.toFixed(0)}ms | Success: ${stats.successRate.toFixed(1)}%`
    );
    console.log(`   Throughput: ${(batchSize / (totalTime / 1000)).toFixed(2)} requests/second`);
  }
}

async function runEndpointComparison() {
  console.log("\n🔍 ENDPOINT COMPARISON TEST");
  console.log("=".repeat(50));

  const endpoints = [
    { endpoint: "/.netlify/functions/health", name: "Health Check" },
    {
      endpoint:
        "/.netlify/functions/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture (John 3:16)",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Translation Notes (Titus 1:1)",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      name: "Translation Words (Genesis 1:1)",
    },
    {
      endpoint:
        "/.netlify/functions/fetch-translation-questions?reference=Matthew+5:1&language=en&organization=unfoldingWord",
      name: "Translation Questions (Matthew 5:1)",
    },
  ];

  for (const test of endpoints) {
    console.log(`\n🔄 Testing: ${test.name}`);
    const analyzer = new PerformanceAnalyzer();

    // Run 3 requests to get average
    for (let i = 0; i < 3; i++) {
      try {
        const result = await makeRequest(BASE_URL, test.endpoint);
        analyzer.addResult(test.name, result.duration, result.statusCode);
        console.log(`   Request ${i + 1}: ${result.duration}ms`);
      } catch (error) {
        analyzer.addResult(test.name, error.duration, 0, error.error);
        console.log(`   Request ${i + 1}: ERROR - ${error.error}`);
      }

      if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const stats = analyzer.getStats();
    console.log(
      `   Average: ${stats.averageDuration.toFixed(0)}ms | Success: ${stats.successRate.toFixed(1)}%`
    );
  }
}

async function main() {
  console.log(`🚀 Translation Helps MCP Performance Analysis`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Run all analysis tests
    await runEndpointComparison();
    await runCachePerformanceTest();
    await runBatchSizeTest();
    await runConcurrentLoadTest(10, 15000); // 10 concurrent for 15s
    await runConcurrentLoadTest(25, 15000); // 25 concurrent for 15s

    console.log("\n✅ Performance analysis complete!");
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
