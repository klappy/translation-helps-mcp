/**
 * Edge-Compatible Scripture Fetcher
 *
 * Simple, focused scripture fetching for edge runtime.
 * Uses DCS API directly for real data.
 */

import { fetchFromDCS } from './dataFetchers.js';
import { edgeLogger as logger } from './edgeLogger.js';

interface ScriptureData {
	reference: string;
	text: string;
	resource: string;
	language: string;
	organization: string;
	version: string;
	citation: string;
	copyright: string;
	direction: string;
	resourceInfo: {
		name: string;
		description: string;
		language: string;
		textDirection: string;
	};
	metadata?: {
		license: string;
		copyright?: string;
		contributors?: string[];
		publisher?: string;
		issued?: string;
		modified?: string;
		checkingLevel?: string;
	};
}

// Resource mapping for DCS
const RESOURCE_MAP: Record<string, { name: string; description: string; identifier: string }> = {
	ult: {
		name: 'unfoldingWord Literal Text',
		description: 'A form-centric translation that closely follows the Hebrew and Greek texts',
		identifier: 'ult'
	},
	ust: {
		name: 'unfoldingWord Simplified Text',
		description:
			'A meaning-centric translation that expresses the meanings of the Hebrew and Greek texts',
		identifier: 'ust'
	},
	udb: {
		name: 'Unlocked Dynamic Bible',
		description: 'A dynamic translation that expresses the meaning clearly',
		identifier: 'udb'
	}
	// We'll add more as we test
};

/**
 * Parse Bible reference into components
 */
