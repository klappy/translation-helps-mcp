/**
 * Fetch Translation Words Endpoint v2
 *
 * Returns translation word definitions for a given Bible reference.
 * Uses all our consistency patterns and standard responses.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { fetchTranslationWordsFromDCS } from '$lib/edgeTranslationWordsFetcher.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

/**
 * Fetch translation words for a reference
 */
async function fetchTranslationWords(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// Fetch using DCS approach
	const words = await fetchTranslationWordsFromDCS(reference, language, organization);

	if (!words || words.length === 0) {
		throw new Error(`No translation words found for ${reference}`);
	}

	// Extract metadata from the first word if available
	const metadata = words[0]?.metadata || {};

	// Return in standard format
	// Note: fetchTranslationWordsFromDCS doesn't return trace data like the others
	return createTranslationHelpsResponse(words, reference, language, organization, 'tw', {
		license: metadata.license || 'CC BY-SA 4.0',
		copyright: metadata.copyright,
		version: metadata.version
	});
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-words-v2',

	// Use common parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	// Enable format support
	supportsFormats: true,

	fetch: fetchTranslationWords,

	// Use standard error handler
	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
