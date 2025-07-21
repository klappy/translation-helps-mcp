/**
 * SvelteKit API Route for fetch-translation-questions
 * Auto-generated from shared handler with in-memory caching
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchTranslationQuestionsHandler } from '$lib/../../../src/functions/handlers/fetch-translation-questions';
import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(fetchTranslationQuestionsHandler, cache);
export const POST = createSvelteKitHandler(fetchTranslationQuestionsHandler, cache);
export const OPTIONS = createSvelteKitHandler(fetchTranslationQuestionsHandler, cache);
