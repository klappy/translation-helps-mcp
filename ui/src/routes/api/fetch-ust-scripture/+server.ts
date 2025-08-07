export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-ust-scripture
 * Uses the specialized UST handler
 */

import { fetchUSTScriptureHandler } from '$lib/../../../src/experimental/fetch-ust-scripture';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(fetchUSTScriptureHandler, cache);
export const POST = createSvelteKitHandler(fetchUSTScriptureHandler, cache);
export const OPTIONS = createSvelteKitHandler(fetchUSTScriptureHandler, cache);
