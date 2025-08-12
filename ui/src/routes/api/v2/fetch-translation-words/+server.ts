/**
 * Fetch Translation Words Endpoint v2
 *
 * Returns translation word definitions for a given Bible reference.
 * Uses all our consistency patterns and standard responses.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

// Mock translation words data for demo
const MOCK_WORDS = {
	'Titus 1:1': [
		{
			id: 'tw001',
			word: 'servant',
			definition: 'A person who serves another person, especially a person who serves God.',
			aliases: ['slave', 'bondservant'],
			examples: ['Paul, a servant of God', 'Moses, the servant of the Lord'],
			strongs: ['G1401'],
			reference: 'Titus 1:1',
			occurrences: 1
		},
		{
			id: 'tw002',
			word: 'apostle',
			definition: 'Someone who is sent out by God as his special messenger and representative.',
			aliases: ['messenger', 'sent one'],
			examples: ['the twelve apostles', 'Paul, an apostle of Jesus Christ'],
			strongs: ['G652'],
			reference: 'Titus 1:1',
			occurrences: 1
		},
		{
			id: 'tw003',
			word: 'faith',
			definition:
				'Trust or confidence in someone or something; belief in the truth of God and his Word.',
			aliases: ['believe', 'trust', 'confidence'],
			examples: ['faith in Jesus Christ', "the faith of God's elect"],
			strongs: ['G4102'],
			reference: 'Titus 1:1',
			occurrences: 1
		}
	],
	'John 3:16': [
		{
			id: 'tw004',
			word: 'love',
			definition:
				'To have a strong affection for someone or something; to care deeply about someone.',
			aliases: ['beloved', 'affection'],
			examples: ['God so loved the world', 'love your neighbor'],
			strongs: ['G25'],
			reference: 'John 3:16',
			occurrences: 1
		},
		{
			id: 'tw005',
			word: 'world',
			definition:
				'In the Bible, "world" can refer to the earth, the people on earth, or the sinful values and behaviors of people.',
			aliases: ['earth', 'people', 'society'],
			examples: ['God loved the world', 'do not love the world'],
			strongs: ['G2889'],
			reference: 'John 3:16',
			occurrences: 1
		},
		{
			id: 'tw006',
			word: 'eternal life',
			definition: 'Life that never ends; life with God that continues after physical death.',
			aliases: ['everlasting life', 'life forever'],
			examples: ['have eternal life', 'the gift of eternal life'],
			strongs: ['G166', 'G2222'],
			reference: 'John 3:16',
			occurrences: 1
		},
		{
			id: 'tw007',
			word: 'perish',
			definition: 'To die or be destroyed; to be eternally separated from God.',
			aliases: ['die', 'be destroyed', 'be lost'],
			examples: ['should not perish', 'those who are perishing'],
			strongs: ['G622'],
			reference: 'John 3:16',
			occurrences: 1
		}
	]
};

/**
 * Fetch translation words for a reference
 */
async function fetchTranslationWords(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// In real implementation, this would fetch from ZIP cache
	// For now, return mock data
	const words = MOCK_WORDS[reference as keyof typeof MOCK_WORDS] || [];

	if (words.length === 0) {
		// Return empty array with proper metadata instead of error
		return createTranslationHelpsResponse([], reference, language, organization, 'tw');
	}

	// Return in standard format
	return createTranslationHelpsResponse(words, reference, language, organization, 'tw');
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-words-v2',

	// Use common parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationWords,

	// Use standard error handler
	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
