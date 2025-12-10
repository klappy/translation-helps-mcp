/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 * Now supports optional search parameter for in-reference searching.
 */

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

/**
 * Parse resource parameter
 * Supports both standard types (ult, ust, t4t, ueb) and gateway equivalents (glt, gst)
 */
function parseResources(resourceParam: string | undefined): string[] {
	// Include gateway equivalents: glt (equivalent to ult), gst (equivalent to ust)
	const availableResources = ['ult', 'ust', 't4t', 'ueb', 'glt', 'gst'];

	if (!resourceParam || resourceParam === 'all') {
		// Return unique resources (don't include both ult/glt and ust/gst)
		return ['ult', 'ust', 't4t', 'ueb'];
	}

	// Handle comma-separated resources
	const requested = resourceParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => availableResources.includes(r));

	// Remove duplicates (e.g., if both ult and glt are requested)
	const unique = new Set<string>();
	for (const r of requested) {
		// Map gateway resources to their equivalents
		if (r === 'glt') {
			unique.add('ult');
		} else if (r === 'gst') {
			unique.add('ust');
		} else {
			unique.add(r);
		}
	}

	return Array.from(unique);
}

/**
 * Parse USFM text into individual verses with references
 * Used when searching book-only references to return individual verses instead of entire book
 */
function parseUSFMIntoVerses(
	usfmText: string,
	book: string,
	translation: string
): Array<{ text: string; reference: string; translation: string }> {
	const verses: Array<{ text: string; reference: string; translation: string }> = [];

	// Split by chapter markers or verse markers
	// Look for patterns like "## Chapter X" or verse numbers
	const lines = usfmText.split(/\n+/);
	let currentChapter = 0;
	let currentVerse = 0;
	let verseText = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Detect chapter markers (from extractFullBookFromUSFM output)
		const chapterMatch = line.match(/^##\s+Chapter\s+(\d+)/i);
		if (chapterMatch) {
			// Save previous verse if exists
			if (currentVerse > 0 && verseText.trim()) {
				verses.push({
					text: verseText.trim(),
					reference: `${book} ${currentChapter}:${currentVerse}`,
					translation
				});
				verseText = '';
			}
			currentChapter = parseInt(chapterMatch[1], 10);
			currentVerse = 0;
			continue;
		}

		// Detect verse markers (from extractFullBookFromUSFM output or raw USFM)
		// Match patterns like "[[VERSE:1]]", "1. text", or "1 text" (no period)
		const verseMatch = line.match(/\[\[VERSE:(\d+)\]\]|^(\d+)[.\s]\s*/);
		if (verseMatch) {
			// Save previous verse if exists
			if (currentVerse > 0 && verseText.trim()) {
				verses.push({
					text: verseText.trim(),
					reference: `${book} ${currentChapter}:${currentVerse}`,
					translation
				});
			}
			currentVerse = parseInt(verseMatch[1] || verseMatch[2], 10);
			verseText = line.replace(/\[\[VERSE:\d+\]\]|^\d+[.\s]\s*/, '').trim();
			continue;
		}

		// Continue collecting verse text
		if (currentChapter > 0 && currentVerse > 0 && line) {
			// Skip chapter headers and other metadata
			if (!line.startsWith('##') && !line.startsWith('[')) {
				verseText += (verseText ? ' ' : '') + line;
			}
		}
	}

	// Don't forget the last verse
	if (currentChapter > 0 && currentVerse > 0 && verseText.trim()) {
		verses.push({
			text: verseText.trim(),
			reference: `${book} ${currentChapter}:${currentVerse}`,
			translation
		});
	}

	// If no verses found using the formatted approach, try parsing raw USFM
	if (verses.length === 0 && usfmText.includes('\\c ') && usfmText.includes('\\v ')) {
		return parseRawUSFMIntoVerses(usfmText, book, translation);
	}

	return verses;
}

/**
 * Parse raw USFM format into individual verses
 */
