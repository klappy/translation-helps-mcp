/**
 * Shared Filter Utilities
 *
 * DRY: Reusable filter functionality across all resource endpoints.
 * KISS: Simple, focused functions that do one thing well.
 * Antifragile: Graceful handling of edge cases.
 *
 * Used by: scripture, notes, questions, words, word-links, academy
 */

// Re-export the stemmed pattern generator
export { generateStemmedPattern } from './stemmedFilter.js';

// ============================================================================
// BOOK & TESTAMENT UTILITIES
// ============================================================================

/**
 * All 66 book codes in canonical order
 */
export const ALL_BOOKS = [
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
	'mal',
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

export const OT_BOOKS = ALL_BOOKS.slice(0, 39);
export const NT_BOOKS = ALL_BOOKS.slice(39);

/**
 * Book code to display name mapping
 */
export const BOOK_NAMES: Record<string, string> = {
	gen: 'Genesis',
	exo: 'Exodus',
	lev: 'Leviticus',
	num: 'Numbers',
	deu: 'Deuteronomy',
	jos: 'Joshua',
	jdg: 'Judges',
	rut: 'Ruth',
	'1sa': '1Samuel',
	'2sa': '2Samuel',
	'1ki': '1Kings',
	'2ki': '2Kings',
	'1ch': '1Chronicles',
	'2ch': '2Chronicles',
	ezr: 'Ezra',
	neh: 'Nehemiah',
	est: 'Esther',
	job: 'Job',
	psa: 'Psalms',
	pro: 'Proverbs',
	ecc: 'Ecclesiastes',
	sng: 'SongOfSongs',
	isa: 'Isaiah',
	jer: 'Jeremiah',
	lam: 'Lamentations',
	ezk: 'Ezekiel',
	dan: 'Daniel',
	hos: 'Hosea',
	jol: 'Joel',
	amo: 'Amos',
	oba: 'Obadiah',
	jon: 'Jonah',
	mic: 'Micah',
	nam: 'Nahum',
	hab: 'Habakkuk',
	zep: 'Zephaniah',
	hag: 'Haggai',
	zec: 'Zechariah',
	mal: 'Malachi',
	mat: 'Matthew',
	mrk: 'Mark',
	luk: 'Luke',
	jhn: 'John',
	act: 'Acts',
	rom: 'Romans',
	'1co': '1Corinthians',
	'2co': '2Corinthians',
	gal: 'Galatians',
	eph: 'Ephesians',
	php: 'Philippians',
	col: 'Colossians',
	'1th': '1Thessalonians',
	'2th': '2Thessalonians',
	'1ti': '1Timothy',
	'2ti': '2Timothy',
	tit: 'Titus',
	phm: 'Philemon',
	heb: 'Hebrews',
	jas: 'James',
	'1pe': '1Peter',
	'2pe': '2Peter',
	'1jn': '1John',
	'2jn': '2John',
	'3jn': '3John',
	jud: 'Jude',
	rev: 'Revelation'
};

// Reverse mapping: display name (lowercase) -> book code
const BOOK_CODES: Record<string, string> = Object.fromEntries(
	Object.entries(BOOK_NAMES).map(([code, name]) => [name.toLowerCase(), code])
);

/**
 * Get display name for a book (handles both codes and names)
 */
export function getBookDisplayName(book: string): string {
	const lower = book.toLowerCase();
	if (BOOK_NAMES[lower]) return BOOK_NAMES[lower];
	return book;
}

/**
 * Get book code from display name or code
 */
export function getBookCode(book: string): string {
	const lower = book.toLowerCase();
	if (BOOK_NAMES[lower]) return lower;
	if (BOOK_CODES[lower]) return BOOK_CODES[lower];
	// Handle variations like "1 John" vs "1John"
	const normalized = lower.replace(/\s+/g, '');
	if (BOOK_CODES[normalized]) return BOOK_CODES[normalized];
	return lower;
}

/**
 * Extract book name from a reference string like "Genesis 1:1" or "1John 3:16"
 */
export function extractBookFromReference(reference: string): string {
	const match = reference.match(/^(.+?)\s+\d+/);
	if (match) return match[1].trim();
	return reference;
}

/**
 * Get testament for a book code ('ot' or 'nt')
 */
export function getTestament(bookCode: string): 'ot' | 'nt' {
	return NT_BOOKS.includes(bookCode.toLowerCase()) ? 'nt' : 'ot';
}

/**
 * Get books for a testament filter
 */
export function getBooksForTestament(testament: string | undefined): string[] {
	if (testament === 'nt') return NT_BOOKS;
	if (testament === 'ot') return OT_BOOKS;
	return ALL_BOOKS;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Filter result statistics
 */
export interface FilterStatistics {
	total: number;
	byTestament?: {
		ot: number;
		nt: number;
	};
	byBook?: Record<string, number>;
	byCategory?: Record<string, number>;
}

/**
 * Options for computing statistics
 */
export interface StatisticsOptions {
	includeTestament?: boolean;
	includeBook?: boolean;
	includeCategory?: boolean;
}

/**
 * Match item with reference (for scripture-based resources)
 */
export interface ReferenceMatch {
	reference: string;
	[key: string]: any;
}

/**
 * Match item with category (for non-scripture resources like words, academy)
 */
export interface CategoryMatch {
	category: string;
	[key: string]: any;
}

/**
 * Compute statistics from filter matches
 *
 * @param matches - Array of match objects
 * @param options - What statistics to compute
 * @returns FilterStatistics object
 */
export function computeFilterStatistics<T extends Partial<ReferenceMatch & CategoryMatch>>(
	matches: T[],
	options: StatisticsOptions = { includeTestament: true, includeBook: true }
): FilterStatistics {
	const stats: FilterStatistics = {
		total: matches.length
	};

	if (options.includeTestament) {
		stats.byTestament = { ot: 0, nt: 0 };
	}

	if (options.includeBook) {
		stats.byBook = {};
	}

	if (options.includeCategory) {
		stats.byCategory = {};
	}

	for (const match of matches) {
		// Handle reference-based stats (scripture, notes, questions)
		if (match.reference && (options.includeTestament || options.includeBook)) {
			const bookName = extractBookFromReference(match.reference);
			const bookCode = getBookCode(bookName);
			const displayName = getBookDisplayName(bookCode);

			if (options.includeTestament && stats.byTestament) {
				const testament = getTestament(bookCode);
				stats.byTestament[testament]++;
			}

			if (options.includeBook && stats.byBook) {
				stats.byBook[displayName] = (stats.byBook[displayName] || 0) + 1;
			}
		}

		// Handle category-based stats (words, academy)
		if (match.category && options.includeCategory && stats.byCategory) {
			stats.byCategory[match.category] = (stats.byCategory[match.category] || 0) + 1;
		}
	}

	return stats;
}

// ============================================================================
// YAML FRONTMATTER FORMATTING
// ============================================================================

/**
 * Resource type for formatting
 */
export type FilterResourceType =
	| 'scripture'
	| 'translation-notes'
	| 'translation-questions'
	| 'translation-words'
	| 'translation-word-links'
	| 'translation-academy';

/**
 * Format filter statistics as YAML frontmatter
 */
export function formatStatisticsAsYAML(
	stats: FilterStatistics,
	options: {
		filter: string;
		language: string;
		organization: string;
		resource: string;
		resourceType: FilterResourceType;
		reference?: string;
		pattern?: string;
	}
): string {
	let yaml = '---\n';
	yaml += `resource: ${formatResourceTitle(options.resourceType)} Filter\n`;
	yaml += `filter: "${options.filter}"\n`;
	yaml += `language: ${options.language}\n`;
	yaml += `organization: ${options.organization}\n`;

	if (options.resource) {
		yaml += `translation: ${options.resource}\n`;
	}

	if (options.reference) {
		yaml += `reference: ${options.reference}\n`;
	}

	yaml += `\n# Result Statistics\n`;
	yaml += `total_results: ${stats.total}\n`;

	if (stats.byTestament) {
		yaml += `\n# By Testament\n`;
		yaml += `old_testament: ${stats.byTestament.ot}\n`;
		yaml += `new_testament: ${stats.byTestament.nt}\n`;
	}

	if (stats.byCategory && Object.keys(stats.byCategory).length > 0) {
		yaml += `\n# By Category\n`;
		const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
		for (const [category, count] of sortedCategories) {
			yaml += `${category}: ${count}\n`;
		}
	}

	if (stats.byBook && Object.keys(stats.byBook).length > 0) {
		yaml += `\n# By Book\n`;
		const sortedBooks = Object.entries(stats.byBook).sort((a, b) => b[1] - a[1]);
		for (const [book, count] of sortedBooks) {
			yaml += `${book}: ${count}\n`;
		}
	}

	yaml += '---\n';
	return yaml;
}

/**
 * Format resource type for display
 */
export function formatResourceTitle(resourceType: FilterResourceType): string {
	const titles: Record<FilterResourceType, string> = {
		scripture: 'Scripture',
		'translation-notes': 'Translation Notes',
		'translation-questions': 'Translation Questions',
		'translation-words': 'Translation Words',
		'translation-word-links': 'Translation Word Links',
		'translation-academy': 'Translation Academy'
	};
	return titles[resourceType] || resourceType;
}

/**
 * Format filter response as markdown with YAML frontmatter
 *
 * Generic formatter that works for all resource types.
 * Each resource type can provide custom match formatting.
 */
export function formatFilterResponseAsMarkdown<T>(
	response: {
		filter: string;
		pattern?: string;
		language: string;
		organization: string;
		resource?: string;
		reference?: string;
		matches: T[];
	},
	statistics: FilterStatistics,
	resourceType: FilterResourceType,
	formatMatch: (match: T) => string
): string {
	let md = '';

	// YAML frontmatter
	md += formatStatisticsAsYAML(statistics, {
		filter: response.filter,
		language: response.language,
		organization: response.organization,
		resource: response.resource || '',
		resourceType,
		reference: response.reference,
		pattern: response.pattern
	});

	md += '\n';

	// Title
	md += `# ${formatResourceTitle(resourceType)} Filter Results: "${response.filter}"\n\n`;

	// Summary section
	md += `## Summary\n\n`;
	md += `- **Total Results**: ${statistics.total}\n`;

	if (statistics.byTestament) {
		md += `- **Old Testament**: ${statistics.byTestament.ot}\n`;
		md += `- **New Testament**: ${statistics.byTestament.nt}\n`;
	}

	if (response.pattern) {
		md += `- **Pattern**: \`${response.pattern}\`\n`;
	}

	if (response.reference) {
		md += `- **Reference**: ${response.reference}\n`;
	}

	md += '\n';

	// Results by book/category table
	if (statistics.byBook && Object.keys(statistics.byBook).length > 0) {
		md += `## Results by Book\n\n`;
		md += `| Book | Count |\n`;
		md += `|------|-------|\n`;
		const sortedBooks = Object.entries(statistics.byBook).sort((a, b) => b[1] - a[1]);
		for (const [book, count] of sortedBooks.slice(0, 15)) {
			md += `| ${book} | ${count} |\n`;
		}
		if (sortedBooks.length > 15) {
			md += `\n*...and ${sortedBooks.length - 15} more books*\n`;
		}
		md += '\n';
	}

	if (statistics.byCategory && Object.keys(statistics.byCategory).length > 0) {
		md += `## Results by Category\n\n`;
		md += `| Category | Count |\n`;
		md += `|----------|-------|\n`;
		const sortedCategories = Object.entries(statistics.byCategory).sort((a, b) => b[1] - a[1]);
		for (const [category, count] of sortedCategories) {
			md += `| ${category} | ${count} |\n`;
		}
		md += '\n';
	}

	// Matches section
	md += `## Matches\n\n`;

	// Group matches by book if they have references
	const firstMatch = response.matches[0] as any;
	if (firstMatch?.reference) {
		const matchesByBook: Record<string, T[]> = {};
		for (const match of response.matches) {
			const m = match as any;
			const bookName = extractBookFromReference(m.reference);
			const displayName = getBookDisplayName(getBookCode(bookName));
			if (!matchesByBook[displayName]) {
				matchesByBook[displayName] = [];
			}
			matchesByBook[displayName].push(match);
		}

		for (const [book, bookMatches] of Object.entries(matchesByBook)) {
			md += `### ${book} (${bookMatches.length})\n\n`;
			for (const match of bookMatches) {
				md += formatMatch(match);
			}
		}
	} else {
		// No reference grouping - just list matches
		for (const match of response.matches) {
			md += formatMatch(match);
		}
	}

	return md;
}

// ============================================================================
// FILTER MATCH HELPERS
// ============================================================================

/**
 * Apply filter pattern to text and return matched terms
 */
export function findMatchedTerms(text: string, pattern: RegExp): string[] {
	pattern.lastIndex = 0;
	const found: string[] = [];
	let match;
	while ((match = pattern.exec(text)) !== null) {
		found.push(match[0]);
	}
	return [...new Set(found)];
}

/**
 * Check if text matches filter pattern
 */
export function matchesFilter(text: string, pattern: RegExp): boolean {
	pattern.lastIndex = 0;
	return pattern.test(text);
}