function parseReference(reference: string): {
	book: string;
	chapter: number;
	verse?: number;
	verseEnd?: number;
} | null {
	// Simple reference parser
	const match = reference.match(/^(\d?\s*)?([A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);

	if (!match) {
		return null;
	}

	const [, , bookName, chapter, verse, verseEnd] = match;

	return {
		book: bookName.toLowerCase(),
		chapter: parseInt(chapter, 10),
		verse: verse ? parseInt(verse, 10) : undefined,
		verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined
	};
}

/**
 * Get book code from book name
 */
function getBookCode(bookName: string): string {
	// Common book name mappings
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
		psalms: 'psa',
		psalm: 'psa',
		psa: 'psa'
		// Add more as needed
	};

	return bookMap[bookName.toLowerCase()] || bookName.toLowerCase();
}

/**
 * Extract verse text from USFM content
 */
function extractVerseFromUSFM(
	usfm: string,
	chapter: number,
	verse?: number,
	verseEnd?: number
): string {
	// Simple USFM extraction
	const lines = usfm.split('\n');
	let currentChapter = 0;
	let currentVerse = 0;
	let inTargetChapter = false;
	let result = '';
	let collectingVerse = false;

	for (const line of lines) {
		// Chapter marker
		if (line.startsWith('\\c ')) {
			currentChapter = parseInt(line.substring(3).trim(), 10);
			inTargetChapter = currentChapter === chapter;
			currentVerse = 0;
			continue;
		}

		// Skip if not in target chapter
		if (!inTargetChapter) continue;

		// Verse marker
		if (line.startsWith('\\v ')) {
			const verseMatch = line.match(/\\v\s+(\d+)/);
			if (verseMatch) {
				currentVerse = parseInt(verseMatch[1], 10);

				// If no specific verse requested, get whole chapter
				if (!verse) {
					const verseText = line.substring(line.indexOf(' ', 3)).trim();
					result += `${currentVerse}. ${verseText} `;
				} else {
					// Check if this is our target verse
					if (currentVerse >= verse && (!verseEnd || currentVerse <= verseEnd)) {
						collectingVerse = true;
						const verseText = line.substring(line.indexOf(' ', 3)).trim();
						result += `${verseText} `;
					} else {
						collectingVerse = false;
					}
				}
			}
		} else if (collectingVerse || (!verse && inTargetChapter)) {
			// Continue collecting verse text
			if (line.trim() && !line.startsWith('\\')) {
				result += line.trim() + ' ';
			}
		}

		// Stop if we've passed our verse range
		if (verse && verseEnd && currentVerse > verseEnd) {
			break;
		}
	}

	return result.trim();
}

/**
 * Fetch scripture from DCS
 */
export async function fetchScriptureFromDCS(
	reference: string,
	language: string,
	organization: string,
	resources: string[]
): Promise<ScriptureData[]> {
	logger.info('Fetching scripture from DCS', { reference, language, organization, resources });

	// Parse reference
	const parsed = parseReference(reference);
	if (!parsed) {
		throw new Error(`Invalid reference format: ${reference}`);
	}

	const { book, chapter, verse, verseEnd } = parsed;
	const bookCode = getBookCode(book);

	const results: ScriptureData[] = [];

	// Fetch each requested resource
	for (const resource of resources) {
		const resourceInfo = RESOURCE_MAP[resource];
		if (!resourceInfo) {
			logger.warn(`Unknown resource: ${resource}`);
			continue;
		}

		try {
			// Search for resources by identifier/abbreviation
			const searchUrl = `/api/v1/catalog/search?lang=${language}&subject=Bible&limit=50`;
			logger.debug('Searching catalog', { url: searchUrl });

			const searchData = await fetchFromDCS(searchUrl);

			if (!searchData.data || searchData.data.length === 0) {
				logger.warn(`No Bible resources found for language ${language}`);
				continue;
			}

			// Find matching resource by abbreviation or title
			const catalog = searchData.data.find(
				(item: any) =>
					item.abbreviation === resourceInfo.identifier ||
					item.title?.toLowerCase().includes(resourceInfo.identifier) ||
					item.name?.toLowerCase() === resourceInfo.identifier
			);

			if (!catalog) {
				logger.warn(`No catalog entry found for ${resource} in ${language}`);
				continue;
			}

			const repoName = catalog.name;
			const owner = catalog.owner;

			// Get the ingredients to find the right file path
			const bookIngredient = catalog.ingredients?.find((ing: any) => ing.identifier === bookCode);

			if (!bookIngredient) {
				logger.warn(`Book ${bookCode} not found in ${resource}`);
				continue;
			}

			// Fetch the USFM file
			const filePath = bookIngredient.path.replace('./', '');
			const endpoint = `/api/v1/repos/${owner}/${repoName}/contents/${filePath}`;

			logger.info('Fetching USFM file', { endpoint, book: bookCode });

			const fileData = await fetchFromDCS(endpoint);

			if (!fileData.content) {
				logger.warn(`No content found for ${bookCode} in ${resource}`);
				continue;
			}

			// Decode base64 content
			const usfmContent = atob(fileData.content);

			// Extract the requested text
			const text = extractVerseFromUSFM(usfmContent, chapter, verse, verseEnd);

			if (!text) {
				logger.warn(`No text found for ${reference} in ${resource}`);
				continue;
			}

			// Build result with real metadata
			results.push({
				reference,
				text,
				resource,
				language,
				organization,
				version: catalog.version || resource.toUpperCase(),
				citation: `${reference} (${resource.toUpperCase()})`,
				copyright: catalog.rights || catalog.metadata?.rights || 'CC BY-SA 4.0',
				direction: catalog.language_direction || 'ltr',
				resourceInfo: {
					name: catalog.title || resourceInfo.name,
					description: catalog.description || resourceInfo.description,
					language,
					textDirection: catalog.language_direction || 'ltr'
				},
				metadata: {
					license: catalog.rights || 'CC BY-SA 4.0',
					copyright: catalog.copyright,
					contributors: catalog.contributor
						? Array.isArray(catalog.contributor)
							? catalog.contributor
							: [catalog.contributor]
						: [],
					publisher: catalog.publisher || 'unfoldingWord',
					issued: catalog.issued,
					modified: catalog.modified,
					checkingLevel: catalog.checking_level
				}
			});
		} catch (error) {
			logger.error(`Failed to fetch ${resource}`, { error });
			// Continue with other resources
		}
	}

	return results;
}
