/**
 * Edge-Compatible Translation Words Fetcher
 *
 * Fetches translation words (dictionary entries) from DCS API in edge runtime.
 * Parses markdown format and returns structured data.
 */

import { getKVCache } from '$lib/../../../src/functions/kv-cache.js';
import type { EdgeXRayTrace } from '../../../src/functions/edge-xray.js';
import { EdgeXRayTracer, trackedFetch } from '../../../src/functions/edge-xray.js';
import { fetchFromDCS } from './dataFetchers.js';
import { edgeLogger as logger } from './edgeLogger.js';

interface TranslationWord {
	id: string;
	term: string;
	definition: string;
	related?: string[];
	references?: string[];
}

/**
 * Decode base64 string with proper Unicode support
 */
function decodeBase64Unicode(base64: string): string {
	try {
		// Decode base64 to binary string
		const binaryString = atob(base64);
		// Convert binary string to Uint8Array
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		// Decode UTF-8 bytes to string
		return new TextDecoder('utf-8').decode(bytes);
	} catch (error) {
		logger.error('Failed to decode base64', { error });
		// Fallback to simple atob
		return atob(base64);
	}
}

/**
 * Parse Bible reference to get book, chapter, verse
 */
function parseReference(reference: string): {
	book: string;
	chapter: number;
	verse?: number;
} | null {
	const match = reference.match(/^(\d?\s*)?([A-Za-z]+)\s+(\d+)(?::(\d+))?$/);

	if (!match) {
		return null;
	}

	const [, , bookName, chapter, verse] = match;

	return {
		book: bookName.toLowerCase(),
		chapter: parseInt(chapter, 10),
		verse: verse ? parseInt(verse, 10) : undefined
	};
}

/**
 * Map book names to standard codes
 */
function getBookCode(bookName: string): string {
	const bookMap: Record<string, string> = {
		genesis: 'gen',
		gen: 'gen',
		exodus: 'exo',
		exo: 'exo',
		matthew: 'mat',
		mat: 'mat',
		mark: 'mrk',
		mrk: 'mrk',
		luke: 'luk',
		luk: 'luk',
		john: 'jhn',
		jhn: 'jhn',
		romans: 'rom',
		rom: 'rom',
		titus: 'tit',
		tit: 'tit'
		// Add more as needed
	};

	return bookMap[bookName.toLowerCase()] || bookName.toLowerCase();
}

/**
 * Parse markdown content into structured word definition
 */
