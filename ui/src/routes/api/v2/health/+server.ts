/**
 * Health Check Endpoint v2
 *
 * Migrated to use the simple endpoint wrapper.
 * This demonstrates the clean, KISS approach.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { cache as appCache } from '$lib/../../../src/functions/cache.js';
import { getKVCache, initializeKVCache } from '$lib/../../../src/functions/kv-cache.js';
import { unifiedCache } from '$lib/../../../src/functions/unified-cache.js';

export const config = {
	runtime: 'edge'
};

// This will be replaced at build time by sync-version.js
const BUILD_VERSION = '5.3.0';
const BUILD_TIMESTAMP = new Date().toISOString();

/**
 * Health check logic extracted as a pure function
 */
async function performHealthCheck(params: Record<string, any>, _request: Request, platform?: any) {
	// Initialize KV if available
	try {
		const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) initializeKVCache(kv);
	} catch {
		// ignore
	}

	const { clearCache, clearKv, nuke } = params;
	let kvCleared = 0;

	// Handle cache clearing
	if (clearCache || clearKv || nuke) {
		const kv = getKVCache();

		// Clear in-process caches
		try {
			await appCache.clear();
		} catch {
			// Best effort
		}

		try {
			await unifiedCache.clear();
		} catch {
			// Best effort
		}

		// Clear KV based on mode
		if (nuke) {
			kvCleared = await kv.clearAll();
		} else if (clearKv) {
			kvCleared = await kv.clearPrefixes(['zip:', 'catalog:', 'zipfile:']);
		} else {
			await kv.clear();
		}
	}

	return {
		status: 'healthy',
		version: BUILD_VERSION,
		buildTime: BUILD_TIMESTAMP,
		deployment: {
			environment: import.meta.env.MODE,
			platform: 'cloudflare-pages'
		},
		timestamp: new Date().toISOString(),
		cache: {
			clearedMemory: clearCache || clearKv || nuke || false,
			clearedUnified: clearCache || clearKv || nuke || false,
			clearedKv: clearKv || nuke || false,
			kvDeleted: kvCleared
		}
	};
}

// We need a custom handler to pass platform context
export const GET: RequestHandler = async ({ url, platform, request }) => {
	const endpoint = createSimpleEndpoint({
		name: 'health-v2',

		params: [
			{ name: 'clearCache', type: 'boolean', default: false },
			{ name: 'clearKv', type: 'boolean', default: false },
			{ name: 'nuke', type: 'boolean', default: false }
		],

		fetch: async (params, request) => {
			return performHealthCheck(params, request, platform);
		}
	});

	// Call the generated endpoint
	return endpoint({ url, platform, request });
};

// CORS handler
export const OPTIONS = createCORSHandler();
