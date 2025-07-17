/**
 * Test UI Endpoint
 * GET /api/test-ui
 *
 * Serves an HTML interface for testing the Translation Helps API
 */

import type { Handler } from "@netlify/functions";

const TEST_CASES = [
  // Single verses
  { reference: "Titus 1:1", description: "Single verse - our main test case" },
  { reference: "Philemon 1:1", description: "Single verse - smallest book" },
  { reference: "2 John 1:1", description: "Single verse - second smallest book" },
  { reference: "3 John 1:1", description: "Single verse - third smallest book" },
  { reference: "Jude 1:1", description: "Single verse - one chapter book" },

  // Verse ranges
  { reference: "Titus 1:1-3", description: "Verse range - 3 verses" },
  { reference: "Philemon 1:1-5", description: "Verse range - small book, 5 verses" },
  { reference: "2 John 1:1-6", description: "Verse range - half of 2 John" },
  { reference: "3 John 1:1-8", description: "Verse range - most of 3 John" },
  { reference: "Jude 1:1-10", description: "Verse range - partial Jude" },

  // Full chapters
  { reference: "Titus 1", description: "Full chapter - Titus chapter 1" },
  { reference: "Philemon 1", description: "Full chapter - entire Philemon (1 chapter)" },
  { reference: "2 John 1", description: "Full chapter - entire 2 John (1 chapter)" },
  { reference: "3 John 1", description: "Full chapter - entire 3 John (1 chapter)" },
  { reference: "Jude 1", description: "Full chapter - entire Jude (1 chapter)" },
  { reference: "Titus 2", description: "Full chapter - Titus chapter 2" },
  { reference: "Titus 3", description: "Full chapter - Titus chapter 3" },

  // Multiple chapters
  { reference: "Titus 1-2", description: "Multiple chapters - Titus 1-2" },
  { reference: "Titus 2-3", description: "Multiple chapters - Titus 2-3" },
  { reference: "1 Timothy 1-2", description: "Multiple chapters - 1 Timothy 1-2" },

  // Full books (small ones only for testing)
  { reference: "Philemon", description: "Full book - Philemon (25 verses)" },
  { reference: "2 John", description: "Full book - 2 John (13 verses)" },
  { reference: "3 John", description: "Full book - 3 John (14 verses)" },
  { reference: "Jude", description: "Full book - Jude (25 verses)" },
  { reference: "Titus", description: "Full book - Titus (46 verses)" },

  // Edge cases
  { reference: "Obadiah 1:1", description: "Edge case - shortest OT book single verse" },
  { reference: "Obadiah 1", description: "Edge case - shortest OT book full chapter" },
  { reference: "Obadiah", description: "Edge case - shortest OT book (21 verses)" },
  { reference: "Haggai 1:1", description: "Edge case - short OT book single verse" },
  { reference: "Haggai 1", description: "Edge case - short OT book chapter" },
  { reference: "Haggai", description: "Edge case - short OT book (38 verses)" },
];