export function parseWordMarkdown(content: string, term: string): TranslationWord | null {
	// Extract the main term from the first heading
	const termMatch = content.match(/^#\s+(.+)$/m);
	const extractedTerm = termMatch ? termMatch[1].trim() : term;

	// Extract definition - look for content after "## Definition:" or similar
	const definitionMatch = content.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	let definition = '';

	if (definitionMatch) {
		// Clean up the definition text
		definition = definitionMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
	} else {
		// Fallback: get first paragraph after the title
		const paragraphMatch = content.match(/^#\s+.+\n\n([\s\S]+?)(?=\n##|\n\n##|$)/m);
		if (paragraphMatch) {
			definition = paragraphMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
		}
	}

	if (!definition) {
		return null;
	}

	// Extract related words from "See Also" section
	const related: string[] = [];
	const seeAlsoMatch = content.match(/##\s*(?:See Also|Word Links):?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	if (seeAlsoMatch) {
		const links = seeAlsoMatch[1].matchAll(/\[([^\]]+)\]/g);
		for (const link of links) {
			related.push(link[1]);
		}
	}

	// Extract Bible references
	const references: string[] = [];
	const refMatch = content.match(
		/##\s*(?:Bible References|References):?\s*\n\n([\s\S]+?)(?=\n##|$)/i
	);
	if (refMatch) {
		const refs = refMatch[1].matchAll(/\*\s*([^*\n]+)/g);
		for (const ref of refs) {
			references.push(ref[1].trim());
		}
	}

	return {
		id: term,
		term: extractedTerm,
		definition,
		...(related.length > 0 && { related }),
		...(references.length > 0 && { references })
	};
}

/**
 * Get words for a specific reference from the index
 */
function _getWordsForReference(
	indexContent: string,
	book: string,
	chapter: number,
	verse?: number
): string[] {
	const words: Set<string> = new Set();
	const lines = indexContent.split('\n');

	for (const line of lines) {
		// Skip empty lines and headers
		if (!line.trim() || line.startsWith('#')) continue;

		// Parse index line format: term | references
		const parts = line.split('|');
		if (parts.length < 2) continue;

		const term = parts[0].trim();
		const refs = parts[1].trim();

		// Check if this word is used in our reference
		// References might be like "Gen 1:1; Gen 1:26; Exo 3:14"
		const refPattern = verse
			? new RegExp(`\\b${book}\\s+${chapter}:${verse}\\b`, 'i')
			: new RegExp(`\\b${book}\\s+${chapter}:\\d+\\b`, 'i');

		if (refPattern.test(refs)) {
			words.add(term);
		}
	}

	return Array.from(words);
}

/**
 * Fetch translation words from DCS
 */
export async function fetchTranslationWordsFromDCS(
	reference: string,
	language: string = 'en',
	organization: string = 'unfoldingword'
): Promise<TranslationWord[]> {
	logger.info('Fetching translation words from DCS', { reference, language, organization });

	// Parse reference
	const parsed = parseReference(reference);
	if (!parsed) {
		throw new Error(`Invalid reference format: ${reference}`);
	}

	const { book, chapter: _chapter, verse: _verse } = parsed;
	const _bookCode = getBookCode(book);

	try {
		// Search for translation words resource
		const searchUrl = `/api/v1/catalog/search?lang=${language}&subject=Translation%20Words&limit=10`;
		logger.debug('Searching for translation words', { url: searchUrl });

		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn(`No translation words found for language ${language}`);
			return [];
		}

		// Find the translation words resource
		const catalog = searchData.data.find(
			(item: any) =>
				item.subject === 'Translation Words' &&
				item.owner?.toLowerCase() === organization.toLowerCase()
		);

		if (!catalog) {
			logger.warn(`No translation words catalog found for ${organization}`);
			return [];
		}

		const repoName = catalog.name;
		const owner = catalog.owner;

		// First, try to get an index file to find which words are used in this reference
		// This is a simplified approach - real implementation might need more sophisticated indexing
		const words: TranslationWord[] = [];

		// For now, let's try to fetch some common words that might be in the verse
		// In a real implementation, we'd have a proper index or search capability
		const commonWords = ['god', 'love', 'faith', 'sin', 'grace', 'holy', 'spirit', 'eternal'];

		for (const term of commonWords) {
			try {
				// Try to fetch the word file
				const wordPath = `bible/kt/${term}.md`; // Key terms are usually in kt folder
				const endpoint = `/api/v1/repos/${owner}/${repoName}/contents/${wordPath}`;

				logger.debug(`Trying to fetch word: ${term}`);

				const fileData = await fetchFromDCS(endpoint);

				if (fileData.content) {
					// Decode base64 content with proper Unicode support
					const mdContent = decodeBase64Unicode(fileData.content);

					// Parse the markdown
					const word = parseWordMarkdown(mdContent, term);
					if (word) {
						words.push(word);
					}
				}
			} catch (_error) {
				// Word not found, continue with others
				logger.debug(`Word ${term} not found`);
			}
		}

		logger.info(`Found ${words.length} translation words for ${reference}`);
		return words.slice(0, 5); // Limit to 5 words for now
	} catch (error) {
		logger.error('Failed to fetch translation words', { error });
		throw error;
	}
}

/**
 * Fetch a single Translation Word article by term (DRY helper for endpoints)
 */
