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
	const links = tsvData.map((row, index) => {
		const rcLink = row.TWLink || '';

		// Parse RC link to extract category, term, and path
		// Format: rc://*/tw/dict/bible/{category}/{term}
		let category = '';
		let term = '';
		let path = '';

		if (rcLink) {
			// Extract everything after /dict/ and add .md extension
			const pathMatch = rcLink.match(/rc:\/\/\*\/tw\/dict\/(.+)/);
			if (pathMatch) {
				path = pathMatch[1] + '.md'; // e.g., "bible/kt/love.md"
			}

			// Extract category and term
			const match = rcLink.match(/rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/([^/]+)/);
			if (match) {
				category = match[1]; // e.g., "kt", "names", "other"
				term = match[2]; // e.g., "love", "grace", "abraham"
			}
		}

		return {
			id: `twl${index + 1}`,
			reference: row.Reference || reference,
			occurrence: parseInt(row.Occurrence || '1', 10),
			quote: row.Quote || '',
			category, // Extracted: "kt", "names", "other"
			term, // Extracted: "love", "grace", etc. - matches translation_word tool parameter
			path, // Extracted: "bible/kt/love.md"
			strongsId: row.StrongsId || '',
			rcLink, // Full RC link
			position: null
		};
	});

	// Return formatted response with trace data
	// The simpleEndpoint will extract _trace and put it in X-ray headers
	const response = createTranslationHelpsResponse(links, reference, language, organization, 'twl');
	return {
		...response,
		_trace: fetcher.getTrace()
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
