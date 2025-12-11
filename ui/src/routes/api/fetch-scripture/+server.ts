/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 * 
 * Parameters:
 * - search: AutoRAG semantic search (conceptually about X)
 * - filter: Stemmed regex filter (contains word X)
 *   - With reference: searches within that book/chapter
 *   - Without reference: requires resource, searches entire translation (parallel fetch)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS, isValidReference } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createScriptureResponse, addSearchMetadata } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import {
	applySearch,
	type SearchDocument
} from '$lib/../../../src/services/SearchServiceFactory.js';
import { parseReference } from '$lib/referenceParser.js';
import { generateStemmedPattern } from '$lib/stemmedFilter.js';
import { initializeR2Env, getR2Env } from '$lib/../../../src/functions/r2-env.js';

// All 66 book codes for full-resource search
const ALL_BOOKS = [
	'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
	'1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
	'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
	'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
	'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
	'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
	'1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
];
const NT_BOOKS = ALL_BOOKS.slice(39);
const OT_BOOKS = ALL_BOOKS.slice(0, 39);

// Book code to display name mapping
const BOOK_NAMES: Record<string, string> = {
	gen: 'Genesis', exo: 'Exodus', lev: 'Leviticus', num: 'Numbers', deu: 'Deuteronomy',
	jos: 'Joshua', jdg: 'Judges', rut: 'Ruth', '1sa': '1Samuel', '2sa': '2Samuel',
	'1ki': '1Kings', '2ki': '2Kings', '1ch': '1Chronicles', '2ch': '2Chronicles',
	ezr: 'Ezra', neh: 'Nehemiah', est: 'Esther', job: 'Job', psa: 'Psalms', pro: 'Proverbs',
	ecc: 'Ecclesiastes', sng: 'SongOfSongs', isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations',
	ezk: 'Ezekiel', dan: 'Daniel', hos: 'Hosea', jol: 'Joel', amo: 'Amos',
	oba: 'Obadiah', jon: 'Jonah', mic: 'Micah', nam: 'Nahum', hab: 'Habakkuk',
	zep: 'Zephaniah', hag: 'Haggai', zec: 'Zechariah', mal: 'Malachi',
	mat: 'Matthew', mrk: 'Mark', luk: 'Luke', jhn: 'John', act: 'Acts',
	rom: 'Romans', '1co': '1Corinthians', '2co': '2Corinthians', gal: 'Galatians', eph: 'Ephesians',
	php: 'Philippians', col: 'Colossians', '1th': '1Thessalonians', '2th': '2Thessalonians',
	'1ti': '1Timothy', '2ti': '2Timothy', tit: 'Titus', phm: 'Philemon', heb: 'Hebrews',
	jas: 'James', '1pe': '1Peter', '2pe': '2Peter', '1jn': '1John', '2jn': '2John',
	'3jn': '3John', jud: 'Jude', rev: 'Revelation'
};

/**
 * Get display name for a book (handles both codes and names)
 */
function getBookDisplayName(book: string): string {
	// If it's a code, convert to display name
	const lower = book.toLowerCase();
	if (BOOK_NAMES[lower]) return BOOK_NAMES[lower];
	// Already a name, return as-is
	return book;
}

/**
 * Extract book name from scripture text (fallback for full-resource search)
 * Looks for markdown header like "# Genesis" or "# 1 John"
 */
