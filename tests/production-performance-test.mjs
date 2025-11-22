#!/usr/bin/env node

/**
 * Production Performance Test for Search Feature
 * Tests against live Cloudflare Pages deployment
 */

const PROD_URL =
  process.env.PROD_URL || "https://translation-helps-mcp.pages.dev";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDeployment() {
  log("\n🔍 Checking Deployment Status", "cyan");
  log("=".repeat(60), "cyan");

  try {
    const response = await fetch(`${PROD_URL}/api/health`);
    const data = await response.json();

    log(`Status: ${data.status}`, data.status === "healthy" ? "green" : "red");
    log(`Version: ${data.version}`, "blue");
    log(`Build Time: ${data.buildTime}`, "blue");
    log(`Platform: ${data.deployment.platform}`, "blue");

    return data.version;
  } catch (error) {
    log(`❌ Failed to connect: ${error.message}`, "red");
    return null;
  }
}

async function runPerformanceTest(testName, query, options = {}) {
  log(`\n📊 ${testName}`, "magenta");
  log("-".repeat(60), "cyan");

  const iterations = options.iterations || 3;
  const times = [];
  let lastResult = null;

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${PROD_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          language: options.language || "en",
          owner: options.owner || "unfoldingWord",
          reference: options.reference,
          limit: options.limit || 10,
          includeHelps: options.includeHelps !== false,
        }),
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (!response.ok) {
        log(`  Run ${i + 1}: ❌ HTTP ${response.status}`, "red");
        continue;
      }

      const data = await response.json();
      times.push({
        total: totalTime,
        server: data.took_ms,
        network: totalTime - data.took_ms,
      });

      lastResult = data;

      log(
        `  Run ${i + 1}: ${totalTime}ms (server: ${data.took_ms}ms, network: ${totalTime - data.took_ms}ms)`,
        "blue",
      );

      // Wait between requests
      if (i < iterations - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      log(`  Run ${i + 1}: ❌ ${error.message}`, "red");
    }
  }

  if (times.length === 0) {
    log("❌ All requests failed", "red");
    return null;
  }

  // Calculate stats
  const avgTotal = times.reduce((sum, t) => sum + t.total, 0) / times.length;
  const avgServer = times.reduce((sum, t) => sum + t.server, 0) / times.length;
  const avgNetwork =
    times.reduce((sum, t) => sum + t.network, 0) / times.length;
  const minTotal = Math.min(...times.map((t) => t.total));
  const maxTotal = Math.max(...times.map((t) => t.total));

  log("\n  📈 Statistics:", "cyan");
  log(`    Average Total: ${avgTotal.toFixed(0)}ms`, "blue");
  log(`    Average Server: ${avgServer.toFixed(0)}ms`, "blue");
  log(`    Average Network: ${avgNetwork.toFixed(0)}ms`, "blue");
  log(`    Min: ${minTotal}ms, Max: ${maxTotal}ms`, "blue");

  if (lastResult) {
    log(`    Resources: ${lastResult.resourceCount}`, "blue");
    log(`    Hits: ${lastResult.hits?.length || 0}`, "blue");
    if (lastResult.hits && lastResult.hits.length > 0) {
      log(`    Top Score: ${lastResult.hits[0].score.toFixed(2)}`, "blue");
    }
  }

  return {
    avgTotal,
    avgServer,
    avgNetwork,
    minTotal,
    maxTotal,
    result: lastResult,
  };
}

