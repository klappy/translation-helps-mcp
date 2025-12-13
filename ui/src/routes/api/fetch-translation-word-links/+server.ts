/**
 * Fetch Translation Word Links Endpoint v2
 *
 * Now with R2 DIRECT ACCESS for blazing fast filter operations!
 * Parallel fetch all TSV files from R2 storage.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import { initializeR2Env } from '$lib/../../../src/functions/r2-env.js';

// Import shared filter utilities
import { generateStemmedPattern, computeFilterStatistics } from '$lib/filterUtils.js';

// Book codes for R2 direct access (matches TSV file naming: twl_GEN.tsv, twl_EXO.tsv, etc.)
const ALL_BOOK_CODES = [
	'GEN',
	'EXO',
	'LEV',
	'NUM',
	'DEU',
	'JOS',
	'JDG',
	'RUT',
	'1SA',
	'2SA',
	'1KI',
	'2KI',
	'1CH',
	'2CH',
	'EZR',
	'NEH',
	'EST',
	'JOB',
	'PSA',
	'PRO',
	'ECC',
	'SNG',
	'ISA',
	'JER',
	'LAM',
	'EZK',
	'DAN',
	'HOS',
	'JOL',
	'AMO',
	'OBA',
	'JON',
	'MIC',
	'NAM',
	'HAB',
	'ZEP',
	'HAG',
	'ZEC',
	'MAL',
	'MAT',
	'MRK',
	'LUK',
	'JHN',
	'ACT',
	'ROM',
	'1CO',
	'2CO',
	'GAL',
	'EPH',
	'PHP',
	'COL',
	'1TH',
	'2TH',
	'1TI',
	'2TI',
	'TIT',
	'PHM',
	'HEB',
	'JAS',
	'1PE',
	'2PE',
	'1JN',
	'2JN',
	'3JN',
	'JUD',
	'REV'
];

const OT_BOOK_CODES = ALL_BOOK_CODES.slice(0, 39);
const NT_BOOK_CODES = ALL_BOOK_CODES.slice(39);

// Book code to full name mapping
const BOOK_CODE_TO_NAME: Record<string, string> = {
	GEN: 'Genesis',
	EXO: 'Exodus',
	LEV: 'Leviticus',
	NUM: 'Numbers',
	DEU: 'Deuteronomy',
	JOS: 'Joshua',
	JDG: 'Judges',
	RUT: 'Ruth',
	'1SA': '1 Samuel',
	'2SA': '2 Samuel',
	'1KI': '1 Kings',
	'2KI': '2 Kings',
	'1CH': '1 Chronicles',
	'2CH': '2 Chronicles',
	EZR: 'Ezra',
	NEH: 'Nehemiah',
	EST: 'Esther',
	JOB: 'Job',
	PSA: 'Psalms',
	PRO: 'Proverbs',
	ECC: 'Ecclesiastes',
	SNG: 'Song of Solomon',
	ISA: 'Isaiah',
	JER: 'Jeremiah',
	LAM: 'Lamentations',
	EZK: 'Ezekiel',
	DAN: 'Daniel',
	HOS: 'Hosea',
	JOL: 'Joel',
	AMO: 'Amos',
	OBA: 'Obadiah',
	JON: 'Jonah',
	MIC: 'Micah',
	NAM: 'Nahum',
	HAB: 'Habakkuk',
	ZEP: 'Zephaniah',
	HAG: 'Haggai',
	ZEC: 'Zechariah',
	MAL: 'Malachi',
	MAT: 'Matthew',
	MRK: 'Mark',
	LUK: 'Luke',
	JHN: 'John',
	ACT: 'Acts',
	ROM: 'Romans',
	'1CO': '1 Corinthians',
	'2CO': '2 Corinthians',
	GAL: 'Galatians',
	EPH: 'Ephesians',
	PHP: 'Philippians',
	COL: 'Colossians',
	'1TH': '1 Thessalonians',
	'2TH': '2 Thessalonians',
	'1TI': '1 Timothy',
	'2TI': '2 Timothy',
	TIT: 'Titus',
	PHM: 'Philemon',
	HEB: 'Hebrews',
	JAS: 'James',
	'1PE': '1 Peter',
	'2PE': '2 Peter',
	'1JN': '1 John',
	'2JN': '2 John',
	'3JN': '3 John',
	JUD: 'Jude',
	REV: 'Revelation'
};

// Book names for fallback (keep for compatibility)
const BOOKS_TO_SEARCH = Object.values(BOOK_CODE_TO_NAME);
const OT_BOOKS = BOOKS_TO_SEARCH.slice(0, 39);
const NT_BOOKS = BOOKS_TO_SEARCH.slice(39);

/**
 * Parse TSV content into structured rows
 */
