export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route: Resource Catalog
 * GET /api/resource-catalog?reference=...&language=...&organization=...
 */

import { MemoryCacheAdapter } from '$lib/../../../src/functions/caches/memory-cache';
import { resourceCatalogHandler } from '$lib/../../../src/functions/handlers/resource-catalog';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

const cache = new MemoryCacheAdapter();
export const GET = createSvelteKitHandler(resourceCatalogHandler, cache);
export const POST = createSvelteKitHandler(resourceCatalogHandler, cache);
export const OPTIONS = createSvelteKitHandler(resourceCatalogHandler, cache);
