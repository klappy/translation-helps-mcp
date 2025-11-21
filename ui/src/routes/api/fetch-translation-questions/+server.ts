/**
 * Translation Questions Endpoint v2
 *
 * Demonstrates using all our consistent utilities:
 * - Common validators
 * - Standard error handlers
 * - Consistent response shapes
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

/**
 * Fetch translation questions for a reference
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tq-${Date.now()}`, 'translation-questions');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch using unified fetcher
	const results = await fetcher.fetchTranslationQuestions(reference, language, organization);

	if (!results || results.length === 0) {
		throw new Error(`No translation questions found for ${reference}`);
	}

	// Extract metadata from the first result if available
	const metadata = results[0]?.metadata || {};

	// Return in standard format with trace data
	return {
		...createTranslationHelpsResponse(results, reference, language, organization, 'tq', {
			license: metadata.license || 'CC BY-SA 4.0',
			copyright: metadata.copyright,
			version: metadata.version
		}),
		_trace: fetcher.getTrace()
	};
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'translation-questions-v2',

	// Use common parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationQuestions,

	supportsFormats: true,

	// Use standard error handler
	onError: createStandardErrorHandler({
		'No translation questions found': {
			status: 404,
			message: 'No translation questions available for this reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
