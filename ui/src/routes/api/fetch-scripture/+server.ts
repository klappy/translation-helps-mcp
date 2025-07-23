/**
 * SvelteKit API Route for fetch-scripture
 * Auto-generated from shared handler with in-memory caching
 */

import { fetchScriptureHandler } from '$lib/../../../src/functions/handlers/fetch-scripture';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

// Remove duplicate caching - scripture service handles its own unified caching
export const GET = createSvelteKitHandler(fetchScriptureHandler);
export const POST = createSvelteKitHandler(fetchScriptureHandler);
export const OPTIONS = createSvelteKitHandler(fetchScriptureHandler);
