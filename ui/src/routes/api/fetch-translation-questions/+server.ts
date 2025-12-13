/**
 * Translation Questions Endpoint v2
 *
 * Now with R2 DIRECT ACCESS for blazing fast filter operations!
 * Parallel fetch all TSV files from R2 storage.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
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
import { initializeR2Env } from '$lib/../../../src/functions/r2-env.js';

// Import shared filter utilities
import { generateStemmedPattern, computeFilterStatistics } from '$lib/filterUtils.js';

// Book codes for R2 direct access (matches TSV file naming: tq_GEN.tsv, tq_EXO.tsv, etc.)
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
): Array<{ Reference: string; ID: string; Question: string; Response: string }> {
	const lines = content.split('\n');
	const rows: Array<{ Reference: string; ID: string; Question: string; Response: string }> = [];

	// Find header line
	let headerLine = 0;
	for (let i = 0; i < Math.min(5, lines.length); i++) {
		if (lines[i].includes('Reference') && lines[i].includes('Question')) {
			headerLine = i;
			break;
		}
	}

	const headers = lines[headerLine].split('\t').map((h) => h.trim());
	const refIdx = headers.findIndex((h) => h === 'Reference');
	const idIdx = headers.findIndex((h) => h === 'ID');
	const questionIdx = headers.findIndex((h) => h === 'Question');
	const responseIdx = headers.findIndex((h) => h === 'Response');

	for (let i = headerLine + 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cols = line.split('\t');
		if (cols.length >= Math.max(refIdx, questionIdx, responseIdx) + 1) {
			rows.push({
				Reference: cols[refIdx]?.trim() || '',
				ID: idIdx >= 0 ? cols[idIdx]?.trim() || '' : '',
				Question: questionIdx >= 0 ? cols[questionIdx]?.trim() || '' : '',
				Response: responseIdx >= 0 ? cols[responseIdx]?.trim() || '' : ''
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
		testament
	} = params;

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-questions] R2 Direct Filter: "${filter}" Pattern: ${pattern}`);

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
		question: string;
		response: string;
		matchedTerms: string[];
		matchCount: number;
	}> = [];

	let booksSearched = 0;
	let booksFailed = 0;
	let fetchMethod = 'r2-direct';

	try {
		// Build R2 prefix
		const r2Prefix = `by-url/git.door43.org/${organization}/${language}_tq/`;

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
			// Find versioned path (e.g., archive/v86.zip/files/)
			const sampleKey = listResult.objects[0].key;
			const archiveMatch = sampleKey.match(/archive\/[^/]+\.zip\/files\//);
			if (!archiveMatch) {
				throw new Error('Could not determine R2 archive path');
			}
			const basePath = r2Prefix + archiveMatch[0];

			console.log(`[fetch-translation-questions] R2 base path: ${basePath}`);

			// Parallel fetch + parse + filter (interleaved I/O and CPU)
			const fetchPromises = bookCodes.map(async (bookCode) => {
				const key = `${basePath}tq_${bookCode}.tsv`;
				const fetchStart = Date.now();
				try {
					const obj = await r2Bucket.get(key);
					const fetchDuration = Date.now() - fetchStart;
					if (obj) {
						const text = await obj.text();
						tracer.addApiCall({
							url: `r2://get/tq_${bookCode}.tsv`,
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
							const searchText = `${row.Question} ${row.Response}`;
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
									question: row.Question,
									response: row.Response,
									matchedTerms: [...new Set(found)],
									matchCount: found.length
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
				`[fetch-translation-questions] R2 filter complete: ${matches.length} matches from ${booksSearched} books`
			);
		}
	} catch (error) {
		console.error('[fetch-translation-questions] R2 direct fetch failed:', error);
		fetchMethod = 'r2-failed';
	}

	// Compute statistics
	const statistics = computeFilterStatistics(matches);

	return {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			testament: testament || 'all',
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
	const { reference, language, organization, testament } = params;

	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-questions] Fallback Filter: "${filter}" Pattern: ${pattern}`);

	const matches: Array<{
		reference: string;
		question: string;
		response: string;
		matchedTerms: string[];
		matchCount: number;
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
							const rawRef = q.Reference || q.reference || '';
							const fullReference = rawRef ? `${book} ${rawRef}` : book;
							bookMatches.push({
								reference: fullReference,
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
				console.warn(`[fetch-translation-questions] Fallback filter failed for ${book}:`, error);
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

	const statistics = computeFilterStatistics(matches);

	return {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			testament: testament || 'all',
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
	md += `resource: Translation Questions Filter\n`;
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
	md += '---\n\n';

	md += `# Translation Questions Filter: "${response.filter}"\n\n`;
	md += `**Total Results**: ${response.totalMatches}\n`;
	md += `**Fetch Method**: ${response.searchScope?.fetchMethod || 'unknown'}\n\n`;

	md += `## Matches\n\n`;
	const displayMatches = response.matches?.slice(0, 100) || [];
	for (const match of displayMatches) {
		md += `### ${match.reference}\n`;
		md += `**Q**: ${match.question}\n`;
		md += `**A**: ${match.response}\n`;
		md += `*Matched: ${match.matchedTerms?.join(', ')}*\n\n`;
	}

	if (response.matches?.length > 100) {
		md += `\n*... and ${response.matches.length - 100} more matches*\n`;
	}

	return md;
}

/**
 * Fetch translation questions for a reference (non-filter requests)
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { reference, language, organization, search } = params;

	const tracer = new EdgeXRayTracer(`tq-${Date.now()}`, 'translation-questions');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let results: any[] = [];

	// Check if we have enough parameters to proceed
	if (!reference && !search) {
		throw new Error(
			'Reference is required. Example: reference=John 3:16. Or use filter/search for broader queries.'
		);
	}

	// If no reference but has search, search across all books
	if (!reference && search) {
		console.log('[fetch-translation-questions] No reference, searching all books for:', search);

		const allQuestions: any[] = [];
		let booksSearched = 0;
		let booksFailed = 0;

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
					console.warn(`[fetch-translation-questions] Failed to fetch ${book}:`, error);
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

	const metadata = results[0]?.metadata || {};

	if (search && search.trim().length > 0) {
		const totalBeforeSearch = results.length;
		results = await applySearch(
			results,
			search,
			'questions',
			(item: any, index: number): SearchDocument => ({
				id: `question-${index}`,
				content: `${item.question || ''} ${item.response || item.answer || ''}`.trim(),
				path: item.reference || reference,
				resource: 'translation-questions',
				type: 'questions'
			})
		);
		console.log(
			`[fetch-translation-questions] Search filtered ${totalBeforeSearch} to ${results.length}`
		);
	}

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
		const tracer = new EdgeXRayTracer(`tq-filter-${Date.now()}`, 'translation-questions-filter');

		const params = {
			filter,
			reference: url.searchParams.get('reference'),
			language: url.searchParams.get('language') || 'en',
			organization: url.searchParams.get('organization') || 'unfoldingWord',
			testament: url.searchParams.get('testament')
		};

		let response: any;

		if (r2Bucket) {
			response = await handleFilterRequestWithR2(filter, params, r2Bucket, tracer);
		} else {
			console.log('[fetch-translation-questions] No R2 bucket, using fallback');
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
	name: 'translation-questions-v2',

	params: [
		{
			name: 'reference',
			required: false,
			validate: (value) => !value || isValidReference(value)
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search,
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
		}
	],

	fetch: fetchTranslationQuestions,
	supportsFormats: true,

	onError: createStandardErrorHandler({
		'No translation questions found': {
			status: 404,
			message: 'No translation questions available for this reference.'
		},
		'Reference is required': {
			status: 400,
			message:
				'Reference parameter is required. Example: reference=John 3:16. Or use filter/search parameter for broader queries.'
		}
	})
});

export const OPTIONS = createCORSHandler();
