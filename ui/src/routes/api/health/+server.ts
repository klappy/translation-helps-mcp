/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { healthHandler } from '$lib/../../../src/functions/handlers/health';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(healthHandler, cache);
export const POST = createSvelteKitHandler(healthHandler, cache);
export const OPTIONS = createSvelteKitHandler(healthHandler, cache);
