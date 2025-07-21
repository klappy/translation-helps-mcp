/**
 * SvelteKit API Route for extract-references
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { extractReferencesHandler } from '$lib/../../../src/functions/handlers/extract-references';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(extractReferencesHandler, cache);
export const POST = createSvelteKitHandler(extractReferencesHandler, cache);
export const OPTIONS = createSvelteKitHandler(extractReferencesHandler, cache);
