#!/usr/bin/env node

/**
 * Search Performance Analysis Script
 * Measures detailed timing for search operations
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8787";

// ANSI color codes for pretty output
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

function formatMs(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTable(data, columns) {
  const widths = {};
  columns.forEach((col) => {
    widths[col] = Math.max(
      col.length,
      ...data.map((row) => String(row[col] || "").length),
    );
  });

  // Header
  const header = columns.map((col) => col.padEnd(widths[col])).join(" | ");
  const separator = columns.map((col) => "-".repeat(widths[col])).join("-+-");

  console.log(header);
  console.log(separator);

  // Rows
  data.forEach((row) => {
    const line = columns
      .map((col) => String(row[col] || "").padEnd(widths[col]))
      .join(" | ");
    console.log(line);
  });
}

async function measureSearch(params, description) {
  const startTime = Date.now();
  const networkTimes = {};

  try {
    // Measure network request
    networkTimes.start = Date.now();
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    networkTimes.firstByte = Date.now();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    networkTimes.end = Date.now();

    return {
      description,
      totalTime: networkTimes.end - startTime,
      networkTime: networkTimes.firstByte - networkTimes.start,
      parseTime: networkTimes.end - networkTimes.firstByte,
      serverTime: data.took_ms,
      resourceCount: data.resourceCount || 0,
      hitCount: data.hits?.length || 0,
      failures: data.failures?.length || 0,
      data,
    };
  } catch (error) {
    return {
      description,
      error: error.message,
      totalTime: Date.now() - startTime,
    };
  }
}

async function analyzeResourceTiming(params) {
  log("\n📊 Analyzing Per-Resource Timing", "cyan");
  log("=".repeat(60), "cyan");

  const result = await measureSearch(params, "Resource Analysis");

  if (result.data?.failures && result.data.failures.length > 0) {
    log("\n⚠️ Resource Failures:", "yellow");
    result.data.failures.forEach((f) => {
      log(`  ${f.resource}: ${f.error}`, "red");
    });
  }

  // Analyze hits by resource
  if (result.data?.hits) {
    const byResource = {};
    result.data.hits.forEach((hit) => {
      if (!byResource[hit.resource]) {
        byResource[hit.resource] = { count: 0, scores: [], types: new Set() };
      }
      byResource[hit.resource].count++;
      byResource[hit.resource].scores.push(hit.score);
      byResource[hit.resource].types.add(hit.type);
    });

    log("\n📈 Results by Resource:", "blue");
    Object.entries(byResource).forEach(([resource, stats]) => {
      const avgScore =
        stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      log(
        `  ${resource}: ${stats.count} hits, avg score: ${avgScore.toFixed(2)}, types: ${[...stats.types].join(", ")}`,
      );
    });
  }

  return result;
}

async function runComprehensiveAnalysis() {
  log("\n🔬 Search Performance Comprehensive Analysis", "magenta");
  log("=".repeat(60), "magenta");
  log(`Target: ${BASE_URL}`);
  log(`Time: ${new Date().toISOString()}\n`);

  const tests = [
    {
      name: "Simple Query",
      params: {
        query: "God",
        language: "en",
        owner: "unfoldingWord",
        limit: 5,
      },
    },
    {
      name: "With Reference",
      params: {
        query: "Jesus",
        language: "en",
        owner: "unfoldingWord",
        reference: "John 3",
        limit: 5,
      },
    },
    {
      name: "Bible Only",
      params: {
        query: "salvation",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: false,
        limit: 10,
      },
    },
    {
      name: "All Resources",
      params: {
        query: "grace",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: true,
        limit: 20,
      },
    },
    {
      name: "Complex Query",
      params: {
        query: "love faith hope",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: true,
        limit: 15,
      },
    },
  ];

  const results = [];

  // Warm-up request
  log("🔥 Warming up with initial request...", "yellow");
  await measureSearch({ query: "test", language: "en", limit: 1 }, "Warmup");

  // Run each test
  for (const test of tests) {
    log(`\n📋 Test: ${test.name}`, "cyan");
    log("-".repeat(40));

    const result = await measureSearch(test.params, test.name);
    results.push(result);

    if (result.error) {
      log(`❌ Error: ${result.error}`, "red");
    } else {
      log(`✅ Success in ${formatMs(result.totalTime)}`, "green");
      log(`   Server processing: ${formatMs(result.serverTime)}`);
      log(`   Network transit: ${formatMs(result.networkTime)}`);
      log(`   Resources searched: ${result.resourceCount}`);
      log(`   Results found: ${result.hitCount}`);

      if (result.failures > 0) {
        log(`   ⚠️ Failed resources: ${result.failures}`, "yellow");
      }
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary table
  log("\n📊 Summary Table", "magenta");
  log("=".repeat(80), "magenta");

  const tableData = results.map((r) => ({
    Test: r.description,
    Total: formatMs(r.totalTime || 0),
    Server: formatMs(r.serverTime || 0),
    Network: formatMs(r.networkTime || 0),
    Resources: r.resourceCount || "-",
    Hits: r.hitCount || "-",
    Status: r.error ? "❌" : "✅",
  }));

  formatTable(tableData, [
    "Test",
    "Total",
    "Server",
    "Network",
    "Resources",
    "Hits",
    "Status",
  ]);

  // Performance analysis
  log("\n🎯 Performance Analysis", "magenta");
  log("=".repeat(60), "magenta");

  const successfulTests = results.filter((r) => !r.error);
  if (successfulTests.length > 0) {
    const avgTotal =
      successfulTests.reduce((a, r) => a + r.totalTime, 0) /
      successfulTests.length;
    const avgServer =
      successfulTests.reduce((a, r) => a + r.serverTime, 0) /
      successfulTests.length;
    const avgNetwork =
      successfulTests.reduce((a, r) => a + r.networkTime, 0) /
      successfulTests.length;

    log(`Average Total Time: ${formatMs(avgTotal)}`);
    log(`Average Server Time: ${formatMs(avgServer)}`);
    log(`Average Network Time: ${formatMs(avgNetwork)}`);

    const overhead = avgTotal - avgServer;
    const overheadPercent = ((overhead / avgTotal) * 100).toFixed(1);
    log(`Network/Parse Overhead: ${formatMs(overhead)} (${overheadPercent}%)`);

    // Check against 2.5s target
    const target = 2500;
    if (avgServer < target) {
      log(
        `\n✅ Meeting 2.5s target! (${formatMs(avgServer)} < ${formatMs(target)})`,
        "green",
      );
    } else {
      const delta = avgServer - target;
      log(
        `\n⚠️ Missing 2.5s target by ${formatMs(delta)} (${formatMs(avgServer)} > ${formatMs(target)})`,
        "yellow",
      );

      // Calculate required improvement
      const improvementNeeded = ((delta / avgServer) * 100).toFixed(1);
      log(`   Need ${improvementNeeded}% improvement to meet target`, "yellow");
    }
  }

  // Test with more details on one query
  log("\n🔍 Detailed Resource Analysis", "cyan");
  await analyzeResourceTiming({
    query: "peace",
    language: "en",
    owner: "unfoldingWord",
    includeHelps: true,
    limit: 50,
  });
}

// Run analysis
runComprehensiveAnalysis()
  .then(() => {
    log("\n✨ Analysis complete!", "green");
    process.exit(0);
  })
  .catch((error) => {
    log(`\n💥 Analysis failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  });
