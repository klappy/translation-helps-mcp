/**
 * Get Available Books Endpoint v2
 *
 * Discover which Bible books are available for specific resources.
 * Uses all our consistency patterns and DCS fetching utilities.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { circuitBreakers } from '$lib/circuitBreaker.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createListResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

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
async function fetchAvailableBooks(params: Record<string, any>, request: Request): Promise<any> {
	const {
		language = 'en',
		organization = 'unfoldingWord',
		resource,
		testament,
		includeChapters = false,
		includeCoverage = true
	} = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`books-${Date.now()}`, 'get-available-books');

	// Initialize fetcher with request headers (for future use)
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let books = [];

	// Fetch catalog metadata to get ingredients
	try {
		// Import required functions
		const { fetchCatalogMetadata } = await import('$lib/edgeMetadataFetcher.js');

		// Determine subject based on resource type
		const subjectMap: Record<string, string> = {
			ult: 'Bible',
			ust: 'Bible',
			tn: 'TSV Translation Notes',
			tw: 'Translation Words',
			tq: 'TSV Translation Questions',
			ta: 'Translation Academy'
		};

		const subject = resource
			? subjectMap[resource.toLowerCase()] || 'Bible'
			: 'Bible,Aligned Bible,TSV Translation Notes,Translation Words,TSV Translation Questions,Translation Academy';

		// Fetch catalog data
		const catalogData = await circuitBreakers.dcs.execute(async () => {
			return fetchCatalogMetadata(language, organization, subject);
		});

		if (!catalogData || catalogData.length === 0) {
			const response = createListResponse([], {
				language,
				organization,
				resource: resource || 'all',
				source: 'DCS Catalog',
				error: 'No resources found'
			});
			return {
				...response,
				_trace: fetcher.getTrace()
			};
		}

		// Extract books from ingredients of all matching resources
		const bookSet = new Set<string>();
		const allBooks: any[] = [];

		for (const catalog of catalogData) {
			// Filter by specific resource if requested
			if (
				resource &&
				catalog.abbreviation !== resource &&
				!catalog.title?.toLowerCase().includes(resource)
			) {
				continue;
			}

			if (catalog.ingredients && Array.isArray(catalog.ingredients)) {
				for (const ingredient of catalog.ingredients) {
					const bookId = ingredient.identifier;

					// Skip if not a valid book or already added
					if (!bookId || !BOOK_INFO[bookId] || bookSet.has(bookId)) {
						continue;
					}

					// Filter by testament if specified
					if (testament && testament !== 'both' && BOOK_INFO[bookId].testament !== testament) {
						continue;
					}

					bookSet.add(bookId);
					const bookInfo = BOOK_INFO[bookId];

					const book: any = {
						id: bookId,
						name: bookInfo.name,
						testament: bookInfo.testament,
						available: true
					};

					if (includeChapters) {
						book.chapters = bookInfo.chapters;
					}

					if (includeCoverage) {
						book.coverage = {
							chapters: bookInfo.chapters,
							completed: bookInfo.chapters, // Assume complete
							percentage: 100
						};
					}

					allBooks.push(book);
				}
			}
		}

		// Sort books by biblical order (could use a proper ordering)
		books = allBooks.sort((a, b) => {
			const aIndex = Object.keys(BOOK_INFO).indexOf(a.id);
			const bIndex = Object.keys(BOOK_INFO).indexOf(b.id);
			return aIndex - bIndex;
		});

		console.log(
			`[available-books] Found ${books.length} books from catalog ingredients for ${language}/${resource || 'all'}`
		);
	} catch (error) {
		console.error('[available-books] Failed to fetch catalog data:', error);

		// For any errors, return empty list with error message
		const response = createListResponse([], {
			language,
			organization,
			resource: resource || 'all',
			source: 'DCS Catalog',
			error: error instanceof Error ? error.message : 'Failed to fetch catalog data'
		});
		return {
			...response,
			_trace: fetcher.getTrace()
		};
	}

	// NO MOCK FALLBACK - If no books found, return empty list
	if (books.length === 0) {
		const response = createListResponse([], {
			language,
			organization,
			resource: resource || 'ult',
			source: 'DCS API',
			message: 'No books available for the specified criteria'
		});
		return {
			...response,
			_trace: fetcher.getTrace()
		};
	}

	// Sort books by canonical order
	books.sort((a, b) => {
		const aIndex = Object.keys(BOOK_INFO).indexOf(a.id);
		const bIndex = Object.keys(BOOK_INFO).indexOf(b.id);
		return aIndex - bIndex;
	});

	const response = createListResponse(books, {
		language,
		organization,
		resource: resource || 'all',
		source: 'DCS Catalog Ingredients',
		circuitBreakerState: circuitBreakers.dcs.getState().state,
		...(testament && { filteredBy: { testament } })
	});

	return {
		...response,
		_trace: fetcher.getTrace()
	};
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
