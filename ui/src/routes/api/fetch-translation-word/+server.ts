/**
 * Get Translation Word Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Retrieves detailed information about a specific translation word/term.
 * Supports RC links from TWL, direct terms, and paths.
 * Provides Table of Contents when no specific term is requested.
 * Optional search parameter for filtering content relevance.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher, type TWArticleResult } from '$lib/unifiedResourceFetcher.js';
import { parseRCLink, extractTerm, isRCLink } from '$lib/rcLinkParser.js';
import { createSearchService } from '$lib/../../../src/services/SearchServiceFactory.js';

/**
 * Generate Table of Contents when no specific term is requested
 */
function generateTableOfContents(language: string, organization: string) {
	return {
		type: 'table-of-contents',
		title: 'Translation Words',
		description: 'Biblical terms and concepts with detailed explanations',
		categories: [
			{
				id: 'kt',
				name: 'Key Terms',
				description: 'Central theological concepts (God, salvation, covenant, righteousness)',
				exampleTerms: ['love', 'grace', 'faith', 'covenant', 'salvation'],
				exampleRCLink: `rc://${language}/tw/dict/bible/kt/love`
			},
			{
				id: 'names',
				name: 'Names',
				description: 'People, places, and proper nouns (Abraham, Jerusalem, Pharaoh)',
				exampleTerms: ['abraham', 'david', 'jerusalem', 'egypt', 'israel'],
				exampleRCLink: `rc://${language}/tw/dict/bible/names/abraham`
			},
			{
				id: 'other',
				name: 'Other Terms',
				description: 'Cultural, historical, and general concepts (Sabbath, temple, sacrifice)',
				exampleTerms: ['sabbath', 'temple', 'sacrifice', 'priest', 'altar'],
				exampleRCLink: `rc://${language}/tw/dict/bible/other/sabbath`
			}
		],
		usage: {
			byRCLink: `?rcLink=rc://${language}/tw/dict/bible/kt/love`,
			byTerm: '?term=love',
			byPath: '?path=bible/kt/love.md'
		},
		language,
		organization
	};
}

