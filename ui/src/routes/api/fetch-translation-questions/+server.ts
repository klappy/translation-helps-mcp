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
import { COMMON_PARAMS, isValidReference } from '$lib/commonValidators.js';
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

	let results: any[] = [];

	// If no reference but has search, search across all books
	if (!reference && search) {
		console.log(
			'[fetch-translation-questions-v2] No reference provided, searching all books for:',
			search
		);

		const booksToSearch = [
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

		const allQuestions: any[] = [];
		let booksSearched = 0;
		let booksFailed = 0;

		// Process books in batches
		const batchSize = 10;
		for (let i = 0; i < booksToSearch.length; i += batchSize) {
			const batch = booksToSearch.slice(i, i + batchSize);

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

	// Use common parameter validators + search
	params: [
		{
			name: 'reference',
			required: false, // Optional when search is provided
			validate: (value) => !value || isValidReference(value)
		},
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
