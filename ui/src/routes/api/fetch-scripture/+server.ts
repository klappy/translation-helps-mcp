/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 * 
 * Parameters:
 * - search: AutoRAG semantic search (conceptually about X)
 * - filter: Stemmed regex filter (contains word X) - requires reference
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
	translation: string
): Array<{ text: string; reference: string; chapter: number; verse: number; translation: string }> {
	const verses: Array<{ text: string; reference: string; chapter: number; verse: number; translation: string }> = [];
	const lines = text.split('\n');
	let currentChapter = 0;

	// Try to extract chapter from book reference (e.g., "1John 4" -> chapter 4)
	const bookChapterMatch = book.match(/(\d+)$/);
	if (bookChapterMatch) {
		currentChapter = parseInt(bookChapterMatch[1], 10);
	}

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
 */
async function handleFilterRequest(request: Request): Promise<Response | null> {
	const url = new URL(request.url);
	const filter = url.searchParams.get('filter');
	
	if (!filter) return null;
	
	const reference = url.searchParams.get('reference');
	if (!reference) {
		return json({
			error: 'Reference is required when using filter parameter',
			hint: 'Provide a book or chapter reference (e.g., reference=John or reference=Romans 8)'
		}, { status: 400 });
	}
	
	const language = url.searchParams.get('language') || 'en';
	const organization = url.searchParams.get('organization') || 'unfoldingWord';
	const resourceParam = url.searchParams.get('resource') || 'all';
	
	console.log(`[fetch-scripture] Filter: "${filter}" in ${reference}`);
	
	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-scripture] Pattern: ${pattern}`);
	
	const requestedResources = parseResources(resourceParam);
	const tracer = new EdgeXRayTracer(`scripture-filter-${Date.now()}`, 'fetch-scripture-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));
	
	// Fetch scripture for the reference
	const results = await fetcher.fetchScripture(reference, language, organization, requestedResources);
	
	if (!results || results.length === 0) {
		return json({
			error: `Scripture not found for reference: ${reference}`,
			filter,
			pattern: pattern.toString()
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
	
	const parsedRef = parseReference(reference);
	const book = parsedRef?.book || reference.split(' ')[0];
	
	for (const result of results) {
		const verses = parseIntoVerses(result.text, book, result.translation);
		
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
	
	return json({
		filter,
		pattern: pattern.toString(),
		reference,
		language,
		organization,
		totalMatches: matches.length,
		matches,
		_trace: tracer.getTrace()
	});
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
		const book = parsedRef?.book || reference;
		
		const parsedVerses: Array<{ text: string; reference: string; translation: string }> = [];
		for (const result of results) {
			const verses = parseIntoVerses(result.text, book, result.translation);
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
	// Check for filter param first
	const filterResponse = await handleFilterRequest(event.request);
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
