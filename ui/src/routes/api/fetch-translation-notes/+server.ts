/**
 * Translation Notes Endpoint v2
 *
 * Another example of consistent endpoint implementation.
 * Same patterns, same utilities, predictable behavior!
 * Now supports optional search parameter for in-reference searching.
 * Now supports filter parameter for stemmed regex matching with statistics.
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
 * Handle filter requests - stemmed regex matching across notes
 * Returns data object for createSimpleEndpoint to format
 */
async function handleFilterRequest(
	filter: string,
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, testament } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tn-filter-${Date.now()}`, 'translation-notes-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-notes] Filter: "${filter}" Pattern: ${pattern}`);

	// Collect matches
	const matches: Array<{
		reference: string;
		quote: string;
		note: string;
		matchedTerms: string[];
		matchCount: number;
	}> = [];

	// Determine books to search
	let booksToSearch: string[];
	const testamentLower = testament?.toLowerCase();

	if (reference) {
		// Single reference
		booksToSearch = [reference];
	} else {
		// Filter by testament if specified (case-insensitive)
		if (testamentLower === 'ot') {
			booksToSearch = OT_BOOKS;
		} else if (testamentLower === 'nt') {
			booksToSearch = NT_BOOKS;
		} else {
			booksToSearch = BOOKS_TO_SEARCH;
		}
	}

	let booksSearched = 0;
	let booksFailed = 0;

	console.log(
		`[fetch-translation-notes] Testament filter: "${testament}", Books to search: ${booksToSearch.length}`
	);

	// Process books in batches
	const batchSize = 10;
	for (let i = 0; i < booksToSearch.length; i += batchSize) {
		const batch = booksToSearch.slice(i, i + batchSize);

		const batchPromises = batch.map(async (book) => {
			try {
				const bookNotes = await fetcher.fetchTranslationNotes(book, language, organization);
				if (bookNotes && bookNotes.length > 0) {
					const bookMatches: typeof matches = [];
					for (const note of bookNotes) {
						const noteText = note.note || note.Note || note.text || '';
						const quote = note.quote || note.Quote || '';
						const searchText = `${quote} ${noteText}`;

						pattern.lastIndex = 0;
						const found: string[] = [];
						let match;
						while ((match = pattern.exec(searchText)) !== null) {
							found.push(match[0]);
						}

						if (found.length > 0) {
							// Get the raw reference from the note (e.g., "3:16")
							const rawRef = note.Reference || note.reference || '';
							// Prepend book name to create full reference (e.g., "John 3:16")
							const fullReference = rawRef ? `${book} ${rawRef}` : book;

							bookMatches.push({
								reference: fullReference,
								quote,
								note: noteText,
								matchedTerms: [...new Set(found)],
								matchCount: found.length
							});
						}
					}
					return { success: true, matches: bookMatches, book };
				}
				return { success: true, matches: [], book };
			} catch (error) {
				console.warn(`[fetch-translation-notes] Filter failed for ${book}:`, error);
				return { success: false, matches: [], book };
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
		`[fetch-translation-notes] Filter complete: ${matches.length} matches from ${booksSearched} books`
	);

	// Compute statistics using shared utility
	const statistics = computeFilterStatistics(matches);

	// Build response DATA (not Response object - let createSimpleEndpoint handle formatting)
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

	return response;
}

/**
 * Fetch translation notes for a reference
 */
async function fetchTranslationNotes(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, search, filter } = params;

	// Handle filter requests first (stemmed regex matching)
	if (filter) {
		return handleFilterRequest(filter, params, request);
	}

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tn-${Date.now()}`, 'translation-notes');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let results: any[] = [];

	// If no reference but has search, search across all books
	if (!reference && search) {
		console.log(
			'[fetch-translation-notes-v2] No reference provided, searching all books for:',
			search
		);

		const allNotes: any[] = [];
		let booksSearched = 0;
		let booksFailed = 0;

		// Process books in batches
		const batchSize = 10;
		for (let i = 0; i < BOOKS_TO_SEARCH.length; i += batchSize) {
			const batch = BOOKS_TO_SEARCH.slice(i, i + batchSize);

			const batchPromises = batch.map(async (book) => {
				try {
					const bookNotes = await fetcher.fetchTranslationNotes(book, language, organization);
					if (bookNotes && bookNotes.length > 0) {
						// Search these notes
						const matches = await applySearch(
							bookNotes,
							search,
							'notes',
							(item: any, index: number): SearchDocument => ({
								id: `${book}-note-${index}`,
								content: `${item.quote || ''} ${item.note || item.Note || item.text || ''}`.trim(),
								path: item.Reference || book,
								resource: 'translation-notes',
								type: 'notes'
							})
						);
						return { success: true, matches };
					}
					return { success: true, matches: [] };
				} catch (error) {
					console.warn(`[fetch-translation-notes-v2] Failed to fetch ${book}:`, error);
					return { success: false, matches: [] };
				}
			});

			const batchResults = await Promise.all(batchPromises);
			for (const result of batchResults) {
				if (result.success) {
					booksSearched++;
					allNotes.push(...result.matches);
				} else {
					booksFailed++;
				}
			}
		}

		console.log(
			`[fetch-translation-notes-v2] Search complete: ${allNotes.length} matches from ${booksSearched} books`
		);

		return createTranslationHelpsResponse(allNotes, 'all', language, organization, 'tn', {
			searchQuery: search,
			searchApplied: true,
			booksSearched,
			booksFailed
		});
	}

	// Fetch using unified fetcher
	results = await fetcher.fetchTranslationNotes(reference, language, organization);

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

	// Same parameter validators + search + filter
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
				'Stemmed regex filter (e.g., "metaphor" matches "metaphor", "metaphors", "metaphorical")'
		},
		{
			name: 'testament',
			required: false,
			validate: (value) => !value || ['ot', 'nt'].includes(value.toLowerCase()),
			description: 'Limit filter to Old Testament (ot) or New Testament (nt)'
		}
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
