/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createScriptureResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

/**
 * Parse resource parameter
 */
function parseResources(resourceParam: string | undefined): string[] {
	const availableResources = ['ult', 'ust', 't4t', 'ueb'];

	if (!resourceParam || resourceParam === 'all') {
		return availableResources;
	}

	// Handle comma-separated resources
	return resourceParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => availableResources.includes(r));
}

/**
 * Fetch scripture for a reference
 */
async function fetchScripture(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, resource: resourceParam } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`scripture-${Date.now()}`, 'fetch-scripture');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Get requested resources
	const requestedResources = parseResources(resourceParam);

	// Fetch using unified fetcher
	const results = await fetcher.fetchScripture(
		reference,
		language,
		organization,
		requestedResources
	);

	if (!results || results.length === 0) {
		throw new Error(`Scripture not found for reference: ${reference}`);
	}

	// Return in standard format with trace data
	return {
		...createScriptureResponse(results, {
			reference,
			requestedResources,
			foundResources: results.map((s: any) => s.translation?.split(' ')[0]?.toLowerCase())
		}),
		_trace: fetcher.getTrace()
	};
}

// Create the endpoint with format support
export const GET = createSimpleEndpoint({
	name: 'fetch-scripture-v2',

	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'resource',
			default: 'all',
			validate: (value) => {
				if (!value) return true;
				if (value === 'all') return true;
				const resources = value.split(',').map((r) => r.trim());
				return resources.every((r) => ['ult', 'ust', 't4t', 'ueb'].includes(r));
			}
		}
	],

	// Enable format support - format parameter will be added automatically
	supportsFormats: true,

	fetch: fetchScripture,

	onError: createStandardErrorHandler({
		'Scripture not found for reference': {
			status: 404,
			message: 'No scripture available for the specified reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
