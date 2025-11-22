#!/usr/bin/env node

/**
 * Integration Test for Search Feature
 * Tests the full end-to-end search functionality
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8787";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}📋 Test: ${name}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

async function testHealthEndpoint() {
  logTest("Health Check");
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    const data = await response.json();
    logSuccess(`Server is healthy (v${data.version})`);
    return true;
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testBasicSearch() {
  logTest('Basic Search - Query: "God"');
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "God",
        language: "en",
        owner: "unfoldingWord",
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Response time: ${data.took_ms}ms`);
    logInfo(`Resources searched: ${data.resourceCount}`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    if (data.hits && data.hits.length > 0) {
      logSuccess(`Found ${data.hits.length} results`);
      logInfo(
        `Top result: ${data.hits[0].resource} - Score: ${data.hits[0].score.toFixed(2)}`,
      );
      logInfo(`Preview: "${data.hits[0].preview.substring(0, 80)}..."`);
      return true;
    } else {
      logWarning("No results found");
      return false;
    }
  } catch (error) {
    logError(`Basic search failed: ${error.message}`);
    return false;
  }
}

async function testSearchWithReference() {
  logTest('Search with Reference Filter - Query: "Jesus" in John 3');
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Jesus",
        language: "en",
        owner: "unfoldingWord",
        reference: "John 3",
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Response time: ${data.took_ms}ms`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    if (data.hits && data.hits.length > 0) {
      logSuccess(`Found ${data.hits.length} results with reference filter`);
      logInfo(`Top result: ${data.hits[0].resource} (${data.hits[0].type})`);
      return true;
    } else {
      logWarning("No results found");
      return false;
    }
  } catch (error) {
    logError(`Reference search failed: ${error.message}`);
    return false;
  }
}

async function testSearchIncludeHelps() {
  logTest('Search with Translation Helps - Query: "grace"');
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "grace",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: true,
        limit: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Response time: ${data.took_ms}ms`);
    logInfo(`Resources searched: ${data.resourceCount}`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    if (data.hits && data.hits.length > 0) {
      // Count resource types
      const types = {};
      data.hits.forEach((hit) => {
        types[hit.type] = (types[hit.type] || 0) + 1;
      });

      logSuccess(
        `Found results across ${Object.keys(types).length} resource types`,
      );
      logInfo(`Types: ${JSON.stringify(types)}`);
      return true;
    } else {
      logWarning("No results found");
      return false;
    }
  } catch (error) {
    logError(`Helps search failed: ${error.message}`);
    return false;
  }
}

async function testSearchBibleOnly() {
  logTest('Search Bible Only (no helps) - Query: "salvation"');
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "salvation",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: false,
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Response time: ${data.took_ms}ms`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    if (data.hits && data.hits.length > 0) {
      const nonBibleTypes = data.hits.filter((h) => h.type !== "bible");
      if (nonBibleTypes.length > 0) {
        logWarning(
          `Found ${nonBibleTypes.length} non-bible results (should be 0)`,
        );
        return false;
      }
      logSuccess("All results are Bible verses (as expected)");
      return true;
    } else {
      logWarning("No results found");
      return false;
    }
  } catch (error) {
    logError(`Bible-only search failed: ${error.message}`);
    return false;
  }
}

async function testEmptyQuery() {
  logTest("Empty Query Validation");
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        language: "en",
      }),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.code === "MISSING_QUERY") {
        logSuccess("Correctly rejected empty query with 400 error");
        return true;
      }
    }

    logError("Should have returned 400 error for empty query");
    return false;
  } catch (error) {
    logError(`Empty query test failed: ${error.message}`);
    return false;
  }
}

async function testMultiTermSearch() {
  logTest('Multi-Term Search - Query: "love faith"');
  try {
    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "love faith",
        language: "en",
        owner: "unfoldingWord",
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Response time: ${data.took_ms}ms`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    if (data.hits && data.hits.length > 0) {
      logSuccess(`Found ${data.hits.length} results for multi-term query`);
      return true;
    } else {
      logWarning("No results found");
      return false;
    }
  } catch (error) {
    logError(`Multi-term search failed: ${error.message}`);
    return false;
  }
}

async function testPerformance() {
  logTest("Performance Test - Multiple Resources");
  try {
    const startTime = Date.now();

    const response = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "peace",
        language: "en",
        owner: "unfoldingWord",
        includeHelps: true,
        limit: 20,
      }),
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    logInfo(`Total request time: ${totalTime}ms`);
    logInfo(`Server processing time: ${data.took_ms}ms`);
    logInfo(`Resources searched: ${data.resourceCount}`);
    logInfo(`Hits found: ${data.hits?.length || 0}`);

    const TARGET_TIME = 3000; // 3 seconds for multi-resource search

    if (data.took_ms < TARGET_TIME) {
      logSuccess(
        `Performance target met: ${data.took_ms}ms < ${TARGET_TIME}ms`,
      );
      return true;
    } else {
      logWarning(
        `Performance slower than target: ${data.took_ms}ms > ${TARGET_TIME}ms`,
      );
      return false;
    }
  } catch (error) {
    logError(`Performance test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log("\n🧪 Starting Integration Tests for Search Feature", "cyan");
  log("=".repeat(60), "cyan");

  const tests = [
    { name: "Health Check", fn: testHealthEndpoint, critical: true },
    { name: "Basic Search", fn: testBasicSearch, critical: true },
    {
      name: "Search with Reference",
      fn: testSearchWithReference,
      critical: false,
    },
    { name: "Search with Helps", fn: testSearchIncludeHelps, critical: false },
    { name: "Bible Only Search", fn: testSearchBibleOnly, critical: false },
    { name: "Empty Query Validation", fn: testEmptyQuery, critical: true },
    { name: "Multi-Term Search", fn: testMultiTermSearch, critical: false },
    { name: "Performance Test", fn: testPerformance, critical: false },
  ];

  let passed = 0;
  let failed = 0;
  let criticalFailed = false;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) {
          criticalFailed = true;
        }
      }
    } catch (error) {
      logError(`Test "${test.name}" threw error: ${error.message}`);
      failed++;
      if (test.critical) {
        criticalFailed = true;
      }
    }

    // Stop if a critical test fails
    if (criticalFailed) {
      log("\n❌ Critical test failed. Stopping test suite.", "red");
      break;
    }
  }

  log("\n" + "=".repeat(60), "cyan");
  log("📊 Test Summary", "cyan");
  log("=".repeat(60), "cyan");
  log(`Total Tests: ${passed + failed}`);
  log(`Passed: ${passed}`, "green");
  log(`Failed: ${failed}`, "red");

  if (failed === 0) {
    log("\n🎉 All tests passed!", "green");
    return 0;
  } else if (criticalFailed) {
    log("\n💥 Critical tests failed!", "red");
    return 2;
  } else {
    log("\n⚠️  Some tests failed", "yellow");
    return 1;
  }
}

// Run tests
runAllTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    logError(`Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(3);
  });
