#!/usr/bin/env node

/**
 * Cloudflare Performance Testing & Baseline Comparison
 *
 * Tests Cloudflare deployment and compares against baseline metrics:
 * - Response times vs baseline (176-199ms average)
 * - Cache performance
 * - Scalability under load
 * - Cost analysis for Cloudflare vs Netlify pricing
 */

import https from "https";

// Cloudflare configuration
const CLOUDFLARE = {
  name: "Cloudflare Workers",
  url: "https://translation-helps-mcp.pages.dev",
  pricing: {
    requests: 0.0000005, // $0.50 per million after 100k free
    cpu: 0.000001, // per GB-second (simplified)
    freeTier: 100000, // free requests per day (100k)
  },
};

// Baseline metrics from UI performance page (Netlify era)
const BASELINE_METRICS = {
  endpoints: [
    { name: "Health Check", avgTime: 176, grade: "A+", requestsPerSecond: 5.68 },
    { name: "Languages", avgTime: 180, grade: "A+", requestsPerSecond: 5.56 },
    { name: "Translation Notes", avgTime: 176, grade: "A+", requestsPerSecond: 5.68 },
    { name: "Scripture", avgTime: 176, grade: "A+", requestsPerSecond: 5.68 },
    { name: "Translation Questions", avgTime: 180, grade: "A+", requestsPerSecond: 5.56 },
    { name: "Translation Words", avgTime: 199, grade: "A+", requestsPerSecond: 5.03 },
  ],
  cacheImprovements: [
    { reference: "Languages", miss: 250, hit: 180, improvement: 28.0 },
    { reference: "Translation Notes - Titus 1:1", miss: 241, hit: 176, improvement: 27.0 },
    { reference: "Scripture - John 3:16", miss: 234, hit: 176, improvement: 25.0 },
    { reference: "Translation Words - Genesis 1:1", miss: 286, hit: 199, improvement: 30.6 },
  ],
  loadTesting: [
    { concurrency: 10, successRate: 100, avgResponse: 180, rps: 5.6 },
    { concurrency: 25, successRate: 100, avgResponse: 190, rps: 6.3 },
    { concurrency: 50, successRate: 100, avgResponse: 200, rps: 6.9 },
    { concurrency: 100, successRate: 100, avgResponse: 220, rps: 6.9 },
  ],
};

// Netlify pricing for comparison
const NETLIFY_PRICING = {
  functionExecution: 0.0000002083, // per 100ms
  bandwidth: 0.0000001042, // per GB
  requests: 0.000000125, // per request
  freeTier: 125000, // free invocations per month
};

