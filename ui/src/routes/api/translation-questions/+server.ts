/**
 * Translation Questions Endpoint v2
 *
 * Demonstrates using all our consistent utilities:
 * - Common validators
 * - Standard error handlers
 * - Consistent response shapes
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { fetchTSVFromZIP } from '$lib/edgeZipFetcher.js';
import { parseReference } from '$lib/referenceParser.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

/**
 * Fetch translation questions for a reference
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// Parse the reference
	const parsedRef = parseReference(reference);

	// Fetch using ZIP-based approach
	const result = await fetchTSVFromZIP(parsedRef, language, organization, 'tq');

	if (!result.data || result.data.length === 0) {
		throw new Error(`No translation questions found for ${reference}`);
	}

	// Return in standard format with trace data
	return {
		...createTranslationHelpsResponse(result.data, reference, language, organization, 'tq'),
		_trace: result.trace
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