async function runAllTests() {
  log("\n🚀 Production Performance Tests", "cyan");
  log("=".repeat(60), "cyan");
  log(`Target: ${PROD_URL}`, "yellow");

  // Check deployment
  const version = await checkDeployment();
  if (!version) {
    log("\n❌ Deployment not accessible. Aborting tests.", "red");
    return;
  }

  if (version !== "7.3.0") {
    log(`\n⚠️  Warning: Expected version 7.3.0, found ${version}`, "yellow");
    log("The search feature may not be deployed yet.", "yellow");

    // Check if search endpoint exists
    try {
      const response = await fetch(`${PROD_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test", language: "en", limit: 1 }),
      });

      if (response.status === 404) {
        log("❌ Search endpoint not found. Deployment incomplete.", "red");
        return;
      }
    } catch (error) {
      log(`❌ Cannot access search endpoint: ${error.message}`, "red");
      return;
    }
  }

  const results = [];

  // Test 1: Simple single-term search
  results.push(
    await runPerformanceTest('Test 1: Single Term Search ("God")', "God", {
      iterations: 3,
      limit: 5,
    }),
  );

  // Test 2: Multi-term search
  results.push(
    await runPerformanceTest(
      'Test 2: Multi-Term Search ("love faith")',
      "love faith",
      { iterations: 3, limit: 5 },
    ),
  );

  // Test 3: Reference-filtered search
  results.push(
    await runPerformanceTest(
      'Test 3: Reference Filter ("Jesus" in John 3)',
      "Jesus",
      { iterations: 3, reference: "John 3", limit: 5 },
    ),
  );

  // Test 4: Translation helps search
  results.push(
    await runPerformanceTest('Test 4: Translation Helps ("grace")', "grace", {
      iterations: 3,
      includeHelps: true,
      limit: 10,
    }),
  );

  // Test 5: Large result set
  results.push(
    await runPerformanceTest('Test 5: Large Result Set ("peace")', "peace", {
      iterations: 3,
      limit: 20,
    }),
  );

  // Summary
  log("\n" + "=".repeat(60), "cyan");
  log("📊 Performance Summary", "cyan");
  log("=".repeat(60), "cyan");

  const validResults = results.filter((r) => r !== null);

  if (validResults.length === 0) {
    log("❌ No successful tests", "red");
    return;
  }

  const overallAvg =
    validResults.reduce((sum, r) => sum + r.avgTotal, 0) / validResults.length;
  const overallServer =
    validResults.reduce((sum, r) => sum + r.avgServer, 0) / validResults.length;
  const overallNetwork =
    validResults.reduce((sum, r) => sum + r.avgNetwork, 0) /
    validResults.length;
  const fastest = Math.min(...validResults.map((r) => r.minTotal));
  const slowest = Math.max(...validResults.map((r) => r.maxTotal));

  log(`\nOverall Average Response Time: ${overallAvg.toFixed(0)}ms`, "green");
  log(
    `  Server Processing: ${overallServer.toFixed(0)}ms (${((overallServer / overallAvg) * 100).toFixed(1)}%)`,
    "blue",
  );
  log(
    `  Network Latency: ${overallNetwork.toFixed(0)}ms (${((overallNetwork / overallAvg) * 100).toFixed(1)}%)`,
    "blue",
  );
  log(`\nFastest Response: ${fastest}ms`, "green");
  log(`Slowest Response: ${slowest}ms`, "yellow");

  // Performance assessment
  log("\n🎯 Performance Assessment:", "cyan");
  if (overallAvg < 3000) {
    log("✅ Excellent - Under 3 second target!", "green");
  } else if (overallAvg < 5000) {
    log("✅ Good - Acceptable for MVP", "green");
  } else if (overallAvg < 10000) {
    log("⚠️  Marginal - Consider optimization", "yellow");
  } else {
    log("❌ Needs optimization", "red");
  }

  // Network vs Server time analysis
  if (overallNetwork > overallServer) {
    log(
      `\n💡 Network latency (${overallNetwork.toFixed(0)}ms) > Server time (${overallServer.toFixed(0)}ms)`,
      "blue",
    );
    log(
      "   This is normal for production deployments with geographic distance.",
      "blue",
    );
  } else {
    log(
      `\n⚡ Server processing (${overallServer.toFixed(0)}ms) is the main bottleneck.`,
      "yellow",
    );
    log("   Consider implementing ZIP caching for improvement.", "yellow");
  }

  log("\n✅ Performance testing complete!", "green");
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Test runner failed: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
