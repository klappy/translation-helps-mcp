/**
 * Get Translation Word Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Retrieves detailed information about a specific translation word/term.
 * Supports RC links from TWL, direct terms, and paths.
 * Provides Table of Contents when no specific term is requested.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher, type TWArticleResult } from '$lib/unifiedResourceFetcher.js';
import { parseRCLink, extractTerm, isRCLink } from '$lib/rcLinkParser.js';

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
	const { term, path, rcLink, language = 'en', organization = 'unfoldingWord' } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tw-${Date.now()}`, 'get-translation-word');

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

	// Priority: rcLink > term (if it's an RC link) > path > term
	if (rcLink || isRCLink(term)) {
		const linkToParse = rcLink || term;
		const parsed = parseRCLink(linkToParse, language);

		if (!parsed.isValid) {
			throw new Error(
				`Invalid RC link format: ${linkToParse}. Expected format: rc://en/tw/dict/bible/kt/love`
			);
		}

		wordKey = parsed.term;
		targetPath = parsed.path;
		searchCategory = parsed.category;
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
			// If we have a specific path and it failed, try without the path (search by term)
			if (targetPath) {
				result = await fetcher.fetchTranslationWord(wordKey, language, organization);
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

		const item = {
			id: `${categoryKey}:${wordKey}`,
			term: wordKey,
			title: termTitle,
			category: categoryKey,
			categoryName: categoryNames[categoryKey] || 'Other',
			definition,
			content: mdContent,
			path: result.path,
			language,
			organization,
			source: 'TW',
			rcLink: `rc://${language}/tw/dict/bible/${categoryKey}/${wordKey}`
		};

		const wrapped = createTranslationHelpsResponse(
			[item],
			termTitle,
			language,
			organization,
			'tw',
			{
				source: 'TW'
			}
		);

		// Add trace information for debugging
		(wrapped as any)._trace = fetcher.getTrace();

		return wrapped;
	} catch (error) {
		// Add trace information to error context
		const trace = fetcher.getTrace();
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`${errorMessage} (Trace: ${JSON.stringify(trace)})`);
	}
}

export const GET = createSimpleEndpoint({
	name: 'get-translation-word-v2',

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
		COMMON_PARAMS.organization
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