function parseRawUSFMIntoVerses(
	usfmText: string,
	book: string,
	translation: string
): Array<{ text: string; reference: string; translation: string }> {
	const verses: Array<{ text: string; reference: string; translation: string }> = [];
	const lines = usfmText.split('\n');
	let currentChapter = 0;
	let currentVerse = 0;
	let verseText = '';

	for (const line of lines) {
		// Chapter marker: \c 3
		const chapterMatch = line.match(/\\c\s+(\d+)/);
		if (chapterMatch) {
			// Save previous verse
			if (currentVerse > 0 && verseText.trim()) {
				verses.push({
					text: verseText.trim(),
					reference: `${book} ${currentChapter}:${currentVerse}`,
					translation
				});
				verseText = '';
			}
			currentChapter = parseInt(chapterMatch[1], 10);
			currentVerse = 0;
			continue;
		}

		// Verse marker: \v 16
		const verseMatch = line.match(/\\v\s+(\d+)\s*(.*)/);
		if (verseMatch) {
			// Save previous verse
			if (currentVerse > 0 && verseText.trim()) {
				verses.push({
					text: verseText.trim(),
					reference: `${book} ${currentChapter}:${currentVerse}`,
					translation
				});
			}
			currentVerse = parseInt(verseMatch[1], 10);
			// Clean USFM markers from verse text
			verseText = verseMatch[2]
				.replace(/\\w\s+[^|]+\|[^\\]+\\w\*/g, '') // Word markers
				.replace(/\\zaln-[se]\|[^\\]+\\*/g, '') // Alignment markers
				.replace(/\\[a-z]+\d*\s*/g, '') // Other markers
				.replace(/\s+/g, ' ')
				.trim();
			continue;
		}

		// Continue verse text (non-marker lines)
		if (currentChapter > 0 && currentVerse > 0 && line.trim() && !line.match(/^\\[a-z]/)) {
			const cleaned = line
				.replace(/\\w\s+[^|]+\|[^\\]+\\w\*/g, '')
				.replace(/\\zaln-[se]\|[^\\]+\\*/g, '')
				.replace(/\\[a-z]+\d*\s*/g, '')
				.trim();
			if (cleaned) {
				verseText += (verseText ? ' ' : '') + cleaned;
			}
		}
	}

	// Save last verse
	if (currentChapter > 0 && currentVerse > 0 && verseText.trim()) {
		verses.push({
			text: verseText.trim(),
			reference: `${book} ${currentChapter}:${currentVerse}`,
			translation
		});
	}

	return verses;
}

/**
 * Fetch scripture for a reference
 */
