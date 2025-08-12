/**
 * K6 Baseline Load Test - 100 RPS
 *
 * Tests the system under normal load conditions to establish
 * baseline performance metrics.
 *
 * Validates Task 14 requirements from implementation plan.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics for detailed analysis
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 RPS
    { duration: "5m", target: 100 }, // Stay at 100 RPS
    { duration: "2m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% under 500ms
    http_req_failed: ["rate<0.001"], // Error rate under 0.1%
    errors: ["rate<0.01"], // Custom error rate under 1%
    response_time: ["p(90)<400"], // 90% under 400ms
  },
  ext: {
    loadimpact: {
      name: "Translation Helps API - Baseline Load Test",
      distribution: {
        "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 100 },
      },
    },
  },
};

// Test endpoints with different load patterns
const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    weight: 10, // 10% of requests
    params: {},
  },
  {
    name: "Fetch Scripture",
    url: "/api/fetch-scripture",
    weight: 30, // 30% of requests
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
  },
  {
    name: "Translation Notes",
    url: "/api/fetch-translation-notes",
    weight: 20, // 20% of requests
    params: {
      reference: "Romans 1:1",
      language: "en",
      organization: "unfoldingWord",
    },
  },
  {
    name: "Translation Words",
    url: "/api/get-translation-word",
    weight: 15, // 15% of requests
    params: {
      word: "faith",
      language: "en",
      organization: "unfoldingWord",
    },
  },
  {
    name: "Get Languages",
    url: "/api/get-languages",
    weight: 15, // 15% of requests
    params: {
      organization: "unfoldingWord",
    },
  },
  {
    name: "Browse Words",
    url: "/api/browse-translation-words",
    weight: 10, // 10% of requests
    params: {
      language: "en",
      organization: "unfoldingWord",
    },
  },
];

// Get base URL from environment or default
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (random <= cumulativeWeight) {
      return endpoint;
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
      "User-Agent": "K6-Load-Test/1.0",
      Accept: "application/json",
      "X-Test-Type": "baseline-load",
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

  // Validate response
  const isSuccess = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "has valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
    "response size > 0": (r) => r.body.length > 0,
    [`${endpoint.name} endpoint works`]: (r) => r.status === 200,
  });

  // Record errors
  errorRate.add(!isSuccess);

  // Log detailed info for debugging (sample)
  if (Math.random() < 0.01) {
    // 1% sampling
    console.log(
      `[${endpoint.name}] ${response.status} ${response.timings.duration}ms ${response.body.length}B`,
    );
  }

  // Realistic user behavior - small pause between requests
  sleep(Math.random() * 0.5 + 0.5); // 0.5-1.0 second pause
}

export function handleSummary(data) {
  return {
    "baseline-load-test-results.json": JSON.stringify(data, null, 2),
    "baseline-load-test-summary.txt": textSummary(data, {
      indent: " ",
      enableColors: true,
    }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || "";

  return `
${indent}📊 BASELINE LOAD TEST RESULTS (100 RPS)
${indent}=====================================
${indent}
${indent}🎯 Test Overview:
${indent}   Duration: 9 minutes total
${indent}   Target RPS: 100
${indent}   Virtual Users: ${data.metrics.vus_max.values.max}
${indent}   Total Requests: ${data.metrics.http_reqs.values.count}
${indent}
${indent}⚡ Performance Metrics:
${indent}   Avg Response Time: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
${indent}   95th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms
${indent}   99th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms
${indent}   Request Rate: ${Math.round(data.metrics.http_reqs.values.rate)} req/s
${indent}
${indent}✅ Success Metrics:
${indent}   Success Rate: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
${indent}   Failed Requests: ${data.metrics.http_req_failed.values.count}
${indent}   Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(3)}%
${indent}
${indent}🌐 Network Metrics:
${indent}   Data Sent: ${Math.round(data.metrics.data_sent.values.count / 1024 / 1024)}MB
${indent}   Data Received: ${Math.round(data.metrics.data_received.values.count / 1024 / 1024)}MB
${indent}   Avg Response Size: ${Math.round(data.metrics.data_received.values.count / data.metrics.http_reqs.values.count)}B
${indent}
${indent}🎯 Threshold Results:
${indent}   Response Time P95 < 500ms: ${data.metrics.http_req_duration.values["p(95)"] < 500 ? "✅ PASS" : "❌ FAIL"}
${indent}   Error Rate < 0.1%: ${data.metrics.http_req_failed.values.rate < 0.001 ? "✅ PASS" : "❌ FAIL"}
${indent}   Custom Error Rate < 1%: ${data.metrics.errors.values.rate < 0.01 ? "✅ PASS" : "❌ FAIL"}
${indent}
${indent}📈 Baseline established for future load testing!
${indent}
`;
}
