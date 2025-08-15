/**
 * Fetch Translation Academy Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Returns a specific translation academy module by ID or path.
 * Academy articles are linked from Translation Notes via RC links.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

/**
 * Fetch a specific translation academy module
 * Uses real markdown content from DCS ZIP archives
 */
async function fetchTranslationAcademy(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { moduleId, language, organization } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`ta-${Date.now()}`, 'fetch-translation-academy');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch real TA module from markdown
	const result = await fetcher.fetchTranslationAcademy(language, organization, moduleId);

	// Check if we got a specific module or TOC
	if (result.modules && result.modules.length > 0) {
		// Got specific module(s)
		const module = result.modules[0];

		// Parse module ID from path if needed
		const id = module.id || moduleId;
		const category =
			module.path.match(/\/(translate|checking|process|audio|gateway)\//)?.[1] || 'translate';

		// Extract title from markdown (first H1)
		const titleMatch = module.markdown?.match(/^#\s+(.+)$/m);
		const title = titleMatch ? titleMatch[1] : id;

		return {
			module: {
				id,
				title,
				category,
				path: module.path,
				content: module.markdown || '',
				supportReference: `rc://*/ta/man/${category}/${id}`
			},
			metadata: {
				language,
				organization,
				resourceType: 'ta',
				_trace: tracer.getTrace()
			}
		};
	} else {
		// No module found
		throw new Error(`Translation Academy module not found: ${moduleId}`);
	}
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-academy-v2',

	// Use common parameter validators + moduleId
	params: [
		{
			name: 'moduleId',
			type: 'string',
			required: true,
			description:
				'Translation Academy module ID (e.g., "figs-metaphor", "translate/figs-metaphor")'
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization
	],

	fetch: fetchTranslationAcademy,

	// Use standard error handler
	onError: createStandardErrorHandler(),

	// Support passthrough for markdown
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