async function getTranslationWord(params: Record<string, any>, request: Request): Promise<any> {
	const { term, path, rcLink, language = 'en', organization = 'unfoldingWord', search } = params;

	// Create tracer for this request (moved up for debug use)
	const tracer = new EdgeXRayTracer(`tw-${Date.now()}`, 'fetch-translation-word');

	// TEMPORARY DEBUG - show what's happening
	if (term === 'debug-info') {
		return {
			debug: true,
			message: 'Debug mode active - returning diagnostic info',
			params: { term, path, rcLink, language, organization },
			timestamp: new Date().toISOString()
		};
	}

	// SUPER DEBUG MODE - trace the entire flow
	if (term === 'love-debug') {
		const debugTrace: any[] = [];
		debugTrace.push({ step: 1, message: 'Starting debug trace for love term' });

		try {
			debugTrace.push({ step: 2, message: 'Creating fetcher' });
			const fetcher = new UnifiedResourceFetcher(tracer);

			debugTrace.push({
				step: 3,
				message: 'Calling fetchTranslationWord',
				params: { term: 'love', language, organization }
			});
			const result = await fetcher.fetchTranslationWord('love', language, organization);

			debugTrace.push({ step: 4, message: 'Success!', result });
			return {
				debug: true,
				success: true,
				trace: debugTrace,
				result
			};
		} catch (error: any) {
			debugTrace.push({ step: 'error', message: error.message, debug: error.debug });
			return {
				debug: true,
				success: false,
				trace: debugTrace,
				error: error.message,
				errorDebug: error.debug
			};
		}
	}

	// If no parameters provided, return Table of Contents
	if (!term && !path && !rcLink) {
		const toc = generateTableOfContents(language, organization);
		return createTranslationHelpsResponse([toc], 'Table of Contents', language, organization, 'tw');
	}

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Determine what we're looking for using our parser
	let wordKey: string;
	let targetPath: string | undefined;
	let searchCategory: string | undefined;

	// Priority: rcLink > path > term (if it's an RC link) > term
	if (rcLink || isRCLink(term)) {
		const linkToParse = rcLink || term;

		// Parse to get term and category
		const parsed = parseRCLink(linkToParse, language);
		if (!parsed.isValid) {
			throw new Error(
				`Invalid RC link format: ${linkToParse}. Expected format: rc://en/tw/dict/bible/kt/love`
			);
		}

		wordKey = parsed.term;
		searchCategory = parsed.category;
		// DON'T set targetPath - let smart search find the file
		// The smart search is more reliable than exact path matching
	} else if (path) {
		const extracted = extractTerm(path, language);
		wordKey = extracted.term;
		targetPath = extracted.path;
		searchCategory = extracted.category;
	} else if (term) {
		const extracted = extractTerm(term, language);
		wordKey = extracted.term;
		searchCategory = extracted.category;
	} else {
		throw new Error('Either term, path, or rcLink parameter is required');
	}

	if (!wordKey) {
		throw new Error('Could not determine term to look up');
	}

	try {
		// Use the existing fetchTranslationWord method from UnifiedResourceFetcher
		let result: TWArticleResult;

		try {
			result = await fetcher.fetchTranslationWord(wordKey, language, organization, targetPath);
		} catch (error) {
			// TEMPORARY DEBUG - capture error details
			const errorWithDebug = error as any;
			if (errorWithDebug.debug) {
				console.log('[DEBUG] Error has debug info:', errorWithDebug.debug);
			}

			// If we have a specific path and it failed, try without the path (search by term)
			if (targetPath) {
				try {
					result = await fetcher.fetchTranslationWord(wordKey, language, organization);
				} catch (fallbackError) {
					// Also check fallback error for debug info
					const fallbackWithDebug = fallbackError as any;
					if (fallbackWithDebug.debug) {
						console.log('[DEBUG] Fallback error has debug info:', fallbackWithDebug.debug);
					}
					throw fallbackError;
				}
			} else {
				throw error;
			}
		}

		if (!result || !result.content) {
			throw new Error(`Translation word not found: ${wordKey}`);
		}

		// Parse markdown content for better structure
		const mdContent = result.content;
		const titleMatch = mdContent.match(/^#\s+(.+)$/m);
		const termTitle = titleMatch ? titleMatch[1].trim() : wordKey;

		// Extract definition from markdown - look for Definition section or first paragraph
		let definition = '';
		const defMatch = mdContent.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
		if (defMatch) {
			definition = defMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
		} else {
			// Fallback: extract first paragraph after title
			const lines = mdContent.split('\n');
			let foundTitle = false;
			for (const line of lines) {
				if (line.startsWith('#') && !foundTitle) {
					foundTitle = true;
					continue;
				}
				if (foundTitle && line.trim() && !line.startsWith('#')) {
					definition = line.trim();
					break;
				}
			}
		}

		// Extract category from path or use search category
		const categoryMatch = result.path?.match(/bible\/(kt|names|other)\//);
		const categoryKey = categoryMatch ? categoryMatch[1] : searchCategory || 'other';
		const categoryNames: Record<string, string> = {
			kt: 'Key Terms',
			names: 'Names',
			other: 'Other'
		};

		// Return single article directly (not wrapped in items array)
		// This makes it consistent with translation-academy endpoint
		const article = {
			term: wordKey,
			title: termTitle,
			category: categoryKey,
			categoryName: categoryNames[categoryKey] || 'Other',
			definition,
			content: mdContent,
			path: result.path,
			rcLink: `rc://${language}/tw/dict/bible/${categoryKey}/${wordKey}`,
			reference: params.reference || null, // Include if provided
			language,
			organization,
			metadata: {
				source: 'TW',
				resourceType: 'tw',
				license: 'CC BY-SA 4.0',
				...(search && { searchQuery: search, searchApplied: true })
			}
		};

		// Apply search relevance check if search parameter provided
		if (search && search.trim().length > 0) {
			// Create ephemeral search service to check relevance
			const searchService = createSearchService('words');
			await searchService.indexDocuments([
				{
					id: wordKey,
					content: `${termTitle} ${definition} ${mdContent}`,
					path: result.path || '',
					resource: 'translation-words',
					type: 'words'
				}
			]);

			const results = await searchService.search(search, { maxResults: 1 });

			if (results.length === 0) {
				// Search term not found in this article
				throw new Error(`Translation word "${wordKey}" does not match search query "${search}"`);
			}

			// Add search score to metadata
			article.metadata.searchScore = results[0].score;
			article.metadata.matchedTerms = results[0].match.terms;

			console.log(
				`[fetch-translation-word-v2] Search "${search}" matched "${wordKey}" with score ${results[0].score}`
			);
		}

		return article;
	} catch (error) {
		// Add trace information to error context
		const trace = fetcher.getTrace();
		const errorMessage = error instanceof Error ? error.message : String(error);
		const debugInfo = (error as any)?.debug;
		const enhancedError = new Error(`${errorMessage} (Trace: ${JSON.stringify(trace)})`);
		if (debugInfo) {
			(enhancedError as any).debug = debugInfo;
		}
		throw enhancedError;
	}
}

export const GET = createSimpleEndpoint({
	name: 'fetch-translation-word-v2',

	params: [
		{
			name: 'term',
			validate: (value) => {
				if (!value) return true;
				return value.length > 0;
			}
		},
		{
			name: 'path',
			validate: (value) => {
				if (!value) return true;
				return value.endsWith('.md');
			}
		},
		{
			name: 'rcLink',
			validate: (value) => {
				if (!value) return true;
				return isRCLink(value);
			}
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search
	],

	fetch: getTranslationWord,

	onError: createStandardErrorHandler({
		'Either term, path, or rcLink parameter is required': {
			status: 400,
			message:
				'Please provide either a term (e.g., "faith"), path (e.g., "bible/kt/faith.md"), or RC link (e.g., "rc://en/tw/dict/bible/kt/faith")'
		},
		'Translation word not found': {
			status: 404,
			message: 'The requested translation word was not found in the source repository.'
		},
		'does not match search query': {
			status: 404,
			message: 'The requested translation word does not contain the search query.'
		},
		'Invalid RC link format': {
			status: 400,
			message: 'Invalid RC link format. Expected: rc://[language]/tw/dict/bible/[category]/[term]'
		},
		'No translation words catalog found': {
			status: 404,
			message: 'No Translation Words catalog available for the requested language/organization.'
		}
	}),

	supportsFormats: true
});

// CORS handler
export const OPTIONS = createCORSHandler();
