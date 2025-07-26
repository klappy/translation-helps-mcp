export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for browse-translation-words
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { browseTranslationWordsHandler } from '$lib/../../../src/functions/handlers/browse-translation-words';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(browseTranslationWordsHandler, cache);
export const POST = createSvelteKitHandler(browseTranslationWordsHandler, cache);
export const OPTIONS = createSvelteKitHandler(browseTranslationWordsHandler, cache);
