/**
 * Fetch Translation Word Links Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Returns links between Bible text and translation word entries.
 * These help identify which words in a verse have dictionary entries.
 * Now supports filter parameter for stemmed regex matching with statistics.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

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
 * Handle filter requests - find word links matching a term pattern
 */
async function handleFilterRequest(
	filter: string,
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, testament, category: categoryFilter } = params;

	// Require reference OR testament to limit scope (prevents timeout on 66 books)
	if (!reference && !testament) {
		throw new Error(
			'Filter requires either a reference OR a testament (ot/nt) to limit scope. ' +
				'Examples: filter=love&reference=John OR filter=love&testament=nt'
		);
	}

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`twl-filter-${Date.now()}`, 'translation-word-links-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-word-links] Filter: "${filter}" Pattern: ${pattern}`);

	// Collect matches
	const matches: Array<{
		reference: string;
		quote: string;
		term: string;
		category: string;
		rcLink: string;
		matchedTerms: string[];
	}> = [];

	// Determine books to search
	let booksToSearch: string[];
	const testamentLower = testament?.toLowerCase();

	if (reference) {
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

	// Process books in batches
	const batchSize = 10;
	for (let i = 0; i < booksToSearch.length; i += batchSize) {
		const batch = booksToSearch.slice(i, i + batchSize);

		const batchPromises = batch.map(async (book) => {
			try {
				const tsvData = await fetcher.fetchTranslationWordLinks(book, language, organization);
				if (tsvData && tsvData.length > 0) {
					const bookMatches: typeof matches = [];
					for (const row of tsvData) {
						const rcLink = row.TWLink || '';
						const quote = row.Quote || '';

						// Extract term from RC link
						let term = '';
						let category = '';
						const termMatch = rcLink.match(/rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/([^/]+)/);
						if (termMatch) {
							category = termMatch[1];
							term = termMatch[2];
						}

						// Filter by category if specified
						if (categoryFilter && category !== categoryFilter) {
							continue;
						}

						// Check if term matches pattern
						const searchText = `${term} ${quote}`;
						pattern.lastIndex = 0;
						const found: string[] = [];
						let match;
						while ((match = pattern.exec(searchText)) !== null) {
							found.push(match[0]);
						}

						if (found.length > 0) {
							// Get the raw reference from the row (e.g., "3:16")
							const rawRef = row.Reference || '';
							// Prepend book name to create full reference (e.g., "John 3:16")
							const fullReference = rawRef ? `${book} ${rawRef}` : book;

							bookMatches.push({
								reference: fullReference,
								quote,
								term,
								category,
								rcLink,
								matchedTerms: [...new Set(found)]
							});
						}
					}
					return { success: true, matches: bookMatches };
				}
				return { success: true, matches: [] };
			} catch (error) {
				console.warn(`[fetch-translation-word-links] Filter failed for ${book}:`, error);
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
		`[fetch-translation-word-links] Filter complete: ${matches.length} matches from ${booksSearched} books`
	);

	// Compute statistics (both testament/book and category)
	const statistics = computeFilterStatistics(matches, {
		includeTestament: true,
		includeBook: true,
		includeCategory: true
	});

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
			category: categoryFilter || 'all',
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
 * Fetch translation word links for a reference
 * Uses real TSV data from DCS ZIP archives
 */
async function fetchTranslationWordLinks(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, filter } = params;

	// Handle filter requests first (stemmed regex matching)
	if (filter) {
		return handleFilterRequest(filter, params, request);
	}

	// Require reference for non-filter requests
	if (!reference) {
		throw new Error(
			'Reference is required. Use filter parameter for full-resource search (e.g., filter=love)'
		);
	}

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
		let linkCategory = '';
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
				linkCategory = match[1]; // e.g., "kt", "names", "other"
				term = match[2]; // e.g., "love", "grace", "abraham"
			}
		}

		return {
			id: `twl${index + 1}`,
			reference: row.Reference || reference,
			occurrence: parseInt(row.Occurrence || '1', 10),
			quote: row.Quote || '',
			category: linkCategory, // Extracted: "kt", "names", "other"
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

	params: [
		{
			...COMMON_PARAMS.reference,
			required: false // Optional when filter is provided
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'filter',
			required: false,
			description:
				'Stemmed regex filter to find word links (e.g., "love" matches "love", "loved", "beloved")'
		},
		{
			name: 'testament',
			required: false,
			validate: (value) => !value || ['ot', 'nt'].includes(value.toLowerCase()),
			description: 'Limit filter to Old Testament (ot) or New Testament (nt)'
		},
		{
			name: 'category',
			required: false,
			validate: (value) => !value || ['kt', 'names', 'other'].includes(value.toLowerCase()),
			description: 'Limit filter to word category: kt (Key Terms), names, or other'
		}
	],

	fetch: fetchTranslationWordLinks,

	onError: createStandardErrorHandler({
		'Reference is required': {
			status: 400,
			message: 'Reference parameter is required for non-filter requests.'
		},
		'Filter requires either a reference OR a testament': {
			status: 400,
			message:
				'Filter requires a reference OR testament to limit scope. Use filter=love&reference=John OR filter=love&testament=nt'
		}
	}),

	// Support passthrough for TSV and markdown for LLMs
	supportsFormats: ['json', 'tsv', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
