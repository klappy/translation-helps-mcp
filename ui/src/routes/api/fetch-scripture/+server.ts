export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-scripture
 * TEMPORARILY REVERTED: Testing basic functionality before debugging config system
 */

import { fetchScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-scripture';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

// Use old handler temporarily while we debug the config system
export const GET = createSvelteKitHandler(fetchScriptureHandler);
export const POST = createSvelteKitHandler(fetchScriptureHandler);
export const OPTIONS = createSvelteKitHandler(fetchScriptureHandler);
