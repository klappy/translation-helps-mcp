/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { fetchScriptureFromZIP, parseReference } from '$lib/edgeZipFetcher.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createScriptureResponse } from '$lib/standardResponses.js';

/**
 * Parse resource parameter
 */
function parseResources(resourceParam: string | undefined): string[] {
	if (!resourceParam || resourceParam === 'all') {
		return ['ult', 'ust'];
	}

	// Handle comma-separated resources
	return resourceParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => ['ult', 'ust'].includes(r));
}

/**
 * Fetch scripture for a reference
 */
async function fetchScripture(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization, resource: resourceParam } = params;

	// Parse the reference
	const parsedRef = parseReference(reference);

	// Get requested resources
	const requestedResources = parseResources(resourceParam);

	// Fetch using ZIP-based approach
	const result = await fetchScriptureFromZIP(parsedRef, language, organization, requestedResources);

	if (!result.data || result.data.length === 0) {
		throw new Error(`Scripture not found for reference: ${reference}`);
	}

	// Return in standard format with trace data
	return {
		...createScriptureResponse(result.data, {
			reference,
			language,
			organization,
			requestedResources,
			foundResources: result.data.map((s: any) => s.resource)
		}),
		_trace: result.trace
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