export const handler: Handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/html",
  };

  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  const baseUrl = event.headers.host?.includes("localhost")
    ? `http://${event.headers.host}`
    : `https://${event.headers.host}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Helps MCP - Comprehensive Test Suite</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .test-case {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border: 1px solid #e1e5e9;
        }
        .test-case h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 16px;
        }
        .test-description {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 15px;
        }
        .test-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        .btn-primary { background: #3498db; color: white; }
        .btn-secondary { background: #95a5a6; color: white; }
        .btn-success { background: #27ae60; color: white; }
        .btn-warning { background: #f39c12; color: white; }
        .btn:hover { opacity: 0.9; }
        .results {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
        }
        .loading {
            color: #3498db;
            font-style: italic;
        }
        .error {
            color: #e74c3c;
            background: #fdf2f2;
            border-color: #f5c6cb;
        }
        .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 10px;
            border-radius: 6px;
            background: #f8f9fa;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
        }
        .bulk-controls {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .bulk-controls .btn {
            margin: 0 10px;
            padding: 12px 24px;
            font-size: 14px;
        }
        .debug-section {
            background: #f0f2f5;
            border: 1px solid #dcdfe6;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            margin-bottom: 30px;
        }
        .debug-section h2 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #34495e;
        }
        .debug-controls {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .debug-controls .btn {
            padding: 8px 16px;
            font-size: 13px;
        }
        .debug-output {
            width: 100%;
            height: 200px;
            padding: 10px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            background: #f8f9fa;
            border: 1px solid #dcdfe6;
            border-radius: 6px;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-y: auto;
        }
        .debug-stats {
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
        }
        .debug-filter {
            margin-left: 15px;
        }
        .debug-filter input {
            margin-right: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📖 Translation Helps MCP - Comprehensive Test Suite</h1>
        <p>Test various biblical reference combinations to validate scripture, notes, questions, words, and links</p>
    </div>

    <div class="bulk-controls">
        <button class="btn btn-primary" onclick="runAllTests()">🚀 Run All Tests</button>
        <button class="btn btn-secondary" onclick="runSingleVerseTests()">📄 Single Verses Only</button>
        <button class="btn btn-success" onclick="runChapterTests()">📚 Chapters Only</button>
        <button class="btn btn-warning" onclick="runEdgeCaseTests()">⚡ Edge Cases Only</button>
        <button class="btn btn-secondary" onclick="clearAllResults()">🗑️ Clear All</button>
    </div>

    <div class="debug-section">
        <h2>🐛 Debug Output (Copy-Paste Ready)</h2>
        <div class="debug-controls">
            <button class="btn btn-warning" onclick="generateDebugReport()">📋 Generate Debug Report</button>
            <button class="btn btn-secondary" onclick="clearDebugOutput()">🗑️ Clear Debug</button>
            <label class="debug-filter">
                <input type="checkbox" id="errorsOnly" checked> Errors Only
            </label>
            <label class="debug-filter">
                <input type="checkbox" id="missingData"> Missing Data
            </label>
            <label class="debug-filter">
                <input type="checkbox" id="allResponses"> All Responses
            </label>
        </div>
        <textarea id="debugOutput" class="debug-output" placeholder="Debug report will appear here..."></textarea>
        <div class="debug-stats">
            <span id="debugErrorCount">0 errors</span> • 
            <span id="debugMissingCount">0 missing data</span> • 
            <span id="debugTotalCount">0 total responses</span>
        </div>
    </div>

    <div class="stats" id="stats">
        <div class="stat-item">
            <div class="stat-number" id="total-tests">${TEST_CASES.length}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="completed-tests">0</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="passed-tests">0</div>
            <div class="stat-label">Passed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number" id="failed-tests">0</div>
            <div class="stat-label">Failed</div>
        </div>
    </div>

    <div class="test-grid">
        ${TEST_CASES.map(
          (testCase, index) => `
            <div class="test-case" id="test-${index}">
                <h3>${testCase.reference}</h3>
                <div class="test-description">${testCase.description}</div>
                <div class="test-buttons">
                    <button class="btn btn-primary" onclick="runTest(${index}, 'all')">All Resources</button>
                    <button class="btn btn-secondary" onclick="runTest(${index}, 'scripture')">Scripture</button>
                    <button class="btn btn-success" onclick="runTest(${index}, 'notes')">Notes</button>
                    <button class="btn btn-warning" onclick="runTest(${index}, 'questions')">Questions</button>
                    <button class="btn btn-primary" onclick="runTest(${index}, 'words')">Words</button>
                    <button class="btn btn-secondary" onclick="runTest(${index}, 'links')">Links</button>
                </div>
                <div class="results" id="results-${index}" style="display: none;"></div>
            </div>
        `
        ).join("")}
    </div>

    <script>
        const TEST_CASES = ${JSON.stringify(TEST_CASES)};
        const baseUrl = window.location.protocol + '//' + window.location.host;
        let stats = { completed: 0, passed: 0, failed: 0 };

        async function runTest(index, resources) {
            const testCase = TEST_CASES[index];
            const resultsDiv = document.getElementById('results-' + index);
            resultsDiv.style.display = 'block';
            resultsDiv.className = 'results loading';
            resultsDiv.innerHTML = '🔄 Running test...';

            try {
                const resourceParam = resources === 'all' ? '' : '&resources=' + resources;
                const url = baseUrl + '/.netlify/functions/fetch-resources?reference=' + encodeURIComponent(testCase.reference) + resourceParam;
                
                const response = await fetch(url);
                const data = await response.json();

                if (response.ok) {
                    resultsDiv.className = 'results';
                    const formattedResults = formatResults(data, resources);
                    resultsDiv.innerHTML = formattedResults;
                    updateStats(true);
                    
                    // Auto-collect debug data
                    debugResponses.push({
                        testCase: testCase.reference,
                        description: testCase.description,
                        resources: resources,
                        results: formattedResults,
                        rawData: data
                    });
                } else {
                    throw new Error('HTTP ' + response.status + ': ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                resultsDiv.className = 'results error';
                const errorMessage = '❌ Error: ' + error.message;
                resultsDiv.innerHTML = errorMessage;
                updateStats(false);
                
                // Auto-collect error data
                debugErrors.push({
                    testCase: testCase.reference,
                    description: testCase.description,
                    resources: resources,
                    error: error.message,
                    results: errorMessage
                });
            }
        }

        function formatResults(data, resources) {
            let html = '<strong>📊 Results Summary:</strong><br>';
            
            if (resources === 'all' || resources === 'scripture') {
                html += \`🔤 Scripture: \${data.scripture ? '✅ Found' : '❌ None'}\`;
                if (data.scriptures && data.scriptures.length > 0) {
                    html += \` (\${data.scriptures.length} translations)\`;
                }
                html += '<br>';
            }
            
            if (resources === 'all' || resources === 'notes') {
                html += \`📝 Notes: \${data.translationNotes?.length || 0}<br>\`;
            }
            
            if (resources === 'all' || resources === 'questions') {
                html += \`❓ Questions: \${data.translationQuestions?.length || 0}<br>\`;
            }
            
            if (resources === 'all' || resources === 'words') {
                html += \`📖 Words: \${data.translationWords?.length || 0}<br>\`;
            }
            
            if (resources === 'all' || resources === 'links') {
                html += \`🔗 Links: \${data.translationWordLinks?.length || 0}<br>\`;
            }

            html += \`<br><strong>⏱️ Performance:</strong><br>\`;
            html += \`Response Time: \${data.metadata?.responseTime || 'Unknown'}ms<br>\`;
            html += \`Cached: \${data.metadata?.cached ? '✅ Yes' : '❌ No'}<br>\`;

            if (data.translationWords && data.translationWords.length > 0) {
                html += \`<br><strong>📖 Sample Words:</strong><br>\`;
                data.translationWords.slice(0, 3).forEach(word => {
                    html += \`• \${word.term}: \${word.definition}<br>\`;
                });
            }

            if (data.translationWordLinks && data.translationWordLinks.length > 0) {
                html += \`<br><strong>🔗 Sample Links:</strong><br>\`;
                data.translationWordLinks.slice(0, 3).forEach(link => {
                    html += \`• \${link.word} (\${link.reference || 'N/A'}): \${link.origWords || 'N/A'}<br>\`;
                });
            }

            return html;
        }

        function updateStats(passed) {
            stats.completed++;
            if (passed) stats.passed++;
            else stats.failed++;
            
            document.getElementById('completed-tests').textContent = stats.completed;
            document.getElementById('passed-tests').textContent = stats.passed;
            document.getElementById('failed-tests').textContent = stats.failed;
        }

        async function runAllTests() {
            for (let i = 0; i < TEST_CASES.length; i++) {
                await runTest(i, 'all');
                await new Promise(resolve => setTimeout(resolve, 500)); // Prevent overwhelming the server
            }
        }

        async function runSingleVerseTests() {
            const singleVerseIndices = [0, 1, 2, 3, 4, 24, 26]; // Single verse test cases
            for (const index of singleVerseIndices) {
                await runTest(index, 'all');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        async function runChapterTests() {
            const chapterIndices = [10, 11, 12, 13, 14, 15, 16]; // Chapter test cases
            for (const index of chapterIndices) {
                await runTest(index, 'all');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        async function runEdgeCaseTests() {
            const edgeCaseIndices = [24, 25, 26, 27, 28, 29]; // Edge case test cases
            for (const index of edgeCaseIndices) {
                await runTest(index, 'all');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        function clearAllResults() {
            for (let i = 0; i < TEST_CASES.length; i++) {
                const resultsDiv = document.getElementById('results-' + i);
                resultsDiv.style.display = 'none';
                resultsDiv.innerHTML = '';
            }
            stats = { completed: 0, passed: 0, failed: 0 };
            updateStats(false);
            stats.failed = 0; // Reset failed count after updating
        }

        // Debug functions
        let debugResponses = [];
        let debugErrors = [];

        async function generateDebugReport() {
            const errorsOnly = document.getElementById('errorsOnly').checked;
            const missingData = document.getElementById('missingData').checked;
            const allResponses = document.getElementById('allResponses').checked;

            let reportData = [];

            // ERRORS FIRST (highest priority)
            if (errorsOnly || allResponses) {
                debugErrors.forEach(function(item) {
                    reportData.push({
                        priority: 1,
                        type: 'ERROR',
                        reference: item.testCase,
                        description: item.description,
                        resources: item.resources,
                        issue: item.error,
                        fullResults: item.results
                    });
                });
            }

            // MISSING DATA (second priority)
            if (missingData || allResponses) {
                debugResponses.forEach(function(item) {
                    if (item.results.includes('❌ None') || 
                        item.results.includes(': 0<br>') ||
                        item.results.includes('Scripture: ❌ None')) {
                        reportData.push({
                            priority: 2,
                            type: 'MISSING_DATA',
                            reference: item.testCase,
                            description: item.description,
                            resources: item.resources,
                            issue: 'No data returned',
                            fullResults: item.results
                        });
                    }
                });
            }

            // ALL RESPONSES (lowest priority)
            if (allResponses && !errorsOnly && !missingData) {
                debugResponses.forEach(function(item) {
                    reportData.push({
                        priority: 3,
                        type: 'SUCCESS',
                        reference: item.testCase,
                        description: item.description,
                        resources: item.resources,
                        issue: 'Working as expected',
                        fullResults: item.results
                    });
                });
            }

            // Sort by priority (errors first, then missing data, then successes)
            reportData.sort(function(a, b) { return a.priority - b.priority; });

            // Generate copy-paste ready report
            const timestamp = new Date().toISOString();
            let report = '=== TRANSLATION HELPS MCP DEBUG REPORT ===\\n';
            report += 'Generated: ' + timestamp + '\\n';
            report += 'Total Tests: ' + (debugResponses.length + debugErrors.length) + '\\n';
            report += 'Errors: ' + debugErrors.length + '\\n';
            report += 'Missing Data: ' + debugResponses.filter(function(r) { return r.results.includes('❌ None'); }).length + '\\n';
            report += '\\n';

            if (reportData.length === 0) {
                report += 'No data to report. Run some tests first!\\n';
            } else {
                reportData.forEach(function(item, index) {
                    report += '--- TEST ' + (index + 1) + ': ' + item.type + ' ---\\n';
                    report += 'Reference: ' + item.reference + '\\n';
                    report += 'Description: ' + item.description + '\\n';
                    report += 'Resources: ' + item.resources + '\\n';
                    report += 'Issue: ' + item.issue + '\\n';
                    report += 'Results: ' + item.fullResults.replace(/<br>/g, ' | ').replace(/<[^>]*>/g, '') + '\\n';
                    report += '\\n';
                });
            }

            report += '=== END REPORT ===';

            document.getElementById('debugOutput').value = report;
            document.getElementById('debugErrorCount').textContent = debugErrors.length + ' errors';
            const missingCount = debugResponses.filter(function(r) { return r.results.includes('❌ None'); }).length;
            document.getElementById('debugMissingCount').textContent = missingCount + ' missing data';
            document.getElementById('debugTotalCount').textContent = (debugResponses.length + debugErrors.length) + ' total responses';
        }

        function clearDebugOutput() {
            debugResponses = [];
            debugErrors = [];
            document.getElementById('debugOutput').value = '';
            document.getElementById('debugErrorCount').textContent = '0 errors';
            document.getElementById('debugMissingCount').textContent = '0 missing data';
            document.getElementById('debugTotalCount').textContent = '0 total responses';
        }
    </script>
</body>
</html>
`;

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
    },
    body: html,
  };
};