function parseTSV(
	content: string
): Array<{ Reference: string; ID: string; Quote: string; Occurrence: string; TWLink: string }> {
	const lines = content.split('\n');
	const rows: Array<{
		Reference: string;
		ID: string;
		Quote: string;
		Occurrence: string;
		TWLink: string;
	}> = [];

	// Find header line
	let headerLine = 0;
	for (let i = 0; i < Math.min(5, lines.length); i++) {
		if (lines[i].includes('Reference') && lines[i].includes('TWLink')) {
			headerLine = i;
			break;
		}
	}

	const headers = lines[headerLine].split('\t').map((h) => h.trim());
	const refIdx = headers.findIndex((h) => h === 'Reference');
	const idIdx = headers.findIndex((h) => h === 'ID');
	const quoteIdx = headers.findIndex((h) => h === 'Quote');
	const occIdx = headers.findIndex((h) => h === 'Occurrence');
	const twlIdx = headers.findIndex((h) => h === 'TWLink');

	for (let i = headerLine + 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cols = line.split('\t');
		if (cols.length >= Math.max(refIdx, quoteIdx, twlIdx) + 1) {
			rows.push({
				Reference: cols[refIdx]?.trim() || '',
				ID: idIdx >= 0 ? cols[idIdx]?.trim() || '' : '',
				Quote: quoteIdx >= 0 ? cols[quoteIdx]?.trim() || '' : '',
				Occurrence: occIdx >= 0 ? cols[occIdx]?.trim() || '1' : '1',
				TWLink: twlIdx >= 0 ? cols[twlIdx]?.trim() || '' : ''
			});
		}
	}

	return rows;
}

/**
 * Handle filter requests with R2 DIRECT ACCESS
 */
async function handleFilterRequestWithR2(
	filter: string,
	params: Record<string, any>,
	r2Bucket: any,
	tracer: EdgeXRayTracer
): Promise<any> {
	const {
		reference: _reference,
		language = 'en',
		organization = 'unfoldingWord',
		testament,
		category: categoryFilter
	} = params;

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-word-links] R2 Direct Filter: "${filter}" Pattern: ${pattern}`);

	// Determine which books to search
	let bookCodes: string[];
	const testamentLower = testament?.toLowerCase();
	if (testamentLower === 'ot') {
		bookCodes = OT_BOOK_CODES;
	} else if (testamentLower === 'nt') {
		bookCodes = NT_BOOK_CODES;
	} else {
		bookCodes = ALL_BOOK_CODES;
	}

	const matches: Array<{
		reference: string;
		quote: string;
		term: string;
		category: string;
		rcLink: string;
		matchedTerms: string[];
	}> = [];

	let booksSearched = 0;
	let booksFailed = 0;
	let fetchMethod = 'r2-direct';

	try {
		// Build R2 prefix
		const r2Prefix = `by-url/git.door43.org/${organization}/${language}_twl/`;

		// List to find versioned path
		const listStart = Date.now();
		const listResult = await r2Bucket.list({ prefix: r2Prefix, limit: 1000 });
		const listDuration = Date.now() - listStart;
		tracer.addApiCall({
			url: `r2://list/${r2Prefix}`,
			duration: listDuration,
			status: 200,
			size: listResult.objects?.length || 0,
			cached: true
		});

		if (listResult.objects && listResult.objects.length > 0) {
			// Find a .tsv file to extract the base path from (not just any object)
			const tsvFile = listResult.objects.find((obj: any) => obj.key.endsWith('.tsv'));
			if (!tsvFile) {
				throw new Error('No TSV files found in R2 bucket');
			}
			const sampleKey = tsvFile.key;
			// Extract full base path including archive version
			const archiveMatch = sampleKey.match(
				/^(by-url\/[^/]+\/[^/]+\/[^/]+\/archive\/[^/]+\.zip\/files\/)/
			);
			if (!archiveMatch) {
				throw new Error('Could not determine R2 archive path from: ' + sampleKey);
			}
			const basePath = archiveMatch[1];

			console.log(`[fetch-translation-word-links] R2 base path: ${basePath}`);

			// Parallel fetch + parse + filter (interleaved I/O and CPU)
			const fetchPromises = bookCodes.map(async (bookCode) => {
				const key = `${basePath}twl_${bookCode}.tsv`;
				const fetchStart = Date.now();
				try {
					const obj = await r2Bucket.get(key);
					const fetchDuration = Date.now() - fetchStart;
					if (obj) {
						const text = await obj.text();
						tracer.addApiCall({
							url: `r2://get/twl_${bookCode}.tsv`,
							duration: fetchDuration,
							status: 200,
							size: text.length,
							cached: true
						});

						// Parse and filter INSIDE the promise - interleaves with other fetches
						const bookName = BOOK_CODE_TO_NAME[bookCode] || bookCode;
						const rows = parseTSV(text);
						const bookMatches: typeof matches = [];

						for (const row of rows) {
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
								const fullRef = row.Reference ? `${bookName} ${row.Reference}` : bookName;
								bookMatches.push({
									reference: fullRef,
									quote,
									term,
									category,
									rcLink,
									matchedTerms: [...new Set(found)]
								});
							}
						}

						return { bookCode, matches: bookMatches, success: true };
					}
				} catch {
					// File doesn't exist for this book
				}
				return { bookCode, matches: [] as typeof matches, success: false };
			});

			const r2Results = await Promise.all(fetchPromises);

			// Aggregate already-processed results
			for (const { matches: bookMatches, success } of r2Results) {
				if (success) {
					booksSearched++;
					matches.push(...bookMatches);
				} else {
					booksFailed++;
				}
			}

			console.log(
				`[fetch-translation-word-links] R2 filter complete: ${matches.length} matches from ${booksSearched} books`
			);
		}
	} catch (error) {
		console.error('[fetch-translation-word-links] R2 direct fetch failed:', error);
		fetchMethod = 'r2-failed';
	}

	// Compute statistics
	const statistics = computeFilterStatistics(matches, {
		includeTestament: true,
		includeBook: true,
		includeCategory: true
	});

	return {
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
			booksFailed,
			fetchMethod
		},
		matches
	};
}

