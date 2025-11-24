/**
 * Translation Notes Endpoint v2
 *
 * Another example of consistent endpoint implementation.
 * Same patterns, same utilities, predictable behavior!
 * Now supports optional search parameter for in-reference searching.
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
 * Fetch translation notes for a reference
 */
async function fetchTranslationNotes(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, search } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tn-${Date.now()}`, 'translation-notes');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch using unified fetcher
	let results = await fetcher.fetchTranslationNotes(reference, language, organization);

	if (!results || results.length === 0) {
		throw new Error(`No translation notes found for ${reference}`);
	}

	// Extract metadata from the first result if available
	const metadata = results[0]?.metadata || {};

	// Apply search if query provided (ephemeral, in-memory only)
	if (search && search.trim().length > 0) {
		const totalBeforeSearch = results.length;

		results = await applySearch(
			results,
			search,
			'notes',
			(item: any, index: number): SearchDocument => ({
				id: `note-${index}`, // Use index for uniqueness
				content: `${item.quote || ''} ${item.note || item.Note || item.text || ''}`.trim(),
				path: item.reference || reference,
				resource: 'translation-notes',
				type: 'notes'
			})
		);

		console.log(
			`[fetch-translation-notes-v2] Search "${search}" filtered ${totalBeforeSearch} results to ${results.length}`
		);
	}

	// Return in standard format with trace data
	const baseResponse = createTranslationHelpsResponse(
		results,
		reference,
		language,
		organization,
		'tn',
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

// Create the endpoint - notice how similar this is to translation-questions!
export const GET = createSimpleEndpoint({
	name: 'translation-notes-v2',

	// Same parameter validators + search
	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search
	],

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
