/**
 * Browse Translation Academy Endpoint v2
 *
 * Lists all available translation academy articles, optionally filtered by category.
 * Perfect for building topic indexes or browsing training materials.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createListResponse } from '$lib/standardResponses.js';

// Academy article categories
const ACADEMY_CATEGORIES = {
	all: 'All Articles',
	translate: 'Translation',
	bible: 'Bible',
	process: 'Process',
	checking: 'Checking'
};

// Mock translation academy articles
const MOCK_ACADEMY_DATABASE = [
	// Translation Category
	{
		id: 'ta_translate_001',
		title: 'Abstract Nouns',
		category: 'translate',
		path: 'translate/figs-abstractnouns',
		description: 'How to translate abstract concepts that may not exist in your language.',
		topics: ['grammar', 'nouns', 'translation-principles'],
		difficulty: 'intermediate',
		readTime: 5
	},
	{
		id: 'ta_translate_002',
		title: 'Metaphor',
		category: 'translate',
		path: 'translate/figs-metaphor',
		description:
			'Understanding and translating figurative language where one thing represents another.',
		topics: ['figures-of-speech', 'meaning', 'interpretation'],
		difficulty: 'intermediate',
		readTime: 8
	},
	{
		id: 'ta_translate_003',
		title: 'Active or Passive',
		category: 'translate',
		path: 'translate/figs-activepassive',
		description: 'How to handle active and passive voice in translation.',
		topics: ['grammar', 'voice', 'sentence-structure'],
		difficulty: 'beginner',
		readTime: 6
	},
	{
		id: 'ta_translate_004',
		title: 'Idiom',
		category: 'translate',
		path: 'translate/figs-idiom',
		description: 'Translating expressions that mean something different than their literal words.',
		topics: ['figures-of-speech', 'culture', 'meaning'],
		difficulty: 'intermediate',
		readTime: 7
	},
	// Bible Category
	{
		id: 'ta_bible_001',
		title: 'The Bible',
		category: 'bible',
		path: 'bible/bible',
		description: 'An introduction to what the Bible is and how it is organized.',
		topics: ['scripture', 'canon', 'inspiration'],
		difficulty: 'beginner',
		readTime: 10
	},
	{
		id: 'ta_bible_002',
		title: 'Chapter and Verse Numbers',
		category: 'bible',
		path: 'bible/chapter-verses',
		description: 'Understanding the chapter and verse system in the Bible.',
		topics: ['reference-system', 'navigation', 'history'],
		difficulty: 'beginner',
		readTime: 4
	},
	{
		id: 'ta_bible_003',
		title: 'Biblical Weights and Measures',
		category: 'bible',
		path: 'bible/weights-measures',
		description: 'Converting ancient measurements to modern equivalents.',
		topics: ['culture', 'history', 'conversion'],
		difficulty: 'intermediate',
		readTime: 12
	},
	// Process Category
	{
		id: 'ta_process_001',
		title: 'Getting Started',
		category: 'process',
		path: 'process/getting-started',
		description: 'How to begin your Bible translation project.',
		topics: ['planning', 'preparation', 'team-building'],
		difficulty: 'beginner',
		readTime: 15
	},
	{
		id: 'ta_process_002',
		title: 'Translation Team',
		category: 'process',
		path: 'process/translation-team',
		description: 'Building and organizing an effective translation team.',
		topics: ['teamwork', 'roles', 'collaboration'],
		difficulty: 'beginner',
		readTime: 8
	},
	{
		id: 'ta_process_003',
		title: 'Source Text Selection',
		category: 'process',
		path: 'process/source-text',
		description: 'Choosing the best source text for your translation.',
		topics: ['resources', 'decision-making', 'quality'],
		difficulty: 'intermediate',
		readTime: 10
	},
	// Checking Category
	{
		id: 'ta_checking_001',
		title: 'Checking Overview',
		category: 'checking',
		path: 'checking/checking-overview',
		description: 'Introduction to the translation checking process.',
		topics: ['quality-assurance', 'accuracy', 'review'],
		difficulty: 'beginner',
		readTime: 6
	},
	{
		id: 'ta_checking_002',
		title: 'Self Check',
		category: 'checking',
		path: 'checking/self-check',
		description: 'How translators can check their own work.',
		topics: ['self-review', 'accuracy', 'methodology'],
		difficulty: 'beginner',
		readTime: 5
	},
	{
		id: 'ta_checking_003',
		title: 'Peer Check',
		category: 'checking',
		path: 'checking/peer-check',
		description: 'Having other translators review your work.',
		topics: ['collaboration', 'feedback', 'improvement'],
		difficulty: 'intermediate',
		readTime: 7
	}
];

/**
 * Browse translation academy articles
 */
async function browseTranslationAcademy(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { language, organization, category, search, difficulty } = params;

	// Filter articles
	let articles = [...MOCK_ACADEMY_DATABASE];

	// Filter by category
	if (category && category !== 'all') {
		articles = articles.filter((a) => a.category === category);
	}

	// Filter by difficulty
	if (difficulty) {
		articles = articles.filter((a) => a.difficulty === difficulty);
	}

	// Filter by search term
	if (search) {
		const searchTerm = search.toLowerCase();
		articles = articles.filter(
			(a) =>
				a.title.toLowerCase().includes(searchTerm) ||
				a.description.toLowerCase().includes(searchTerm) ||
				a.topics.some((t) => t.toLowerCase().includes(searchTerm))
		);
	}

	// Sort by title
	articles.sort((a, b) => a.title.localeCompare(b.title));

	// Add category names
	const articlesWithCategoryNames = articles.map((a) => ({
		...a,
		categoryName: ACADEMY_CATEGORIES[a.category as keyof typeof ACADEMY_CATEGORIES] || 'Unknown'
	}));

	// Calculate statistics
	const totalReadTime = articles.reduce((sum, a) => sum + a.readTime, 0);
	const difficultyCount = articles.reduce(
		(acc, a) => {
			acc[a.difficulty] = (acc[a.difficulty] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	return createListResponse(articlesWithCategoryNames, {
		language,
		organization,
		source: 'TA',
		totalReadTime: `${totalReadTime} minutes`,
		difficultyBreakdown: difficultyCount,
		...(category && category !== 'all' && { filteredBy: { category } }),
		...(difficulty && {
			filteredBy: { ...(category && category !== 'all' ? { category } : {}), difficulty }
		}),
		...(search && { searchQuery: search }),
		categories: Object.entries(ACADEMY_CATEGORIES).map(([key, name]) => ({
			id: key,
			name,
			count:
				key === 'all'
					? MOCK_ACADEMY_DATABASE.length
					: MOCK_ACADEMY_DATABASE.filter((a) => a.category === key).length
		}))
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'browse-translation-academy-v2',

	params: [
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'category',
			validate: (value) => {
				if (!value) return true;
				return Object.keys(ACADEMY_CATEGORIES).includes(value);
			}
		},
		{
			name: 'difficulty',
			validate: (value) => {
				if (!value) return true;
				return ['beginner', 'intermediate', 'advanced'].includes(value);
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

	fetch: browseTranslationAcademy,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
