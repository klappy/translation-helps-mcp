/**
 * Get Translation Word Endpoint v2
 *
 * Retrieves detailed information about a specific translation word/term.
 * Can look up by term name or direct path.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { ZipResourceFetcher2 } from '$lib/../../../src/services/ZipResourceFetcher2.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

async function getTranslationWord(params: Record<string, any>, _request: Request): Promise<any> {
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

	// Use ZipResourceFetcher2 with X-Ray tracer
	const tracer = new EdgeXRayTracer(
		`tw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		'get-translation-word-v2'
	);
	const fetcher = new ZipResourceFetcher2(tracer);
	const lang = language || 'en';
	const org = organization || 'unfoldingWord';
	const categories = [
		{ key: 'kt', name: 'Key Terms' },
		{ key: 'names', name: 'Names' },
		{ key: 'other', name: 'Other' }
	];

	let mdContent: string | null = null;
	let foundCat: { key: string; name: string } | null = null;
	for (const cat of categories) {
		try {
			const res = await fetcher.getMarkdownContent(
				lang,
				org,
				'tw',
				`bible/${cat.key}/${wordKey}.md`
			);
			if (res?.content) {
				mdContent = new TextDecoder('utf-8').decode(res.content);
				foundCat = cat;
				break;
			}
		} catch {
			// try next category
		}
	}

	if (!mdContent || !foundCat) {
		throw new Error(`Translation word not found: ${wordKey}`);
	}

	// Parse minimal fields from markdown
	const titleMatch = mdContent.match(/^#\s+(.+)$/m);
	const termTitle = titleMatch ? titleMatch[1].trim() : wordKey;
	const defMatch = mdContent.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	const definition = defMatch ? defMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ') : '';

	const item = {
		id: `${foundCat.key}:${wordKey}`,
		word: termTitle,
		category: foundCat.key,
		categoryName: foundCat.name,
		definition,
		language: lang,
		organization: org,
		source: 'TW',
		content: mdContent
	};

	const wrapped = createTranslationHelpsResponse([item], termTitle, lang, org, 'tw', {
		source: 'TW'
	});
	(wrapped as any)._trace = fetcher.getTrace();
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
