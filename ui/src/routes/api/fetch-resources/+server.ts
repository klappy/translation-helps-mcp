/**
 * SvelteKit API Route for fetch-resources
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { fetchResourcesHandler } from '$lib/../../../src/functions/handlers/fetch-resources';

export const GET = createSvelteKitHandler(fetchResourcesHandler);
export const POST = createSvelteKitHandler(fetchResourcesHandler);
export const OPTIONS = createSvelteKitHandler(fetchResourcesHandler);
