/**
 * Get Words for Reference Endpoint v2
 *
 * Returns all translation words that appear in a specific Bible reference.
 * Useful for showing all key terms in a verse or passage.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

// Mock data mapping references to words
const REFERENCE_WORDS_MAP = {
	'John 3:16': [
		{
			id: 'tw_kt_002',
			word: 'love',
			category: 'kt',
			definition:
				'To have a strong affection for someone or something; to care deeply about someone.',
			strongs: ['G25'],
			position: { start: 11, end: 16 },
			quote: 'loved',
			occurrence: 1
		},
		{
			id: 'tw_kt_008',
			word: 'world',
			category: 'kt',
			definition:
				'In the Bible, "world" can refer to the earth, the people on earth, or the sinful values and behaviors of people.',
			strongs: ['G2889'],
			position: { start: 21, end: 26 },
			quote: 'world',
			occurrence: 1
		},
		{
			id: 'tw_kt_009',
			word: 'eternal life',
			category: 'kt',
			definition: 'Life that never ends; life with God that continues after physical death.',
			strongs: ['G166', 'G2222'],
			position: { start: 108, end: 120 },
			quote: 'eternal life',
			occurrence: 1
		},
		{
			id: 'tw_kt_010',
			word: 'perish',
			category: 'kt',
			definition: 'To die or be destroyed; to be eternally separated from God.',
			strongs: ['G622'],
			position: { start: 93, end: 99 },
			quote: 'perish',
			occurrence: 1
		},
		{
			id: 'tw_kt_011',
			word: 'believe',
			category: 'kt',
			definition: 'To trust that something is true; to have faith.',
			strongs: ['G4100'],
			position: { start: 78, end: 86 },
			quote: 'believes',
			occurrence: 1
		}
	],
	'Titus 1:1': [
		{
			id: 'tw_other_001',
			word: 'servant',
			category: 'other',
			definition: 'A person who serves another person, especially a person who serves God.',
			strongs: ['G1401'],
			position: { start: 7, end: 14 },
			quote: 'servant',
			occurrence: 1
		},
		{
			id: 'tw_kt_012',
			word: 'apostle',
			category: 'kt',
			definition: 'Someone who is sent out by God as his special messenger and representative.',
			strongs: ['G652'],
			position: { start: 30, end: 37 },
			quote: 'apostle',
			occurrence: 1
		},
		{
			id: 'tw_kt_001',
			word: 'faith',
			category: 'kt',
			definition:
				'Trust or confidence in someone or something; belief in the truth of God and his Word.',
			strongs: ['G4102'],
			position: { start: 75, end: 80 },
			quote: 'faith',
			occurrence: 1
		},
		{
			id: 'tw_kt_013',
			word: 'elect',
			category: 'kt',
			definition: "Chosen by God for salvation; God's chosen people.",
			strongs: ['G1588'],
			position: { start: 88, end: 93 },
			quote: 'elect',
			occurrence: 1
		},
		{
			id: 'tw_kt_014',
			word: 'truth',
			category: 'kt',
			definition: 'That which is real, genuine, or in accordance with fact.',
			strongs: ['G225'],
			position: { start: 115, end: 120 },
			quote: 'truth',
			occurrence: 1
		},
		{
			id: 'tw_kt_015',
			word: 'godliness',
			category: 'kt',
			definition: 'The quality of living in a way that honors and pleases God.',
			strongs: ['G2150'],
			position: { start: 140, end: 149 },
			quote: 'godliness',
			occurrence: 1
		}
	],
	'Genesis 1:1': [
		{
			id: 'tw_kt_016',
			word: 'God',
			category: 'kt',
			definition: 'The eternal being who created the universe and everything in it.',
			strongs: ['H430'],
			position: { start: 19, end: 22 },
			quote: 'God',
			occurrence: 1
		},
		{
			id: 'tw_kt_017',
			word: 'create',
			category: 'kt',
			definition: 'To make something out of nothing; to cause something to exist.',
			strongs: ['H1254'],
			position: { start: 23, end: 30 },
			quote: 'created',
			occurrence: 1
		},
		{
			id: 'tw_kt_018',
			word: 'heaven',
			category: 'kt',
			definition: 'The place where God lives; the sky and everything beyond it.',
			strongs: ['H8064'],
			position: { start: 35, end: 41 },
			quote: 'heaven',
			occurrence: 1
		}
	]
};

/**
 * Get words for a specific reference
 */
async function getWordsForReference(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// Get words for the reference
	const words = REFERENCE_WORDS_MAP[reference as keyof typeof REFERENCE_WORDS_MAP] || [];

	// Sort by position in the verse
	const sortedWords = [...words].sort((a, b) => a.position.start - b.position.start);

	// Add some summary statistics
	const _categories = words.reduce(
		(acc, word) => {
			acc[word.category] = (acc[word.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	// Return in standard format with enhanced metadata
	return createTranslationHelpsResponse(sortedWords, reference, language, organization, 'tw');
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'get-words-for-reference-v2',

	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: getWordsForReference,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