function extractBookFromText(text: string): string {
	const headerMatch = text.match(/^#\s+([A-Za-z0-9\s]+?)\s*$/m);
	if (headerMatch) return headerMatch[1].trim();
	return 'Unknown';
}

/**
 * Extract clean text from USFM format
 * Preserves chapter/verse structure for parsing
 */
function extractFullBookFromUSFM(usfm: string): string {
	try {
		const bookText = usfm
			// Preserve chapter markers
			.replace(/\\c\s+(\d+)/g, '[[CHAPTER:$1]]')
			// Preserve verse markers
			.replace(/\\v\s+(\d+)\s*/g, '[[VERSE:$1]]')
			// Remove alignment markers
			.replace(/\\zaln-s\s*\|[^\\]+\\\*/g, '')
			.replace(/\\zaln-e\\\*/g, '')
			// Remove word markers
			.replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, '$1')
			// Remove other USFM markers
			.replace(/\\-s\s*\|[^\\]+\\\*/g, '')
			.replace(/\\-e\\\*/g, '')
			.replace(/\\[a-z]+\d*\s*/g, '')
			// Remove asterisks and braces
			.replace(/\*+/g, '')
			.replace(/\{([^}]+)\}/g, '$1')
			// Clean whitespace
			.replace(/\s+/g, ' ')
			.replace(/\s+([.,;:!?])/g, '$1')
			// Format chapters and verses
			.replace(/\[\[CHAPTER:(\d+)\]\]/g, '\n\n## Chapter $1\n\n')
			.replace(/\[\[VERSE:(\d+)\]\]/g, '\n$1 ')
			.trim();
		return bookText;
	} catch {
		return '';
	}
}

/**
 * Parse resource parameter
 */
function parseResources(resourceParam: string | undefined): string[] {
	const availableResources = ['ult', 'ust', 't4t', 'ueb', 'glt', 'gst'];

	if (!resourceParam || resourceParam === 'all') {
		return ['ult', 'ust', 't4t', 'ueb'];
	}

	const requested = resourceParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => availableResources.includes(r));

	const unique = new Set<string>();
	for (const r of requested) {
		if (r === 'glt') unique.add('ult');
		else if (r === 'gst') unique.add('ust');
		else unique.add(r);
	}

	return Array.from(unique);
}

/**
 * Parse text into individual verses
 * Handles multiple formats:
 * - "3:16 For God so loved..." (chapter:verse prefix)
 * - "16 For God so loved..." (verse only, after # Chapter X header)
 */
function parseIntoVerses(
	text: string,
	book: string,
	translation: string,
	knownChapter?: number
): Array<{ text: string; reference: string; chapter: number; verse: number; translation: string }> {
	const verses: Array<{ text: string; reference: string; chapter: number; verse: number; translation: string }> = [];
	const lines = text.split('\n');
	let currentChapter = knownChapter || 0;

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		// Chapter header: "# Book Chapter 3" or "# 1John 4"
		const chapterHeaderMatch = trimmedLine.match(/^#+\s+.*?(\d+)\s*$/);
		if (chapterHeaderMatch) {
			currentChapter = parseInt(chapterHeaderMatch[1], 10);
			continue;
		}

		// Chapter header: "## Chapter 3"
		const chapterMatch = trimmedLine.match(/^#+\s+Chapter\s+(\d+)/i);
		if (chapterMatch) {
			currentChapter = parseInt(chapterMatch[1], 10);
			continue;
		}

		// Verse line with chapter:verse prefix: "3:16 For God so loved..."
		const fullVerseMatch = trimmedLine.match(/^(\d+):(\d+)\s+(.+)$/);
		if (fullVerseMatch) {
			const [, chapter, verse, verseText] = fullVerseMatch;
			currentChapter = parseInt(chapter, 10);
			verses.push({
				text: verseText.trim(),
				reference: `${book} ${chapter}:${verse}`,
				chapter: parseInt(chapter, 10),
				verse: parseInt(verse, 10),
				translation
			});
			continue;
		}

		// Verse line with just verse number: "16 For God so loved..."
		// Also handles: "[ULT v87...] 1 Beloved..." (translation prefix)
		const verseOnlyMatch = trimmedLine.match(/^(?:\[[^\]]+\]\s*)?(\d+)\s+(.+)$/);
		if (verseOnlyMatch && currentChapter > 0) {
			const [, verse, verseText] = verseOnlyMatch;
			// Skip if this looks like a chapter header (very short)
			if (verseText.length > 10) {
				verses.push({
					text: verseText.trim(),
					reference: `${book} ${currentChapter}:${verse}`,
					chapter: currentChapter,
					verse: parseInt(verse, 10),
					translation
				});
			}
		}
	}

	return verses;
}