/**
 * Fallback filter without R2 - uses per-book fetch (slower)
 */
async function handleFilterRequestFallback(
	filter: string,
	params: Record<string, any>,
	request: Request,
	tracer: EdgeXRayTracer
): Promise<any> {
	const { reference, language, organization, testament, category: categoryFilter } = params;

	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-word-links] Fallback Filter: "${filter}" Pattern: ${pattern}`);

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
	} else if (testamentLower === 'ot') {
		booksToSearch = OT_BOOKS;
	} else if (testamentLower === 'nt') {
		booksToSearch = NT_BOOKS;
	} else {
		booksToSearch = BOOKS_TO_SEARCH;
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

						let term = '';
						let category = '';
						const termMatch = rcLink.match(/rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/([^/]+)/);
						if (termMatch) {
							category = termMatch[1];
							term = termMatch[2];
						}

						if (categoryFilter && category !== categoryFilter) continue;

						const searchText = `${term} ${quote}`;
						pattern.lastIndex = 0;
						const found: string[] = [];
						let match;
						while ((match = pattern.exec(searchText)) !== null) {
							found.push(match[0]);
						}

						if (found.length > 0) {
							const rawRef = row.Reference || '';
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
				console.warn(`[fetch-translation-word-links] Fallback filter failed for ${book}:`, error);
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

	const statistics = computeFilterStatistics(matches, {
		includeTestament: true,
		includeBook: true,
		includeCategory: true
	});

	return {
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
			booksFailed,
			fetchMethod: 'per-book-fallback'
		},
		matches,
		_trace: tracer.getTrace()
	};
}

/**
 * Format filter response as markdown
 */
function formatFilterResponseAsMarkdown(response: any): string {
	let md = '';

	md += '---\n';
	md += `resource: Translation Word Links Filter\n`;
	md += `filter: "${response.filter}"\n`;
	md += `language: ${response.language}\n`;
	md += `organization: ${response.organization}\n`;
	md += `\n# Result Statistics\n`;
	md += `total_results: ${response.totalMatches}\n`;

	if (response.statistics?.byTestament) {
		md += `\n# By Testament\n`;
		for (const [test, count] of Object.entries(response.statistics.byTestament)) {
			md += `${test}: ${count}\n`;
		}
	}
	if (response.statistics?.byBook) {
		md += `\n# By Book\n`;
		for (const [book, count] of Object.entries(response.statistics.byBook)) {
			md += `${book}: ${count}\n`;
		}
	}
	if (response.statistics?.byCategory) {
		md += `\n# By Category\n`;
		for (const [cat, count] of Object.entries(response.statistics.byCategory)) {
			md += `${cat}: ${count}\n`;
		}
	}
	md += '---\n\n';

	md += `# Translation Word Links Filter: "${response.filter}"\n\n`;
	md += `**Total Results**: ${response.totalMatches}\n`;
	md += `**Fetch Method**: ${response.searchScope?.fetchMethod || 'unknown'}\n\n`;

	md += `## Matches\n\n`;
	const displayMatches = response.matches?.slice(0, 100) || [];
	for (const match of displayMatches) {
		md += `### ${match.reference}\n`;
		md += `**Term**: ${match.term} (${match.category})\n`;
		md += `**Quote**: ${match.quote}\n`;
		md += `*Matched: ${match.matchedTerms?.join(', ')}*\n\n`;
	}

	if (response.matches?.length > 100) {
		md += `\n*... and ${response.matches.length - 100} more matches*\n`;
	}

	return md;
}

