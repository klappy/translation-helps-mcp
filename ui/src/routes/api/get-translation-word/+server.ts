export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for get-translation-word
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getTranslationWordHandler } from '$lib/../../../src/functions/handlers/get-translation-word';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(getTranslationWordHandler, cache);
export const POST = createSvelteKitHandler(getTranslationWordHandler, cache);
export const OPTIONS = createSvelteKitHandler(getTranslationWordHandler, cache);
