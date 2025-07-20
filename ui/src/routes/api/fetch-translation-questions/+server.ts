/**
 * SvelteKit API Route for fetch-translation-questions
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchTranslationQuestionsHandler } from '$lib/../../../src/functions/handlers/fetch-translation-questions';

export const GET = createSvelteKitHandler(fetchTranslationQuestionsHandler);
export const POST = createSvelteKitHandler(fetchTranslationQuestionsHandler);
export const OPTIONS = createSvelteKitHandler(fetchTranslationQuestionsHandler);
