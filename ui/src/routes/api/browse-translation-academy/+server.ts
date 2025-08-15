/**
 * Browse Translation Academy Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Lists all available translation academy modules from the TOC.
 * Perfect for building topic indexes or browsing training materials.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createListResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

// Academy article categories - matches ZIP structure
const ACADEMY_CATEGORIES = {
	all: 'All Modules',
	translate: 'Translation',
	checking: 'Checking',
	process: 'Process',
	audio: 'Audio',
	gateway: 'Strategic Language'
};

/**
 * Browse translation academy modules
 * Uses real TOC data from DCS ZIP archives
 */
async function browseTranslationAcademy(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { language, organization, category } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`ta-browse-${Date.now()}`, 'browse-translation-academy');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch TOC from Translation Academy
	const result = await fetcher.browseTranslationAcademy(
		language,
		organization,
		category !== 'all' ? category : undefined
	);

	// Transform modules to consistent format
	const modules = (result.modules || []).map((module) => {
		// Extract category from path
		const categoryMatch = module.path.match(/\/(translate|checking|process|audio|gateway)\//);
		const moduleCategory = categoryMatch ? categoryMatch[1] : 'unknown';

		// Extract human-readable title from ID
		const title = module.id
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		return {
			id: module.id,
			title,
			category: moduleCategory,
			path: module.path,
			categoryName:
				ACADEMY_CATEGORIES[moduleCategory as keyof typeof ACADEMY_CATEGORIES] || 'Unknown',
			supportReference: `rc://*/ta/man/${moduleCategory}/${module.id}`
		};
	});

	// Sort by category then title
	modules.sort((a, b) => {
		const catCompare = a.category.localeCompare(b.category);
		if (catCompare !== 0) return catCompare;
		return a.title.localeCompare(b.title);
	});

	// Calculate category counts
	const categoryCounts = modules.reduce(
		(acc, module) => {
			acc[module.category] = (acc[module.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// Build category list with counts
	const categories = Object.entries(ACADEMY_CATEGORIES).map(([key, name]) => ({
		id: key,
		name,
		count: key === 'all' ? modules.length : categoryCounts[key] || 0
	}));

	return createListResponse(modules, {
		language,
		organization,
		source: 'Translation Academy',
		totalModules: modules.length,
		availableCategories: result.categories || [],
		categoryBreakdown: categoryCounts,
		...(category && category !== 'all' && { filteredBy: { category } }),
		categories,
		_trace: tracer.getTrace()
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'browse-translation-academy-v2',

	params: [
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'category',
			type: 'string',
			required: false,
			default: 'all',
			description: 'Filter by category (all, translate, checking, process, audio, gateway)',
			validate: (value) => {
				if (!value) return true;
				return Object.keys(ACADEMY_CATEGORIES).includes(value);
			}
		}
	],

	fetch: browseTranslationAcademy,

	onError: createStandardErrorHandler(),

	// Support passthrough for JSON listing and markdown for LLMs
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
