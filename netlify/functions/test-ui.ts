import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Helps API - Test UI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .timing-success { color: #10b981; }
        .timing-warning { color: #f59e0b; }
        .timing-error { color: #ef4444; }
    </style>
</head>
<body class="gradient-bg min-h-screen text-white">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-8">🚀 Translation Helps API Test Suite</h1>
        
        <!-- Individual Endpoint Testing -->
        <div class="card rounded-xl p-6 mb-8">
            <h2 class="text-2xl font-semibold mb-4">🔧 Individual Endpoint Testing</h2>
            
            <form id="testForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Reference:</label>
                        <input type="text" id="reference" value="Titus 1:1" 
                               class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Language:</label>
                        <input type="text" id="language" value="en" 
                               class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Organization:</label>
                        <input type="text" id="organization" value="unfoldingWord" 
                               class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Endpoint:</label>
                        <select id="endpoint" class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white">
                            <option value="fetch-scripture">Scripture</option>
                            <option value="fetch-translation-notes">Translation Notes</option>
                            <option value="fetch-translation-questions">Translation Questions</option>
                            <option value="fetch-translation-words">Translation Words</option>
                            <option value="fetch-translation-word-links">Translation Word Links</option>
                            <option value="fetch-resources">All Resources</option>
                        </select>
        </div>
                </div>
                
                <div class="flex flex-wrap gap-4">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium">
                        🚀 Test Endpoint
                    </button>
                    <button type="button" onclick="testAllEndpoints()" class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium">
                        🎯 Test All Endpoints
                    </button>
                </div>
            </form>
            
            <div id="individualResults" class="mt-6"></div>
        </div>

        <!-- Bulk Testing -->
        <div class="card rounded-xl p-6 mb-8">
            <h2 class="text-2xl font-semibold mb-4">📊 Bulk Testing Suite</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Test Configuration:</label>
                    <select id="testConfig" class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white">
                        <option value="quick">Quick (5 tests)</option>
                        <option value="standard">Standard (15 tests)</option>
                        <option value="comprehensive">Comprehensive (30 tests)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div>
                    <button onclick="runBulkTests()" class="w-full bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium">
                        🎲 Run Bulk Tests
                    </button>
                </div>
                </div>
                
            <div id="bulkResults" class="mt-6"></div>
        </div>
        
        <!-- Debug Logs -->
        <div class="card rounded-xl p-6">
            <h2 class="text-2xl font-semibold mb-4">📋 Debug Information</h2>
            <div id="debugLogs" class="bg-black/20 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto"></div>
        </div>
    </div>

    <script>
        const API_BASE = '/.netlify/functions';
        const debugLogs = [];

        function addDebugLog(level, message, data) {
            const timestamp = new Date().toISOString();
            const logEntry = { timestamp, level, message, data };
            debugLogs.push(logEntry);
            
            const debugDiv = document.getElementById('debugLogs');
            const logLine = document.createElement('div');
            logLine.className = 'mb-2';
            logLine.innerHTML = '<span class="text-gray-400">[' + timestamp + ']</span> <span class="text-yellow-400">[' + level + ']</span> ' + message;
            if (data) {
                logLine.innerHTML += ' <span class="text-blue-400">' + JSON.stringify(data) + '</span>';
            }
            debugDiv.appendChild(logLine);
            debugDiv.scrollTop = debugDiv.scrollHeight;
        }

        async function testEndpoint(endpoint, params) {
            const startTime = Date.now();
            const url = API_BASE + '/' + endpoint + '?' + new URLSearchParams(params);
            
            addDebugLog('INFO', 'Testing endpoint: ' + endpoint, params);
            
            try {
                const response = await fetch(url);
                const clientTime = Date.now() - startTime;
                const responseText = await response.text();
                
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    throw new Error('Invalid JSON response');
                }
                
                const totalTime = responseData.responseTime + clientTime;
                
                addDebugLog('SUCCESS', 'Endpoint test completed', {
                    endpoint: endpoint,
                    status: response.status,
                    clientTime: clientTime + 'ms',
                    serverTime: responseData.responseTime + 'ms',
                    totalTime: totalTime + 'ms',
                    dataCount: responseData.data ? responseData.data.length : 0
                });
                
                return {
                    success: true,
                    endpoint: endpoint,
                    clientTime: clientTime,
                    serverTime: responseData.responseTime,
                    totalTime: totalTime,
                    dataCount: responseData.data ? responseData.data.length : 0,
                    data: responseData
                };
            } catch (error) {
                addDebugLog('ERROR', 'Endpoint test failed: ' + endpoint, { error: error.message });
                return {
                    success: false,
                    endpoint: endpoint,
                    error: error.message
                };
            }
        }

        async function testAllEndpoints() {
            const reference = document.getElementById('reference').value;
            const language = document.getElementById('language').value;
            const organization = document.getElementById('organization').value;
            
            const endpoints = [
                'fetch-scripture',
                'fetch-translation-notes', 
                'fetch-translation-questions',
                'fetch-translation-words',
                'fetch-translation-word-links',
                'fetch-resources'
            ];
            
            const params = { reference, language, organization };
            
            addDebugLog('INFO', 'Starting all endpoint tests', { endpoints: endpoints, params: params });
            
            const results = await Promise.all(
                endpoints.map(endpoint => testEndpoint(endpoint, params))
            );
            
            displayIndividualResults(results);
        }

        function displayIndividualResults(results) {
            const resultsDiv = document.getElementById('individualResults');
            resultsDiv.innerHTML = '<h3 class="text-xl font-semibold mb-4">Test Results</h3>';
            
            results.forEach(result => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'mb-4 p-4 rounded-lg ' + (result.success ? 'bg-green-900/20' : 'bg-red-900/20');
                
                if (result.success) {
                    resultDiv.innerHTML = 
                        '<div class="font-medium text-green-400">✅ ' + result.endpoint + '</div>' +
                        '<div class="text-sm text-gray-300">' +
                        'Client: <span class="timing-success">' + result.clientTime + 'ms</span> | ' +
                        'Server: <span class="timing-success">' + result.serverTime + 'ms</span> | ' +
                        'Total: <span class="timing-success">' + result.totalTime + 'ms</span> | ' +
                        'Data: ' + result.dataCount + ' items' +
                        '</div>';
                        } else {
                    resultDiv.innerHTML = 
                        '<div class="font-medium text-red-400">❌ ' + result.endpoint + '</div>' +
                        '<div class="text-sm text-gray-300">Error: ' + result.error + '</div>';
                }
                
                resultsDiv.appendChild(resultDiv);
            });
            
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }

        async function runBulkTests() {
            const resultsDiv = document.getElementById('bulkResults');
            resultsDiv.innerHTML = '<div class="text-center">🔄 Running bulk tests...</div>';
            
            const testCases = generateTestCases();
            const results = { total: testCases.length, passed: 0, failed: 0, details: [] };
            
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const result = await testEndpoint(testCase.endpoint, testCase.params);
                
                if (result.success) {
                    results.passed++;
                        } else {
                    results.failed++;
                }
                
                results.details.push(result);
                
                // Update progress
                resultsDiv.innerHTML = '<div class="text-center">🔄 Running test ' + (i + 1) + ' of ' + testCases.length + '...</div>';
            }
            
            displayBulkResults(results);
        }

        function generateTestCases() {
            const references = ['Titus 1:1', 'John 3:16', 'Genesis 1:1', 'Matthew 5:1-12', 'Psalm 23:1-6'];
            const endpoints = ['fetch-scripture', 'fetch-translation-notes', 'fetch-translation-questions', 'fetch-translation-words', 'fetch-translation-word-links'];
            
            const testCases = [];
            for (let i = 0; i < 10; i++) {
                testCases.push({
                    endpoint: endpoints[i % endpoints.length],
                    params: {
                        reference: references[i % references.length],
                        language: 'en',
                        organization: 'unfoldingWord'
                    }
                });
            }
            
            return testCases;
        }

        function displayBulkResults(results) {
            const resultsDiv = document.getElementById('bulkResults');
            
            const summary = 
                '<div class="mb-4 p-4 bg-blue-900/20 rounded-lg">' +
                '<h3 class="text-xl font-semibold mb-2">Bulk Test Summary</h3>' +
                '<div class="grid grid-cols-3 gap-4 text-center">' +
                '<div><div class="text-2xl font-bold text-blue-400">' + results.total + '</div><div class="text-sm">Total</div></div>' +
                '<div><div class="text-2xl font-bold text-green-400">' + results.passed + '</div><div class="text-sm">Passed</div></div>' +
                '<div><div class="text-2xl font-bold text-red-400">' + results.failed + '</div><div class="text-sm">Failed</div></div>' +
                '</div></div>';
            
            const details = results.details.map(result => {
                const color = result.success ? 'green' : 'red';
                const icon = result.success ? '✅' : '❌';
                return '<div class="mb-2 p-2 bg-' + color + '-900/20 rounded">' + icon + ' ' + result.endpoint + '</div>';
            }).join('');
            
            resultsDiv.innerHTML = summary + details;
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }

        // Form submission
        document.getElementById('testForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const endpoint = document.getElementById('endpoint').value;
            const params = {
                reference: document.getElementById('reference').value,
                language: document.getElementById('language').value,
                organization: document.getElementById('organization').value
            };
            
            const result = await testEndpoint(endpoint, params);
            displayIndividualResults([result]);
        });

        addDebugLog('INFO', 'Test UI loaded successfully');
    </script>
</body>
</html>
`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
    },
    body: html,
  };
};
