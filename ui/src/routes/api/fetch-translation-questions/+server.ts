/**
 * Translation Questions Endpoint v2
 *
 * Demonstrates using all our consistent utilities:
 * - Common validators
 * - Standard error handlers
 * - Consistent response shapes
 * - Optional search parameter for in-reference searching
 * - Filter parameter for stemmed regex matching with statistics
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS, isValidReference } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse, addSearchMetadata } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import {
	applySearch,
	type SearchDocument
} from '$lib/../../../src/services/SearchServiceFactory.js';

// Import shared filter utilities
import { generateStemmedPattern, computeFilterStatistics } from '$lib/filterUtils.js';

// Book names for full-resource filter
const BOOKS_TO_SEARCH = [
	'Genesis',
	'Exodus',
	'Leviticus',
	'Numbers',
	'Deuteronomy',
	'Joshua',
	'Judges',
	'Ruth',
	'1 Samuel',
	'2 Samuel',
	'1 Kings',
	'2 Kings',
	'1 Chronicles',
	'2 Chronicles',
	'Ezra',
	'Nehemiah',
	'Esther',
	'Job',
	'Psalms',
	'Proverbs',
	'Ecclesiastes',
	'Song of Solomon',
	'Isaiah',
	'Jeremiah',
	'Lamentations',
	'Ezekiel',
	'Daniel',
	'Hosea',
	'Joel',
	'Amos',
	'Obadiah',
	'Jonah',
	'Micah',
	'Nahum',
	'Habakkuk',
	'Zephaniah',
	'Haggai',
	'Zechariah',
	'Malachi',
	'Matthew',
	'Mark',
	'Luke',
	'John',
	'Acts',
	'Romans',
	'1 Corinthians',
	'2 Corinthians',
	'Galatians',
	'Ephesians',
	'Philippians',
	'Colossians',
	'1 Thessalonians',
	'2 Thessalonians',
	'1 Timothy',
	'2 Timothy',
	'Titus',
	'Philemon',
	'Hebrews',
	'James',
	'1 Peter',
	'2 Peter',
	'1 John',
	'2 John',
	'3 John',
	'Jude',
	'Revelation'
];

// OT/NT split for testament filtering
const OT_BOOKS = BOOKS_TO_SEARCH.slice(0, 39);
const NT_BOOKS = BOOKS_TO_SEARCH.slice(39);

/**
 * Handle filter requests - stemmed regex matching across questions
 */
async function handleFilterRequest(
	filter: string,
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tq-filter-${Date.now()}`, 'translation-questions-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-questions] Filter: "${filter}" Pattern: ${pattern}`);

	// Collect matches
	const matches: Array<{
		reference: string;
		question: string;
		response: string;
		matchedTerms: string[];
		matchCount: number;
	}> = [];

	// Determine books to search
	let booksToSearch: string[];
	if (reference) {
		booksToSearch = [reference];
	} else {
		if (testament === 'ot') {
			booksToSearch = OT_BOOKS;
		} else if (testament === 'nt') {
			booksToSearch = NT_BOOKS;
		} else {
			booksToSearch = BOOKS_TO_SEARCH;
		}
	}

	let booksSearched = 0;
	let booksFailed = 0;

	// Process books in batches
	const batchSize = 10;
	for (let i = 0; i < booksToSearch.length; i += batchSize) {
		const batch = booksToSearch.slice(i, i + batchSize);

		const batchPromises = batch.map(async (book) => {
			try {
				const bookQuestions = await fetcher.fetchTranslationQuestions(book, language, organization);
				if (bookQuestions && bookQuestions.length > 0) {
					const bookMatches: typeof matches = [];
					for (const q of bookQuestions) {
						const question = q.question || q.Question || '';
						const response = q.response || q.Response || q.answer || '';
						const searchText = `${question} ${response}`;

						pattern.lastIndex = 0;
						const found: string[] = [];
						let match;
						while ((match = pattern.exec(searchText)) !== null) {
							found.push(match[0]);
						}

						if (found.length > 0) {
							bookMatches.push({
								reference: q.Reference || q.reference || book,
								question,
								response,
								matchedTerms: [...new Set(found)],
								matchCount: found.length
							});
						}
					}
					return { success: true, matches: bookMatches };
				}
				return { success: true, matches: [] };
			} catch (error) {
				console.warn(`[fetch-translation-questions] Filter failed for ${book}:`, error);
				return { success: false, matches: [] };
			}
		});

		const batchResults = await Promise.all(batchPromises);
		for (const result of batchResults) {
			if (result.success) {
				booksSearched++;
				matches.push(...result.matches);
			} else {
				booksFailed++;
			}
		}
	}

	console.log(
		`[fetch-translation-questions] Filter complete: ${matches.length} matches from ${booksSearched} books`
	);

	// Compute statistics using shared utility
	const statistics = computeFilterStatistics(matches);

	// Build response
	const response = {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			testament: testament || 'all',
			booksSearched,
			booksFailed
		},
		matches,
		_trace: tracer.getTrace()
	};

	if (reference) {
		(response as any).reference = reference;
	}

	// Return data object - let createSimpleEndpoint handle formatting
	return response;
}

