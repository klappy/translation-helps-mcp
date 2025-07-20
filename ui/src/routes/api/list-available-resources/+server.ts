/**
 * SvelteKit API Route for list-available-resources
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { listAvailableResourcesHandler } from '$lib/../../../src/functions/handlers/list-available-resources';

export const GET = createSvelteKitHandler(listAvailableResourcesHandler);
export const POST = createSvelteKitHandler(listAvailableResourcesHandler);
export const OPTIONS = createSvelteKitHandler(listAvailableResourcesHandler);
