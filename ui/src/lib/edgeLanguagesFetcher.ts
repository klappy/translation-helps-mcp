/**
 * Edge-Compatible Languages Fetcher
 *
 * Fetches available languages from DCS API catalog.
 * Returns language metadata including resources and coverage.
 */

import { fetchFromDCS } from './dataFetchers.js';
import { edgeLogger as logger } from './edgeLogger.js';

interface Language {
	code: string;
	name: string;
	direction: 'ltr' | 'rtl';
	resources?: string[];
	coverage?: {
		ot: number;
		nt: number;
		total: number;
	};
}

/**
 * Get unique languages from catalog data
 */
function extractLanguagesFromCatalog(catalogData: any[]): Language[] {
	const languageMap = new Map<string, Language>();

	for (const item of catalogData) {
		const langCode = item.language || item.lang;
		if (!langCode) continue;

		// Get existing language or create new
		let language = languageMap.get(langCode);
		if (!language) {
			language = {
				code: langCode,
				name: item.language_title || item.lang_name || langCode,
				direction: item.language_direction === 'rtl' ? 'rtl' : 'ltr',
				resources: []
			};
			languageMap.set(langCode, language);
		}

		// Add resource if not already tracked
		if (item.subject && language.resources && !language.resources.includes(item.subject)) {
			language.resources.push(item.subject);
		}
	}

	return Array.from(languageMap.values());
}

/**
 * Calculate coverage stats for a language
 */
function calculateCoverage(language: Language, catalogData: any[]): void {
	// Get all books for this language
	const bookSet = new Set<string>();

	for (const item of catalogData) {
		if (item.language === language.code && item.ingredients) {
			for (const ingredient of item.ingredients) {
				if (ingredient.identifier) {
					bookSet.add(ingredient.identifier);
				}
			}
		}
	}

	// Basic book counts (this is simplified - real implementation would need proper book lists)
	const otBooks = [
		'gen',
		'exo',
		'lev',
		'num',
		'deu',
		'jos',
		'jdg',
		'rut',
		'1sa',
		'2sa',
		'1ki',
		'2ki',
		'1ch',
		'2ch',
		'ezr',
		'neh',
		'est',
		'job',
		'psa',
		'pro',
		'ecc',
		'sng',
		'isa',
		'jer',
		'lam',
		'ezk',
		'dan',
		'hos',
		'jol',
		'amo',
		'oba',
		'jon',
		'mic',
		'nam',
		'hab',
		'zep',
		'hag',
		'zec',
		'mal'
	];
	const ntBooks = [
		'mat',
		'mrk',
		'luk',
		'jhn',
		'act',
		'rom',
		'1co',
		'2co',
		'gal',
		'eph',
		'php',
		'col',
		'1th',
		'2th',
		'1ti',
		'2ti',
		'tit',
		'phm',
		'heb',
		'jas',
		'1pe',
		'2pe',
		'1jn',
		'2jn',
		'3jn',
		'jud',
		'rev'
	];

	let otCount = 0;
	let ntCount = 0;

	for (const book of bookSet) {
		if (otBooks.includes(book)) otCount++;
		if (ntBooks.includes(book)) ntCount++;
	}

	language.coverage = {
		ot: Math.round((otCount / otBooks.length) * 100),
		nt: Math.round((ntCount / ntBooks.length) * 100),
		total: Math.round(((otCount + ntCount) / (otBooks.length + ntBooks.length)) * 100)
	};
}

/**
 * Fetch available languages from DCS
 */
export async function fetchLanguagesFromDCS(
	resourceFilter?: string,
	includeMetadata: boolean = false,
	includeStats: boolean = false
): Promise<Language[]> {
	logger.info('Fetching languages from DCS', { resourceFilter, includeMetadata, includeStats });

	try {
		// Search for all Bible resources
		const searchUrl = `/api/v1/catalog/search?subject=Bible&limit=5000`;
		logger.debug('Searching catalog for languages', { url: searchUrl });

		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn('No catalog data found');
			return [];
		}

		// Extract unique languages
		let languages = extractLanguagesFromCatalog(searchData.data);

		// Apply resource filter if specified
		if (resourceFilter) {
			languages = languages.filter(
				(lang) =>
					lang.resources &&
					lang.resources.some((r) => r.toLowerCase().includes(resourceFilter.toLowerCase()))
			);
		}

		// Calculate coverage stats if requested
		if (includeStats) {
			for (const language of languages) {
				calculateCoverage(language, searchData.data);
			}
		}

		// Remove resources array if metadata not requested
		if (!includeMetadata) {
			for (const language of languages) {
				delete language.resources;
			}
		}

		// Sort by language code
		languages.sort((a, b) => a.code.localeCompare(b.code));

		logger.info(`Found ${languages.length} languages`);
		return languages;
	} catch (error) {
		logger.error('Failed to fetch languages', { error });
		throw error;
	}
}
