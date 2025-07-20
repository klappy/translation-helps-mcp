/**
 * SvelteKit API Route for get-languages
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getLanguagesHandler } from '$lib/../../../src/functions/handlers/get-languages';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(getLanguagesHandler, cache);
export const POST = createSvelteKitHandler(getLanguagesHandler, cache);
export const OPTIONS = createSvelteKitHandler(getLanguagesHandler, cache);
