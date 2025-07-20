/**
 * SvelteKit API Route for fetch-translation-notes
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchTranslationNotesHandler } from '$lib/../../../src/functions/handlers/fetch-translation-notes';

export const GET = createSvelteKitHandler(fetchTranslationNotesHandler);
export const POST = createSvelteKitHandler(fetchTranslationNotesHandler);
export const OPTIONS = createSvelteKitHandler(fetchTranslationNotesHandler);
