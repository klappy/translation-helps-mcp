/**
 * Translation Notes Endpoint v2
 *
 * Now with R2 DIRECT ACCESS for blazing fast filter operations!
 * Same pattern as scripture - parallel fetch all TSV files from R2.
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

// Book codes for R2 direct access (matches TSV file naming: tn_GEN.tsv, tn_EXO.tsv, etc.)
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

// Book code to display name mapping
const BOOK_NAMES: Record<string, string> = {
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

// Book names for fallback per-book fetch
const BOOKS_TO_SEARCH = Object.values(BOOK_NAMES);
const OT_BOOKS = BOOKS_TO_SEARCH.slice(0, 39);
const NT_BOOKS = BOOKS_TO_SEARCH.slice(39);

/**
 * Parse TSV content into rows
 */
function parseTSV(
	content: string
): Array<{ Reference: string; ID: string; Quote: string; Note: string }> {
	const lines = content.split('\n');
	if (lines.length < 2) return [];

	const headers = lines[0].split('\t').map((h) => h.trim());
	const refIdx = headers.findIndex((h) => h.toLowerCase() === 'reference');
	const idIdx = headers.findIndex((h) => h.toLowerCase() === 'id');
	const quoteIdx = headers.findIndex(
		(h) => h.toLowerCase() === 'quote' || h.toLowerCase() === 'origquote'
	);
	const noteIdx = headers.findIndex(
		(h) => h.toLowerCase() === 'note' || h.toLowerCase() === 'occurrencenote'
	);

	const rows: Array<{ Reference: string; ID: string; Quote: string; Note: string }> = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cols = line.split('\t');
		rows.push({
			Reference: refIdx >= 0 ? cols[refIdx]?.trim() || '' : '',
			ID: idIdx >= 0 ? cols[idIdx]?.trim() || '' : '',
			Quote: quoteIdx >= 0 ? cols[quoteIdx]?.trim() || '' : '',
			Note: noteIdx >= 0 ? cols[noteIdx]?.trim() || '' : ''
		});
	}

	return rows;
}

/**
 * Handle filter requests with R2 DIRECT ACCESS
 * Fetches all TSV files in parallel - blazing fast!
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

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-notes] R2 Direct Filter: "${filter}" Pattern: ${pattern}`);

	// Determine which books to search
	const testamentLower = testament?.toLowerCase();
	let bookCodes: string[];
	if (testamentLower === 'ot') {
		bookCodes = OT_BOOK_CODES;
	} else if (testamentLower === 'nt') {
		bookCodes = NT_BOOK_CODES;
	} else {
		bookCodes = ALL_BOOK_CODES;
	}

	console.log(`[fetch-translation-notes] R2 direct fetch for ${bookCodes.length} TSV files`);

	// Build R2 prefix for translation notes
	// Files are stored at: by-url/git.door43.org/{org}/{lang}_tn/archive/{version}.zip/files/tn_{BOOK}.tsv
	const r2Prefix = `by-url/git.door43.org/${organization}/${language}_tn/`;

	// Collect matches
	const matches: Array<{
		reference: string;
		quote: string;
		note: string;
		matchedTerms: string[];
		matchCount: number;
	}> = [];

	let booksSearched = 0;
	let booksFailed = 0;
	let fetchMethod = 'r2-direct';

	try {
		// List to find the versioned path
		const listStart = Date.now();
		const listResult = await r2Bucket.list({ prefix: r2Prefix, limit: 100 });
		const listDuration = Date.now() - listStart;
		tracer.addApiCall({
			url: `r2://list/${r2Prefix}`,
			duration: listDuration,
			status: 200,
			size: listResult.objects?.length || 0,
			cached: true
		});

		if (listResult.objects && listResult.objects.length > 0) {
			// Find a .tsv file to extract the base path from
			const tsvFile = listResult.objects.find((obj: any) => obj.key.endsWith('.tsv'));
			const samplePath = tsvFile?.key || '';
			const archiveMatch = samplePath.match(
				/^(by-url\/[^/]+\/[^/]+\/[^/]+\/archive\/[^/]+\.zip\/files\/)/
			);

			if (archiveMatch && tsvFile) {
				const basePath = archiveMatch[1];
				console.log(`[fetch-translation-notes] R2 base path: ${basePath}`);

				// Parallel fetch + parse + filter (interleaved I/O and CPU)
				// Each promise fetches, parses, and filters - allowing true parallelism
				const fetchPromises = bookCodes.map(async (bookCode) => {
					const key = `${basePath}tn_${bookCode}.tsv`;
					const fetchStart = Date.now();
					try {
						const obj = await r2Bucket.get(key);
						const fetchDuration = Date.now() - fetchStart;
						if (obj) {
							const text = await obj.text();
							tracer.addApiCall({
								url: `r2://get/tn_${bookCode}.tsv`,
								duration: fetchDuration,
								status: 200,
								size: text.length,
								cached: true
							});

							// Parse and filter INSIDE the promise - interleaves with other fetches
							const bookName = BOOK_NAMES[bookCode] || bookCode;
							const rows = parseTSV(text);
							const bookMatches: typeof matches = [];

							for (const row of rows) {
								const searchText = `${row.Quote} ${row.Note}`;
								pattern.lastIndex = 0;
								const found: string[] = [];
								let match;
								while ((match = pattern.exec(searchText)) !== null) {
									found.push(match[0]);
								}

								if (found.length > 0) {
									const fullReference = row.Reference ? `${bookName} ${row.Reference}` : bookName;
									bookMatches.push({
										reference: fullReference,
										quote: row.Quote,
										note: row.Note,
										matchedTerms: [...new Set(found)],
										matchCount: found.length
									});
								}
							}

							return { bookCode, matches: bookMatches, success: true };
						}
					} catch {
						// File not in R2
					}
					tracer.addApiCall({
						url: `r2://get/tn_${bookCode}.tsv`,
						duration: Date.now() - fetchStart,
						status: 404,
						size: 0,
						cached: false
					});
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
					`[fetch-translation-notes] R2 filter complete: ${matches.length} matches from ${booksSearched} books`
				);
			}
		}
	} catch (error) {
		console.error('[fetch-translation-notes] R2 direct fetch failed:', error);
		fetchMethod = 'r2-failed';
	}

	// Compute statistics using shared utility
	const statistics = computeFilterStatistics(matches);

	// Build response
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
		matches,
		_trace: tracer.getTrace()
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

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-notes] Fallback Filter: "${filter}" Pattern: ${pattern}`);

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
							const rawRef = note.Reference || note.reference || '';
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
				console.warn(`[fetch-translation-notes] Fallback failed for ${book}:`, error);
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
			fetchMethod: 'per-book-fallback'
		},
		matches,
		_trace: tracer.getTrace()
	};
}

/**
 * Fetch translation notes for a reference (non-filter requests)
 */