async function fetchScripture(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, resource: resourceParam, search } = params;

	// Create tracer and fetcher FIRST - needed by all code paths
	const tracer = new EdgeXRayTracer(`scripture-${Date.now()}`, 'fetch-scripture');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Get requested resources
	const requestedResources = parseResources(resourceParam);

	// If no reference but has search, delegate to /api/search (DRY - uses cached indexes)
	if (!reference && search) {
		console.log(
			'[fetch-scripture-v2] No reference provided, delegating to /api/search for:',
			search
		);

		const startTime = Date.now();

		// Build the search URL - use internal fetch to the search endpoint
		const searchUrl = new URL('/api/search', request.url);
		searchUrl.searchParams.set('query', search);
		searchUrl.searchParams.set('language', language || 'en');
		searchUrl.searchParams.set('organization', organization || 'unfoldingWord');
		// Request scripture specifically - triggers expanded result fetching in search endpoint
		searchUrl.searchParams.set('resource', 'scripture');
		// Also set includeHelps=false as backup filter
		searchUrl.searchParams.set('includeHelps', 'false');
		// Request more results since we're filtering client-side too
		searchUrl.searchParams.set('limit', '50');

		try {
			// Call the search endpoint internally (shares cached indexes!)
			const searchResponse = await fetch(searchUrl.toString(), {
				headers: request.headers
			});

			if (!searchResponse.ok) {
				throw new Error(`Search endpoint returned ${searchResponse.status}`);
			}

			const searchData = await searchResponse.json();
			const totalTime = Date.now() - startTime;

			console.log(
				`[fetch-scripture-v2] Search via /api/search complete in ${totalTime}ms: ${searchData.hits?.length || 0} hits`
			);

		// Transform search results to scripture format
		// Filter to scripture resources (ult, ust, ueb, t4t, or 'scripture' type)
		const SCRIPTURE_RESOURCES = ['ult', 'ust', 'ueb', 't4t', 'scripture', 'glt', 'gst'];
		const scriptureResults = (searchData.hits || [])
			.filter((hit: any) => {
				const resource = (hit.resource || '').toLowerCase();
				return SCRIPTURE_RESOURCES.includes(resource);
			})
			.map((hit: any) => ({
				text: hit.preview?.replace(/\*\*/g, '') || hit.content || '',
				reference: hit.reference || hit.path || '',
				translation: hit.resource || '',
				searchScore: hit.score,
				matchedTerms: hit.match?.terms
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
					delegatedTo: '/api/search',
					resourcesSearched: searchData.resourceCount || 0
				}
			};
		} catch (error) {
			console.error('[fetch-scripture-v2] Failed to delegate to /api/search:', error);
			throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// Require reference if not searching
	if (!reference && !search) {
		throw new Error('Reference is required when not searching');
	}

	// Parse reference to check if it's book-only or chapter-only
	const parsedRef = parseReference(reference);
	const isBookOnly = parsedRef && !parsedRef.chapter;
	const isChapterOnly = parsedRef && parsedRef.chapter && !parsedRef.verse;

	// Fetch using unified fetcher
	let results = await fetcher.fetchScripture(reference, language, organization, requestedResources);

	if (!results || results.length === 0) {
		throw new Error(`Scripture not found for reference: ${reference}`);
	}

	// Apply search if query provided (ephemeral, in-memory only)
	if (search && search.trim().length > 0) {
		const totalBeforeSearch = results.length;

		// If book-only or chapter-only reference, parse into individual verses first
		if ((isBookOnly || isChapterOnly) && parsedRef) {
			const parsedVerses: Array<{ text: string; reference: string; translation: string }> = [];

			// Parse each translation's text into individual verses
			for (const result of results) {
				// For chapter-only references, the text is already pre-formatted
				// but we still need to parse it into individual verses
				if (isChapterOnly) {
					// Parse the chapter text into verses
					const lines = result.text.split(/\n+/);
					let currentVerse = 0;
					let verseText = '';

					for (const line of lines) {
						// Check for verse number at start of line (format: "16 text...")
						const verseMatch = line.match(/^(\d+)\s+(.+)/);
						if (verseMatch) {
							// Save previous verse if exists
							if (currentVerse > 0 && verseText.trim()) {
								// Clean up trailing backslashes and whitespace
								const cleanText = verseText.replace(/\\+\s*$/, '').trim();
								if (cleanText) {
									parsedVerses.push({
										text: cleanText,
										reference: `${parsedRef.book} ${parsedRef.chapter}:${currentVerse}`,
										translation: result.translation
									});
								}
							}
							currentVerse = parseInt(verseMatch[1], 10);
							verseText = verseMatch[2];
						} else if (currentVerse > 0 && line.trim()) {
							// Continue current verse text
							verseText += ' ' + line.trim();
						}
					}

					// Don't forget the last verse
					if (currentVerse > 0 && verseText.trim()) {
						// Clean up trailing backslashes and whitespace
						const cleanText = verseText.replace(/\\+\s*$/, '').trim();
						if (cleanText) {
							parsedVerses.push({
								text: cleanText,
								reference: `${parsedRef.book} ${parsedRef.chapter}:${currentVerse}`,
								translation: result.translation
							});
						}
					}
				} else {
					// Book-only reference - use existing parser
					const verses = parseUSFMIntoVerses(result.text, parsedRef.book, result.translation);
					parsedVerses.push(...verses);
				}
			}

			if (parsedVerses.length === 0) {
				console.error(`[fetch-scripture-v2] No verses parsed from content!`, {
					reference,
					resultsCount: results.length
				});
				// Return empty results if no verses parsed
				results = [];
			} else {
				// Now search the individual verses
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
		} else {
			// Normal search for specific verse references (e.g., John 3:16)
			results = await applySearch(
				results,
				search,
				'scripture',
				(item: any, index: number): SearchDocument => ({
					id: `${item.translation}-${item.reference || reference}-${index}`,
					content: item.text,
					path: item.reference || reference,
					resource: item.translation,
					type: 'bible'
				})
			);
		}

		console.log(
			`[fetch-scripture-v2] Search "${search}" filtered ${totalBeforeSearch} results to ${results.length}`
		);
	} else {
		// Log for debugging - verify all versions are being returned
		console.log(
			`[fetch-scripture-v2] Fetched ${results.length} scripture versions:`,
			results.map((s: any) => s.translation || 'Unknown')
		);
	}

	// Deduplicate results by translation + reference combination
	const uniqueResults = results.reduce((acc: any[], curr: any) => {
		const key = `${curr.translation}-${curr.reference || reference}`;
		if (!acc.some((r) => `${r.translation}-${r.reference || reference}` === key)) {
			acc.push(curr);
		}
		return acc;
	}, []);

	// Return in standard format with trace data
	const baseResponse = createScriptureResponse(uniqueResults, {
		reference,
		requestedResources,
		foundResources: [
			...new Set(uniqueResults.map((s: any) => s.translation?.split(' ')[0]?.toLowerCase()))
		]
	});

	// Add search metadata if search was applied
	const response = {
		...baseResponse,
		metadata: search
			? addSearchMetadata(baseResponse.metadata, search, results.length)
			: baseResponse.metadata,
		_trace: fetcher.getTrace()
	};

	// Log the response structure to verify all scriptures are included
	console.log(
		`[fetch-scripture-v2] Response contains ${response.scripture?.length || 0} scriptures in response.scripture array`
	);

	return response;
}

// Create the endpoint with format support
export const GET = createSimpleEndpoint({
	name: 'fetch-scripture-v2',

	params: [
		{
			name: 'reference',
			required: false, // Optional when search is provided
			validate: isValidReference
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'resource',
			default: 'all',
			validate: (value) => {
				if (!value) return true;
				if (value === 'all') return true;
				const resources = value.split(',').map((r) => r.trim());
				// Include gateway equivalents: glt (equivalent to ult), gst (equivalent to ust)
				return resources.every((r) => ['ult', 'ust', 't4t', 'ueb', 'glt', 'gst'].includes(r));
			}
		},
		COMMON_PARAMS.search // Add optional search parameter
	],

	// Enable format support - format parameter will be added automatically
	supportsFormats: true,

	fetch: fetchScripture,

	onError: createStandardErrorHandler({
		'Scripture not found for reference': {
			status: 404,
			message: 'No scripture available for the specified reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
