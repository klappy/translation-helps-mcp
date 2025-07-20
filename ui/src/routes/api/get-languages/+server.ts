/**
 * SvelteKit API Route for get-languages
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getLanguagesHandler } from '$lib/../../../src/functions/handlers/get-languages';

export const GET = createSvelteKitHandler(getLanguagesHandler);
export const POST = createSvelteKitHandler(getLanguagesHandler);
export const OPTIONS = createSvelteKitHandler(getLanguagesHandler);
