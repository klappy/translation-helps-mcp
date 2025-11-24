/**
 * Translation Questions Endpoint v2
 *
 * Demonstrates using all our consistent utilities:
 * - Common validators
 * - Standard error handlers
 * - Consistent response shapes
 * - Optional search parameter for in-reference searching
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse, addSearchMetadata } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import {
	applySearch,
	type SearchDocument
} from '$lib/../../../src/services/SearchServiceFactory.js';

/**
 * Fetch translation questions for a reference
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, search } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tq-${Date.now()}`, 'translation-questions');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch using unified fetcher
	let results = await fetcher.fetchTranslationQuestions(reference, language, organization);

	if (!results || results.length === 0) {
		throw new Error(`No translation questions found for ${reference}`);
	}

	// Extract metadata from the first result if available
	const metadata = results[0]?.metadata || {};

	// Apply search if query provided (ephemeral, in-memory only)
	if (search && search.trim().length > 0) {
		const totalBeforeSearch = results.length;

		results = await applySearch(
			results,
			search,
			'questions',
			(item: any, index: number): SearchDocument => ({
				id: `question-${index}`, // Use index for uniqueness
				// Index both question and answer, with question having higher relevance
				content: `${item.question || ''} ${item.response || item.answer || ''}`.trim(),
				path: item.reference || reference,
				resource: 'translation-questions',
				type: 'questions'
			})
		);

		console.log(
			`[fetch-translation-questions-v2] Search "${search}" filtered ${totalBeforeSearch} results to ${results.length}`
		);
	}

	// Return in standard format with trace data
	const baseResponse = createTranslationHelpsResponse(
		results,
		reference,
		language,
		organization,
		'tq',
		{
			license: metadata.license || 'CC BY-SA 4.0',
			copyright: metadata.copyright,
			version: metadata.version
		}
	);

	return {
		...baseResponse,
		metadata: search
			? addSearchMetadata(baseResponse.metadata, search, results.length)
			: baseResponse.metadata,
		_trace: fetcher.getTrace()
	};
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'translation-questions-v2',

	// Use common parameter validators + search
	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search
	],

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
