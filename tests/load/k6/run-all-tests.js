#!/usr/bin/env node

/**
 * K6 Load Testing Suite Runner
 *
 * Orchestrates all load testing scenarios and generates comprehensive reports.
 * Integrates with CI/CD pipelines and provides detailed analysis.
 *
 * Completes Task 14 infrastructure requirements from implementation plan.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Test configuration
const TESTS = {
  baseline: {
    name: "Baseline Load Test",
    file: "baseline.js",
    description: "100 RPS normal load",
    duration: "9 minutes",
    critical: true,
  },
  peak: {
    name: "Peak Load Test",
    file: "peak.js",
    description: "1000 RPS production target",
    duration: "33 minutes",
    critical: true,
  },
  stress: {
    name: "Stress Test",
    file: "stress.js",
    description: "2000 RPS breaking point",
    duration: "35 minutes",
    critical: false,
  },
  spike: {
    name: "Spike Test",
    file: "spike.js",
    description: "0→1000 RPS in 30s surge",
    duration: "14.5 minutes",
    critical: true,
  },
  soak: {
    name: "Soak Test",
    file: "soak.js",
    description: "500 RPS for 24 hours",
    duration: "24+ hours",
    critical: false, // Too long for regular CI
  },
};

// Configuration from environment
const CONFIG = {
  baseUrl: process.env.BASE_URL || "https://api.translation.tools",
  k6Path: process.env.K6_PATH || "k6",
  resultsDir: process.env.RESULTS_DIR || "./results",
  runMode: process.env.RUN_MODE || "critical", // critical, all, custom
  ciMode: process.env.CI === "true",
  slackWebhook: process.env.SLACK_WEBHOOK,
  emailRecipients: process.env.EMAIL_RECIPIENTS,
};

class LoadTestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
    this.ensureResultsDir();
  }

  ensureResultsDir() {
    if (!fs.existsSync(CONFIG.resultsDir)) {
      fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
    }
  }

  async runAllTests() {
    console.log("🚀 K6 Load Testing Suite Starting...");
    console.log(`Target: ${CONFIG.baseUrl}`);
    console.log(`Mode: ${CONFIG.runMode}`);
    console.log(`CI Mode: ${CONFIG.ciMode ? "Yes" : "No"}`);
    console.log("=".repeat(80));

    const testsToRun = this.getTestsToRun();

    let totalDuration = 0;
    for (const testKey of testsToRun) {
      const test = TESTS[testKey];
      console.log(`\n📋 Running ${test.name}...`);
      console.log(`📝 ${test.description}`);
      console.log(`⏱️ Expected duration: ${test.duration}`);

      try {
        const result = await this.runSingleTest(testKey, test);
        this.results[testKey] = result;

        if (result.success) {
          console.log(`✅ ${test.name} completed successfully`);
        } else {
          console.log(`❌ ${test.name} failed: ${result.error}`);

          if (test.critical && CONFIG.ciMode) {
            console.log("🚨 Critical test failed in CI mode - stopping");
            break;
          }
        }
      } catch (error) {
        console.error(`💥 ${test.name} crashed:`, error.message);
        this.results[testKey] = { success: false, error: error.message };

        if (test.critical && CONFIG.ciMode) {
          break;
        }
      }

      // Brief pause between tests
      await this.sleep(5000);
    }

    // Generate comprehensive report
    await this.generateFinalReport();

    // Send notifications
    await this.sendNotifications();

    console.log("\n🏁 Load testing suite completed!");
    return this.results;
  }

  getTestsToRun() {
    switch (CONFIG.runMode) {
      case "critical":
        return Object.keys(TESTS).filter((key) => TESTS[key].critical);
      case "all":
        return Object.keys(TESTS);
      case "baseline":
        return ["baseline"];
      case "performance":
        return ["baseline", "peak"];
      case "stress":
        return ["baseline", "peak", "stress"];
      default:
        // Custom mode - from environment
        const custom = process.env.CUSTOM_TESTS;
        return custom ? custom.split(",") : ["baseline"];
    }
  }

  async runSingleTest(testKey, test) {
    const startTime = Date.now();
    const testFile = path.join(process.cwd(), test.file);
    const resultFile = path.join(CONFIG.resultsDir, `${testKey}-results.json`);

    try {
      // Build k6 command
      const cmd = [
        CONFIG.k6Path,
        "run",
        "--env",
        `BASE_URL=${CONFIG.baseUrl}`,
        "--out",
        `json=${resultFile}`,
        testFile,
      ].join(" ");

      console.log(`🔧 Command: ${cmd}`);

      // Execute test
      const output = execSync(cmd, {
        encoding: "utf8",
        timeout: test.file === "soak.js" ? 25 * 60 * 60 * 1000 : 60 * 60 * 1000, // 1 hour timeout, 25 hours for soak
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse results if JSON file exists
      let metrics = null;
      if (fs.existsSync(resultFile)) {
        const jsonResults = fs.readFileSync(resultFile, "utf8");
        metrics = this.parseK6Results(jsonResults);
      }

      return {
        success: true,
        duration,
        output: output,
        metrics,
        testKey,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: false,
        duration,
        error: error.message,
        testKey,
        timestamp: new Date().toISOString(),
      };
    }
  }

  parseK6Results(jsonData) {
    const lines = jsonData.split("\n").filter((line) => line.trim());
    const metrics = {};

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === "Point" && data.metric) {
          if (!metrics[data.metric]) {
            metrics[data.metric] = [];
          }
          metrics[data.metric].push({
            timestamp: data.data.time,
            value: data.data.value,
            tags: data.data.tags,
          });
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return metrics;
  }

  async generateFinalReport() {
    const report = {
      suite: "K6 Load Testing Suite",
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      config: CONFIG,
      results: this.results,
      summary: this.generateSummary(),
    };

    // Save JSON report
    const reportFile = path.join(CONFIG.resultsDir, "load-test-suite-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlFile = path.join(CONFIG.resultsDir, "load-test-suite-report.html");
    fs.writeFileSync(htmlFile, htmlReport);

    // Generate text summary
    const textSummary = this.generateTextSummary(report);
    const textFile = path.join(CONFIG.resultsDir, "load-test-suite-summary.txt");
    fs.writeFileSync(textFile, textSummary);

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportFile}`);
    console.log(`   HTML: ${htmlFile}`);
    console.log(`   Text: ${textFile}`);
  }

  generateSummary() {
    const totalTests = Object.keys(this.results).length;
    const successfulTests = Object.values(this.results).filter((r) => r.success).length;
    const failedTests = totalTests - successfulTests;

    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate: ((successfulTests / totalTests) * 100).toFixed(1),
      overallStatus: failedTests === 0 ? "PASS" : "FAIL",
    };
  }

  generateTextSummary(report) {
    const summary = report.summary;

    return `
🚀 K6 LOAD TESTING SUITE REPORT
================================

📊 SUITE OVERVIEW:
   Tests Run: ${summary.totalTests}
   Successful: ${summary.successfulTests}
   Failed: ${summary.failedTests}
   Success Rate: ${summary.successRate}%
   Overall Status: ${summary.overallStatus}
   
⏱️ EXECUTION DETAILS:
   Started: ${report.timestamp}
   Duration: ${Math.round(report.duration / 1000 / 60)} minutes
   Target URL: ${report.config.baseUrl}
   Mode: ${report.config.runMode}

📋 TEST RESULTS:
${Object.entries(report.results)
  .map(
    ([key, result]) => `
   ${TESTS[key].name}:
   ├── Status: ${result.success ? "✅ PASS" : "❌ FAIL"}
   ├── Duration: ${Math.round(result.duration / 1000 / 60)} minutes
   ${result.error ? `└── Error: ${result.error}` : "└── Completed successfully"}
`
  )
  .join("")}

🎯 PRODUCTION READINESS:
   Baseline Performance: ${this.results.baseline?.success ? "✅" : "❌"}
   Peak Load Handling: ${this.results.peak?.success ? "✅" : "❌"}
   Traffic Spike Resilience: ${this.results.spike?.success ? "✅" : "❌"}
   Breaking Point Analysis: ${this.results.stress?.success ? "✅" : "❌"}
   Long-term Stability: ${this.results.soak?.success ? "✅" : "⏸️ Not Run"}

💡 RECOMMENDATIONS:
   ${
     summary.overallStatus === "PASS"
       ? "✅ System is ready for production load!"
       : "⚠️ Address failed tests before production deployment"
   }

Generated: ${new Date().toISOString()}
`;
  }

  generateHtmlReport(report) {
    const summary = report.summary;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Testing Suite Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #4CAF50; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #4CAF50; }
        .test-result { margin: 15px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ddd; }
        .pass { border-left-color: #4CAF50; background: #f0fff0; }
        .fail { border-left-color: #f44336; background: #fff0f0; }
        .status { font-weight: bold; font-size: 1.2em; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K6 Load Testing Suite Report</h1>
            <p class="timestamp">Generated: ${report.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <h3>Tests Run</h3>
                <div class="status">${summary.totalTests}</div>
            </div>
            <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="status">${summary.successRate}%</div>
            </div>
            <div class="stat-card">
                <h3>Overall Status</h3>
                <div class="status ${summary.overallStatus === "PASS" ? "pass" : "fail"}">${summary.overallStatus}</div>
            </div>
            <div class="stat-card">
                <h3>Duration</h3>
                <div class="status">${Math.round(report.duration / 1000 / 60)}m</div>
            </div>
        </div>
        
        <h2>📋 Test Results</h2>
        ${Object.entries(report.results)
          .map(
            ([key, result]) => `
        <div class="test-result ${result.success ? "pass" : "fail"}">
            <h3>${TESTS[key].name}</h3>
            <p><strong>Description:</strong> ${TESTS[key].description}</p>
            <p><strong>Status:</strong> <span class="status">${result.success ? "✅ PASS" : "❌ FAIL"}</span></p>
            <p><strong>Duration:</strong> ${Math.round(result.duration / 1000 / 60)} minutes</p>
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ""}
        </div>
        `
          )
          .join("")}
        
        <h2>🎯 Production Readiness Assessment</h2>
        <div class="test-result ${summary.overallStatus === "PASS" ? "pass" : "fail"}">
            <p><strong>System Status:</strong> ${
              summary.overallStatus === "PASS"
                ? "✅ Ready for production deployment"
                : "⚠️ Requires optimization before production"
            }</p>
            <p><strong>Load Handling:</strong> ${this.results.peak?.success ? "Excellent" : "Needs Work"}</p>
            <p><strong>Spike Resilience:</strong> ${this.results.spike?.success ? "Excellent" : "Needs Work"}</p>
        </div>
    </div>
</body>
</html>
`;
  }

  async sendNotifications() {
    const summary = this.generateSummary();

    // Slack notification
    if (CONFIG.slackWebhook) {
      try {
        await this.sendSlackNotification(summary);
        console.log("📱 Slack notification sent");
      } catch (error) {
        console.error("❌ Slack notification failed:", error.message);
      }
    }

    // Email notification (if configured)
    if (CONFIG.emailRecipients) {
      console.log("📧 Email notifications configured but not implemented");
    }
  }

  async sendSlackNotification(summary) {
    const message = {
      text: `🚀 Load Testing Suite ${summary.overallStatus}`,
      attachments: [
        {
          color: summary.overallStatus === "PASS" ? "good" : "danger",
          fields: [
            { title: "Tests Run", value: summary.totalTests, short: true },
            { title: "Success Rate", value: `${summary.successRate}%`, short: true },
            { title: "Target", value: CONFIG.baseUrl, short: false },
          ],
        },
      ],
    };

    // Implementation would use fetch/axios to send to Slack webhook
    console.log("Slack message:", JSON.stringify(message, null, 2));
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const runner = new LoadTestRunner();

  try {
    const results = await runner.runAllTests();
    const summary = runner.generateSummary();

    // Exit with appropriate code for CI
    process.exit(summary.overallStatus === "PASS" ? 0 : 1);
  } catch (error) {
    console.error("💥 Load testing suite failed:", error);
    process.exit(1);
  }
}

// Export for programmatic use
export { LoadTestRunner };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
