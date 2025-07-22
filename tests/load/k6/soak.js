/**
 * K6 Soak Test - 500 RPS for 24 Hours
 *
 * Tests system endurance and stability over extended periods.
 * Validates memory leaks, resource accumulation, and long-term reliability.
 *
 * Validates Task 14 requirements from implementation plan.
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics for soak testing
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");
const memoryLeakIndicator = new Trend("memory_leak_indicator");
const stabilityMetric = new Rate("stability");
const hourlyPerformance = new Trend("hourly_performance");

// 24-hour soak test configuration
export const options = {
  stages: [
    { duration: "10m", target: 100 }, // Warm up
    { duration: "10m", target: 250 }, // Ramp to half load
    { duration: "10m", target: 500 }, // Reach target load

    // THE BIG ONE - 24 HOURS AT 500 RPS!
    { duration: "24h", target: 500 }, // Endurance test

    { duration: "10m", target: 250 }, // Scale down
    { duration: "10m", target: 0 }, // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // Consistent performance over time
    http_req_failed: ["rate<0.01"], // Very low error rate for stability
    errors: ["rate<0.02"], // Custom error rate
    stability: ["rate>0.99"], // 99% stability required
    memory_leak_indicator: ["avg<2"], // Memory usage should stay stable
  },
  ext: {
    loadimpact: {
      name: "Translation Helps API - 24-Hour Soak Test",
      distribution: {
        "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 50 },
        "amazon:eu:dublin": { loadZone: "amazon:eu:dublin", percent: 50 },
      },
    },
  },
};

// Endurance-focused endpoint patterns
const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    weight: 20, // High frequency for monitoring
    params: {},
    category: "monitoring",
  },
  {
    name: "Fetch Scripture",
    url: "/api/fetch-scripture",
    weight: 30,
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
    category: "core",
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
    category: "core",
  },
  {
    name: "Translation Words",
    url: "/api/get-translation-word",
    weight: 15,
    params: {
      word: "faith",
      language: "en",
      organization: "unfoldingWord",
    },
    category: "reference",
  },
  {
    name: "Get Languages",
    url: "/api/get-languages",
    weight: 10,
    params: {
      organization: "unfoldingWord",
    },
    category: "discovery",
  },
  {
    name: "Browse Words",
    url: "/api/browse-translation-words",
    weight: 5,
    params: {
      language: "en",
      organization: "unfoldingWord",
    },
    category: "browse",
  },
];

// Realistic data for long-term testing
const longTermReferences = [
  "John 3:16",
  "Romans 1:1",
  "Genesis 1:1",
  "Psalm 23:1",
  "Matthew 5:3",
  "Luke 2:14",
  "Acts 2:38",
  "1 John 4:8",
  "Ephesians 2:8",
  "Philippians 4:13",
  "2 Timothy 3:16",
  "Hebrews 11:1",
  "James 1:17",
  "Revelation 21:4",
];

const words = ["faith", "love", "grace", "peace", "joy", "hope"];

// Get base URL from environment
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";

// Track test start time for memory leak detection
const testStartTime = Date.now();
let baselineResponseTime = null;
let hourCounter = 0;

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (random <= cumulativeWeight) {
      const endpointCopy = { ...endpoint };

      // Add realistic variation
      if (endpoint.name.includes("Scripture")) {
        endpointCopy.params = {
          ...endpoint.params,
          reference: longTermReferences[Math.floor(Math.random() * longTermReferences.length)],
        };
      }

      if (endpoint.name.includes("Translation Words")) {
        endpointCopy.params = {
          ...endpoint.params,
          word: words[Math.floor(Math.random() * words.length)],
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

  // Consistent headers for soak testing
  const params = {
    headers: {
      "User-Agent": "K6-Soak-Test/1.0",
      Accept: "application/json",
      "X-Test-Type": "soak-test",
      "X-Test-Hour": Math.floor((Date.now() - testStartTime) / (1000 * 60 * 60)),
    },
    timeout: "30s",
  };

  const startTime = Date.now();
  const response = http.get(url, params);
  const endTime = Date.now();
  const requestDuration = endTime - startTime;

  // Record soak metrics
  requestCount.add(1);
  responseTime.add(requestDuration);

  // Establish baseline on first successful request
  if (baselineResponseTime === null && response.status === 200) {
    baselineResponseTime = requestDuration;
  }

  // Memory leak detection (simple heuristic)
  if (baselineResponseTime !== null) {
    const memoryLeakFactor = requestDuration / baselineResponseTime;
    memoryLeakIndicator.add(memoryLeakFactor);
  }

  // Track hourly performance
  const currentHour = Math.floor((Date.now() - testStartTime) / (1000 * 60 * 60));
  if (currentHour !== hourCounter) {
    hourlyPerformance.add(requestDuration);
    hourCounter = currentHour;
  }

  // Stability validation
  const isStable = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 2000ms": (r) => r.timings.duration < 2000,
    "has valid response": (r) => r.body && r.body.length > 0,
    "no server errors": (r) => r.status < 500,
    [`${endpoint.name} stable`]: (r) => r.status === 200,
  });

  stabilityMetric.add(isStable);
  errorRate.add(!isStable);

  // Hourly logging (every hour)
  const elapsedHours = Math.floor((Date.now() - testStartTime) / (1000 * 60 * 60));
  if (Math.random() < 0.0001 && elapsedHours > 0) {
    // Very sparse logging
    const memoryLeak = baselineResponseTime
      ? (requestDuration / baselineResponseTime).toFixed(2)
      : "N/A";
    console.log(
      `[SOAK-${elapsedHours}H] ${endpoint.name} ${response.status} ${Math.round(requestDuration)}ms [ML:${memoryLeak}x]`
    );
  }

  // Alert on performance degradation
  if (baselineResponseTime && requestDuration > baselineResponseTime * 3) {
    console.warn(
      `[DEGRADATION] ${endpoint.name} ${Math.round(requestDuration)}ms (baseline: ${Math.round(baselineResponseTime)}ms)`
    );
  }

  // Steady, realistic user behavior
  sleep(Math.random() * 1.0 + 0.5); // 0.5-1.5 second pause
}

export function handleSummary(data) {
  const testDurationHours = (Date.now() - testStartTime) / (1000 * 60 * 60);
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const stabilityRate = (data.metrics.stability.values.rate * 100).toFixed(3);

  return {
    "soak-test-results.json": JSON.stringify(data, null, 2),
    "soak-test-summary.txt": textSummary(data, testDurationHours),
    "soak-test-detailed.html": htmlSummary(data, testDurationHours),
  };
}

function textSummary(data, testDurationHours) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const stabilityRate = (data.metrics.stability.values.rate * 100).toFixed(3);
  const successRate = (100 - data.metrics.http_req_failed.values.rate * 100).toFixed(3);
  const memoryLeakAvg = data.metrics.memory_leak_indicator.values.avg.toFixed(2);

  return `
🏃‍♂️ SOAK TEST RESULTS - 24 HOUR ENDURANCE
==========================================

⏱️ ENDURANCE OVERVIEW:
   Test Duration: ${testDurationHours.toFixed(1)} hours
   Target: 24 hours at 500 RPS
   Completion: ${((testDurationHours / 24) * 100).toFixed(1)}%
   
🎯 SUSTAINED PERFORMANCE:
   Target RPS: 500
   Average RPS: ${avgRPS}
   Consistency: ${((avgRPS / 500) * 100).toFixed(1)}%
   
⚡ LONG-TERM RESPONSE TIMES:
   Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   50th Percentile: ${Math.round(data.metrics.http_req_duration.values.med)}ms
   95th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms
   99th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms

🔒 STABILITY METRICS:
   Overall Stability: ${stabilityRate}%
   Success Rate: ${successRate}%
   Failed Requests: ${data.metrics.http_req_failed.values.count}
   Total Requests: ${data.metrics.http_reqs.values.count}

🧠 MEMORY LEAK ANALYSIS:
   Memory Leak Indicator: ${memoryLeakAvg}x baseline
   Memory Status: ${
     memoryLeakAvg < 1.5
       ? "✅ STABLE"
       : memoryLeakAvg < 2.0
         ? "⚠️ MINOR GROWTH"
         : "❌ POTENTIAL LEAK"
   }
   Resource Accumulation: ${memoryLeakAvg < 2 ? "NONE DETECTED" : "REQUIRES INVESTIGATION"}

🎯 ENDURANCE THRESHOLD VALIDATION:
   P95 Response < 1000ms: ${data.metrics.http_req_duration.values["p(95)"] < 1000 ? "✅ PASS" : "❌ FAIL"}
   Error Rate < 1%: ${data.metrics.http_req_failed.values.rate < 0.01 ? "✅ PASS" : "❌ FAIL"}
   Stability > 99%: ${data.metrics.stability.values.rate > 0.99 ? "✅ PASS" : "❌ FAIL"}
   Memory Stable: ${data.metrics.memory_leak_indicator.values.avg < 2 ? "✅ PASS" : "❌ FAIL"}

🌐 RESOURCE UTILIZATION:
   Total Data Sent: ${Math.round(data.metrics.data_sent.values.count / 1024 / 1024)}MB
   Total Data Received: ${Math.round(data.metrics.data_received.values.count / 1024 / 1024)}MB
   Peak Virtual Users: ${data.metrics.vus_max.values.max}

🏆 ENDURANCE ASSESSMENT:
   System Endurance: ${
     stabilityRate >= 99 && memoryLeakAvg < 2
       ? "✅ EXCELLENT"
       : stabilityRate >= 98 && memoryLeakAvg < 2.5
         ? "⚠️ GOOD"
         : "❌ NEEDS WORK"
   }
   Production Ready: ${avgRPS >= 450 && stabilityRate >= 99 ? "✅ YES" : "❌ NO"}
   24-Hour Capable: ${testDurationHours >= 20 && stabilityRate >= 99 ? "✅ PROVEN" : "⚠️ PARTIAL"}

💡 LONG-TERM RECOMMENDATIONS:
   ${
     stabilityRate >= 99.5 && memoryLeakAvg < 1.5
       ? "✅ System shows excellent long-term stability!"
       : stabilityRate >= 99 && memoryLeakAvg < 2
         ? "⚠️ System is stable but monitor for gradual performance changes"
         : "❌ System requires optimization for long-term operation"
   }

Test Completed: ${new Date().toISOString()}
Duration: ${Math.floor(testDurationHours)}h ${Math.floor((testDurationHours % 1) * 60)}m
`;
}

function htmlSummary(data, testDurationHours) {
  const stabilityRate = (data.metrics.stability.values.rate * 100).toFixed(2);
  const memoryLeakAvg = data.metrics.memory_leak_indicator.values.avg.toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>24-Hour Soak Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f0f8ff; }
        .metric { background: white; padding: 20px; margin: 15px 0; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .endurance { border-left: 5px solid #4169e1; }
        .stability { border-left: 5px solid #32cd32; }
        .memory { border-left: 5px solid #ffa500; }
        .stat { display: inline-block; margin: 15px; padding: 15px; background: #f8f8f8; border-radius: 8px; }
        .duration { font-size: 2em; color: #4169e1; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🏃‍♂️ 24-Hour Soak Test Results</h1>
    
    <div class="metric endurance">
        <h2>⏱️ Endurance Overview</h2>
        <div class="duration">${testDurationHours.toFixed(1)} Hours</div>
        <div class="stat">Target: 24 hours</div>
        <div class="stat">Completion: ${((testDurationHours / 24) * 100).toFixed(1)}%</div>
        <div class="stat">RPS: ${Math.round(data.metrics.http_reqs.values.rate)}</div>
    </div>
    
    <div class="metric stability">
        <h2>🔒 System Stability</h2>
        <div class="stat">Stability Rate: ${stabilityRate}%</div>
        <div class="stat">Success Rate: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
        <div class="stat">Total Requests: ${data.metrics.http_reqs.values.count}</div>
    </div>
    
    <div class="metric memory">
        <h2>🧠 Memory Analysis</h2>
        <div class="stat">Memory Factor: ${memoryLeakAvg}x</div>
        <div class="stat">Status: ${
          memoryLeakAvg < 1.5 ? "✅ Stable" : memoryLeakAvg < 2.0 ? "⚠️ Growing" : "❌ Leaking"
        }</div>
        <div class="stat">P95 Response: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms</div>
    </div>
    
    <div class="metric">
        <h2>🏆 Overall Assessment</h2>
        <p><strong>Endurance Rating:</strong> ${
          stabilityRate >= 99.5 && memoryLeakAvg < 1.5
            ? "✅ Excellent - Ready for 24/7 operation"
            : stabilityRate >= 99 && memoryLeakAvg < 2
              ? "⚠️ Good - Monitor for long-term changes"
              : "❌ Needs optimization for production"
        }</p>
    </div>
    
    <p><em>Test completed after ${Math.floor(testDurationHours)}h ${Math.floor((testDurationHours % 1) * 60)}m</em></p>
    <p><em>Generated: ${new Date().toISOString()}</em></p>
</body>
</html>
`;
}
