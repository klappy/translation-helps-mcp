/**
 * SvelteKit API Route for fetch-scripture
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-scripture';

export const GET = createSvelteKitHandler(fetchScriptureHandler);
export const POST = createSvelteKitHandler(fetchScriptureHandler);
export const OPTIONS = createSvelteKitHandler(fetchScriptureHandler);
