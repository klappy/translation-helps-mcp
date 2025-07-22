/**
 * K6 Peak Load Test - 1000 RPS
 *
 * Tests the system under production peak load conditions.
 * This validates our main performance requirement from the PRD.
 *
 * Validates Task 14 requirements from implementation plan.
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Histogram, Rate, Trend } from "k6/metrics";

// Custom metrics for detailed analysis
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");
const responseSizeHistogram = new Histogram("response_size");
const cacheHitRate = new Rate("cache_hits");
const endpointLatency = new Trend("endpoint_latency");

// Test configuration for peak load
export const options = {
  stages: [
    { duration: "5m", target: 200 }, // Gradual ramp up
    { duration: "5m", target: 500 }, // Mid-range load
    { duration: "5m", target: 800 }, // Near peak
    { duration: "10m", target: 1000 }, // PEAK LOAD - 1000 RPS!
    { duration: "5m", target: 500 }, // Scale down
    { duration: "3m", target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% under 1 second at peak
    http_req_failed: ["rate<0.005"], // Error rate under 0.5% at peak
    errors: ["rate<0.01"], // Custom error rate under 1%
    response_time: ["p(90)<800"], // 90% under 800ms
    cache_hits: ["rate>0.7"], // Cache hit rate over 70%
    endpoint_latency: ["p(99)<2000"], // 99% under 2 seconds
  },
  ext: {
    loadimpact: {
      name: "Translation Helps API - Peak Load Test (1000 RPS)",
      distribution: {
        "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 60 },
        "amazon:eu:dublin": { loadZone: "amazon:eu:dublin", percent: 30 },
        "amazon:ap:singapore": { loadZone: "amazon:ap:singapore", percent: 10 },
      },
    },
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)", "p(99.5)"],
};

// Realistic production endpoint usage patterns
const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    weight: 5, // 5% - monitoring calls
    params: {},
    cacheExpected: false,
  },
  {
    name: "Fetch Scripture",
    url: "/api/fetch-scripture",
    weight: 35, // 35% - primary use case
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Fetch Scripture Range",
    url: "/api/fetch-scripture",
    weight: 15, // 15% - verse ranges
    params: {
      reference: "Romans 1:1-5",
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Translation Notes",
    url: "/api/fetch-translation-notes",
    weight: 20, // 20% - translation help
    params: {
      reference: "Romans 1:1",
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Translation Words",
    url: "/api/get-translation-word",
    weight: 10, // 10% - word lookups
    params: {
      word: "faith",
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Get Languages",
    url: "/api/get-languages",
    weight: 8, // 8% - resource discovery
    params: {
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Browse Words",
    url: "/api/browse-translation-words",
    weight: 4, // 4% - exploration
    params: {
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
  {
    name: "Translation Questions",
    url: "/api/fetch-translation-questions",
    weight: 3, // 3% - checking questions
    params: {
      reference: "Matthew 1:1",
      language: "en",
      organization: "unfoldingWord",
    },
    cacheExpected: true,
  },
];

// Varied scripture references for more realistic load
const scriptureReferences = [
  "John 3:16",
  "Romans 1:1",
  "Matthew 5:3-12",
  "Psalm 23:1",
  "Genesis 1:1",
  "1 Corinthians 13:4-8",
  "Isaiah 53:3-6",
  "Mark 12:30-31",
  "Ephesians 2:8-9",
  "Philippians 4:13",
];

const translationWords = [
  "faith",
  "love",
  "grace",
  "salvation",
  "righteousness",
  "glory",
  "covenant",
  "kingdom",
  "peace",
  "hope",
];

// Get base URL from environment or default
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (random <= cumulativeWeight) {
      // Add variety to requests
      const endpointCopy = { ...endpoint };

      if (endpoint.name.includes("Scripture")) {
        endpointCopy.params = {
          ...endpoint.params,
          reference: scriptureReferences[Math.floor(Math.random() * scriptureReferences.length)],
        };
      }

      if (endpoint.name.includes("Translation Words")) {
        endpointCopy.params = {
          ...endpoint.params,
          word: translationWords[Math.floor(Math.random() * translationWords.length)],
        };
      }

      return endpointCopy;
    }
  }

  return endpoints[0]; // Fallback
}

function buildUrl(endpoint) {
  const url = new URL(endpoint.url, BASE_URL);

  // Add query parameters
  Object.keys(endpoint.params).forEach((key) => {
    url.searchParams.append(key, endpoint.params[key]);
  });

  return url.toString();
}

export default function () {
  const endpoint = selectEndpoint();
  const url = buildUrl(endpoint);

  // Add request headers
  const params = {
    headers: {
      "User-Agent": "K6-Peak-Load-Test/1.0",
      Accept: "application/json",
      "X-Test-Type": "peak-load",
      "Cache-Control": "max-age=300", // Allow caching for 5 minutes
    },
    timeout: "30s",
  };

  // Make the request
  const startTime = Date.now();
  const response = http.get(url, params);
  const endTime = Date.now();

  // Record metrics
  requestCount.add(1);
  responseTime.add(endTime - startTime);
  responseSizeHistogram.add(response.body.length);
  endpointLatency.add(response.timings.duration);

  // Check for cache hits (simple heuristic)
  const isCacheHit = response.timings.duration < 100 && endpoint.cacheExpected;
  cacheHitRate.add(isCacheHit);

  // Comprehensive validation
  const isSuccess = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 1000ms": (r) => r.timings.duration < 1000,
    "response time < 2000ms": (r) => r.timings.duration < 2000,
    "has valid JSON": (r) => {
      try {
        const parsed = JSON.parse(r.body);
        return parsed !== null;
      } catch (e) {
        return false;
      }
    },
    "response size > 0": (r) => r.body.length > 0,
    "no server errors": (r) => r.status < 500,
    [`${endpoint.name} endpoint works`]: (r) => r.status === 200,
  });

  // Record errors
  errorRate.add(!isSuccess);

  // Enhanced logging for peak load analysis
  if (Math.random() < 0.005) {
    // 0.5% sampling to avoid log spam
    const cacheStatus = isCacheHit ? "HIT" : "MISS";
    console.log(
      `[PEAK] ${endpoint.name} ${response.status} ${Math.round(response.timings.duration)}ms ${Math.round(response.body.length / 1024)}KB [${cacheStatus}]`
    );
  }

  // Log performance warnings
  if (response.timings.duration > 1000) {
    console.warn(`[SLOW] ${endpoint.name} took ${Math.round(response.timings.duration)}ms`);
  }

  // Realistic user behavior with some urgency
  sleep(Math.random() * 0.3 + 0.1); // 0.1-0.4 second pause (faster than baseline)
}

export function handleSummary(data) {
  // Calculate additional metrics
  const totalRequests = data.metrics.http_reqs.values.count;
  const avgRPS = data.metrics.http_reqs.values.rate;
  const peakSuccessRate = 100 - data.metrics.http_req_failed.values.rate * 100;

  return {
    "peak-load-test-results.json": JSON.stringify(data, null, 2),
    "peak-load-test-summary.txt": textSummary(data),
    "peak-load-test-detailed.html": htmlSummary(data),
  };
}

function textSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const peakSuccessRate = (100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2);

  return `
🚀 PEAK LOAD TEST RESULTS - 1000 RPS TARGET
=============================================

🎯 PERFORMANCE TARGETS:
   Target RPS: 1000
   Actual RPS: ${avgRPS}
   Target Achievement: ${((avgRPS / 1000) * 100).toFixed(1)}%

⚡ RESPONSE TIME ANALYSIS:
   Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   50th Percentile: ${Math.round(data.metrics.http_req_duration.values.med)}ms
   95th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms
   99th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms
   99.5th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99.5)"])}ms

✅ RELIABILITY METRICS:
   Success Rate: ${peakSuccessRate}%
   Failed Requests: ${data.metrics.http_req_failed.values.count}
   Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(3)}%
   Total Requests: ${data.metrics.http_reqs.values.count}

🎯 THRESHOLD VALIDATION:
   P95 Response < 1000ms: ${data.metrics.http_req_duration.values["p(95)"] < 1000 ? "✅ PASS" : "❌ FAIL"}
   Error Rate < 0.5%: ${data.metrics.http_req_failed.values.rate < 0.005 ? "✅ PASS" : "❌ FAIL"}
   P90 Response < 800ms: ${data.metrics.response_time.values["p(90)"] < 800 ? "✅ PASS" : "❌ FAIL"}
   Cache Hit Rate > 70%: ${data.metrics.cache_hits.values.rate > 0.7 ? "✅ PASS" : "❌ FAIL"}

💾 CACHE PERFORMANCE:
   Cache Hit Rate: ${(data.metrics.cache_hits.values.rate * 100).toFixed(1)}%
   Cache Effectiveness: ${data.metrics.cache_hits.values.rate > 0.7 ? "EXCELLENT" : "NEEDS IMPROVEMENT"}

🌐 RESOURCE UTILIZATION:
   Data Sent: ${Math.round(data.metrics.data_sent.values.count / 1024 / 1024)}MB
   Data Received: ${Math.round(data.metrics.data_received.values.count / 1024 / 1024)}MB
   Avg Response Size: ${Math.round(data.metrics.data_received.values.count / data.metrics.http_reqs.values.count)}B
   Virtual Users (Peak): ${data.metrics.vus_max.values.max}

🎉 PRODUCTION READINESS: ${avgRPS >= 800 && peakSuccessRate >= 99.5 ? "✅ READY" : "⚠️ NEEDS OPTIMIZATION"}

Test Duration: 33 minutes
Test Completed: ${new Date().toISOString()}
`;
}

function htmlSummary(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Peak Load Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🚀 Peak Load Test Results - 1000 RPS</h1>
    <div class="metric">
        <h3>Request Rate: ${Math.round(data.metrics.http_reqs.values.rate)} RPS</h3>
        <p>Target: 1000 RPS | Achievement: ${((data.metrics.http_reqs.values.rate / 1000) * 100).toFixed(1)}%</p>
    </div>
    <div class="metric">
        <h3>Success Rate: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</h3>
        <p>Failed Requests: ${data.metrics.http_req_failed.values.count}</p>
    </div>
    <div class="metric">
        <h3>Response Times</h3>
        <p>P95: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms</p>
        <p>P99: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms</p>
    </div>
    <p>Generated: ${new Date().toISOString()}</p>
</body>
</html>
`;
}
