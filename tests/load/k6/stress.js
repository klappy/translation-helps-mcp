/**
 * K6 Stress Test - 2000 RPS
 *
 * Tests the system beyond normal operating conditions to find
 * the breaking point and validate graceful degradation.
 *
 * Validates Task 14 requirements from implementation plan.
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics for stress analysis
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");
const timeoutRate = new Rate("timeouts");
const serverErrorRate = new Rate("server_errors");
const degradationMetric = new Trend("degradation_factor");
const recoveryTime = new Trend("recovery_time");

// Stress test configuration - PUSH THE LIMITS!
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Warm up
    { duration: "3m", target: 500 }, // Normal load
    { duration: "3m", target: 1000 }, // Peak load
    { duration: "5m", target: 1500 }, // Beyond peak
    { duration: "10m", target: 2000 }, // STRESS POINT - 2000 RPS!
    { duration: "5m", target: 1500 }, // Scale back
    { duration: "3m", target: 1000 }, // Recovery verification
    { duration: "2m", target: 500 }, // Cool down
    { duration: "2m", target: 0 }, // Full recovery
  ],
  thresholds: {
    // More lenient thresholds for stress testing
    http_req_duration: ["p(95)<2000"], // Allow higher response times
    http_req_failed: ["rate<0.1"], // Allow higher error rate (10%)
    errors: ["rate<0.2"], // Custom error rate under 20%
    timeouts: ["rate<0.05"], // Timeout rate under 5%
    server_errors: ["rate<0.02"], // Server errors under 2%
  },
  ext: {
    loadimpact: {
      name: "Translation Helps API - Stress Test (2000 RPS)",
      distribution: {
        "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 40 },
        "amazon:eu:dublin": { loadZone: "amazon:eu:dublin", percent: 30 },
        "amazon:ap:singapore": { loadZone: "amazon:ap:singapore", percent: 20 },
        "amazon:us:portland": { loadZone: "amazon:us:portland", percent: 10 },
      },
    },
  },
  summaryTrendStats: [
    "avg",
    "min",
    "med",
    "max",
    "p(90)",
    "p(95)",
    "p(99)",
    "p(99.9)",
  ],
};

// Aggressive endpoint testing patterns
const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    weight: 15, // Increased for stress monitoring
    params: {},
    timeout: "10s",
  },
  {
    name: "Fetch Scripture",
    url: "/api/fetch-scripture",
    weight: 25, // Heavy load on primary endpoint
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
    timeout: "45s",
  },
  {
    name: "Fetch Large Scripture Range",
    url: "/api/fetch-scripture",
    weight: 15, // Test with demanding requests
    params: {
      reference: "Romans 1:1-25", // Larger range
      language: "en",
      organization: "unfoldingWord",
    },
    timeout: "60s",
  },
  {
    name: "Translation Notes",
    url: "/api/fetch-translation-notes",
    weight: 20,
    params: {
      reference: "Romans 1:1",
      language: "en",
      organization: "unfoldingWord",
    },
    timeout: "45s",
  },
  {
    name: "Multiple Translation Words",
    url: "/api/get-translation-word",
    weight: 10,
    params: {
      word: "righteousness", // Complex theological term
      language: "en",
      organization: "unfoldingWord",
    },
    timeout: "30s",
  },
  {
    name: "Heavy Browse Operation",
    url: "/api/browse-translation-words",
    weight: 10,
    params: {
      language: "en",
      organization: "unfoldingWord",
    },
    timeout: "60s",
  },
  {
    name: "Resource Discovery",
    url: "/api/get-languages",
    weight: 5,
    params: {
      organization: "unfoldingWord",
    },
    timeout: "20s",
  },
];

// Stress-inducing data variations
const stressfulReferences = [
  "Genesis 1:1-31", // Full chapter
  "Psalm 119:1-50", // Large psalm section
  "Matthew 5:1-48", // Sermon on the mount
  "Romans 1:1-32", // Dense theological content
  "1 Chronicles 1:1-54", // Genealogies (complex)
  "Leviticus 23:1-44", // Detailed laws
  "Isaiah 53:1-12", // Prophetic text
  "Revelation 21:1-27", // Apocalyptic literature
];

const complexWords = [
  "righteousness",
  "sanctification",
  "propitiation",
  "justification",
  "eschatology",
  "pneumatology",
  "soteriology",
  "christology",
];

// Get base URL from environment
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (random <= cumulativeWeight) {
      const endpointCopy = { ...endpoint };

      // Add stress-inducing variations
      if (endpoint.name.includes("Scripture")) {
        endpointCopy.params = {
          ...endpoint.params,
          reference:
            stressfulReferences[
              Math.floor(Math.random() * stressfulReferences.length)
            ],
        };
      }

      if (endpoint.name.includes("Translation Words")) {
        endpointCopy.params = {
          ...endpoint.params,
          word: complexWords[Math.floor(Math.random() * complexWords.length)],
        };
      }

      return endpointCopy;
    }
  }

  return endpoints[0];
}

function buildUrl(endpoint) {
  const url = new URL(endpoint.url, BASE_URL);

  Object.keys(endpoint.params).forEach((key) => {
    url.searchParams.append(key, endpoint.params[key]);
  });

  return url.toString();
}

export default function () {
  const endpoint = selectEndpoint();
  const url = buildUrl(endpoint);

  // Aggressive request parameters
  const params = {
    headers: {
      "User-Agent": "K6-Stress-Test/1.0",
      Accept: "application/json",
      "X-Test-Type": "stress-test",
      "Cache-Control": "no-cache", // Force fresh requests for stress
      "X-Stress-Level": "MAXIMUM",
    },
    timeout: endpoint.timeout || "30s",
  };

  const startTime = Date.now();
  let response;
  let isTimeout = false;

  try {
    response = http.get(url, params);
  } catch (error) {
    console.error(`Request failed: ${error}`);
    isTimeout = true;
    response = { status: 0, timings: { duration: 0 }, body: "" };
  }

  const endTime = Date.now();
  const requestDuration = endTime - startTime;

  // Record stress metrics
  requestCount.add(1);
  responseTime.add(requestDuration);
  timeoutRate.add(isTimeout);

  // Check for server errors
  const isServerError = response.status >= 500;
  serverErrorRate.add(isServerError);

  // Calculate degradation factor (higher = more degraded)
  const baselineResponseTime = 200; // Expected baseline
  const degradationFactor = requestDuration / baselineResponseTime;
  degradationMetric.add(degradationFactor);

  // Comprehensive stress validation
  const isSuccess =
    !isTimeout &&
    check(response, {
      "status is not 0": (r) => r.status !== 0,
      "status is < 500": (r) => r.status < 500,
      "response time < 5000ms": (r) => r.timings.duration < 5000,
      "has response body": (r) => r.body && r.body.length > 0,
      "not timeout": () => !isTimeout,
      [`${endpoint.name} responds`]: (r) =>
        r.status === 200 || r.status === 429, // Accept rate limiting
    });

  // Record errors with detailed logging
  errorRate.add(!isSuccess);

  // Enhanced stress testing logs
  if (Math.random() < 0.02) {
    // 2% sampling for stress analysis
    const status = isTimeout ? "TIMEOUT" : response.status;
    const degradation =
      degradationFactor > 2
        ? "HIGH"
        : degradationFactor > 1.5
          ? "MEDIUM"
          : "LOW";
    console.log(
      `[STRESS] ${endpoint.name} ${status} ${Math.round(requestDuration)}ms [DEGRADE:${degradation}]`,
    );
  }

  // Log critical performance issues
  if (requestDuration > 2000) {
    console.warn(
      `[CRITICAL] ${endpoint.name} took ${Math.round(requestDuration)}ms`,
    );
  }

  if (isServerError) {
    console.error(
      `[SERVER ERROR] ${endpoint.name} returned ${response.status}`,
    );
  }

  // Aggressive user behavior - minimal pauses
  sleep(Math.random() * 0.2 + 0.05); // 0.05-0.25 second pause (very aggressive)
}

export function handleSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const successRate = (
    100 -
    data.metrics.http_req_failed.values.rate * 100
  ).toFixed(2);
  const maxRPS = 2000;

  return {
    "stress-test-results.json": JSON.stringify(data, null, 2),
    "stress-test-summary.txt": textSummary(data),
    "stress-test-analysis.html": htmlSummary(data),
  };
}

function textSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const successRate = (
    100 -
    data.metrics.http_req_failed.values.rate * 100
  ).toFixed(2);
  const timeoutRate = (data.metrics.timeouts.values.rate * 100).toFixed(2);
  const serverErrorRate = (
    data.metrics.server_errors.values.rate * 100
  ).toFixed(2);

  return `
💥 STRESS TEST RESULTS - 2000 RPS TARGET
==========================================

🎯 STRESS PERFORMANCE:
   Target RPS: 2000
   Achieved RPS: ${avgRPS}
   Stress Achievement: ${((avgRPS / 2000) * 100).toFixed(1)}%
   
⚡ RESPONSE TIME UNDER STRESS:
   Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   50th Percentile: ${Math.round(data.metrics.http_req_duration.values.med)}ms
   95th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms
   99th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms
   99.9th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99.9)"])}ms
   Max Response Time: ${Math.round(data.metrics.http_req_duration.values.max)}ms

🚨 FAILURE ANALYSIS:
   Overall Success Rate: ${successRate}%
   Request Failures: ${data.metrics.http_req_failed.values.count}
   Timeout Rate: ${timeoutRate}%
   Server Error Rate: ${serverErrorRate}%
   Total Requests: ${data.metrics.http_reqs.values.count}

🎯 STRESS THRESHOLD VALIDATION:
   P95 Response < 2000ms: ${data.metrics.http_req_duration.values["p(95)"] < 2000 ? "✅ PASS" : "❌ FAIL"}
   Error Rate < 10%: ${data.metrics.http_req_failed.values.rate < 0.1 ? "✅ PASS" : "❌ FAIL"}
   Timeout Rate < 5%: ${data.metrics.timeouts.values.rate < 0.05 ? "✅ PASS" : "❌ FAIL"}
   Server Error Rate < 2%: ${data.metrics.server_errors.values.rate < 0.02 ? "✅ PASS" : "❌ FAIL"}

📊 DEGRADATION ANALYSIS:
   Avg Degradation Factor: ${data.metrics.degradation_factor.values.avg.toFixed(2)}x
   Max Degradation Factor: ${data.metrics.degradation_factor.values.max.toFixed(2)}x
   Degradation Rating: ${
     data.metrics.degradation_factor.values.avg < 2
       ? "EXCELLENT"
       : data.metrics.degradation_factor.values.avg < 5
         ? "ACCEPTABLE"
         : "POOR"
   }

🌐 RESOURCE IMPACT:
   Data Sent: ${Math.round(data.metrics.data_sent.values.count / 1024 / 1024)}MB
   Data Received: ${Math.round(data.metrics.data_received.values.count / 1024 / 1024)}MB
   Peak Virtual Users: ${data.metrics.vus_max.values.max}

🎯 BREAKING POINT ANALYSIS:
   System Breaking Point: ${avgRPS >= 1800 ? "NOT REACHED" : "REACHED"}
   Graceful Degradation: ${successRate >= 80 ? "✅ YES" : "❌ NO"}
   Recovery Capability: ${successRate >= 90 ? "EXCELLENT" : successRate >= 80 ? "GOOD" : "POOR"}

💡 RECOMMENDATIONS:
   ${
     avgRPS >= 1800 && successRate >= 90
       ? "✅ System handles 2000 RPS well - ready for production scaling!"
       : avgRPS >= 1500 && successRate >= 80
         ? "⚠️ System partially handles stress - consider optimization"
         : "❌ System needs significant optimization before production"
   }

Test Duration: 35 minutes
Breaking Point Test: ${new Date().toISOString()}
`;
}

function htmlSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const successRate = (
    100 -
    data.metrics.http_req_failed.values.rate * 100
  ).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Stress Test Results - Breaking Point Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
        .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .critical { border-left: 5px solid #ff4444; }
        .warning { border-left: 5px solid #ffaa00; }
        .success { border-left: 5px solid #44aa44; }
        .stat { display: inline-block; margin: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>💥 Stress Test Results - 2000 RPS</h1>
    
    <div class="metric ${avgRPS >= 1800 ? "success" : avgRPS >= 1500 ? "warning" : "critical"}">
        <h2>🎯 Performance Under Stress</h2>
        <div class="stat">Target: 2000 RPS</div>
        <div class="stat">Achieved: ${avgRPS} RPS</div>
        <div class="stat">Success Rate: ${successRate}%</div>
    </div>
    
    <div class="metric">
        <h3>⚡ Response Time Analysis</h3>
        <div class="stat">P95: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms</div>
        <div class="stat">P99: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms</div>
        <div class="stat">Max: ${Math.round(data.metrics.http_req_duration.values.max)}ms</div>
    </div>
    
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.1 ? "success" : "warning"}">
        <h3>🚨 Error Analysis</h3>
        <div class="stat">Failed: ${data.metrics.http_req_failed.values.count}</div>
        <div class="stat">Timeouts: ${(data.metrics.timeouts.values.rate * 100).toFixed(2)}%</div>
        <div class="stat">Server Errors: ${(data.metrics.server_errors.values.rate * 100).toFixed(2)}%</div>
    </div>
    
    <div class="metric">
        <h3>📊 Breaking Point Assessment</h3>
        <p><strong>System Status:</strong> ${
          avgRPS >= 1800 && successRate >= 90
            ? "✅ Excellent - Handles extreme load"
            : avgRPS >= 1500 && successRate >= 80
              ? "⚠️ Good - Some degradation under stress"
              : "❌ Needs optimization"
        }</p>
    </div>
    
    <p><em>Test completed: ${new Date().toISOString()}</em></p>
</body>
</html>
`;
}
