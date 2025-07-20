/**
 * SvelteKit API Route for fetch-scripture
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-scripture';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(fetchScriptureHandler, cache);
export const POST = createSvelteKitHandler(fetchScriptureHandler, cache);
export const OPTIONS = createSvelteKitHandler(fetchScriptureHandler, cache);