/**
 * Handle filter requests - stemmed regex matching
 * Uses direct R2 access for full-resource search (much faster than per-book zip fetches)
 */
async function handleFilterRequest(request: Request, r2Bucket?: any): Promise<Response | null> {
	const url = new URL(request.url);
	const filter = url.searchParams.get('filter');
	
	if (!filter) return null;
	
	const reference = url.searchParams.get('reference');
	const language = url.searchParams.get('language') || 'en';
	const organization = url.searchParams.get('organization') || 'unfoldingWord';
	const resourceParam = url.searchParams.get('resource');
	const testament = url.searchParams.get('testament')?.toLowerCase();
	
	// Validate: need reference OR specific resource (not 'all')
	if (!reference && (!resourceParam || resourceParam === 'all')) {
		return json({
			error: 'Filter requires either a reference OR a specific resource',
			hints: [
				'With reference: filter=love&reference=John',
				'With resource: filter=love&resource=ult',
				'Limit scope: filter=love&resource=ult&testament=nt'
			],
			availableResources: ['ult', 'ust', 't4t', 'ueb'],
			availableTestaments: ['ot', 'nt']
		}, { status: 400 });
	}
	
	// For full-resource search, only allow single resource
	const requestedResources = parseResources(resourceParam || 'ult');
	if (!reference && requestedResources.length > 1) {
		return json({
			error: 'Full-resource search requires a single resource',
			hints: [
				'Use one resource: filter=love&resource=ult',
				'Or add reference: filter=love&reference=John&resource=ult,ust'
			]
		}, { status: 400 });
	}
	
	console.log(`[fetch-scripture] Filter: "${filter}" in ${reference || `full ${requestedResources[0]}`}`);
	
	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-scripture] Pattern: ${pattern}`);
	
	const tracer = new EdgeXRayTracer(`scripture-filter-${Date.now()}`, 'fetch-scripture-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));
	
	let results: Array<{ text: string; translation: string; book?: string }> = [];
	let booksSearched: string[] = [];
	let fetchMethod = 'per-book';
	
	if (reference) {
		// Single reference - simple fetch
		const fetched = await fetcher.fetchScripture(reference, language, organization, requestedResources);
		results = fetched.map(r => ({ ...r }));
	} else if (r2Bucket) {
		// Full resource search with R2 direct access - much faster!
		fetchMethod = 'r2-direct';
		const books = testament === 'nt' ? NT_BOOKS : testament === 'ot' ? OT_BOOKS : ALL_BOOKS;
		const resource = requestedResources[0];
		
		console.log(`[fetch-scripture] R2 direct fetch for ${books.length} books in ${resource}`);
		
		// Build R2 prefix for this resource
		// Files are stored at: by-url/git.door43.org/{org}/{lang}_{resource}/archive/{version}.zip/files/{bookfile}.usfm
		// We need to discover the version by listing first
		const r2Prefix = `by-url/git.door43.org/${organization}/${language}_${resource}/`;
		
		try {
			// List to find the versioned path
			const listStart = Date.now();
			const listResult = await r2Bucket.list({ prefix: r2Prefix, limit: 10 });
			const listDuration = Date.now() - listStart;
			tracer.addApiCall({ url: `r2://list/${r2Prefix}`, duration: listDuration, status: 200, size: listResult.objects?.length || 0, cached: true });
			
			if (listResult.objects && listResult.objects.length > 0) {
				// Extract the full path pattern from first result
				// e.g., "by-url/git.door43.org/unfoldingWord/en_ult/archive/v87.zip/files/41-MAT.usfm"
				const samplePath = listResult.objects[0].key;
				const archiveMatch = samplePath.match(/^(by-url\/[^/]+\/[^/]+\/[^/]+\/archive\/[^/]+\.zip\/files\/)/);
				
				if (archiveMatch) {
					const basePath = archiveMatch[1];
					console.log(`[fetch-scripture] R2 base path: ${basePath}`);
					
					// Parallel fetch all book files from R2
					const bookFileMap: Record<string, string> = {
						gen: '01-GEN', exo: '02-EXO', lev: '03-LEV', num: '04-NUM', deu: '05-DEU',
						jos: '06-JOS', jdg: '07-JDG', rut: '08-RUT', '1sa': '09-1SA', '2sa': '10-2SA',
						'1ki': '11-1KI', '2ki': '12-2KI', '1ch': '13-1CH', '2ch': '14-2CH',
						ezr: '15-EZR', neh: '16-NEH', est: '17-EST', job: '18-JOB', psa: '19-PSA', pro: '20-PRO',
						ecc: '21-ECC', sng: '22-SNG', isa: '23-ISA', jer: '24-JER', lam: '25-LAM',
						ezk: '26-EZK', dan: '27-DAN', hos: '28-HOS', jol: '29-JOL', amo: '30-AMO',
						oba: '31-OBA', jon: '32-JON', mic: '33-MIC', nam: '34-NAM', hab: '35-HAB',
						zep: '36-ZEP', hag: '37-HAG', zec: '38-ZEC', mal: '39-MAL',
						mat: '41-MAT', mrk: '42-MRK', luk: '43-LUK', jhn: '44-JHN', act: '45-ACT',
						rom: '46-ROM', '1co': '47-1CO', '2co': '48-2CO', gal: '49-GAL', eph: '50-EPH',
						php: '51-PHP', col: '52-COL', '1th': '53-1TH', '2th': '54-2TH',
						'1ti': '55-1TI', '2ti': '56-2TI', tit: '57-TIT', phm: '58-PHM', heb: '59-HEB',
						jas: '60-JAS', '1pe': '61-1PE', '2pe': '62-2PE', '1jn': '63-1JN', '2jn': '64-2JN',
						'3jn': '65-3JN', jud: '66-JUD', rev: '67-REV'
					};
					
					const fetchPromises = books.map(async (bookCode) => {
						const fileCode = bookFileMap[bookCode];
						if (!fileCode) return { bookCode, text: null };
						
						const key = `${basePath}${fileCode}.usfm`;
						const fetchStart = Date.now();
						try {
							const obj = await r2Bucket.get(key);
							const fetchDuration = Date.now() - fetchStart;
							if (obj) {
								const text = await obj.text();
								tracer.addApiCall({ url: `r2://get/${fileCode}.usfm`, duration: fetchDuration, status: 200, size: text.length, cached: true });
								return { bookCode, text };
							}
						} catch {
							// File not in R2
						}
						tracer.addApiCall({ url: `r2://get/${fileCode}.usfm`, duration: Date.now() - fetchStart, status: 404, size: 0, cached: false });
						return { bookCode, text: null };
					});
					
					const r2Results = await Promise.all(fetchPromises);
					
					// Process R2 results - extract full book content from USFM
					for (const { bookCode, text } of r2Results) {
						if (text) {
							// Extract clean text from USFM
							const cleanText = extractFullBookFromUSFM(text);
							results.push({ text: cleanText, translation: resource.toUpperCase(), book: bookCode });
							booksSearched.push(bookCode);
						}
					}
				}
			}
		} catch (error) {
			console.error('[fetch-scripture] R2 direct fetch failed:', error);
		}
		
		// Fallback to per-book fetch if R2 didn't work
		if (results.length === 0) {
			console.log('[fetch-scripture] R2 direct failed, falling back to per-book fetch');
			fetchMethod = 'per-book-fallback';
		}
	}
	
	// Fallback: per-book fetch (slower but always works)
	if (!reference && results.length === 0) {
		const books = testament === 'nt' ? NT_BOOKS : testament === 'ot' ? OT_BOOKS : ALL_BOOKS;
		console.log(`[fetch-scripture] Per-book fetch for ${books.length} books from ${requestedResources[0]}`);
		
		const fetchPromises = books.map(async (bookCode) => {
			try {
				const bookResults = await fetcher.fetchScripture(bookCode, language, organization, requestedResources);
				return { bookCode, results: (bookResults || []).map(r => ({ ...r, book: bookCode })) };
			} catch {
				return { bookCode, results: [] };
			}
		});
		
		const allBookResults = await Promise.all(fetchPromises);
		for (const { bookCode, results: bookResults } of allBookResults) {
			if (bookResults.length > 0) {
				results.push(...bookResults);
				booksSearched.push(bookCode);
			}
		}
	}
	
	if (!results || results.length === 0) {
		return json({
			error: reference
				? `Scripture not found for reference: ${reference}`
				: `No scripture found for resource: ${resourceParam}`,
			filter,
			pattern: pattern.toString(),
			hints: ['Check resource exists: ult, ust, t4t, ueb']
		}, { status: 404 });
	}
	
	// Parse into verses and filter
	const matches: Array<{
		reference: string;
		text: string;
		resource: string;
		matchedTerms: string[];
		matchCount: number;
	}> = [];
	
	// For single reference, use parsed book/chapter; for full resource, use tagged book
	const parsedRef = reference ? parseReference(reference) : null;
	const singleBook = parsedRef?.book || (reference ? reference.replace(/\s+\d+.*$/, '').trim() : null);
	const singleChapter = parsedRef?.chapter;
	
	for (const result of results) {
		// Use result.book (from full-resource) or singleBook (from reference) or extract from text
		const bookRaw = result.book || singleBook || extractBookFromText(result.text);
		const book = getBookDisplayName(bookRaw);
		const verses = parseIntoVerses(result.text, book, result.translation, singleChapter);
		
		for (const verse of verses) {
			pattern.lastIndex = 0;
			const found: string[] = [];
			let match;
			while ((match = pattern.exec(verse.text)) !== null) {
				found.push(match[0]);
			}
			
			if (found.length > 0) {
				matches.push({
					reference: verse.reference,
					text: verse.text,
					resource: result.translation,
					matchedTerms: [...new Set(found)],
					matchCount: found.length
				});
			}
		}
	}
	
	const response: Record<string, any> = {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		resource: requestedResources.join(','),
		totalMatches: matches.length,
		matches,
		_trace: tracer.getTrace()
	};
	
	if (reference) {
		response.reference = reference;
	} else {
		response.searchScope = {
			fetchMethod,
			testament: testament || 'all',
			booksSearched: booksSearched.length,
			books: booksSearched
		};
	}
	
	return json(response);
}

