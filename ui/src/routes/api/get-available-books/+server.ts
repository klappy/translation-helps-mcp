/**
 * SvelteKit API Route for get-available-books
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getAvailableBooksHandler } from '$lib/../../../src/functions/handlers/get-available-books';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(getAvailableBooksHandler, cache);
export const POST = createSvelteKitHandler(getAvailableBooksHandler, cache);
export const OPTIONS = createSvelteKitHandler(getAvailableBooksHandler, cache);
