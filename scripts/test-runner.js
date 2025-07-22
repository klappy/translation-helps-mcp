#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe",
      shell: true,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on("error", reject);
  });
}

async function checkServer() {
  log("\n🔍 Checking if server is running...", colors.blue);

  try {
    const response = await fetch("http://localhost:8888/.netlify/functions/health");
    if (response.ok) {
      log("✅ Server is running", colors.green);
      return true;
    }
  } catch (error) {
    log("❌ Server is not running. Please start with: netlify dev", colors.red);
    return false;
  }
}

async function runTests() {
  log(`${colors.bold}🧪 Translation Helps MCP Test Suite${colors.reset}`);
  log("=====================================\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  const testSuites = [
    {
      name: "Smoke Tests",
      file: "tests/smoke.test.ts",
      description: "Quick health check and basic functionality validation",
    },
    {
      name: "API/MCP Parity Tests",
      file: "tests/endpoint-parity.test.ts",
      description: "Tests that API and MCP endpoints return identical responses",
    },
    {
      name: "Regression Tests",
      file: "tests/regression.test.ts",
      description: "Tests for specific bugs that have been fixed",
    },
    {
      name: "DCS API Client Tests",
      file: "tests/DCSApiClient.test.ts",
      description: "Unit tests for the DCS API client",
    },
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const suite of testSuites) {
    log(`\n${colors.bold}Running: ${suite.name}${colors.reset}`, colors.blue);
    log(`${suite.description}\n`);

    try {
      const result = await runCommand("npx", ["vitest", "run", suite.file, "--reporter=verbose"], {
        env: { ...process.env, TEST_BASE_URL: "http://localhost:8888" },
      });

      const lines = result.stdout.split("\n");
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      // Parse vitest output
      lines.forEach((line) => {
        if (line.includes("✓")) passed++;
        if (line.includes("✗") || line.includes("FAIL")) failed++;
        if (line.includes("↓") || line.includes("SKIP")) skipped++;
      });

      totalPassed += passed;
      totalFailed += failed;

      results.push({
        name: suite.name,
        passed,
        failed,
        skipped,
        success: failed === 0,
        output: result.stdout,
      });

      if (failed === 0) {
        log(`✅ ${suite.name}: ${passed} tests passed`, colors.green);
      } else {
        log(`❌ ${suite.name}: ${failed} tests failed, ${passed} tests passed`, colors.red);
      }
    } catch (error) {
      log(`❌ ${suite.name}: Error running tests`, colors.red);
      console.error(error);
      results.push({
        name: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        success: false,
        error: error.message,
      });
      totalFailed++;
    }
  }

  // Print summary
  log("\n=====================================", colors.bold);
  log(`${colors.bold}📊 Test Summary${colors.reset}`);
  log("=====================================");

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    const color = result.success ? colors.green : colors.red;
    log(
      `${status} ${result.name}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`,
      color
    );
  });

  log(`\n${colors.bold}Overall Results:${colors.reset}`);
  if (totalFailed === 0) {
    log(`🎉 All tests passed! (${totalPassed} total)`, colors.green);
  } else {
    log(`💥 ${totalFailed} tests failed, ${totalPassed} tests passed`, colors.red);
  }

  // Print failed test details
  const failedSuites = results.filter((r) => !r.success);
  if (failedSuites.length > 0) {
    log("\n=====================================", colors.bold);
    log(`${colors.bold}❌ Failed Test Details${colors.reset}`);
    log("=====================================");

    failedSuites.forEach((suite) => {
      log(`\n${colors.red}${colors.bold}${suite.name}:${colors.reset}`);
      if (suite.error) {
        log(suite.error, colors.red);
      } else {
        // Extract error details from output
        const errorLines = suite.output
          .split("\n")
          .filter(
            (line) => line.includes("FAIL") || line.includes("Error") || line.includes("expect")
          );
        errorLines.forEach((line) => log(line, colors.red));
      }
    });
  }

  // Print recommendations
  log("\n=====================================", colors.bold);
  log(`${colors.bold}🔧 Recommendations${colors.reset}`);
  log("=====================================");

  if (totalFailed === 0) {
    log("✅ All systems are working correctly!", colors.green);
    log("✅ API/MCP parity is maintained", colors.green);
    log("✅ No regressions detected", colors.green);
  } else {
    log("❌ Issues detected that need attention:", colors.red);
    log("   1. Check server logs for error details", colors.yellow);
    log("   2. Verify all dependencies are installed", colors.yellow);
    log("   3. Ensure test data is available", colors.yellow);
    log("   4. Run individual test suites for more details", colors.yellow);
  }

  log("\n=====================================");
  log(`${colors.bold}🚀 Next Steps${colors.reset}`);
  log("=====================================");
  log("• Run specific tests: npx vitest run tests/endpoint-parity.test.ts");
  log("• Run in watch mode: npx vitest tests/");
  log("• Generate coverage: npx vitest run --coverage");
  log("• Check server health: curl http://localhost:8888/.netlify/functions/health");

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Add package.json test scripts if they don't exist
async function updatePackageJson() {
  const packagePath = path.join(__dirname, "package.json");

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    if (!pkg.scripts) pkg.scripts = {};

    const testScripts = {
      test: "node test-runner.js",
      "test:smoke": "vitest run tests/smoke.test.ts",
      "test:parity": "vitest run tests/endpoint-parity.test.ts",
      "test:regression": "vitest run tests/regression.test.ts",
      "test:unit": "vitest run tests/DCSApiClient.test.ts",
      "test:watch": "vitest tests/",
      "test:coverage": "vitest run --coverage",
    };

    let updated = false;
    Object.entries(testScripts).forEach(([key, value]) => {
      if (!pkg.scripts[key]) {
        pkg.scripts[key] = value;
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
      log("✅ Updated package.json with test scripts", colors.green);
    }
  } catch (error) {
    log("❌ Could not update package.json", colors.red);
  }
}

// Main execution
await updatePackageJson();
await runTests();