/**
 * Fetch translation word links for a reference (non-filter requests)
 */
async function fetchTranslationWordLinks(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// Require reference for non-filter requests
	if (!reference) {
		throw new Error('Reference is required. Use filter parameter for full-resource search');
	}

	const tracer = new EdgeXRayTracer(`twl-${Date.now()}`, 'fetch-translation-word-links');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Fetch real TWL data from TSV
	const tsvData = await fetcher.fetchTranslationWordLinks(reference, language, organization);

	// Transform TSV rows to expected format
	const links = tsvData.map((row, index) => {
		const rcLink = row.TWLink || '';

		let linkCategory = '';
		let term = '';
		let path = '';

		if (rcLink) {
			const pathMatch = rcLink.match(/rc:\/\/\*\/tw\/dict\/(.+)/);
			if (pathMatch) {
				path = pathMatch[1] + '.md';
			}

			const match = rcLink.match(/rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/([^/]+)/);
			if (match) {
				linkCategory = match[1];
				term = match[2];
			}
		}

		return {
			id: `twl${index + 1}`,
			reference: row.Reference || reference,
			occurrence: parseInt(row.Occurrence || '1', 10),
			quote: row.Quote || '',
			category: linkCategory,
			term,
			path,
			strongsId: row.StrongsId || '',
			rcLink,
			position: null
		};
	});

	const response = createTranslationHelpsResponse(links, reference, language, organization, 'twl');
	return {
		...response,
		_trace: fetcher.getTrace()
	};
}

/**
 * Main GET handler - with R2 direct access for filter operations
 */
export const GET: RequestHandler = async (event) => {
	const r2Bucket = (event.platform as any)?.env?.ZIP_FILES;
	const caches: CacheStorage | undefined = (event.platform as any)?.caches;
	if (r2Bucket || caches) {
		initializeR2Env(r2Bucket, caches);
	}

	const url = new URL(event.request.url);
	const filter = url.searchParams.get('filter');

	// Handle filter requests with R2 direct access
	if (filter) {
		const tracer = new EdgeXRayTracer(`twl-filter-${Date.now()}`, 'translation-word-links-filter');

		const params = {
			filter,
			reference: url.searchParams.get('reference'),
			language: url.searchParams.get('language') || 'en',
			organization: url.searchParams.get('organization') || 'unfoldingWord',
			testament: url.searchParams.get('testament'),
			category: url.searchParams.get('category')
		};

		let response: any;

		if (r2Bucket) {
			response = await handleFilterRequestWithR2(filter, params, r2Bucket, tracer);
		} else {
			console.log('[fetch-translation-word-links] No R2 bucket, using fallback');
			response = await handleFilterRequestFallback(filter, params, event.request, tracer);
		}

		const format = url.searchParams.get('format')?.toLowerCase() || 'json';
		if (format === 'md' || format === 'markdown') {
			return new Response(formatFilterResponseAsMarkdown(response), {
				headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
			});
		}

		return json(response);
	}

	// Non-filter requests use the simple endpoint pattern
	return simpleEndpointHandler(event);
};

// Simple endpoint for non-filter requests
const simpleEndpointHandler = createSimpleEndpoint({
	name: 'fetch-translation-word-links-v2',

	params: [
		{
			...COMMON_PARAMS.reference,
			required: false
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'filter',
			required: false,
			description: 'Stemmed regex filter (handled separately with R2 direct access)'
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
			description: 'Limit filter to word category: kt, names, or other'
		}
	],

	fetch: fetchTranslationWordLinks,

	onError: createStandardErrorHandler({
		'Reference is required': {
			status: 400,
			message: 'Reference parameter is required for non-filter requests.'
		}
	}),

	supportsFormats: ['json', 'tsv', 'md', 'markdown']
});

export const OPTIONS = createCORSHandler();
