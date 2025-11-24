/**
 * Common Parameter Validators
 *
 * Reusable validation functions to ensure consistency across all endpoints.
 * DRY principle: Define once, use everywhere!
 */

/**
 * Validate a Bible reference string
 * Supports: Book only, Book Chapter, Book Chapter:Verse, Book Chapter:Verse-Verse, Book Chapter-Chapter
 * Examples: "John", "John 3", "John 3:16", "Genesis 1:1-5", "1 Corinthians 13", "Psalm 23"
 */
export function isValidReference(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	const trimmed = value.trim();

	// Allow book-only references (e.g., "John", "Genesis")
	// Must be at least 2 characters and contain letters
	const bookOnlyPattern = /^[1-3]?\s?[A-Za-z]+$/;
	if (bookOnlyPattern.test(trimmed)) {
		return trimmed.length >= 2; // At least 2 chars for book name
	}

	// Pattern for references with chapter/verse: Book Chapter:Verse
	// Examples: "John 3:16", "Genesis 1:1-5", "1 Corinthians 13", "Psalm 23"
	const withChapterPattern = /^[1-3]?\s?[A-Za-z]+\s+\d+(?::\d+(?:-\d+)?)?(?:-\d+(?::\d+)?)?$/;
	return withChapterPattern.test(trimmed);
}

/**
 * Validate a language code
 *
 * Supports BCP 47 language tags (RFC 5646), which include:
 * - ISO 639-1 (2-letter): "en", "es", "fr"
 * - ISO 639-3 (3-letter): "eng", "spa", "fra"
 * - BCP 47 with region codes: "es-419", "en-US", "pt-BR"
 *   - Region codes can be ISO 3166-1 alpha-2 (2 letters) or UN M.49 (3 digits)
 * - BCP 47 with script: "zh-Hans", "zh-Hant" (ISO 15924, 4 letters)
 * - BCP 47 with variants: "en-GB-oxendict", "zh-Hans-CN"
 *
 * Format: language[-script][-region][-variant][-extension]
 * Examples: "en", "es-419", "pt-BR", "zh-Hans-CN", "en-GB-oxendict"
 *
 * Reference: https://tools.ietf.org/html/rfc5646
 */
export function isValidLanguageCode(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Simplified BCP 47 pattern that's practical and maintainable:
	// - Language subtag: 2-3 letters (ISO 639-1 or ISO 639-3)
	// - Optional script: 4 letters (ISO 15924)
	// - Optional region: 2 letters (ISO 3166-1 alpha-2) or 3 digits (UN M.49)
	// - Optional variant/extension: alphanumeric with hyphens
	const bcp47Pattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?(-[a-z0-9-]+)?$/i;

	// Also accept simple 2-3 letter codes for backward compatibility
	const simplePattern = /^[a-z]{2,3}$/i;

	return bcp47Pattern.test(value) || simplePattern.test(value);
}

/**
 * Validate an organization name
 *
 * Supports any valid organization identifier from Door43 catalog.
 * Common patterns include:
 * - Standard organizations: "unfoldingWord", "Door43-Catalog"
 * - Language-specific organizations: "es-419_gl", "es-419_lab", "es-419_obt"
 * - Format: alphanumeric with hyphens and underscores
 *
 * We validate format rather than maintaining a whitelist to support
 * dynamic organizations from the catalog.
 */
export function isValidOrganization(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Allow alphanumeric characters, hyphens, underscores, and dots
	// Must be at least 2 characters, max 100 characters
	// Examples: "unfoldingWord", "es-419_gl", "Door43-Catalog", "org.name"
	const orgPattern = /^[a-zA-Z0-9._-]{2,100}$/;

	return orgPattern.test(value);
}

/**
 * Validate a resource type
 */
export function isValidResourceType(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Standard resource types
	const validTypes = ['ult', 'ust', 'tn', 'tw', 'tq', 'ta', 'twl'];
	return validTypes.includes(value);
}

/**
 * Validate a subject/category
 */
export function isValidSubject(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// DCS catalog subjects
	const validSubjects = [
		'Bible',
		'Aligned Bible',
		'Translation Notes',
		'Translation Words',
		'Translation Questions',
		'Translation Academy',
		'Open Bible Stories'
	];
	return validSubjects.includes(value);
}

/**
 * Validate a search query string
 */
export function isValidSearchQuery(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Must be between 2 and 100 characters
	const trimmed = value.trim();
	if (trimmed.length < 2 || trimmed.length > 100) return false;

	// Allow any Unicode characters, spaces, and common punctuation
	// Just prevent extremely long queries or control characters
	// eslint-disable-next-line no-control-regex
	return !/[\x00-\x1F\x7F]/.test(trimmed);
}

/**
 * Common parameter schemas for reuse
 */
export const COMMON_PARAMS = {
	reference: {
		name: 'reference',
		required: true,
		validate: isValidReference
	},

	language: {
		name: 'language',
		default: 'en',
		validate: isValidLanguageCode
	},

	organization: {
		name: 'organization',
		default: 'unfoldingWord',
		validate: isValidOrganization
	},

	resource: {
		name: 'resource',
		validate: isValidResourceType
	},

	subject: {
		name: 'subject',
		validate: isValidSubject
	},

	search: {
		name: 'search',
		required: false,
		type: 'string',
		validate: isValidSearchQuery
	}
};
