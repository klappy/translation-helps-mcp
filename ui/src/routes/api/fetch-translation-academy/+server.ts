/**
 * Fetch Translation Academy Endpoint v2
 *
 * Returns translation academy articles relevant to a Bible reference.
 * Uses all our consistency patterns and standard responses.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

// Mock translation academy data for demo
const MOCK_ACADEMY = {
	'Titus 1:1': [
		{
			id: 'ta001',
			title: 'Abstract Nouns',
			category: 'translate',
			reference: 'Titus 1:1',
			supportReference: 'rc://*/ta/man/translate/figs-abstractnouns',
			content:
				'Abstract nouns are nouns that refer to attitudes, qualities, events, or situations. In this verse, "faith" and "knowledge" are abstract nouns.',
			examples: [
				'If your language does not use abstract nouns, you can express the same ideas in other ways.',
				'Instead of "faith," you could say "believing" or "trusting."'
			],
			relatedArticles: ['figs-metaphor', 'figs-explicit']
		},
		{
			id: 'ta002',
			title: 'Apostle',
			category: 'bible',
			reference: 'Titus 1:1',
			supportReference: 'rc://*/tw/dict/bible/kt/apostle',
			content:
				'The term "apostle" means "someone who is sent out." An apostle is someone who has been given the authority to represent the one who sent them.',
			examples: [
				'Jesus chose twelve apostles to be his closest disciples.',
				'Paul was called to be an apostle to the Gentiles.'
			],
			relatedArticles: ['disciple', 'authority']
		}
	],
	'John 3:16': [
		{
			id: 'ta003',
			title: 'Exclusive and Inclusive "We"',
			category: 'translate',
			reference: 'John 3:16',
			supportReference: 'rc://*/ta/man/translate/figs-exclusive',
			content:
				'Some languages have different forms of "we" depending on whether the speaker is including the person being spoken to.',
			examples: [
				'Exclusive: We (but not you) are going to the store.',
				"Inclusive: We (including you) are all God's children."
			],
			relatedArticles: ['figs-you', 'figs-pronouns']
		},
		{
			id: 'ta004',
			title: 'Metaphor',
			category: 'translate',
			reference: 'John 3:16',
			supportReference: 'rc://*/ta/man/translate/figs-metaphor',
			content:
				'A metaphor is a figure of speech that uses one thing to mean another thing. In this verse, "perish" is used metaphorically for eternal death.',
			examples: [
				'The word "perish" literally means to die physically.',
				'Here it means to be eternally separated from God.'
			],
			relatedArticles: ['figs-simile', 'figs-metonymy']
		},
		{
			id: 'ta005',
			title: 'God',
			category: 'bible',
			reference: 'John 3:16',
			supportReference: 'rc://*/tw/dict/bible/kt/god',
			content:
				'The term "God" refers to the eternal being who created the universe. He alone deserves to be worshiped.',
			examples: ['There is only one true God.', 'God exists as Father, Son, and Holy Spirit.'],
			relatedArticles: ['godthefather', 'sonofgod', 'holyspirit']
		}
	]
};

/**
 * Fetch translation academy articles for a reference
 */
async function fetchTranslationAcademy(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// In real implementation, this would fetch from ZIP cache
	// For now, return mock data
	const articles = MOCK_ACADEMY[reference as keyof typeof MOCK_ACADEMY] || [];

	if (articles.length === 0) {
		// Return empty array with proper metadata instead of error
		return createTranslationHelpsResponse([], reference, language, organization, 'ta');
	}

	// Return in standard format
	return createTranslationHelpsResponse(articles, reference, language, organization, 'ta');
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-academy-v2',

	// Use common parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationAcademy,

	// Use standard error handler
	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
