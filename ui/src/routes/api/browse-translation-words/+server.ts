/**
 * Browse Translation Words Endpoint v2
 *
 * ⚠️ PARTIAL IMPLEMENTATION - Requires ZIP scanning capability
 *
 * Will list all available translation words from ZIP contents.
 * Currently returns honest error instead of mock data.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

// Word categories that match the tw ZIP structure
const WORD_CATEGORIES = {
	all: 'All Words',
	kt: 'Key Terms',
	names: 'Names',
	other: 'Other'
};

/**
 * Browse translation words
 * Will use real ZIP scanning once implemented in ZipResourceFetcher2
 */
async function browseTranslationWords(params: Record<string, any>, request: Request): Promise<any> {
	const { language, organization, category } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tw-browse-${Date.now()}`, 'browse-translation-words');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// This will throw the honest error from UnifiedResourceFetcher
	// until ZIP scanning is implemented
	const result = await fetcher.browseTranslationWords(
		language,
		organization,
		category !== 'all' ? category : undefined
	);

	// Once implemented, this would return the word list
	return result;
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'browse-translation-words-v2',

	params: [
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'category',
			type: 'string',
			required: false,
			default: 'all',
			description: 'Filter by category (all, kt, names, other)',
			validate: (value) => {
				if (!value) return true;
				return Object.keys(WORD_CATEGORIES).includes(value);
			}
		}
	],

	fetch: browseTranslationWords,

	onError: createStandardErrorHandler(),

	// Will support JSON and markdown once ZIP scanning is implemented
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
