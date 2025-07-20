/**
 * SvelteKit API Route for browse-translation-words
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { browseTranslationWordsHandler } from '$lib/../../../src/functions/handlers/browse-translation-words';

export const GET = createSvelteKitHandler(browseTranslationWordsHandler);
export const POST = createSvelteKitHandler(browseTranslationWordsHandler);
export const OPTIONS = createSvelteKitHandler(browseTranslationWordsHandler);
