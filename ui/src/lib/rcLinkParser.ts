/**
 * RC Link Parser for Translation Words
 *
 * KISS: Simple utility to parse RC links like rc://en/tw/dict/bible/kt/love
 * DRY: Reuses existing patterns from codebase
 */

export interface ParsedRCLink {
	language: string;
	resource: 'tw' | 'ta' | 'tn' | 'tq';
	category: string;
	term: string;
	path: string;
	dirPath?: string; // For TA modules - directory path like 'translate/figs-metaphor'
	isValid: boolean;
}

/**
 * Parse RC link for Translation Words
 * Supports formats:
 * - rc://en/tw/dict/bible/kt/love
 * - rc://<any>/tw/dict/bible/kt/love (wildcard language)
 */
export function parseRCLink(rcLink: string, defaultLanguage = 'en'): ParsedRCLink {
	const result: ParsedRCLink = {
		language: defaultLanguage,
		resource: 'tw',
		category: '',
		term: '',
		path: '',
		isValid: false
	};

	if (!rcLink || typeof rcLink !== 'string') {
		return result;
	}

	// Handle both with and without rc:// prefix
	const cleanLink = rcLink.startsWith('rc://') ? rcLink : `rc://${rcLink}`;

	// Pattern to match: rc://[language]/tw/dict/bible/[category]/[term]
	const twPattern = /^rc:\/\/([^/]+)\/tw\/dict\/bible\/([^/]+)\/([^/\s]+)$/i;
	const match = cleanLink.match(twPattern);

	if (!match) {
		return result;
	}

	const [, language, category, term] = match;

	result.language = language === '*' ? defaultLanguage : language;
	result.resource = 'tw';
	result.category = category;
	result.term = term;
	result.path = `bible/${category}/${term}.md`;
	result.isValid = true;

	return result;
}

/**
 * Check if a string looks like an RC link
 */
export function isRCLink(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// Check for rc:// prefix or rc-like pattern
	return (
		input.includes('rc://') || input.match(/^[^/]+\/tw\/dict\/bible\/[^/]+\/[^/\s]+$/i) !== null
	);
}

/**
 * Extract term from various input formats
 */
export function extractTerm(
	input: string,
	defaultLanguage = 'en'
): {
	term: string;
	category?: string;
	path?: string;
	source: 'rcLink' | 'path' | 'term';
} {
	if (!input) {
		return { term: '', source: 'term' };
	}

	// Try RC link first
	if (isRCLink(input)) {
		const parsed = parseRCLink(input, defaultLanguage);
		if (parsed.isValid) {
			return {
				term: parsed.term,
				category: parsed.category,
				path: parsed.path,
				source: 'rcLink'
			};
		}
	}

	// Try path format: bible/kt/love.md
	const pathMatch = input.match(/bible\/([^/]+)\/([^/]+)\.md$/i);
	if (pathMatch) {
		const [, category, term] = pathMatch;
		return {
			term,
			category,
			path: input,
			source: 'path'
		};
	}

	// Fallback to direct term
	const cleanTerm = input.toLowerCase().replace(/\s+/g, '');
	return {
		term: cleanTerm,
		source: 'term'
	};
}

/**
 * Parse RC link for Translation Academy
 * Supports formats:
 * - rc://en/ta/man/translate/figs-metaphor
 * - rc://STAR/ta/man/translate/figs-metaphor where STAR is wildcard
 * - rc://STAR/STAR/STAR/translate/figs-metaphor with wildcards
 */
export function parseTranslationAcademyRCLink(
	rcLink: string,
	defaultLanguage = 'en'
): ParsedRCLink {
	const result: ParsedRCLink = {
		language: defaultLanguage,
		resource: 'ta',
		category: '',
		term: '',
		path: '',
		dirPath: '',
		isValid: false
	};

	if (!rcLink || typeof rcLink !== 'string') {
		return result;
	}

	// Handle both with and without rc:// prefix
	const cleanLink = rcLink.startsWith('rc://') ? rcLink : `rc://${rcLink}`;

	// Pattern to match: rc://[lang|*]/[resourceId|*]/[type|*]/[dirPath]
	// Example: rc://*/ta/man/translate/figs-metaphor
	const taPattern = /^rc:\/\/([^/]+|\*)\/([^/]+|\*)\/([^/]+|\*)\/(.+)$/i;
	const match = cleanLink.match(taPattern);

	if (!match) {
		return result;
	}

	const [, language, resourceId, resourceType, dirPath] = match;

	// Validate it's a TA link (resourceId should be 'ta' or wildcard)
	if (resourceId !== '*' && resourceId.toLowerCase() !== 'ta') {
		return result;
	}

	result.language = language === '*' ? defaultLanguage : language;
	result.resource = 'ta';
	result.dirPath = dirPath;
	result.path = dirPath; // For TA, path is the directory path (no .md extension)

	// Extract category from dirPath (first segment)
	const pathParts = dirPath.split('/');
	result.category = pathParts[0] || '';
	result.term = pathParts.slice(1).join('/') || ''; // Module ID is everything after category

	result.isValid = true;

	return result;
}

/**
 * Check if a string looks like a Translation Academy RC link
 */
export function isTranslationAcademyRCLink(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// Check for TA-specific patterns
	return (
		input.includes('rc://') &&
		(input.includes('/ta/') || input.match(/rc:\/\/[^/]+\/\*\//) !== null)
	);
}