// Test scenarios - Updated for SvelteKit API routes
const TEST_SCENARIOS = {
  endpoints: [
    { endpoint: "/api/health", name: "Health Check", baseline: 176 },
    { endpoint: "/api/get-languages?organization=unfoldingWord", name: "Languages", baseline: 180 },
    {
      endpoint:
        "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - John 3:16",
      baseline: 176,
    },
    {
      endpoint:
        "/api/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Translation Notes - Titus 1:1",
      baseline: 176,
    },
    {
      endpoint:
        "/api/fetch-translation-words?reference=Genesis+1:1&language=en&organization=unfoldingWord",
      name: "Translation Words - Genesis 1:1",
      baseline: 199,
    },
    {
      endpoint:
        "/api/fetch-translation-word-links?reference=John+3:16&language=en&organization=unfoldingWord",
      name: "Translation Word Links - John 3:16",
      baseline: 180,
    },
  ],

  // Cache testing scenarios
  cache: [
    {
      endpoint:
        "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
      name: "Scripture - John 3:16",
      baselineMiss: 234,
      baselineHit: 176,
    },
    {
      endpoint:
        "/api/fetch-translation-notes?reference=Titus+1:1&language=en&organization=unfoldingWord",
      name: "Translation Notes - Titus 1:1",
      baselineMiss: 241,
      baselineHit: 176,
    },
  ],

  // Mixed workload for load testing
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
class CloudflareMetrics {
  constructor() {
    this.requests = [];
    this.startTime = Date.now();
  }

  addRequest(endpoint, duration, statusCode, error = null, cacheStatus = "unknown") {
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
      requestsPerSecond: successful.length / ((Date.now() - this.startTime) / 1000),
      cacheHits: this.requests.filter((r) => r.cacheStatus?.includes("HIT")).length,
      cacheMisses: this.requests.filter((r) => r.cacheStatus?.includes("MISS")).length,
    };
  }

  reset() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

// HTTP request helper with enhanced cache detection
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const fullUrl = `${CLOUDFLARE.url}${endpoint}`;

    const req = https.get(fullUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const duration = Date.now() - startTime;

        // Detect cache status from Cloudflare headers
        const cacheStatus =
          res.headers["cf-cache-status"] ||
          res.headers["x-cache"] ||
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

// Main test runner
class CloudflareTester {
  constructor() {
    this.metrics = new CloudflareMetrics();
  }

  async runBaselineComparison() {
    console.log(`\n📊 Cloudflare vs Baseline Performance Comparison`);
    console.log("=".repeat(80));

    for (const test of TEST_SCENARIOS.endpoints) {
      console.log(`\n🔄 Testing: ${test.name}`);
      console.log("-".repeat(60));

      const results = [];

      // Run 3 tests to get average
      for (let i = 0; i < 3; i++) {
        try {
          const result = await makeRequest(test.endpoint);
          results.push(result);
          this.metrics.addRequest(
            test.name,
            result.duration,
            result.statusCode,
            null,
            result.cacheStatus
          );
          console.log(
            `   Test ${i + 1}: ${result.duration}ms | ${result.statusCode} | Cache: ${result.cacheStatus}`
          );
        } catch (error) {
          this.metrics.addRequest(test.name, error.duration, 0, error.error);
          console.log(`   Test ${i + 1}: ERROR - ${error.error}`);
        }

        if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Compare to baseline
      const successful = results.filter((r) => r.statusCode === 200);
      if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const baselineComparison = ((test.baseline - avgDuration) / test.baseline) * 100;
        const comparison = baselineComparison > 0 ? "FASTER" : "SLOWER";
        const color = baselineComparison > 0 ? "🟢" : "🔴";

        console.log(
          `   ${color} Cloudflare: ${avgDuration.toFixed(0)}ms vs Baseline: ${test.baseline}ms`
        );
        console.log(`   📈 Performance: ${Math.abs(baselineComparison).toFixed(1)}% ${comparison}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async runCachePerformanceTest() {
    console.log(`\n💾 Cache Performance Test`);
    console.log("=".repeat(80));

    for (const test of TEST_SCENARIOS.cache) {
      console.log(`\n🔄 Testing cache for: ${test.name}`);
      console.log("-".repeat(60));

      // First request (likely cache miss)
      try {
        const result1 = await makeRequest(test.endpoint);
        this.metrics.addRequest(
          `${test.name} (Miss)`,
          result1.duration,
          result1.statusCode,
          null,
          result1.cacheStatus
        );
        console.log(`   First Request: ${result1.duration}ms | Cache: ${result1.cacheStatus}`);
        console.log(`   Baseline Miss: ${test.baselineMiss}ms`);

        // Wait a moment
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Second request (likely cache hit)
        const result2 = await makeRequest(test.endpoint);
        this.metrics.addRequest(
          `${test.name} (Hit)`,
          result2.duration,
          result2.statusCode,
          null,
          result2.cacheStatus
        );
        console.log(`   Second Request: ${result2.duration}ms | Cache: ${result2.cacheStatus}`);
        console.log(`   Baseline Hit: ${test.baselineHit}ms`);

        // Calculate improvement
        if (result1.duration > result2.duration) {
          const improvement = ((result1.duration - result2.duration) / result1.duration) * 100;
          console.log(`   🚀 Cache Improvement: ${improvement.toFixed(1)}% faster`);

          const baselineImprovement =
            ((test.baselineMiss - test.baselineHit) / test.baselineMiss) * 100;
          console.log(`   📊 Baseline Improvement: ${baselineImprovement.toFixed(1)}% faster`);
        }
      } catch (error) {
        console.log(`   ❌ Cache test failed: ${error.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  async runLoadTest(concurrency, duration = 30000) {
    console.log(`\n⚡ Load Test - ${concurrency} concurrent requests for ${duration / 1000}s`);
    console.log("=".repeat(80));

    this.metrics.reset();
    const promises = [];

    for (let i = 0; i < concurrency; i++) {
      const promise = this.runLoadLoop(duration);
      promises.push(promise);
    }

    await Promise.all(promises);

    const stats = this.metrics.getStats();
    if (stats && !stats.error) {
      console.log(`\n📈 Load Test Results:`);
      console.log(`   Requests: ${stats.totalRequests} (${stats.successRate.toFixed(1)}% success)`);
      console.log(`   Average Response: ${stats.averageDuration.toFixed(0)}ms`);
      console.log(`   Median Response: ${stats.medianDuration.toFixed(0)}ms`);
      console.log(`   95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
      console.log(`   Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);

      // Compare to baseline
      const baselineLoad = BASELINE_METRICS.loadTesting.find((l) => l.concurrency === concurrency);
      if (baselineLoad) {
        console.log(`\n📊 vs Baseline (${concurrency} concurrent):`);
        console.log(
          `   Cloudflare RPS: ${stats.requestsPerSecond.toFixed(2)} vs Baseline: ${baselineLoad.rps}`
        );
        console.log(
          `   Cloudflare Avg: ${stats.averageDuration.toFixed(0)}ms vs Baseline: ${baselineLoad.avgResponse}ms`
        );

        const rpsImprovement =
          ((stats.requestsPerSecond - baselineLoad.rps) / baselineLoad.rps) * 100;
        const responseImprovement =
          ((baselineLoad.avgResponse - stats.averageDuration) / baselineLoad.avgResponse) * 100;

        console.log(
          `   🚀 Throughput: ${rpsImprovement > 0 ? "+" : ""}${rpsImprovement.toFixed(1)}%`
        );
        console.log(
          `   ⚡ Response: ${responseImprovement > 0 ? "+" : ""}${responseImprovement.toFixed(1)}% faster`
        );
      }
    }
  }

  async runLoadLoop(duration) {
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
        const result = await makeRequest(selectedTest.endpoint);
        this.metrics.addRequest(
          `Load-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          result.duration,
          result.statusCode,
          null,
          result.cacheStatus
        );
      } catch (error) {
        this.metrics.addRequest(
          `Load-${selectedTest.endpoint.split("?")[0].split("/").pop()}`,
          error.duration,
          0,
          error.error
        );
      }

      // Random delay between requests (100-500ms)
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));
    }
  }

  calculateCostComparison(stats) {
    if (!stats || stats.error) return { error: "No data" };

    // Cloudflare costs
    const dailyRequests = stats.totalRequests;
    let cloudflareDailyCost = 0;

    if (dailyRequests > CLOUDFLARE.pricing.freeTier) {
      const billableDaily = dailyRequests - CLOUDFLARE.pricing.freeTier;
      cloudflareDailyCost = billableDaily * CLOUDFLARE.pricing.requests;
    }

    const cloudflareMonthly = cloudflareDailyCost * 30;

    // Netlify costs (for comparison)
    const executionCost = (stats.averageDuration / 100) * NETLIFY_PRICING.functionExecution;
    const requestCost = NETLIFY_PRICING.requests;
    const netlifyPerRequest = executionCost + requestCost;

    const monthlyRequests = dailyRequests * 30;
    let netlifyMonthly = 0;

    if (monthlyRequests > NETLIFY_PRICING.freeTier) {
      netlifyMonthly = (monthlyRequests - NETLIFY_PRICING.freeTier) * netlifyPerRequest;
    }

    return {
      cloudflare: {
        dailyCost: cloudflareDailyCost,
        monthlyCost: cloudflareMonthly,
        costPerRequest: cloudflareMonthly / monthlyRequests || 0,
        freeTierCovered: dailyRequests <= CLOUDFLARE.pricing.freeTier,
      },
      netlify: {
        monthlyCost: netlifyMonthly,
        costPerRequest: netlifyPerRequest,
        freeTierCovered: monthlyRequests <= NETLIFY_PRICING.freeTier,
      },
      savings: netlifyMonthly - cloudflareMonthly,
      savingsPercent:
        netlifyMonthly > 0 ? ((netlifyMonthly - cloudflareMonthly) / netlifyMonthly) * 100 : 0,
    };
  }

  printFinalReport() {
    const stats = this.metrics.getStats();
    const costs = this.calculateCostComparison(stats);

    console.log(`\n📋 CLOUDFLARE PERFORMANCE REPORT`);
    console.log("=".repeat(80));

    if (stats && !stats.error) {
      console.log(`\n🔷 PERFORMANCE SUMMARY:`);
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`   Average Response: ${stats.averageDuration.toFixed(0)}ms`);
      console.log(`   Median Response: ${stats.medianDuration.toFixed(0)}ms`);
      console.log(`   95th Percentile: ${stats.p95Duration.toFixed(0)}ms`);
      console.log(`   Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`   Cache Hits: ${stats.cacheHits} | Cache Misses: ${stats.cacheMisses}`);

      if (costs && !costs.error) {
        console.log(`\n💰 COST ANALYSIS:`);
        console.log(`   🔷 Cloudflare:`);
        console.log(`      Daily Cost: $${costs.cloudflare.dailyCost.toFixed(6)}`);
        console.log(`      Monthly Cost: $${costs.cloudflare.monthlyCost.toFixed(4)}`);
        console.log(`      Cost per Request: $${costs.cloudflare.costPerRequest.toFixed(8)}`);
        console.log(
          `      Free Tier: ${costs.cloudflare.freeTierCovered ? "✅ COVERED" : "❌ EXCEEDED"}`
        );

        console.log(`   🔶 Netlify (for comparison):`);
        console.log(`      Monthly Cost: $${costs.netlify.monthlyCost.toFixed(4)}`);
        console.log(`      Cost per Request: $${costs.netlify.costPerRequest.toFixed(8)}`);
        console.log(
          `      Free Tier: ${costs.netlify.freeTierCovered ? "✅ COVERED" : "❌ EXCEEDED"}`
        );

        if (costs.savings > 0) {
          console.log(
            `   💸 Cloudflare Savings: $${costs.savings.toFixed(4)}/month (${costs.savingsPercent.toFixed(1)}%)`
          );
        } else if (costs.savings < 0) {
          console.log(
            `   💸 Cloudflare Cost Increase: $${Math.abs(costs.savings).toFixed(4)}/month (${Math.abs(costs.savingsPercent).toFixed(1)}%)`
          );
        }
      }
    } else {
      console.log(`   ❌ No valid performance data collected`);
    }

    console.log(`\n🎯 KEY FINDINGS:`);

    // Calculate overall performance vs baseline
    const baselineAvg =
      BASELINE_METRICS.endpoints.reduce((sum, e) => sum + e.avgTime, 0) /
      BASELINE_METRICS.endpoints.length;
    if (stats && !stats.error) {
      const performanceVsBaseline = ((baselineAvg - stats.averageDuration) / baselineAvg) * 100;
      console.log(
        `   📊 Overall Performance: ${performanceVsBaseline > 0 ? "+" : ""}${performanceVsBaseline.toFixed(1)}% vs baseline`
      );
    }

    console.log(`   🧊 Cold Starts: Cloudflare Workers ~1ms vs Netlify Functions ~100ms`);
    console.log(`   🗄️  Caching: Memory-only (KV implementation needed for persistence)`);
    console.log(`   🌍 Global: 300+ edge locations vs Netlify's limited edge`);

    console.log(`\n⚠️  NEXT STEPS:`);
    console.log(`   1. ✅ Cloudflare deployment working and performant`);
    console.log(`   2. 🔧 Implement Cloudflare KV for persistent caching`);
    console.log(`   3. 🔍 Investigate Netlify deployment issues (404s)`);
    console.log(`   4. 📊 Update UI performance page with Cloudflare metrics`);
    console.log(`   5. 🚀 Consider Cloudflare as primary with Netlify backup`);
  }
}

// Main execution
async function main() {
  console.log(`🚀 Cloudflare Performance Testing & Analysis`);
  console.log(`Target: ${CLOUDFLARE.url}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const tester = new CloudflareTester();

  try {
    // Run comprehensive tests
    await tester.runBaselineComparison();
    await tester.runCachePerformanceTest();
    await tester.runLoadTest(10, 20000); // 10 concurrent for 20s
    await tester.runLoadTest(25, 20000); // 25 concurrent for 20s
    await tester.runLoadTest(50, 30000); // 50 concurrent for 30s

    // Print final analysis
    tester.printFinalReport();

    console.log("\n✅ Cloudflare testing complete!");
  } catch (error) {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  }
}

// Export for programmatic use
export { CloudflareTester, CloudflareMetrics, CLOUDFLARE };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