/**
 * Fetch translation questions for a reference
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, search, filter } = params;

	// Handle filter requests first (stemmed regex matching)
	if (filter) {
		return handleFilterRequest(filter, params, request);
	}

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tq-${Date.now()}`, 'translation-questions');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let results: any[] = [];

	// If no reference but has search, search across all books
	if (!reference && search) {
		console.log(
			'[fetch-translation-questions-v2] No reference provided, searching all books for:',
			search
		);

		const allQuestions: any[] = [];
		let booksSearched = 0;
		let booksFailed = 0;

		// Process books in batches
		const batchSize = 10;
		for (let i = 0; i < BOOKS_TO_SEARCH.length; i += batchSize) {
			const batch = BOOKS_TO_SEARCH.slice(i, i + batchSize);

			const batchPromises = batch.map(async (book) => {
				try {
					const bookQuestions = await fetcher.fetchTranslationQuestions(
						book,
						language,
						organization
					);
					if (bookQuestions && bookQuestions.length > 0) {
						// Search these questions
						const matches = await applySearch(
							bookQuestions,
							search,
							'questions',
							(item: any, index: number): SearchDocument => ({
								id: `${book}-question-${index}`,
								content: `${item.question || ''} ${item.response || item.answer || ''}`.trim(),
								path: item.Reference || book,
								resource: 'translation-questions',
								type: 'questions'
							})
						);
						return { success: true, matches };
					}
					return { success: true, matches: [] };
				} catch (error) {
					console.warn(`[fetch-translation-questions-v2] Failed to fetch ${book}:`, error);
					return { success: false, matches: [] };
				}
			});

			const batchResults = await Promise.all(batchPromises);
			for (const result of batchResults) {
				if (result.success) {
					booksSearched++;
					allQuestions.push(...result.matches);
				} else {
					booksFailed++;
				}
			}
		}

		console.log(
			`[fetch-translation-questions-v2] Search complete: ${allQuestions.length} matches from ${booksSearched} books`
		);

		return createTranslationHelpsResponse(allQuestions, 'all', language, organization, 'tq', {
			searchQuery: search,
			searchApplied: true,
			booksSearched,
			booksFailed
		});
	}

	// Fetch using unified fetcher
	results = await fetcher.fetchTranslationQuestions(reference, language, organization);

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

	// Use common parameter validators + search + filter
	params: [
		{
			name: 'reference',
			required: false, // Optional when search/filter is provided
			validate: (value) => !value || isValidReference(value)
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search,
		{
			name: 'filter',
			required: false,
			description:
				'Stemmed regex filter (e.g., "faith" matches "faith", "faithful", "faithfulness")'
		},
		{
			name: 'testament',
			required: false,
			validate: (value) => !value || ['ot', 'nt'].includes(value.toLowerCase()),
			description: 'Limit filter to Old Testament (ot) or New Testament (nt)'
		}
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
