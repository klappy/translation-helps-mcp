/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { healthHandler } from '$lib/../../../src/functions/handlers/health';

export const GET = createSvelteKitHandler(healthHandler);
export const POST = createSvelteKitHandler(healthHandler);
export const OPTIONS = createSvelteKitHandler(healthHandler);
