/**
 * SvelteKit API Route for get-words-for-reference
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getWordsForReferenceHandler } from '$lib/../../../src/functions/handlers/get-words-for-reference';

export const GET = createSvelteKitHandler(getWordsForReferenceHandler);
export const POST = createSvelteKitHandler(getWordsForReferenceHandler);
export const OPTIONS = createSvelteKitHandler(getWordsForReferenceHandler);
