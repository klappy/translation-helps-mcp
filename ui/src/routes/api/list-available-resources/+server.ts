/**
 * SvelteKit API Route for list-available-resources
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { listAvailableResourcesHandler } from '$lib/../../../src/functions/handlers/list-available-resources';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(listAvailableResourcesHandler, cache);
export const POST = createSvelteKitHandler(listAvailableResourcesHandler, cache);
export const OPTIONS = createSvelteKitHandler(listAvailableResourcesHandler, cache);
