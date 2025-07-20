#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const buildDir = path.join(process.cwd(), 'build');
const baseUrl = 'http://localhost:4173';

console.log('🔧 Creating route HTML files for direct access...');

// Routes to create static files for
const routes = ['api', 'chat', 'test', 'performance', 'mcp-tools', 'rag-manifesto'];

async function fetchRouteContent(route) {
	try {
		const response = await fetch(`${baseUrl}/${route}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch /${route}: ${response.status}`);
		}
		return await response.text();
	} catch (error) {
		console.error(`❌ Failed to fetch /${route}:`, error.message);
		return null;
	}
}

async function createRouteFiles() {
	for (const route of routes) {
		console.log(`📥 Fetching content for /${route}...`);
		const content = await fetchRouteContent(route);

		if (content) {
			const filePath = path.join(buildDir, `${route}.html`);
			fs.writeFileSync(filePath, content);
			console.log(`✅ Created ${route}.html`);
		} else {
			console.log(`⚠️  Skipped ${route}.html due to fetch error`);
		}
	}
}

// Check if preview server is running
try {
	const healthCheck = await fetch(`${baseUrl}/`);
	if (healthCheck.ok) {
		await createRouteFiles();
		console.log(`\n✅ Created HTML files for: ${routes.map((r) => `/${r}`).join(', ')}`);
		console.log('✅ Direct access to all routes should now work!');
	} else {
		throw new Error('Server not responding');
	}
} catch {
	console.error('❌ Preview server not running! Please run "npm run preview" first.');
	console.error('❌ Then run this script again.');
	process.exit(1);
}
