/**
 * SvelteKit API Route for fetch-resources
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchResourcesHandler } from '$lib/../../../src/functions/handlers/fetch-resources';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(fetchResourcesHandler, cache);
export const POST = createSvelteKitHandler(fetchResourcesHandler, cache);
export const OPTIONS = createSvelteKitHandler(fetchResourcesHandler, cache);
