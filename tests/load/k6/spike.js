/**
 * K6 Spike Test - 0 to 1000 RPS in 30 seconds
 *
 * Tests system response to sudden traffic surges.
 * Validates auto-scaling, rate limiting, and graceful handling
 * of unexpected load spikes.
 *
 * Validates Task 14 requirements from implementation plan.
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics for spike analysis
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");
const spikeRecovery = new Trend("spike_recovery");
const rateLimitHits = new Rate("rate_limit_hits");
const timeToFirstByte = new Trend("ttfb");
const autoScalingIndicator = new Trend("auto_scaling");

// Spike test configuration - SUDDEN SURGE!
export const options = {
  stages: [
    // BASELINE
    { duration: "2m", target: 10 }, // Low baseline

    // THE SPIKE - 30 SECONDS TO 1000 RPS!
    { duration: "30s", target: 1000 }, // MASSIVE SPIKE!

    // SUSTAIN SPIKE
    { duration: "5m", target: 1000 }, // Hold at peak

    // RECOVERY TEST
    { duration: "2m", target: 100 }, // Quick scale down
    { duration: "3m", target: 10 }, // Return to baseline
    { duration: "2m", target: 0 }, // Complete stop
  ],
  thresholds: {
    // Spike-specific thresholds
    http_req_duration: ["p(95)<3000"], // Allow higher latency during spike
    http_req_failed: ["rate<0.05"], // Error rate under 5% during spike
    errors: ["rate<0.1"], // Custom error rate under 10%
    rate_limit_hits: ["rate<0.3"], // Rate limiting is acceptable during spike
    spike_recovery: ["p(90)<2000"], // Recovery should be fast
  },
  ext: {
    loadimpact: {
      name: "Translation Helps API - Traffic Spike Test",
      distribution: {
        "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 70 },
        "amazon:eu:dublin": { loadZone: "amazon:eu:dublin", percent: 30 },
      },
    },
  },
};

// Spike test endpoint patterns (focused on most likely spike scenarios)
const endpoints = [
  {
    name: "Health Check",
    url: "/api/health",
    weight: 15, // Monitoring traffic during spike
    params: {},
    rateLimitExpected: false,
  },
  {
    name: "Fetch Scripture",
    url: "/api/fetch-scripture",
    weight: 40, // Primary spike traffic
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
    rateLimitExpected: true,
  },
  {
    name: "Viral Scripture Reference",
    url: "/api/fetch-scripture",
    weight: 20, // Viral content pattern
    params: {
      reference: "Jeremiah 29:11", // Popular verse
      language: "en",
      organization: "unfoldingWord",
    },
    rateLimitExpected: true,
  },
  {
    name: "Translation Notes",
    url: "/api/fetch-translation-notes",
    weight: 15,
    params: {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
    },
    rateLimitExpected: true,
  },
  {
    name: "Get Languages",
    url: "/api/get-languages",
    weight: 10, // Discovery during spike
    params: {
      organization: "unfoldingWord",
    },
    rateLimitExpected: false,
  },
];

// Popular/viral content that might cause spikes
const viralReferences = [
  "John 3:16", // Most popular
  "Jeremiah 29:11", // Hope verse
  "Philippians 4:13", // Strength verse
  "Romans 8:28", // Comfort verse
  "Psalm 23:1", // Shepherd psalm
  "Matthew 28:19", // Great commission
  "1 Corinthians 13:4-8", // Love chapter
  "Isaiah 41:10", // Fear not
];

// Get base URL from environment
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";

// Track spike phases
let spikeStartTime = null;
let baselineResponseTime = null;

function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (random <= cumulativeWeight) {
      const endpointCopy = { ...endpoint };

      // During spike, focus on viral content
      if (
        endpoint.name.includes("Scripture") ||
        endpoint.name.includes("Viral")
      ) {
        endpointCopy.params = {
          ...endpoint.params,
          reference:
            viralReferences[Math.floor(Math.random() * viralReferences.length)],
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

  // Track spike phase
  const currentVUs = __VU;
  if (currentVUs > 100 && spikeStartTime === null) {
    spikeStartTime = Date.now();
  }

  // Spike-aware headers
  const params = {
    headers: {
      "User-Agent": "K6-Spike-Test/1.0",
      Accept: "application/json",
      "X-Test-Type": "spike-test",
      "X-Spike-Phase":
        currentVUs > 500 ? "PEAK" : currentVUs > 100 ? "SPIKE" : "BASELINE",
      "X-VU-Count": currentVUs.toString(),
    },
    timeout: "45s", // Longer timeout during spike
  };

  const startTime = Date.now();
  const response = http.get(url, params);
  const endTime = Date.now();
  const requestDuration = endTime - startTime;

  // Record spike metrics
  requestCount.add(1);
  responseTime.add(requestDuration);
  timeToFirstByte.add(response.timings.waiting);

  // Establish baseline
  if (
    currentVUs <= 20 &&
    baselineResponseTime === null &&
    response.status === 200
  ) {
    baselineResponseTime = requestDuration;
  }

  // Auto-scaling detection (response time changes)
  if (baselineResponseTime !== null) {
    const scalingFactor = requestDuration / baselineResponseTime;
    autoScalingIndicator.add(scalingFactor);
  }

  // Spike recovery measurement
  if (spikeStartTime !== null && currentVUs < 200) {
    const recoveryTime = Date.now() - spikeStartTime;
    spikeRecovery.add(recoveryTime);
  }

  // Rate limiting detection
  const isRateLimited =
    response.status === 429 ||
    (response.status === 503 && response.body.includes("rate"));
  rateLimitHits.add(isRateLimited);

  // Spike-tolerant validation
  const isSuccess = check(response, {
    "status is successful": (r) => r.status === 200 || r.status === 429, // Rate limiting is OK
    "response time reasonable": (r) => r.timings.duration < 5000, // Allow higher latency
    "has response": (r) => r.body && r.body.length > 0,
    "not server error": (r) =>
      r.status !== 500 && r.status !== 502 && r.status !== 503,
    [`${endpoint.name} handles spike`]: (r) =>
      r.status === 200 || r.status === 429,
  });

  errorRate.add(!isSuccess);

  // Enhanced spike logging
  if (Math.random() < 0.01) {
    // 1% sampling
    const phase =
      currentVUs > 500 ? "PEAK" : currentVUs > 100 ? "SPIKE" : "BASELINE";
    const rateLimited = isRateLimited ? "RATE-LIMITED" : "OK";
    console.log(
      `[${phase}] ${endpoint.name} ${response.status} ${Math.round(requestDuration)}ms VUs:${currentVUs} [${rateLimited}]`,
    );
  }

  // Alert on severe degradation
  if (baselineResponseTime && requestDuration > baselineResponseTime * 10) {
    console.warn(
      `[SPIKE STRESS] ${endpoint.name} ${Math.round(requestDuration)}ms (${Math.round(requestDuration / baselineResponseTime)}x baseline)`,
    );
  }

  // Log rate limiting
  if (isRateLimited && Math.random() < 0.1) {
    console.log(`[RATE LIMITED] ${endpoint.name} - System protecting itself`);
  }

  // Aggressive spike behavior - minimal pauses
  sleep(Math.random() * 0.1 + 0.02); // 0.02-0.12 second pause (very aggressive)
}

export function handleSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const maxVUs = data.metrics.vus_max.values.max;
  const rateLimitRate = (
    data.metrics.rate_limit_hits.values.rate * 100
  ).toFixed(2);

  return {
    "spike-test-results.json": JSON.stringify(data, null, 2),
    "spike-test-summary.txt": textSummary(data),
    "spike-test-analysis.html": htmlSummary(data),
  };
}

function textSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const successRate = (
    100 -
    data.metrics.http_req_failed.values.rate * 100
  ).toFixed(2);
  const rateLimitRate = (
    data.metrics.rate_limit_hits.values.rate * 100
  ).toFixed(2);
  const autoScalingFactor = data.metrics.auto_scaling.values.avg.toFixed(2);

  return `
⚡ SPIKE TEST RESULTS - 0 to 1000 RPS in 30s
===========================================

🚀 SPIKE PERFORMANCE:
   Target Spike: 0 → 1000 RPS in 30 seconds
   Peak RPS Achieved: ${avgRPS}
   Spike Success: ${((avgRPS / 1000) * 100).toFixed(1)}%
   Peak Virtual Users: ${data.metrics.vus_max.values.max}

⚡ RESPONSE TIME DURING SPIKE:
   Baseline Avg: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   50th Percentile: ${Math.round(data.metrics.http_req_duration.values.med)}ms
   95th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms
   99th Percentile: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms
   Max Response Time: ${Math.round(data.metrics.http_req_duration.values.max)}ms

🛡️ PROTECTION MECHANISMS:
   Rate Limiting Activated: ${rateLimitRate}%
   Rate Limit Effectiveness: ${rateLimitRate > 10 ? "✅ ACTIVE" : "⚠️ MINIMAL"}
   System Protection: ${rateLimitRate > 5 ? "ENGAGED" : "NOT DETECTED"}

🔄 AUTO-SCALING ANALYSIS:
   Auto-scaling Factor: ${autoScalingFactor}x baseline
   Scaling Response: ${
     autoScalingFactor < 3
       ? "✅ EXCELLENT"
       : autoScalingFactor < 5
         ? "⚠️ ADEQUATE"
         : "❌ SLOW"
   }
   TTFB Avg: ${Math.round(data.metrics.ttfb.values.avg)}ms

✅ SPIKE RESILIENCE:
   Overall Success Rate: ${successRate}%
   Failed Requests: ${data.metrics.http_req_failed.values.count}
   Total Requests: ${data.metrics.http_reqs.values.count}
   System Stability: ${successRate >= 90 ? "EXCELLENT" : successRate >= 80 ? "GOOD" : "POOR"}

🎯 SPIKE THRESHOLD VALIDATION:
   P95 Response < 3000ms: ${data.metrics.http_req_duration.values["p(95)"] < 3000 ? "✅ PASS" : "❌ FAIL"}
   Error Rate < 5%: ${data.metrics.http_req_failed.values.rate < 0.05 ? "✅ PASS" : "❌ FAIL"}
   Rate Limiting < 30%: ${data.metrics.rate_limit_hits.values.rate < 0.3 ? "✅ PASS" : "❌ FAIL"}

🏆 SPIKE HANDLING ASSESSMENT:
   Traffic Surge Handling: ${
     avgRPS >= 800 && successRate >= 85
       ? "✅ EXCELLENT"
       : avgRPS >= 600 && successRate >= 75
         ? "⚠️ ADEQUATE"
         : "❌ NEEDS WORK"
   }
   Rate Limiting Wisdom: ${
     rateLimitRate >= 10 && rateLimitRate <= 30
       ? "✅ SMART"
       : rateLimitRate < 10
         ? "⚠️ MIGHT NEED MORE"
         : "❌ TOO AGGRESSIVE"
   }
   Recovery Capability: ${data.metrics.spike_recovery.values.avg < 5000 ? "✅ FAST" : "⚠️ SLOW"}

💡 SPIKE TEST INSIGHTS:
   ${
     avgRPS >= 800 && successRate >= 90 && rateLimitRate < 20
       ? "✅ System excellently handles traffic spikes - ready for viral content!"
       : avgRPS >= 600 && successRate >= 80
         ? "⚠️ System handles spikes adequately but could use optimization"
         : "❌ System struggles with traffic spikes - needs auto-scaling improvements"
   }

🌊 TRAFFIC PATTERN ANALYSIS:
   Peak Traffic Sustained: ${avgRPS >= 800 ? "YES" : "PARTIAL"}
   Graceful Degradation: ${rateLimitRate > 0 && successRate > 80 ? "YES" : "NO"}
   Viral Content Ready: ${avgRPS >= 700 && rateLimitRate < 25 ? "YES" : "NO"}

Test Duration: 14.5 minutes
Spike Simulation: ${new Date().toISOString()}
`;
}

function htmlSummary(data) {
  const avgRPS = Math.round(data.metrics.http_reqs.values.rate);
  const successRate = (
    100 -
    data.metrics.http_req_failed.values.rate * 100
  ).toFixed(2);
  const rateLimitRate = (
    data.metrics.rate_limit_hits.values.rate * 100
  ).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Traffic Spike Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .metric { background: rgba(255,255,255,0.9); color: #333; padding: 20px; margin: 15px 0; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); }
        .spike { border-left: 5px solid #ff6b6b; }
        .protection { border-left: 5px solid #4ecdc4; }
        .scaling { border-left: 5px solid #45b7d1; }
        .stat { display: inline-block; margin: 10px; padding: 12px; background: #f0f0f0; border-radius: 6px; }
        .spike-indicator { font-size: 3em; text-align: center; color: #ff6b6b; }
        h1 { text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <h1>⚡ Traffic Spike Test - 1000 RPS Surge</h1>
    
    <div class="metric spike">
        <h2>🚀 Spike Performance</h2>
        <div class="spike-indicator">${avgRPS} RPS</div>
        <div class="stat">Target: 1000 RPS</div>
        <div class="stat">Achievement: ${((avgRPS / 1000) * 100).toFixed(1)}%</div>
        <div class="stat">Peak VUs: ${data.metrics.vus_max.values.max}</div>
    </div>
    
    <div class="metric protection">
        <h2>🛡️ System Protection</h2>
        <div class="stat">Rate Limiting: ${rateLimitRate}%</div>
        <div class="stat">Success Rate: ${successRate}%</div>
        <div class="stat">Protection Status: ${rateLimitRate > 10 ? "✅ Active" : "⚠️ Minimal"}</div>
    </div>
    
    <div class="metric scaling">
        <h2>🔄 Auto-Scaling Response</h2>
        <div class="stat">P95 Response: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms</div>
        <div class="stat">TTFB: ${Math.round(data.metrics.ttfb.values.avg)}ms</div>
        <div class="stat">Scaling Factor: ${data.metrics.auto_scaling.values.avg.toFixed(2)}x</div>
    </div>
    
    <div class="metric">
        <h2>🏆 Spike Readiness Assessment</h2>
        <p><strong>Traffic Surge Handling:</strong> ${
          avgRPS >= 800 && successRate >= 85
            ? "✅ Excellent - Ready for viral traffic"
            : avgRPS >= 600 && successRate >= 75
              ? "⚠️ Adequate - Some optimization recommended"
              : "❌ Needs significant improvement"
        }</p>
        <p><strong>Viral Content Ready:</strong> ${avgRPS >= 700 && rateLimitRate < 25 ? "YES" : "NO"}</p>
    </div>
    
    <p style="text-align: center;"><em>Spike test completed: ${new Date().toISOString()}</em></p>
</body>
</html>
`;
}
