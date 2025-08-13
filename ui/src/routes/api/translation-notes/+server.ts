/**
 * Translation Notes Endpoint v2
 *
 * Another example of consistent endpoint implementation.
 * Same patterns, same utilities, predictable behavior!
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { fetchTSVFromZIP } from '$lib/edgeZipFetcher.js';
import { parseReference } from '$lib/referenceParser.js';

/**
 * Fetch translation notes for a reference
 */
async function fetchTranslationNotes(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// Parse the reference
	const parsedRef = parseReference(reference);

	// Fetch using ZIP-based approach
	const result = await fetchTSVFromZIP(parsedRef, language, organization, 'tn');

	if (!result.data || result.data.length === 0) {
		throw new Error(`No translation notes found for ${reference}`);
	}

	// Return in standard format with trace data
	return {
		...createTranslationHelpsResponse(result.data, reference, language, organization, 'tn'),
		_trace: result.trace
	};
}

// Create the endpoint - notice how similar this is to translation-questions!
export const GET = createSimpleEndpoint({
	name: 'translation-notes-v2',

	// Same parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	// Enable format support
	supportsFormats: true,

	fetch: fetchTranslationNotes,

	// Same error handler with custom message
	onError: createStandardErrorHandler({
		'No translation notes found': {
			status: 404,
			message: 'No translation notes available for this reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