/**
 * Fetch scripture for a reference
 */
async function fetchScripture(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, resource: resourceParam, search } = params;

	const tracer = new EdgeXRayTracer(`scripture-${Date.now()}`, 'fetch-scripture');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	const requestedResources = parseResources(resourceParam);

	// If no reference but has search, delegate to /api/search
	if (!reference && search) {
		console.log('[fetch-scripture-v2] No reference, delegating to /api/search:', search);

		const startTime = Date.now();
		const searchUrl = new URL('/api/search', request.url);
		searchUrl.searchParams.set('query', search);
		searchUrl.searchParams.set('language', language || 'en');
		searchUrl.searchParams.set('organization', organization || 'unfoldingWord');
		searchUrl.searchParams.set('resource', 'scripture');
		searchUrl.searchParams.set('includeHelps', 'false');
		searchUrl.searchParams.set('limit', '50');

		try {
			const searchResponse = await fetch(searchUrl.toString(), { headers: request.headers });
			if (!searchResponse.ok) throw new Error(`Search returned ${searchResponse.status}`);

			const searchData = await searchResponse.json();
			const totalTime = Date.now() - startTime;

			const SCRIPTURE_RESOURCES = ['ult', 'ust', 'ueb', 't4t', 'scripture', 'glt', 'gst'];
			const requestedLang = (language || 'en').toLowerCase();
			
			const scriptureResults = (searchData.hits || [])
				.filter((hit: any) => {
					const resource = (hit.resource || '').toLowerCase();
					const hitLang = (hit.language || '').toLowerCase();
					return SCRIPTURE_RESOURCES.includes(resource) && (!hitLang || hitLang === requestedLang);
				})
				.map((hit: any) => ({
					text: hit.preview?.replace(/\*\*/g, '') || hit.content || '',
					reference: hit.reference || hit.path || '',
					translation: hit.resource || '',
					language: hit.language || language || 'en',
					searchScore: hit.score
				}));

			return {
				scripture: scriptureResults,
				reference: 'all',
				language: language || 'en',
				organization: organization || 'unfoldingWord',
				metadata: {
					totalCount: scriptureResults.length,
					searchQuery: search,
					searchApplied: true,
					searchTime: totalTime,
					delegatedTo: '/api/search'
				}
			};
		} catch (error) {
			throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	if (!reference && !search) {
		throw new Error('Reference is required when not searching');
	}

	// Fetch scripture
	let results = await fetcher.fetchScripture(reference, language, organization, requestedResources);

	if (!results || results.length === 0) {
		throw new Error(`Scripture not found for reference: ${reference}`);
	}

	// Apply search if provided
	if (search && search.trim().length > 0) {
		const parsedRef = parseReference(reference);
		const book = parsedRef?.book || reference.replace(/\s+\d+.*$/, '').trim();
		const chapter = parsedRef?.chapter;
		
		const parsedVerses: Array<{ text: string; reference: string; translation: string }> = [];
		for (const result of results) {
			const verses = parseIntoVerses(result.text, book, result.translation, chapter);
			for (const v of verses) {
				parsedVerses.push({ text: v.text, reference: v.reference, translation: v.translation });
			}
		}

		if (parsedVerses.length > 0) {
			results = await applySearch(
				parsedVerses,
				search,
				'scripture',
				(item: any, index: number): SearchDocument => ({
					id: `${item.translation}-${item.reference}-${index}`,
					content: item.text,
					path: item.reference,
					resource: item.translation,
					type: 'bible'
				})
			);
		}
	}

	// Deduplicate
	const uniqueResults = results.reduce((acc: any[], curr: any) => {
		const key = `${curr.translation}-${curr.reference || reference}`;
		if (!acc.some((r) => `${r.translation}-${r.reference || reference}` === key)) {
			acc.push(curr);
		}
		return acc;
	}, []);

	const baseResponse = createScriptureResponse(uniqueResults, {
		reference,
		requestedResources,
		foundResources: [...new Set(uniqueResults.map((s: any) => s.translation?.split(' ')[0]?.toLowerCase()))]
	});

	return {
		...baseResponse,
		metadata: search ? addSearchMetadata(baseResponse.metadata, search, results.length) : baseResponse.metadata,
		_trace: fetcher.getTrace()
	};
}

/**
 * GET handler - check for filter first, then normal endpoint
 */
export const GET: RequestHandler = async (event) => {
	// Initialize R2 environment before any operations
	const r2Bucket = (event.platform as any)?.env?.ZIP_FILES;
	const caches: CacheStorage | undefined = (event.platform as any)?.caches;
	if (r2Bucket || caches) {
		initializeR2Env(r2Bucket, caches);
	}
	
	// Check for filter param first
	const filterResponse = await handleFilterRequest(event.request, r2Bucket);
	if (filterResponse) return filterResponse;
	
	// Otherwise use normal endpoint
	return normalEndpoint(event);
};

// Normal endpoint (used when no filter param)
const normalEndpoint = createSimpleEndpoint({
	name: 'fetch-scripture-v2',
	params: [
		{ name: 'reference', required: false, validate: isValidReference },
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'resource',
			default: 'all',
			validate: (value) => {
				if (!value || value === 'all') return true;
				return value.split(',').every((r) => ['ult', 'ust', 't4t', 'ueb', 'glt', 'gst'].includes(r.trim()));
			}
		},
		COMMON_PARAMS.search
	],
	supportsFormats: true,
	fetch: fetchScripture,
	onError: createStandardErrorHandler({
		'Scripture not found for reference': { status: 404, message: 'No scripture available for the specified reference.' }
	})
});

export const OPTIONS = createCORSHandler();
