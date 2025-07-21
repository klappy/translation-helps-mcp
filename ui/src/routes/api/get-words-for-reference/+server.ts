/**
 * SvelteKit API Route for get-words-for-reference
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getWordsForReferenceHandler } from '$lib/../../../src/functions/handlers/get-words-for-reference';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(getWordsForReferenceHandler, cache);
export const POST = createSvelteKitHandler(getWordsForReferenceHandler, cache);
export const OPTIONS = createSvelteKitHandler(getWordsForReferenceHandler, cache);