async function fetchTranslationNotes(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, search } = params;

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

	const metadata = results[0]?.metadata || {};

	// Apply search if query provided
	if (search && search.trim().length > 0) {
		const totalBeforeSearch = results.length;

		results = await applySearch(
			results,
			search,
			'notes',
			(item: any, index: number): SearchDocument => ({
				id: `note-${index}`,
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

/**
 * Format filter response as markdown with YAML frontmatter
 */
function formatFilterResponseAsMarkdown(response: any): string {
	let md = '';

	// YAML frontmatter
	md += '---\n';
	md += `resource: Translation Notes Filter\n`;
	md += `filter: "${response.filter}"\n`;
	md += `language: ${response.language}\n`;
	md += `organization: ${response.organization}\n`;
	md += `\n# Result Statistics\n`;
	md += `total_results: ${response.totalMatches}\n`;

	if (response.statistics?.byTestament) {
		md += `\n# By Testament\n`;
		md += `old_testament: ${response.statistics.byTestament.ot || 0}\n`;
		md += `new_testament: ${response.statistics.byTestament.nt || 0}\n`;
	}

	if (response.statistics?.byBook) {
		md += `\n# Top Books\n`;
		const sortedBooks = Object.entries(response.statistics.byBook)
			.sort((a: any, b: any) => b[1] - a[1])
			.slice(0, 10);
		for (const [book, count] of sortedBooks) {
			md += `${book}: ${count}\n`;
		}
	}
	md += '---\n\n';

	// Title
	md += `# Translation Notes Filter: "${response.filter}"\n\n`;
	md += `**Total Results**: ${response.totalMatches}\n`;
	md += `**Fetch Method**: ${response.searchScope?.fetchMethod || 'unknown'}\n\n`;

	// Matches (limit for readability)
	md += `## Matches\n\n`;
	const displayMatches = response.matches?.slice(0, 100) || [];
	for (const match of displayMatches) {
		md += `### ${match.reference}\n`;
		if (match.quote) md += `> **${match.quote}**\n`;
		md += `${match.note}\n`;
		md += `*Matched: ${match.matchedTerms?.join(', ')}*\n\n`;
	}

	if (response.matches?.length > 100) {
		md += `\n*... and ${response.matches.length - 100} more matches*\n`;
	}

	return md;
}

/**
 * Main GET handler - with R2 direct access for filter operations
 */
export const GET: RequestHandler = async (event) => {
	// Initialize R2 environment
	const r2Bucket = (event.platform as any)?.env?.ZIP_FILES;
	const caches: CacheStorage | undefined = (event.platform as any)?.caches;
	if (r2Bucket || caches) {
		initializeR2Env(r2Bucket, caches);
	}

	const url = new URL(event.request.url);
	const filter = url.searchParams.get('filter');

	// Handle filter requests with R2 direct access
	if (filter) {
		const tracer = new EdgeXRayTracer(`tn-filter-${Date.now()}`, 'translation-notes-filter');

		const params = {
			filter,
			reference: url.searchParams.get('reference'),
			language: url.searchParams.get('language') || 'en',
			organization: url.searchParams.get('organization') || 'unfoldingWord',
			testament: url.searchParams.get('testament')
		};

		let response: any;

		if (r2Bucket) {
			// Use R2 direct access - FAST!
			response = await handleFilterRequestWithR2(filter, params, r2Bucket, tracer);
		} else {
			// Fallback to per-book fetch
			console.log('[fetch-translation-notes] No R2 bucket, using fallback');
			response = await handleFilterRequestFallback(filter, params, event.request, tracer);
		}

		// Check requested format
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
	name: 'translation-notes-v2',

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

	supportsFormats: true,
	fetch: fetchTranslationNotes,

	onError: createStandardErrorHandler({
		'No translation notes found': {
			status: 404,
			message: 'No translation notes available for this reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
