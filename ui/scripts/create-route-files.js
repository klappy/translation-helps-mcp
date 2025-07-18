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

// Create chat.html with node_ids for chat page (node 8)
const chatHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,8]');

// Create test.html with node_ids for test page (node 5)
const testHtml = indexHtml.replace(/"node_ids":\[[^\]]*\]/, '"node_ids":[0,5]');

// Write the files
fs.writeFileSync(path.join(buildDir, 'chat.html'), chatHtml);
fs.writeFileSync(path.join(buildDir, 'test.html'), testHtml);

console.log('✅ Created chat.html and test.html');
console.log('✅ Direct access to /chat and /test should now work!');
