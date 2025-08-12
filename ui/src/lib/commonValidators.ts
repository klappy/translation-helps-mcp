/**
 * Common Parameter Validators
 *
 * Reusable validation functions to ensure consistency across all endpoints.
 * DRY principle: Define once, use everywhere!
 */

/**
 * Validate a Bible reference string
 */
export function isValidReference(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Basic pattern: Book Chapter:Verse
	// Examples: "John 3:16", "Genesis 1:1-5", "1 Corinthians 13", "Psalm 23"
	const pattern = /^[1-3]?\s?[A-Za-z]+\s+\d+(?::\d+(?:-\d+)?)?$/;
	return pattern.test(value.trim());
}

/**
 * Validate a language code
 */
export function isValidLanguageCode(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// ISO 639-1 (2-letter) or ISO 639-3 (3-letter) codes
	return /^[a-z]{2,3}$/.test(value);
}

/**
 * Validate an organization name
 */
export function isValidOrganization(value: string): boolean {
	if (!value || typeof value !== 'string') return false;

	// Known organizations
	const validOrgs = ['unfoldingWord', 'Door43-Catalog'];
	return validOrgs.includes(value);
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
	}
};
