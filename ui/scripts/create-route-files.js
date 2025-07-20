#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const buildDir = path.join(process.cwd(), 'build');
const baseUrl = 'http://localhost:4173';

console.log('🔧 Creating route HTML files for direct access...');

// Routes to create static files for
const routes = ['api', 'chat', 'test', 'performance', 'mcp-tools', 'rag-manifesto'];

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startPreviewServer() {
	console.log('🚀 Starting temporary preview server...');
	const serverProcess = spawn('npm', ['run', 'preview'], {
		stdio: ['pipe', 'pipe', 'pipe'],
		cwd: process.cwd()
	});

	// Wait for server to start
	await sleep(3000);

	// Check if server is responding
	for (let i = 0; i < 10; i++) {
		try {
			const response = await fetch(baseUrl);
			if (response.ok) {
				console.log('✅ Preview server is ready');
				return serverProcess;
			}
		} catch {
			// Server not ready yet
		}
		await sleep(1000);
	}

	throw new Error('Failed to start preview server');
}

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

// Main execution
let serverProcess;
try {
	serverProcess = await startPreviewServer();
	await createRouteFiles();
	console.log(`\n✅ Created HTML files for: ${routes.map((r) => `/${r}`).join(', ')}`);
	console.log('✅ Direct access to all routes should now work!');
} catch (error) {
	console.error('❌ Failed to create route files:', error.message);
	process.exit(1);
} finally {
	if (serverProcess) {
		console.log('🛑 Stopping preview server...');
		serverProcess.kill();
		await sleep(1000);
	}
}
