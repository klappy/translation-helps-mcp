export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-ult-scripture
 * Uses the specialized ULT handler with alignment support
 */

import { fetchULTScriptureHandler } from '$lib/../../../src/experimental/fetch-ult-scripture';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(fetchULTScriptureHandler, cache);
export const POST = createSvelteKitHandler(fetchULTScriptureHandler, cache);
export const OPTIONS = createSvelteKitHandler(fetchULTScriptureHandler, cache);
