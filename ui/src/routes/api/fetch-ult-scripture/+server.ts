/**
 * SvelteKit API Route for fetch-ult-scripture
 * ULT/GLT Scripture Endpoint - Literal text with word alignment
 */

import { fetchULTScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-ult-scripture';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

export const GET = createSvelteKitHandler(fetchULTScriptureHandler);
export const POST = createSvelteKitHandler(fetchULTScriptureHandler);
export const OPTIONS = createSvelteKitHandler(fetchULTScriptureHandler);
