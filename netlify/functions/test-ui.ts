/**
 * Test UI Endpoint
 * GET /api/test-ui
 *
 * Serves an HTML interface for testing the Translation Helps API
 */

import { Handler } from "@netlify/functions";

const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Helps MCP - Test UI</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1d1d1f;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #86868b;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .card h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #1d1d1f;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        label {
            display: block;
            font-weight: 500;
            margin-bottom: 0.25rem;
            color: #1d1d1f;
        }
        
        input[type="text"],
        select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d2d2d7;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        
        input[type="text"]:focus,
        select:focus {
            outline: none;
            border-color: #0071e3;
        }
        
        .checkbox-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            background: #f5f5f7;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .checkbox-label:hover {
            background: #e8e8ed;
        }
        
        input[type="checkbox"] {
            margin-right: 0.5rem;
        }
        
        button {
            background: #0071e3;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        button:hover {
            background: #0077ed;
        }
        
        button:disabled {
            background: #86868b;
            cursor: not-allowed;
        }
        
        .loading {
            display: none;
            margin-top: 1rem;
            color: #0071e3;
        }
        
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
        }
        
        .results {
            display: none;
            margin-top: 2rem;
        }
        
        .resource-section {
            background: #f5f5f7;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .resource-section h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1d1d1f;
        }
        
        .scripture-text {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #1d1d1f;
            padding: 1rem;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #0071e3;
        }
        
        .note-item,
        .question-item,
        .word-item {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 0.5rem;
            border-left: 4px solid #d2d2d7;
        }
        
        .note-item strong,
        .question-item strong,
        .word-item strong {
            color: #0071e3;
        }
        
        pre {
            background: #1d1d1f;
            color: #f5f5f7;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 0.9rem;
        }

        .stats {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .stat {
            background: #e8e8ed;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .endpoint-test {
            margin-bottom: 1rem;
            padding: 1rem;
            background: #f5f5f7;
            border-radius: 8px;
        }

        .endpoint-status {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }

        .status-pending { background: #ffc107; }
        .status-success { background: #4caf50; }
        .status-error { background: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Translation Helps MCP</h1>
        <p class="subtitle">Door43 Content Service API Test Interface</p>
        
        <div class="card">
            <h2>Test Individual Endpoints</h2>
            <div id="endpointTests"></div>
        </div>

        <div class="card">
            <h2>Fetch Resources</h2>
            <form id="fetchForm">
                <div class="form-group">
                    <label for="reference">Bible Reference</label>
                    <input type="text" id="reference" name="reference" 
                           placeholder="e.g., Titus 1:1 or Tit 1:1-5 or Genesis 1-3" 
                           value="Titus 1:1">
                </div>
                
                <div class="form-group">
                    <label for="language">Language Code</label>
                    <input type="text" id="language" name="language" 
                           placeholder="e.g., en, fr, es" 
                           value="en">
                </div>
                
                <div class="form-group">
                    <label for="organization">Organization</label>
                    <select id="organization" name="organization">
                        <option value="unfoldingWord" selected>unfoldingWord</option>
                        <option value="Door43-Catalog">Door43-Catalog</option>
                        <option value="STR">STR (Spanish)</option>
                        <option value="ru_gl">ru_gl (Russian)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Resource Types</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="resources" value="scripture" checked>
                            Scripture Text
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="resources" value="notes" checked>
                            Translation Notes
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="resources" value="questions" checked>
                            Translation Questions
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="resources" value="words" checked>
                            Translation Words
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="resources" value="links" checked>
                            Translation Word Links
                        </label>
                    </div>
                </div>
                
                <button type="submit">Fetch Resources</button>
                <div class="loading">Loading...</div>
            </form>
        </div>
        
        <div id="results" class="results"></div>
    </div>

    <script>
        // Test individual endpoints
        async function testEndpoints() {
            const endpoints = [
                { name: 'Scripture', url: '/api/fetch-scripture?reference=Titus 1:1' },
                { name: 'Translation Notes', url: '/api/fetch-translation-notes?reference=Titus 1:1' },
                { name: 'Translation Questions', url: '/api/fetch-translation-questions?reference=Titus 1:1' },
                { name: 'Translation Words', url: '/api/fetch-translation-words?reference=Titus 1:1' },
                { name: 'Translation Word Links', url: '/api/fetch-translation-word-links?reference=Titus 1:1' }
            ];

            const container = document.getElementById('endpointTests');
            container.innerHTML = '';

            for (const endpoint of endpoints) {
                const div = document.createElement('div');
                div.className = 'endpoint-test';
                div.innerHTML = \`
                    <span class="endpoint-status status-pending"></span>
                    <strong>\${endpoint.name}:</strong> Testing...
                \`;
                container.appendChild(div);

                try {
                    const response = await fetch(endpoint.url);
                    const data = await response.json();
                    const status = div.querySelector('.endpoint-status');
                    
                    if (response.ok) {
                        status.className = 'endpoint-status status-success';
                        div.innerHTML += \` ✓ Working\`;
                        console.log(\`\${endpoint.name} response:\`, data);
                    } else {
                        status.className = 'endpoint-status status-error';
                        div.innerHTML += \` ✗ Error: \${data.error || response.status}\`;
                    }
                } catch (error) {
                    const status = div.querySelector('.endpoint-status');
                    status.className = 'endpoint-status status-error';
                    div.innerHTML += \` ✗ Network Error: \${error.message}\`;
                }
            }
        }

        // Fetch resources using individual endpoints
        document.getElementById('fetchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const reference = formData.get('reference');
            const language = formData.get('language');
            const organization = formData.get('organization');
            const resources = formData.getAll('resources');
            
            const resultsDiv = document.getElementById('results');
            const loadingDiv = document.querySelector('.loading');
            
            loadingDiv.style.display = 'block';
            resultsDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
            
            try {
                const results = {};
                const errors = [];

                // Fetch each resource type separately
                if (resources.includes('scripture')) {
                    try {
                        const response = await fetch(\`/api/fetch-scripture?reference=\${encodeURIComponent(reference)}&language=\${language}&organization=\${organization}\`);
                        const data = await response.json();
                        if (response.ok && data.scripture) {
                            results.scripture = data.scripture;
                        } else {
                            errors.push(\`Scripture: \${data.error || 'Not found'}\`);
                        }
                    } catch (error) {
                        errors.push(\`Scripture: \${error.message}\`);
                    }
                }

                if (resources.includes('notes')) {
                    try {
                        const response = await fetch(\`/api/fetch-translation-notes?reference=\${encodeURIComponent(reference)}&language=\${language}&organization=\${organization}\`);
                        const data = await response.json();
                        if (response.ok && data.translationNotes) {
                            results.translationNotes = data.translationNotes;
                        } else {
                            errors.push(\`Translation Notes: \${data.error || 'Not found'}\`);
                        }
                    } catch (error) {
                        errors.push(\`Translation Notes: \${error.message}\`);
                    }
                }

                if (resources.includes('questions')) {
                    try {
                        const response = await fetch(\`/api/fetch-translation-questions?reference=\${encodeURIComponent(reference)}&language=\${language}&organization=\${organization}\`);
                        const data = await response.json();
                        if (response.ok && data.translationQuestions) {
                            results.translationQuestions = data.translationQuestions;
                        } else {
                            errors.push(\`Translation Questions: \${data.error || 'Not found'}\`);
                        }
                    } catch (error) {
                        errors.push(\`Translation Questions: \${error.message}\`);
                    }
                }

                if (resources.includes('words')) {
                    try {
                        const response = await fetch(\`/api/fetch-translation-words?reference=\${encodeURIComponent(reference)}&language=\${language}&organization=\${organization}\`);
                        const data = await response.json();
                        if (response.ok && data.translationWords) {
                            results.translationWords = data.translationWords;
                        } else {
                            errors.push(\`Translation Words: \${data.error || 'Not found'}\`);
                        }
                    } catch (error) {
                        errors.push(\`Translation Words: \${error.message}\`);
                    }
                }

                if (resources.includes('links')) {
                    try {
                        const response = await fetch(\`/api/fetch-translation-word-links?reference=\${encodeURIComponent(reference)}&language=\${language}&organization=\${organization}\`);
                        const data = await response.json();
                        if (response.ok && data.translationWordLinks) {
                            results.translationWordLinks = data.translationWordLinks;
                        } else {
                            errors.push(\`Translation Word Links: \${data.error || 'Not found'}\`);
                        }
                    } catch (error) {
                        errors.push(\`Translation Word Links: \${error.message}\`);
                    }
                }
                
                // Display results
                let html = '<div class="card"><h2>Results</h2>';
                
                // Show stats
                html += '<div class="stats">';
                html += \`<div class="stat">Reference: \${reference}</div>\`;
                html += \`<div class="stat">Language: \${language}</div>\`;
                html += \`<div class="stat">Organization: \${organization}</div>\`;
                html += '</div>';

                // Show errors if any
                if (errors.length > 0) {
                    html += '<div class="error">';
                    html += '<strong>Errors:</strong><br>';
                    html += errors.join('<br>');
                    html += '</div>';
                }

                // Scripture
                if (results.scripture) {
                    html += '<div class="resource-section">';
                    html += \`<h3>Scripture Text (\${results.scripture.translation})</h3>\`;
                    html += \`<div class="scripture-text">\${results.scripture.text}</div>\`;
                    html += '</div>';
                }
                
                // Translation Notes
                if (results.translationNotes && results.translationNotes.length > 0) {
                    html += '<div class="resource-section">';
                    html += \`<h3>Translation Notes (\${results.translationNotes.length})</h3>\`;
                    results.translationNotes.forEach(note => {
                        html += '<div class="note-item">';
                        html += \`<strong>\${note.reference}</strong><br>\`;
                        if (note.quote) html += \`Quote: "\${note.quote}"<br>\`;
                        html += \`\${note.note}\`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                // Translation Questions
                if (results.translationQuestions && results.translationQuestions.length > 0) {
                    html += '<div class="resource-section">';
                    html += \`<h3>Translation Questions (\${results.translationQuestions.length})</h3>\`;
                    results.translationQuestions.forEach(q => {
                        html += '<div class="question-item">';
                        html += \`<strong>\${q.reference}</strong><br>\`;
                        html += \`Q: \${q.question}<br>\`;
                        if (q.answer) html += \`A: \${q.answer}\`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                // Translation Words
                if (results.translationWords && results.translationWords.length > 0) {
                    html += '<div class="resource-section">';
                    html += \`<h3>Translation Words (\${results.translationWords.length})</h3>\`;
                    results.translationWords.forEach(word => {
                        html += '<div class="word-item">';
                        html += \`<strong>\${word.term}</strong><br>\`;
                        html += \`\${word.definition}\`;
                        if (word.title) html += \`<br><em>\${word.title}</em>\`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                // Translation Word Links
                if (results.translationWordLinks && results.translationWordLinks.length > 0) {
                    html += '<div class="resource-section">';
                    html += \`<h3>Translation Word Links (\${results.translationWordLinks.length})</h3>\`;
                    results.translationWordLinks.forEach(link => {
                        html += '<div class="word-item">';
                        html += \`<strong>\${link.word}</strong> (\${link.reference})<br>\`;
                        if (link.origWords) html += \`Original: \${link.origWords}<br>\`;
                        if (link.tags) html += \`Tags: \${link.tags}<br>\`;
                        html += \`ID: \${link.twlid}\`;
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                // Raw JSON
                html += '<div class="resource-section">';
                html += '<h3>Raw Response</h3>';
                html += \`<pre>\${JSON.stringify({ results, errors }, null, 2)}</pre>\`;
                html += '</div>';
                
                html += '</div>';
                
                resultsDiv.innerHTML = html;
                resultsDiv.style.display = 'block';
                
            } catch (error) {
                resultsDiv.innerHTML = \`
                    <div class="card">
                        <div class="error">
                            <strong>Error:</strong> \${error.message}
                        </div>
                    </div>
                \`;
                resultsDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
            }
        });

        // Test endpoints on load
        testEndpoints();
    </script>
</body>
</html>
`;

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache",
    },
    body: HTML,
  };
};
