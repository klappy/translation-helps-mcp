export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for get-context
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getContextHandler } from '$lib/../../../src/functions/handlers/get-context';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(getContextHandler, cache);
export const POST = createSvelteKitHandler(getContextHandler, cache);
export const OPTIONS = createSvelteKitHandler(getContextHandler, cache);
