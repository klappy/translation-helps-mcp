/**
 * SvelteKit API Route for get-context
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { getContextHandler } from '$lib/../../../src/functions/handlers/get-context';

export const GET = createSvelteKitHandler(getContextHandler);
export const POST = createSvelteKitHandler(getContextHandler);
export const OPTIONS = createSvelteKitHandler(getContextHandler);
