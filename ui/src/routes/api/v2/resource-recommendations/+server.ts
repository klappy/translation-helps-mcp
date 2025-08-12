/**
 * Resource Recommendations Endpoint v2
 *
 * Provides intelligent recommendations for translation resources based on context.
 * Suggests the most relevant resources for a given Bible reference and user needs.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createListResponse } from '$lib/standardResponses.js';

// Recommendation categories
const _RECOMMENDATION_TYPES = {
	essential: 'Must-have resources for basic understanding',
	helpful: 'Additional resources for deeper study',
	advanced: 'Resources for complex translation challenges'
};

// Mock recommendation engine
const RECOMMENDATIONS = {
	// Recommendations based on book/genre
	gospel: {
		essential: [
			{
				resourceType: 'tn',
				title: 'Translation Notes',
				reason: 'Critical for understanding cultural and historical context in Gospel narratives',
				priority: 1
			},
			{
				resourceType: 'tw',
				title: 'Translation Words',
				reason: 'Key terms like "Son of God", "Kingdom of Heaven" need careful translation',
				priority: 2
			}
		],
		helpful: [
			{
				resourceType: 'tq',
				title: 'Translation Questions',
				reason: 'Helps ensure key Gospel themes are clearly communicated',
				priority: 3
			},
			{
				resourceType: 'ta',
				title: 'Translation Academy',
				reason: 'Articles on parables, metaphors, and narrative techniques',
				priority: 4
			}
		],
		advanced: [
			{
				resourceType: 'obs',
				title: 'Open Bible Stories',
				reason: 'Simplified Gospel narratives can clarify complex passages',
				priority: 5
			}
		]
	},
	epistle: {
		essential: [
			{
				resourceType: 'tw',
				title: 'Translation Words',
				reason: 'Theological terms in epistles require precise translation',
				priority: 1
			},
			{
				resourceType: 'tn',
				title: 'Translation Notes',
				reason: 'Complex arguments and reasoning need explanation',
				priority: 2
			}
		],
		helpful: [
			{
				resourceType: 'ta',
				title: 'Translation Academy',
				reason: 'Articles on rhetoric, argumentation, and letter writing conventions',
				priority: 3
			}
		],
		advanced: [
			{
				resourceType: 'tq',
				title: 'Translation Questions',
				reason: 'Verify understanding of theological concepts',
				priority: 4
			}
		]
	},
	poetry: {
		essential: [
			{
				resourceType: 'ta',
				title: 'Translation Academy',
				reason: 'Understanding Hebrew poetry structure is crucial',
				priority: 1
			},
			{
				resourceType: 'tn',
				title: 'Translation Notes',
				reason: 'Poetic imagery and parallelism need explanation',
				priority: 2
			}
		],
		helpful: [
			{
				resourceType: 'tw',
				title: 'Translation Words',
				reason: 'Poetic vocabulary often has special meanings',
				priority: 3
			}
		],
		advanced: [
			{
				resourceType: 'tq',
				title: 'Translation Questions',
				reason: 'Ensure poetic meaning is preserved in translation',
				priority: 4
			}
		]
	}
};

// Book genre mapping
const BOOK_GENRES: Record<string, string> = {
	// Gospels
	Matthew: 'gospel',
	Mark: 'gospel',
	Luke: 'gospel',
	John: 'gospel',
	// Epistles
	Romans: 'epistle',
	'1 Corinthians': 'epistle',
	'2 Corinthians': 'epistle',
	Galatians: 'epistle',
	Ephesians: 'epistle',
	Philippians: 'epistle',
	Colossians: 'epistle',
	'1 Thessalonians': 'epistle',
	'2 Thessalonians': 'epistle',
	'1 Timothy': 'epistle',
	'2 Timothy': 'epistle',
	Titus: 'epistle',
	Philemon: 'epistle',
	Hebrews: 'epistle',
	James: 'epistle',
	'1 Peter': 'epistle',
	'2 Peter': 'epistle',
	'1 John': 'epistle',
	'2 John': 'epistle',
	'3 John': 'epistle',
	Jude: 'epistle',
	// Poetry
	Psalms: 'poetry',
	Proverbs: 'poetry',
	Ecclesiastes: 'poetry',
	'Song of Solomon': 'poetry',
	Lamentations: 'poetry',
	// Default to epistle for others (prophets, history, etc.)
	default: 'epistle'
};

// Specific verse recommendations
const VERSE_SPECIFIC_RECOMMENDATIONS: Record<string, any> = {
	'John 3:16': {
		specific: [
			{
				resourceType: 'tw',
				title: 'Key Terms: Love, World, Eternal Life',
				reason: 'This verse contains multiple theological key terms',
				priority: 0
			}
		]
	},
	'Genesis 1:1': {
		specific: [
			{
				resourceType: 'ta',
				title: 'Article: Translating "Create"',
				reason: 'The Hebrew word "bara" has specific theological implications',
				priority: 0
			}
		]
	}
};

/**
 * Get resource recommendations
 */
