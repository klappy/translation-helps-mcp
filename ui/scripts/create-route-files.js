#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const buildDir = path.join(process.cwd(), 'build');
const indexHtmlPath = path.join(buildDir, 'index.html');

console.log('🔧 Creating route HTML files for direct access...');

// Read the index.html file to use as a template
if (!fs.existsSync(indexHtmlPath)) {
	console.error('❌ index.html not found in build directory');
	process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Create chat.html with node_ids for chat page (node 5)
const chatHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,5]');

// Create test.html with node_ids for test page (node 9)
const testHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,9]');

// Create performance.html with node_ids for performance page (node 6)
const performanceHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,6]');

// Create mcp-tools.html with node_ids for mcp-tools page (node 10)
const mcpToolsHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,10]');

// Write the files
fs.writeFileSync(path.join(buildDir, 'chat.html'), chatHtml);
fs.writeFileSync(path.join(buildDir, 'test.html'), testHtml);
fs.writeFileSync(path.join(buildDir, 'performance.html'), performanceHtml);
fs.writeFileSync(path.join(buildDir, 'mcp-tools.html'), mcpToolsHtml);

console.log('✅ Created chat.html, test.html, performance.html, and mcp-tools.html');
console.log('✅ Direct access to /chat, /test, /performance, and /mcp-tools should now work!');
