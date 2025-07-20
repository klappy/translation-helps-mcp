/**
 * SvelteKit API Route for extract-references
 * Auto-generated from shared handler
 */

import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';
import { extractReferencesHandler } from '$lib/../../../src/functions/handlers/extract-references';

export const GET = createSvelteKitHandler(extractReferencesHandler);
export const POST = createSvelteKitHandler(extractReferencesHandler);
export const OPTIONS = createSvelteKitHandler(extractReferencesHandler);
