/**
 * Get Available Books Endpoint v2
 *
 * Discover which Bible books are available for specific resources.
 * Uses all our consistency patterns and DCS fetching utilities.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createListResponse } from '$lib/standardResponses.js';
import { fetchRepoContents, mockFetchers } from '$lib/dataFetchers.js';
import { circuitBreakers } from '$lib/circuitBreaker.js';

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
		includeCoverage = true,
		useMock = false // For testing
	} = params;

	// Use mock data if requested (for development)
	if (useMock) {
		let mockBooks = await mockFetchers.getAvailableBooks(language, resource);

		// Apply testament filter if requested
		if (testament) {
			mockBooks = mockBooks.filter((book: any) => book.testament === testament);
		}

		return createListResponse(mockBooks, {
			language,
			organization,
			resource,
			source: 'mock',
			...(testament && { filteredBy: { testament } })
		});
	}

	// Build repository name
	const repoName = resource ? `${language}_${resource}` : `${language}_ult`; // Default to ULT

	try {
		// Fetch repository contents to see which books exist
		const contents = await fetchRepoContents(organization, repoName);

		// Filter for book directories (they're usually 2-3 letter codes)
		const bookDirs = contents.filter(
			(item) => item.type === 'dir' && item.name.match(/^[0-9]{2,3}-?[A-Z1-3]{3}$/i) // Matches patterns like "01-GEN" or "MAT"
		);

		// Map to our book structure
		const availableBooks = bookDirs
			.map((dir) => {
				// Extract book code from directory name (e.g., "01-GEN" -> "gen")
				const bookCode = dir.name.replace(/^[0-9]+-?/, '').toLowerCase();
				const bookInfo = BOOK_INFO[bookCode];

				if (!bookInfo) {
					return null; // Skip unknown books
				}

				const book: any = {
					id: bookCode,
					name: bookInfo.name,
					testament: bookInfo.testament,
					available: true,
					path: dir.path
				};

				if (includeChapters) {
					book.chapters = bookInfo.chapters;
				}

				if (includeCoverage) {
					// In a real implementation, we'd check actual chapter files
					book.coverage = {
						chapters: bookInfo.chapters,
						completed: bookInfo.chapters, // Assume complete for now
						percentage: 100
					};
				}

				return book;
			})
			.filter(Boolean); // Remove nulls

		// Filter by testament if requested
		let filteredBooks = availableBooks;
		if (testament) {
			filteredBooks = availableBooks.filter((book) => book.testament === testament);
		}

		// Sort books by canonical order (would need full implementation)
		filteredBooks.sort((a, b) => {
			const aIndex = Object.keys(BOOK_INFO).indexOf(a.id);
			const bIndex = Object.keys(BOOK_INFO).indexOf(b.id);
			return aIndex - bIndex;
		});

		return createListResponse(filteredBooks, {
			language,
			organization,
			resource: resource || 'ult',
			source: 'DCS API',
			circuitBreakerState: circuitBreakers.dcs.getState().state,
			...(testament && { filteredBy: { testament } })
		});
	} catch (error) {
		// If repo doesn't exist, return empty list
		if (error instanceof Error && error.message.includes('404')) {
			return createListResponse([], {
				language,
				organization,
				resource: resource || 'ult',
				source: 'DCS API',
				error: 'Repository not found'
			});
		}
		throw error;
	}
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
		{ name: 'includeCoverage', type: 'boolean', default: true },
		{ name: 'useMock', type: 'boolean', default: false } // For testing
	],

	fetch: fetchAvailableBooks,

	onError: createStandardErrorHandler({
		'Repository not found': {
			status: 404,
			message: 'The requested resource or language is not available.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
