/**
 * Test UI Endpoint
 * GET /api/test-ui
 *
 * Serves an HTML interface for testing the Translation Helps API
 */

import { Handler } from "@netlify/functions";

const testUIHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Helps API Testing Interface</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .json-container {
            max-height: 600px;
            overflow-y: auto;
        }
        .resource-badge {
            @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
        }
        .status-success { @apply bg-green-100 text-green-800; }
        .status-warning { @apply bg-yellow-100 text-yellow-800; }
        .status-error { @apply bg-red-100 text-red-800; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="gradient-bg text-white py-8 mb-8">
        <div class="container mx-auto px-4">
            <h1 class="text-4xl font-bold mb-2">Translation Helps API</h1>
            <p class="text-lg opacity-90">Test Interface for Scripture Resource Fetching</p>
        </div>
    </div>

    <div class="container mx-auto px-4 pb-8">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-semibold mb-4">Test API Endpoints</h2>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Scripture Reference</label>
                    <input 
                        type="text" 
                        id="reference" 
                        placeholder="e.g., John 3:16, Matthew 5:1-10" 
                        value="Titus 1:1"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Language Code</label>
                    <input 
                        type="text" 
                        id="language" 
                        placeholder="e.g., en, es, fr" 
                        value="en"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                </div>

                <div class="flex space-x-4">
                    <button 
                        onclick="testFetchResources()" 
                        class="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                        Fetch Resources
                    </button>
                    <button 
                        onclick="testExtractReferences()" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Extract References
                    </button>
                    <button 
                        onclick="testHealthCheck()" 
                        class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                        Health Check
                    </button>
                </div>
            </div>
        </div>

        <div id="results" class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-xl font-semibold mb-4">Results</h3>
            <div id="loading" class="hidden">
                <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </div>
            <div id="result-content" class="json-container">
                <p class="text-gray-500">Click a button above to test an endpoint</p>
            </div>
        </div>
    </div>

    <script>
        async function makeRequest(endpoint, params = {}) {
            const loading = document.getElementById('loading');
            const content = document.getElementById('result-content');
            
            loading.classList.remove('hidden');
            content.innerHTML = '';

            const queryString = new URLSearchParams(params).toString();
            const url = endpoint + (queryString ? '?' + queryString : '');

            try {
                const startTime = performance.now();
                const response = await fetch(url);
                const endTime = performance.now();
                const data = await response.json();

                content.innerHTML = \`
                    <div class="mb-4">
                        <span class="resource-badge status-\${response.ok ? 'success' : 'error'}">
                            \${response.status} \${response.statusText}
                        </span>
                        <span class="text-sm text-gray-600 ml-2">
                            Response time: \${(endTime - startTime).toFixed(0)}ms
                        </span>
                    </div>
                    <pre><code class="language-json">\${JSON.stringify(data, null, 2)}</code></pre>
                \`;
                
                Prism.highlightAll();
            } catch (error) {
                content.innerHTML = \`
                    <div class="text-red-600">
                        <p class="font-semibold">Error:</p>
                        <p>\${error.message}</p>
                    </div>
                \`;
            } finally {
                loading.classList.add('hidden');
            }
        }

        async function testFetchResources() {
            const reference = document.getElementById('reference').value;
            const language = document.getElementById('language').value;
            
            await makeRequest('/api/fetch-resources', { reference, language });
        }

        async function testExtractReferences() {
            const reference = document.getElementById('reference').value;
            
            await makeRequest('/api/extract-references', { text: reference });
        }

        async function testHealthCheck() {
            await makeRequest('/api/health');
        }

        // Test on page load
        window.addEventListener('DOMContentLoaded', () => {
            testHealthCheck();
        });
    </script>
</body>
</html>
`;

export const handler: Handler = async (event, context) => {
  const headers = {
    "Content-Type": "text/html",
    "Cache-Control": "no-cache",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: "Method Not Allowed",
    };
  }

  return {
    statusCode: 200,
    headers,
    body: testUIHTML,
  };
};
