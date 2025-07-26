export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-ust-scripture
 * UST/GST Scripture Endpoint - Simplified text with word alignment
 */

import { fetchUSTScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-ust-scripture';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

export const GET = createSvelteKitHandler(fetchUSTScriptureHandler);
export const POST = createSvelteKitHandler(fetchUSTScriptureHandler);
export const OPTIONS = createSvelteKitHandler(fetchUSTScriptureHandler);
