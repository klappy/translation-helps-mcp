export const config = {
	runtime: 'edge'
};

import { getKVCache, initializeKVCache } from '$lib/../../../src/functions/kv-cache.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform }) => {
	// Try to initialize KV
	let kvInitialized = false;
	let kvError = null;
	let envKeys: string[] = [];
	let testWriteSuccess = false;
	let testReadSuccess = false;
	let kvListCount = 0;

	try {
		// @ts-expect-error platform typing differs by adapter
		const env = platform?.env;
		if (env) {
			envKeys = Object.keys(env);
			const kv = env.TRANSLATION_HELPS_CACHE;
			if (kv) {
				initializeKVCache(kv);
				kvInitialized = true;

				// Test write
				try {
					await kv.put('test:kv-status', JSON.stringify({ test: true, timestamp: Date.now() }), {
						expirationTtl: 60 // 1 minute
					});
					testWriteSuccess = true;
				} catch (e) {
					kvError = `Write test failed: ${e}`;
				}

				// Test read
				try {
					const value = await kv.get('test:kv-status');
					if (value) {
						testReadSuccess = true;
					}
				} catch (e) {
					kvError = `Read test failed: ${e}`;
				}

				// Test list
				try {
					const list = await kv.list({ limit: 10 });
					kvListCount = list.keys.length;
				} catch (e) {
					kvError = `List test failed: ${e}`;
				}
			}
		}
	} catch (error) {
		kvError = error instanceof Error ? error.message : String(error);
	}

	// Get cache stats
	const kvCache = getKVCache();
	const stats = kvCache.getStats();

	return json({
		environment: {
			platform: !!platform,
			platformEnv: !!platform?.env,
			envKeys,
			hasTranslationHelpsCache: envKeys.includes('TRANSLATION_HELPS_CACHE')
		},
		kvStatus: {
			initialized: kvInitialized,
			error: kvError,
			stats,
			tests: {
				write: testWriteSuccess,
				read: testReadSuccess,
				listCount: kvListCount
			}
		},
		timestamp: new Date().toISOString()
	});
};
