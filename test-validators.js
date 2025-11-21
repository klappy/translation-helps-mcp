/**
 * Test the updated validators
 */

// Simulate the validators
function isValidLanguageCode(value) {
	if (!value || typeof value !== 'string') return false;

	// Simplified BCP 47 pattern that's more practical
	// Supports: language[-script][-region][-variant][-extension]
	// Examples: "en", "es-419", "pt-BR", "zh-Hans", "en-GB-oxendict"
	const bcp47Pattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?(-[a-z0-9-]+)?$/i;
	
	// Also accept simple 2-3 letter codes for backward compatibility
	const simplePattern = /^[a-z]{2,3}$/i;
	
	return bcp47Pattern.test(value) || simplePattern.test(value);
}

function isValidOrganization(value) {
	if (!value || typeof value !== 'string') return false;

	// Allow alphanumeric characters, hyphens, underscores, and dots
	// Must be at least 2 characters, max 100 characters
	const orgPattern = /^[a-zA-Z0-9._-]{2,100}$/;
	
	return orgPattern.test(value);
}

// Test cases
const languageTests = [
	{ value: 'en', expected: true, desc: 'Simple ISO 639-1' },
	{ value: 'es', expected: true, desc: 'Simple ISO 639-1' },
	{ value: 'es-419', expected: true, desc: 'BCP 47 with UN M.49 region' },
	{ value: 'en-US', expected: true, desc: 'BCP 47 with ISO 3166-1 region' },
	{ value: 'pt-BR', expected: true, desc: 'BCP 47 with ISO 3166-1 region' },
	{ value: 'zh-Hans', expected: true, desc: 'BCP 47 with script' },
	{ value: 'zh-Hant', expected: true, desc: 'BCP 47 with script' },
	{ value: 'zh-Hans-CN', expected: true, desc: 'BCP 47 with script and region' },
	{ value: 'eng', expected: true, desc: 'ISO 639-3' },
	{ value: 'spa', expected: true, desc: 'ISO 639-3' },
	{ value: 'invalid', expected: false, desc: 'Invalid (too long for simple)' },
	{ value: 'e', expected: false, desc: 'Invalid (too short)' },
	{ value: '123', expected: false, desc: 'Invalid (numbers only)' },
];

const orgTests = [
	{ value: 'unfoldingWord', expected: true, desc: 'Standard org' },
	{ value: 'es-419_gl', expected: true, desc: 'Language-specific org' },
	{ value: 'Door43-Catalog', expected: true, desc: 'Org with hyphen' },
	{ value: 'es-419_lab', expected: true, desc: 'Org with underscore' },
	{ value: 'es-419_obt', expected: true, desc: 'Org with underscore' },
	{ value: 'org.name', expected: true, desc: 'Org with dot' },
	{ value: 'a', expected: false, desc: 'Invalid (too short)' },
	{ value: '', expected: false, desc: 'Invalid (empty)' },
	{ value: 'a'.repeat(101), expected: false, desc: 'Invalid (too long)' },
];

console.log('🧪 Testing Language Code Validator\n');
languageTests.forEach(test => {
	const result = isValidLanguageCode(test.value);
	const status = result === test.expected ? '✅' : '❌';
	console.log(`${status} ${test.desc}: "${test.value}" -> ${result} (expected ${test.expected})`);
});

console.log('\n🧪 Testing Organization Validator\n');
orgTests.forEach(test => {
	const result = isValidOrganization(test.value);
	const status = result === test.expected ? '✅' : '❌';
	console.log(`${status} ${test.desc}: "${test.value}" -> ${result} (expected ${test.expected})`);
});

