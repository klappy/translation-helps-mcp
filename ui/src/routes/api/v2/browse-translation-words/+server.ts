/**
 * Browse Translation Words Endpoint v2
 *
 * Lists all available translation words, optionally filtered by category.
 * Perfect for building word indexes or browsing dictionaries.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createListResponse } from '$lib/standardResponses.js';

// Mock word categories
const WORD_CATEGORIES = {
	all: 'All Words',
	kt: 'Key Terms',
	names: 'Names',
	other: 'Other'
};

// Mock translation words data
const MOCK_WORDS_DATABASE = [
	// Key Terms
	{
		id: 'tw_kt_001',
		word: 'faith',
		category: 'kt',
		definition:
			'Trust or confidence in someone or something; belief in the truth of God and his Word.',
		strongs: ['G4102'],
		aliases: ['believe', 'trust', 'confidence'],
		occurrences: 243
	},
	{
		id: 'tw_kt_002',
		word: 'love',
		category: 'kt',
		definition:
			'To have a strong affection for someone or something; to care deeply about someone.',
		strongs: ['G25', 'G26'],
		aliases: ['beloved', 'affection', 'charity'],
		occurrences: 714
	},
	{
		id: 'tw_kt_003',
		word: 'grace',
		category: 'kt',
		definition: 'Favor or kindness that is given to someone who does not deserve it.',
		strongs: ['G5485'],
		aliases: ['favor', 'gift', 'gracious'],
		occurrences: 170
	},
	{
		id: 'tw_kt_004',
		word: 'sin',
		category: 'kt',
		definition: "The breaking of God's law; moral wrongdoing.",
		strongs: ['G266'],
		aliases: ['transgression', 'iniquity', 'trespass'],
		occurrences: 441
	},
	// Names
	{
		id: 'tw_names_001',
		word: 'Abraham',
		category: 'names',
		definition: 'The ancestor of the Israelites, known for his faith in God.',
		strongs: ['G11'],
		aliases: ['Abram'],
		occurrences: 231
	},
	{
		id: 'tw_names_002',
		word: 'Jerusalem',
		category: 'names',
		definition: 'The capital city of Israel and center of Jewish worship.',
		strongs: ['G2414'],
		aliases: ['City of David', 'Zion'],
		occurrences: 811
	},
	{
		id: 'tw_names_003',
		word: 'Moses',
		category: 'names',
		definition: 'The prophet who led Israel out of Egypt and received the Law.',
		strongs: ['G3475'],
		aliases: [],
		occurrences: 847
	},
	// Other
	{
		id: 'tw_other_001',
		word: 'servant',
		category: 'other',
		definition: 'A person who serves another person, especially a person who serves God.',
		strongs: ['G1401'],
		aliases: ['slave', 'bondservant', 'minister'],
		occurrences: 454
	},
	{
		id: 'tw_other_002',
		word: 'temple',
		category: 'other',
		definition: 'A building where people worship God or false gods.',
		strongs: ['G2411', 'G3485'],
		aliases: ['house of God', 'sanctuary'],
		occurrences: 228
	},
	{
		id: 'tw_other_003',
		word: 'covenant',
		category: 'other',
		definition: 'A formal, binding agreement between two parties.',
		strongs: ['G1242'],
		aliases: ['agreement', 'promise', 'testament'],
		occurrences: 302
	}
];

/**
 * Browse translation words
 */
async function browseTranslationWords(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { language, organization, category, search } = params;

	// Filter words by category
	let words = [...MOCK_WORDS_DATABASE];

	if (category && category !== 'all') {
		words = words.filter((w) => w.category === category);
	}

	// Filter by search term if provided
	if (search) {
		const searchTerm = search.toLowerCase();
		words = words.filter(
			(w) =>
				w.word.toLowerCase().includes(searchTerm) ||
				w.definition.toLowerCase().includes(searchTerm) ||
				w.aliases.some((a) => a.toLowerCase().includes(searchTerm))
		);
	}

	// Sort alphabetically
	words.sort((a, b) => a.word.localeCompare(b.word));

	// Add category names
	const wordsWithCategoryNames = words.map((w) => ({
		...w,
		categoryName: WORD_CATEGORIES[w.category as keyof typeof WORD_CATEGORIES] || 'Unknown'
	}));

	return createListResponse(wordsWithCategoryNames, {
		language,
		organization,
		source: 'TW',
		...(category && category !== 'all' && { filteredBy: { category } }),
		...(search && { searchQuery: search }),
		categories: Object.entries(WORD_CATEGORIES).map(([key, name]) => ({
			id: key,
			name,
			count:
				key === 'all'
					? MOCK_WORDS_DATABASE.length
					: MOCK_WORDS_DATABASE.filter((w) => w.category === key).length
		}))
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'browse-translation-words-v2',

	params: [
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'category',
			validate: (value) => {
				if (!value) return true;
				return Object.keys(WORD_CATEGORIES).includes(value);
			}
		},
		{
			name: 'search',
			validate: (value) => {
				if (!value) return true;
				return value.length >= 2; // Minimum 2 characters
			}
		}
	],

	fetch: browseTranslationWords,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
