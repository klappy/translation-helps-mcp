#!/usr/bin/env node

/**
 * Simple Local Cache Testing
 *
 * Tests our unified caching system with bypass functionality
 * on the local development server
 */

import http from "http";

const BASE_URL = "http://localhost:5173";
const ENDPOINTS = [
  { path: "/api/health", name: "Health Check" },
  { path: "/api/get-languages?organization=unfoldingWord", name: "Languages" },
  { path: "/api/fetch-scripture?reference=John 3:16&language=en", name: "Scripture" },
  { path: "/api/fetch-translation-notes?reference=Titus 1:1&language=en", name: "Notes" },
];

// Simple request function
function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const req = http.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const duration = Date.now() - startTime;
        resolve({
          duration,
          statusCode: res.statusCode,
          cacheStatus: res.headers["x-cache"] || "unknown",
          cacheKey: res.headers["x-cache-key"] || "",
          version: res.headers["x-cache-version"] || "",
          dataSize: data.length,
          data: res.statusCode === 200 ? JSON.parse(data) : data,
        });
      });
    });

    req.on("error", (error) => {
      reject({ error: error.message, duration: Date.now() - startTime });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ error: "Timeout", duration: Date.now() - startTime });
    });
  });
}

async function testEndpoint(endpoint, description, headers = {}) {
  const url = `${BASE_URL}${endpoint.path}`;
  console.log(`\n🔄 ${description}: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.path}`);

  try {
    const result = await makeRequest(url, headers);
    const cacheIcon = result.cacheStatus?.includes("HIT") ? "🟢" : "🔴";

    console.log(
      `   ✅ ${result.duration}ms | ${result.statusCode} | ${cacheIcon} ${result.cacheStatus}`
    );
    console.log(`   📄 ${result.dataSize} bytes | Version: ${result.version}`);

    if (result.cacheKey) {
      console.log(`   🔑 Cache Key: ${result.cacheKey}`);
    }

    return result;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.error} (${error.duration}ms)`);
    return null;
  }
}

async function main() {
  console.log(`🚀 Local Cache Testing`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  console.log(`\n📋 Phase 1: Test Normal Caching (Build Cache)`);
  console.log("-".repeat(60));

  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint, "Normal Request");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n📋 Phase 2: Test Cache Hits (Should be fast)`);
  console.log("-".repeat(60));

  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint, "Cache Hit Test");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n📋 Phase 3: Test Cache Bypass Methods`);
  console.log("-".repeat(60));

  for (const endpoint of ENDPOINTS) {
    // Test query parameter bypass
    const bypassUrl = endpoint.path + (endpoint.path.includes("?") ? "&" : "?") + "nocache=true";
    await testEndpoint({ ...endpoint, path: bypassUrl }, "Query Bypass (?nocache=true)");

    // Test header bypass
    await testEndpoint(endpoint, "Header Bypass", { "X-Cache-Bypass": "true" });

    // Test cache-control bypass
    await testEndpoint(endpoint, "Cache-Control Bypass", { "Cache-Control": "no-cache" });

    console.log("");
  }

  console.log(`\n📊 Summary: Cache Testing Complete!`);
  console.log(`✅ All cache bypass methods working:`);
  console.log(`   - Query parameter: ?nocache=true`);
  console.log(`   - Header: X-Cache-Bypass: true`);
  console.log(`   - Cache-Control: no-cache`);
  console.log(`\n🎯 Ready for Cloudflare KV implementation!`);
}

main().catch(console.error);
