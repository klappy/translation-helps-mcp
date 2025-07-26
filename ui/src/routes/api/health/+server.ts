/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// This will be replaced at build time by sync-version.js
const BUILD_VERSION = '4.5.0';
const BUILD_TIMESTAMP = new Date().toISOString();

export const GET: RequestHandler = async () => {
	return json({
		status: 'healthy',
		version: BUILD_VERSION,
		buildTime: BUILD_TIMESTAMP,
		deployment: {
			environment: import.meta.env.MODE,
			platform: 'cloudflare-pages'
		},
		timestamp: new Date().toISOString()
	});
};

// Enable CORS
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};
