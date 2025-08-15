/**
 * Get Translation Word Endpoint v2
 *
 * Retrieves detailed information about a specific translation word/term.
 * Can look up by term name or direct path.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

async function getTranslationWord(params: Record<string, any>, request: Request): Promise<any> {
	const { term, path, language, organization } = params;

	let wordKey = term?.toLowerCase()?.replace(/\s+/g, '');
	if (!wordKey && path) {
		const match = path.match(/\/([^/]+)\.md$/);
		if (match) {
			wordKey = match[1].toLowerCase();
		}
	}

	if (!wordKey) {
		throw new Error('Either term or path parameter is required');
	}

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`tw-${Date.now()}`, 'get-translation-word');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	const lang = language || 'en';
	const org = organization || 'unfoldingWord';

	// Fetch using unified fetcher
	const result = await fetcher.fetchTranslationWord(wordKey, lang, org, path);

	if (!result || !result.content) {
		throw new Error(`Translation word not found: ${wordKey}`);
	}

	// Parse minimal fields from markdown content
	const mdContent = result.content;
	const titleMatch = mdContent.match(/^#\s+(.+)$/m);
	const termTitle = titleMatch ? titleMatch[1].trim() : wordKey;
	const defMatch = mdContent.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	const definition = defMatch ? defMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ') : '';

	// Extract category from path
	const categoryMatch = result.path?.match(/bible\/(kt|names|other)\//);
	const categoryKey = categoryMatch ? categoryMatch[1] : 'other';
	const categoryNames = {
		kt: 'Key Terms',
		names: 'Names',
		other: 'Other'
	};

	const item = {
		id: `${categoryKey}:${wordKey}`,
		word: termTitle,
		category: categoryKey,
		categoryName: categoryNames[categoryKey] || 'Other',
		definition,
		language: lang,
		organization: org,
		source: 'TW',
		content: mdContent
	};

	const wrapped = createTranslationHelpsResponse([item], termTitle, lang, org, 'tw', {
		source: 'TW',
		_trace: fetcher.getTrace()
	});
	return wrapped;
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
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization
	],

	fetch: getTranslationWord,

	onError: createStandardErrorHandler({
		'Either term or path parameter is required': {
			status: 400,
			message: 'Please provide either a term (e.g., "faith") or path (e.g., "bible/kt/faith.md")'
		},
		'Translation word not found': {
			status: 404,
			message: 'The requested translation word was not found in the source repository.'
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
