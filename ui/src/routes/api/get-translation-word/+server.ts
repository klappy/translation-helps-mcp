/**
 * Get Translation Word Endpoint v2
 *
 * Retrieves detailed information about a specific translation word/term.
 * Can look up by term name or direct path.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { fetchFromDCS } from '$lib/dataFetchers.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';

function decodeBase64Unicode(base64: string): string {
	try {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
		return new TextDecoder('utf-8').decode(bytes);
	} catch {
		return atob(base64);
	}
}

function parseWordMarkdown(content: string, wordId: string) {
	const termMatch = content.match(/^#\s+(.+)$/m);
	const term = termMatch ? termMatch[1].trim() : wordId;

	const definitionMatch = content.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	let definition = '';
	if (definitionMatch) {
		definition = definitionMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
	} else {
		const paragraphMatch = content.match(/^#\s+.+\n\n([\s\S]+?)(?=\n##|\n\n##|$)/m);
		if (paragraphMatch) {
			definition = paragraphMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
		}
	}
	if (!definition) return null;

	const related: string[] = [];
	const seeAlsoMatch = content.match(/##\s*(?:See Also|Word Links):?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	if (seeAlsoMatch) {
		const links = seeAlsoMatch[1].matchAll(/\[([^\]]+)\]/g);
		for (const link of links) related.push(link[1]);
	}

	const references: string[] = [];
	const refMatch = content.match(
		/##\s*(?:Bible References|References):?\s*\n\n([\s\S]+?)(?=\n##|$)/i
	);
	if (refMatch) {
		const refs = refMatch[1].matchAll(/\*\s*([^*\n]+)/g);
		for (const r of refs) references.push(r[1].trim());
	}

	return {
		term,
		definition,
		...(related.length && { related }),
		...(references.length && { references })
	};
}

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

	const searchUrl = `/api/v1/catalog/search?lang=${language || 'en'}&subject=Translation%20Words&limit=25`;
	const searchData = await fetchFromDCS(searchUrl);
	if (!searchData?.data?.length) {
		throw new Error(`No translation words catalog found for language ${language || 'en'}`);
	}

	const catalog = searchData.data.find(
		(item: any) =>
			item.subject === 'Translation Words' &&
			item.owner?.toLowerCase() === String(organization || 'unfoldingWord').toLowerCase()
	);
	if (!catalog) {
		throw new Error(`No translation words catalog found for ${organization || 'unfoldingWord'}`);
	}

	const repoName = catalog.name;
	const owner = catalog.owner;
	const categories = [
		{ key: 'kt', name: 'Key Terms' },
		{ key: 'names', name: 'Names' },
		{ key: 'other', name: 'Other' }
	];

	for (const cat of categories) {
		const wordPath = `bible/${cat.key}/${wordKey}.md`;
		const endpoint = `/api/v1/repos/${owner}/${repoName}/contents/${wordPath}`;
		try {
			const fileData = await fetchFromDCS(endpoint);
			if (fileData?.content) {
				const md = decodeBase64Unicode(fileData.content);
				const parsed = parseWordMarkdown(md, wordKey);
				if (!parsed) continue;
				return {
					id: `${cat.key}:${wordKey}`,
					word: parsed.term,
					category: cat.key,
					categoryName: cat.name,
					definition: parsed.definition,
					...(parsed.related && { relatedWords: parsed.related }),
					...(parsed.references && { references: parsed.references }),
					language,
					organization,
					source: 'TW',
					content: md
				};
			}
		} catch {
			// try next category
		}
	}

	throw new Error(`Translation word not found: ${wordKey}`);
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
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
