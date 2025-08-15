/**
 * Get Available Books Endpoint v2
 *
 * Discover which Bible books are available for specific resources.
 * Uses all our consistency patterns and DCS fetching utilities.
 */

import { circuitBreakers } from '$lib/circuitBreaker.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { fetchBooksFromDCS } from '$lib/edgeBooksFetcher.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createListResponse } from '$lib/standardResponses.js';

// Bible book metadata
const BOOK_INFO = {
	// Old Testament
	gen: { name: 'Genesis', testament: 'ot', chapters: 50 },
	exo: { name: 'Exodus', testament: 'ot', chapters: 40 },
	lev: { name: 'Leviticus', testament: 'ot', chapters: 27 },
	num: { name: 'Numbers', testament: 'ot', chapters: 36 },
	deu: { name: 'Deuteronomy', testament: 'ot', chapters: 34 },
	// ... more books would be here in production
	// New Testament
	mat: { name: 'Matthew', testament: 'nt', chapters: 28 },
	mrk: { name: 'Mark', testament: 'nt', chapters: 16 },
	luk: { name: 'Luke', testament: 'nt', chapters: 24 },
	jhn: { name: 'John', testament: 'nt', chapters: 21 },
	act: { name: 'Acts', testament: 'nt', chapters: 28 },
	rom: { name: 'Romans', testament: 'nt', chapters: 16 },
	'1co': { name: '1 Corinthians', testament: 'nt', chapters: 16 },
	'2co': { name: '2 Corinthians', testament: 'nt', chapters: 13 },
	gal: { name: 'Galatians', testament: 'nt', chapters: 6 },
	eph: { name: 'Ephesians', testament: 'nt', chapters: 6 },
	php: { name: 'Philippians', testament: 'nt', chapters: 4 },
	col: { name: 'Colossians', testament: 'nt', chapters: 4 },
	'1th': { name: '1 Thessalonians', testament: 'nt', chapters: 5 },
	'2th': { name: '2 Thessalonians', testament: 'nt', chapters: 3 },
	'1ti': { name: '1 Timothy', testament: 'nt', chapters: 6 },
	'2ti': { name: '2 Timothy', testament: 'nt', chapters: 4 },
	tit: { name: 'Titus', testament: 'nt', chapters: 3 },
	phm: { name: 'Philemon', testament: 'nt', chapters: 1 },
	heb: { name: 'Hebrews', testament: 'nt', chapters: 13 },
	jas: { name: 'James', testament: 'nt', chapters: 5 },
	'1pe': { name: '1 Peter', testament: 'nt', chapters: 5 },
	'2pe': { name: '2 Peter', testament: 'nt', chapters: 3 },
	'1jn': { name: '1 John', testament: 'nt', chapters: 5 },
	'2jn': { name: '2 John', testament: 'nt', chapters: 1 },
	'3jn': { name: '3 John', testament: 'nt', chapters: 1 },
	jud: { name: 'Jude', testament: 'nt', chapters: 1 },
	rev: { name: 'Revelation', testament: 'nt', chapters: 22 }
};

/**
 * Fetch available books for a language and resource
 */
async function fetchAvailableBooks(params: Record<string, any>, _request: Request): Promise<any> {
	const {
		language = 'en',
		organization = 'unfoldingWord',
		resource,
		testament,
		includeChapters = false,
		includeCoverage = true
	} = params;

	let books = [];

	// Fetch real data from DCS
	try {
		books = await fetchBooksFromDCS(language, resource, testament, organization);

		if (books.length > 0) {
			console.log(
				`[available-books] Fetched ${books.length} real books from DCS for ${language}/${resource || 'all'}`
			);

			// Transform to match expected format with all options
			books = books.map((book) => {
				const bookInfo = BOOK_INFO[book.id];
				const result: any = {
					id: book.id,
					name: book.name,
					testament: book.testament,
					available: true
				};

				if (includeChapters && bookInfo) {
					result.chapters = bookInfo.chapters;
				}

				if (includeCoverage && bookInfo) {
					result.coverage = {
						chapters: bookInfo.chapters,
						completed: bookInfo.chapters, // Assume complete for now
						percentage: 100
					};
				}

				return result;
			});
		}
	} catch (error) {
		console.error('[available-books] Failed to fetch real data:', error);

		// Check if it's a 404 (repository not found)
		if (error instanceof Error && error.message.includes('404')) {
			return createListResponse([], {
				language,
				organization,
				resource: resource || 'ult',
				source: 'DCS API',
				error: 'Repository not found'
			});
		}

		// For other errors, throw them (no mock fallback)
		throw error;
	}

	// NO MOCK FALLBACK - If no books found, return empty list
	if (books.length === 0) {
		return createListResponse([], {
			language,
			organization,
			resource: resource || 'ult',
			source: 'DCS API',
			message: 'No books available for the specified criteria'
		});
	}

	// Sort books by canonical order
	books.sort((a, b) => {
		const aIndex = Object.keys(BOOK_INFO).indexOf(a.id);
		const bIndex = Object.keys(BOOK_INFO).indexOf(b.id);
		return aIndex - bIndex;
	});

	return createListResponse(books, {
		language,
		organization,
		resource: resource || 'ult',
		source: 'DCS API',
		circuitBreakerState: circuitBreakers.dcs.getState().state,
		...(testament && { filteredBy: { testament } })
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'get-available-books-v2',

	params: [
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			...COMMON_PARAMS.resource,
			required: false // Optional for this endpoint
		},
		{
			name: 'testament',
			validate: (value) => {
				if (!value) return true;
				return ['ot', 'nt'].includes(value);
			}
		},
		{ name: 'includeChapters', type: 'boolean', default: false },
		{ name: 'includeCoverage', type: 'boolean', default: true }
	],

	fetch: fetchAvailableBooks,

	onError: createStandardErrorHandler({
		'Repository not found': {
			status: 404,
			message: 'The requested resource or language is not available.'
		}
	}),

	// Support JSON and markdown formats for LLMs
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
