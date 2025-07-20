/**
 * SvelteKit API Route for fetch-translation-words
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchTranslationWordsHandler } from '$lib/../../../src/functions/handlers/fetch-translation-words';

export const GET = createSvelteKitHandler(fetchTranslationWordsHandler);
export const POST = createSvelteKitHandler(fetchTranslationWordsHandler);
export const OPTIONS = createSvelteKitHandler(fetchTranslationWordsHandler);