async function getResourceRecommendations(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { reference, language, organization, userRole = 'translator', includeAll = false } = params;

	// Parse reference to get book
	const bookMatch = reference?.match(/^(\d?\s?[A-Za-z]+)/);
	const book = bookMatch ? bookMatch[1].trim() : null;

	// Determine genre
	const genre = book ? BOOK_GENRES[book] || BOOK_GENRES.default : BOOK_GENRES.default;

	// Get base recommendations for genre
	const genreRecs =
		RECOMMENDATIONS[genre as keyof typeof RECOMMENDATIONS] || RECOMMENDATIONS.epistle;

	// Get verse-specific recommendations if available
	const verseSpecific = VERSE_SPECIFIC_RECOMMENDATIONS[reference] || { specific: [] };

	// Combine recommendations
	let allRecommendations = [
		...verseSpecific.specific,
		...genreRecs.essential,
		...(includeAll ? [...genreRecs.helpful, ...genreRecs.advanced] : genreRecs.helpful)
	];

	// Add user role specific adjustments
	if (userRole === 'reviewer') {
		allRecommendations = allRecommendations.map((rec) => ({
			...rec,
			reason: rec.reason + ' (Important for review process)'
		}));
	} else if (userRole === 'student') {
		// Prioritize learning resources
		allRecommendations = allRecommendations.sort((a, b) => {
			if (a.resourceType === 'ta') return -1;
			if (b.resourceType === 'ta') return 1;
			return a.priority - b.priority;
		});
	}

	// Sort by priority
	allRecommendations.sort((a, b) => a.priority - b.priority);

	// Calculate confidence scores
	const recommendations = allRecommendations.map((rec, index) => ({
		...rec,
		confidence: Math.max(100 - index * 10, 60), // Decreasing confidence
		rank: index + 1
	}));

	return createListResponse(recommendations, {
		reference,
		language,
		organization,
		userRole,
		genre,
		source: 'recommendation-engine',
		totalRecommendations: recommendations.length,
		categories: {
			essential: recommendations.filter((r) =>
				genreRecs.essential.some((e) => e.resourceType === r.resourceType)
			).length,
			helpful: recommendations.filter((r) =>
				genreRecs.helpful.some((h) => h.resourceType === r.resourceType)
			).length,
			advanced: recommendations.filter((r) =>
				genreRecs.advanced.some((a) => a.resourceType === r.resourceType)
			).length,
			specific: verseSpecific.specific.length
		},
		confidenceRange: {
			min: Math.min(...recommendations.map((r) => r.confidence)),
			max: Math.max(...recommendations.map((r) => r.confidence)),
			average: Math.round(
				recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
			)
		}
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'resource-recommendations-v2',

	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'userRole',
			validate: (value) => {
				if (!value) return true;
				return ['translator', 'reviewer', 'student', 'consultant'].includes(value);
			}
		},
		{
			name: 'includeAll',
			type: 'boolean',
			default: false
		}
	],

	fetch: getResourceRecommendations,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
