export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for get-languages
 * Auto-generated from shared handler with in-memory caching
 */

import { getLanguagesHandler } from '$lib/../../../src/functions/handlers/get-languages';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

export const GET = createSvelteKitHandler(getLanguagesHandler);
export const POST = createSvelteKitHandler(getLanguagesHandler);
export const OPTIONS = createSvelteKitHandler(getLanguagesHandler);
