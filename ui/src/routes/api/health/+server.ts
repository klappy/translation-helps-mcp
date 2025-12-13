export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { cache as appCache } from '$lib/../../../src/functions/cache.js';
import { getKVCache, initializeKVCache } from '$lib/../../../src/functions/kv-cache.js';
import { r2KeyFromUrl } from '$lib/../../../src/functions/r2-keys.js';
import { R2Storage } from '$lib/../../../src/functions/r2-storage.js';
import { unifiedCache } from '$lib/../../../src/functions/unified-cache.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

// This will be replaced at build time by sync-version.js
const BUILD_VERSION = '7.20.3';
const BUILD_TIMESTAMP = new Date().toISOString();

export const GET: RequestHandler = async ({ url, platform }) => {
	// Ensure KV is wired (if available in this environment)
	try {
		const kv = (platform as any)?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) initializeKVCache(kv);
	} catch {
		// ignore
	}
	const clearCache = url.searchParams.get('clearCache') === 'true';
	const clearKv = url.searchParams.get('clearKv') === 'true';
	const nuke = url.searchParams.get('nuke') === 'true';
	const r2Test = url.searchParams.get('r2Test') === 'true';
	const r2ZipProof = url.searchParams.get('zipR2Proof') === 'true';

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

	// R2 diagnostics (optional)
	const r2Diagnostics: {
		available: boolean;
		tested: boolean;
		writeOk: boolean;
		readOk: boolean;
		roundTripOk: boolean;
		key: string | null;
		error: string | null;
		hasCaches: boolean;
	} = {
		available: false,
		tested: false,
		writeOk: false,
		readOk: false,
		roundTripOk: false,
		key: null,
		error: null,
		hasCaches: !!(platform as any)?.caches
	};

	try {
		const bucket = (platform as any)?.env?.ZIP_FILES;
		r2Diagnostics.available = !!bucket;

		if (r2Test && bucket) {
			r2Diagnostics.tested = true;
			const key = `health/r2-test-${Date.now()}.txt`;
			const content = `ok-${new Date().toISOString()}`;

			// Write
			try {
				await bucket.put(key, content, {
					httpMetadata: { contentType: 'text/plain', cacheControl: 'max-age=60' },
					customMetadata: { purpose: 'health' }
				});
				r2Diagnostics.writeOk = true;
				r2Diagnostics.key = key;
			} catch (e: any) {
				r2Diagnostics.error = `write: ${e?.message || String(e)}`;
			}

			// Read
			try {
				const obj = await bucket.get(key);
				if (obj) {
					const text = await obj.text();
					r2Diagnostics.readOk = !!text;
					r2Diagnostics.roundTripOk = text === content;
				}
			} catch (e: any) {
				r2Diagnostics.error =
					(r2Diagnostics.error ? r2Diagnostics.error + ' | ' : '') +
					`read: ${e?.message || String(e)}`;
			}

			// Best-effort cleanup
			try {
				await bucket.delete?.(key);
			} catch {
				// ignore cleanup failures
			}
		}
	} catch (e: any) {
		r2Diagnostics.error = `r2: ${e?.message || String(e)}`;
	}

	// ZIP-first proof using R2 storage
	const r2ZipProofResult: any = { executed: false };
	try {
		const bucket = (platform as any)?.env?.ZIP_FILES as any;
		const caches: CacheStorage | undefined = (platform as any)?.caches as any;
		if (r2ZipProof && bucket) {
			r2ZipProofResult.executed = true;
			const org = 'proofOrg';
			const repo = 'proofRepo';
			const ref = 'v0.0.1';
			const zipUrl = `https://git.door43.org/${org}/${repo}/archive/${encodeURIComponent(ref)}.zip`;
			const tarUrl = zipUrl.replace(/\.zip(\?.*)?$/i, '.tar.gz$1');
			const { key: zipKey } = r2KeyFromUrl(zipUrl);
			const { key: tarKey } = r2KeyFromUrl(tarUrl);

			const r2 = new R2Storage(bucket as any, caches as any);

			// Clean any previous
			try {
				await bucket.delete?.(zipKey);
			} catch {
				/* ignore */
			}
			try {
				await bucket.delete?.(tarKey);
			} catch {
				/* ignore */
			}

			// Step A: put only tar, ensure tar is hit after zip miss
			await bucket.put(tarKey, new TextEncoder().encode('tar-data'), {
				httpMetadata: { contentType: 'application/gzip' }
			});
			const a1 = await r2.getZipWithInfo(zipKey);
			const a2 = await r2.getZipWithInfo(tarKey);
			r2ZipProofResult.stepA = {
				zipKey,
				tarKey,
				zipHit: a1.source !== 'miss',
				tarHit: a2.source !== 'miss'
			};

			// Step B: add zip, ensure zip is preferred
			await bucket.put(zipKey, new TextEncoder().encode('zip-data'), {
				httpMetadata: { contentType: 'application/zip' }
			});
			const b1 = await r2.getZipWithInfo(zipKey);
			const b2 = await r2.getZipWithInfo(tarKey);
			r2ZipProofResult.stepB = {
				zipHit: b1.source !== 'miss',
				tarHit: b2.source !== 'miss',
				zipSize: b1.size,
				tarSize: b2.size
			};
		}
	} catch (e: any) {
		r2ZipProofResult.error = e?.message || String(e);
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
		},
		diagnostics: {
			r2: r2Diagnostics,
			r2ZipProof: r2ZipProofResult
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