export async function fetchSingleTranslationWord(
	term: string,
	language: string = 'en',
	organization: string = 'unfoldingWord',
	tracer?: EdgeXRayTracer
): Promise<{ item: any; _trace?: EdgeXRayTrace } | null> {
	const wordKey = term.toLowerCase().replace(/\s+/g, '');
	const base = 'https://git.door43.org';
	const kv = getKVCache();

	try {
		// Search for TW catalog
		const searchUrl = `${base}/api/v1/catalog/search?lang=${language}&subject=Translation%20Words&limit=25`;
		const catalogKey = `catalog:tw:${language}:${organization}`;
		let searchRes: any | null = null;
		const cachedCatalog = await kv.get(catalogKey);
		if (cachedCatalog) {
			try {
				const decoded =
					cachedCatalog instanceof ArrayBuffer
						? new TextDecoder().decode(new Uint8Array(cachedCatalog))
						: (cachedCatalog as any);
				searchRes = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
				if (tracer) {
					tracer.addApiCall({
						url: `${searchUrl}#kv`,
						duration: 1,
						status: 200,
						size: 0,
						cached: true
					});
				}
			} catch {
				searchRes = null;
			}
		}
		if (!searchRes) {
			searchRes = tracer
				? await (await trackedFetch(tracer, searchUrl)).json()
				: await fetchFromDCS(`/api/v1/catalog/search`, {
						lang: language,
						subject: 'Translation Words',
						limit: '25'
					});
			// Cache catalog result (1h)
			await kv.set(catalogKey, searchRes, 3600);
		}

		const catalog = (searchRes?.data || []).find(
			(item: any) =>
				item.subject === 'Translation Words' &&
				item.owner?.toLowerCase() === organization.toLowerCase()
		);
		if (!catalog) return null;

		const repoName = catalog.name;
		const owner = catalog.owner;
		const categories = [
			{ key: 'kt', name: 'Key Terms' },
			{ key: 'names', name: 'Names' },
			{ key: 'other', name: 'Other' }
		];

		for (const cat of categories) {
			const endpoint = `${base}/api/v1/repos/${owner}/${repoName}/contents/bible/${cat.key}/${wordKey}.md`;
			try {
				const fileKey = `tw:file:${owner}:${repoName}:${cat.key}:${wordKey}`;
				let fileData: any | null = null;
				const cachedFile = await kv.get(fileKey);
				if (cachedFile) {
					try {
						const decoded =
							cachedFile instanceof ArrayBuffer
								? new TextDecoder().decode(new Uint8Array(cachedFile))
								: (cachedFile as any);
						fileData = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
						if (tracer) {
							tracer.addApiCall({
								url: `${endpoint}#kv`,
								duration: 1,
								status: 200,
								size: 0,
								cached: true
							});
						}
					} catch {
						fileData = null;
					}
				}

				if (!fileData) {
					fileData = tracer
						? await (await trackedFetch(tracer, endpoint)).json()
						: await fetchFromDCS(
								`/api/v1/repos/${owner}/${repoName}/contents/bible/${cat.key}/${wordKey}.md`
							);
					// Cache minimal payload (content only) for 4h
					if (fileData?.content) {
						await kv.set(fileKey, JSON.stringify({ content: fileData.content }), 14400);
					}
				}

				if (fileData?.content) {
					const mdContent = decodeBase64Unicode(fileData.content);
					const parsed = parseWordMarkdown(mdContent, wordKey);
					if (!parsed) continue;

					const item = {
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
						content: mdContent
					};

					return { item, ...(tracer && { _trace: tracer.getTrace() }) };
				}
			} catch {
				// try next category
			}
		}

		return tracer ? { item: null, _trace: tracer.getTrace() } : null;
	} catch (error) {
		logger.error('Failed to fetch single translation word', { error });
		return tracer ? { item: null, _trace: tracer.getTrace() } : null;
	}
}
