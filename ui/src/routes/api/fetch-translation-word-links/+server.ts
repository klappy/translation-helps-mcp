/**
 * Fetch Translation Word Links Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Returns links between Bible text and translation word entries.
 * These help identify which words in a verse have dictionary entries.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

/**
 * Fetch translation word links for a reference
 * Uses real TSV data from DCS ZIP archives
 */
async function fetchTranslationWordLinks(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`twl-${Date.now()}`, 'fetch-translation-word-links');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch real TWL data from TSV
	const tsvData = await fetcher.fetchTranslationWordLinks(reference, language, organization);

	// Transform TSV rows to expected format
	const links = tsvData.map((row, index) => ({
		id: `twl${index + 1}`,
		reference: row.Reference || reference,
		occurrence: parseInt(row.Occurrence || '1', 10),
		quote: row.Quote || '',
		word: row.TWLink || '',
		// TSV doesn't have Strong's IDs in standard format
		strongsId: row.StrongsId || '',
		// Build RC link from TWLink
		rcLink: row.TWLink ? `rc://*/tw/dict/bible/${row.TWLink}` : '',
		// TSV doesn't provide position data
		position: null
	}));

	// Include trace data for debugging
	const response = createTranslationHelpsResponse(links, reference, language, organization, 'twl');

	// Add trace information
	return {
		...response,
		_trace: tracer.getTrace()
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-word-links-v2',

	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationWordLinks,

	onError: createStandardErrorHandler(),

	// Support passthrough for TSV and markdown for LLMs
	supportsFormats: ['json', 'tsv', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
