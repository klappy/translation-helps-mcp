export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { cache as appCache } from '$lib/../../../src/functions/cache.js';
import { getKVCache, initializeKVCache } from '$lib/../../../src/functions/kv-cache.js';
import { unifiedCache } from '$lib/../../../src/functions/unified-cache.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

// This will be replaced at build time by sync-version.js
const BUILD_VERSION = '5.5.0';
const BUILD_TIMESTAMP = new Date().toISOString();

export const GET: RequestHandler = async ({ url, platform }) => {
	// Ensure KV is wired (if available in this environment)
	try {
		// @ts-expect-error platform typing differs by adapter
		const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) initializeKVCache(kv);
	} catch {
		// ignore
	}
	const clearCache = url.searchParams.get('clearCache') === 'true';
	const clearKv = url.searchParams.get('clearKv') === 'true';
	const nuke = url.searchParams.get('nuke') === 'true';

	let kvCleared = 0;
	if (clearCache || clearKv || nuke) {
		const kv = getKVCache();
		// Always clear in-process caches (CacheManager + UnifiedCache)
		try {
			await appCache.clear();
		} catch {
			// Ignore cache clear errors - best effort
		}
		try {
			await unifiedCache.clear();
		} catch {
			// Ignore cache clear errors - best effort
		}
		if (nuke) {
			// Full wipe of KV + memory
			kvCleared = await kv.clearAll();
		} else if (clearKv) {
			// Clear all relevant KV namespaces including file-level entries
			kvCleared = await kv.clearPrefixes(['zip:', 'catalog:', 'zipfile:']);
		} else {
			await kv.clear();
		}
	}

	return json({
		status: 'healthy',
		version: BUILD_VERSION,
		buildTime: BUILD_TIMESTAMP,
		deployment: {
			environment: import.meta.env.MODE,
			platform: 'cloudflare-pages'
		},
		timestamp: new Date().toISOString(),
		cache: {
			clearedMemory: clearCache || clearKv || nuke,
			clearedUnified: clearCache || clearKv || nuke,
			clearedKv: clearKv || nuke,
			kvDeleted: kvCleared
		}
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
