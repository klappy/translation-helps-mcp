/**
 * SvelteKit API Route for fetch-translation-word-links
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchTranslationWordLinksHandler } from '$lib/../../../src/functions/handlers/fetch-translation-word-links';

export const GET = createSvelteKitHandler(fetchTranslationWordLinksHandler);
export const POST = createSvelteKitHandler(fetchTranslationWordLinksHandler);
export const OPTIONS = createSvelteKitHandler(fetchTranslationWordLinksHandler);
