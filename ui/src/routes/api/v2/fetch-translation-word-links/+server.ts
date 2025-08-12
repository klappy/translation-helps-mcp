/**
 * Fetch Translation Word Links Endpoint v2
 *
 * Returns links between Bible text and translation word entries.
 * These help identify which words in a verse have dictionary entries.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

// Mock translation word links data
const MOCK_WORD_LINKS = {
	'Titus 1:1': [
		{
			id: 'twl001',
			reference: 'Titus 1:1',
			occurrence: 1,
			quote: 'servant',
			word: 'servant',
			strongsId: 'G1401',
			rcLink: 'rc://*/tw/dict/bible/other/servant',
			position: { start: 7, end: 14 }
		},
		{
			id: 'twl002',
			reference: 'Titus 1:1',
			occurrence: 1,
			quote: 'apostle',
			word: 'apostle',
			strongsId: 'G652',
			rcLink: 'rc://*/tw/dict/bible/kt/apostle',
			position: { start: 30, end: 37 }
		},
		{
			id: 'twl003',
			reference: 'Titus 1:1',
			occurrence: 1,
			quote: 'faith',
			word: 'faith',
			strongsId: 'G4102',
			rcLink: 'rc://*/tw/dict/bible/kt/faith',
			position: { start: 75, end: 80 }
		}
	],
	'John 3:16': [
		{
			id: 'twl004',
			reference: 'John 3:16',
			occurrence: 1,
			quote: 'loved',
			word: 'love',
			strongsId: 'G25',
			rcLink: 'rc://*/tw/dict/bible/kt/love',
			position: { start: 11, end: 16 }
		},
		{
			id: 'twl005',
			reference: 'John 3:16',
			occurrence: 1,
			quote: 'world',
			word: 'world',
			strongsId: 'G2889',
			rcLink: 'rc://*/tw/dict/bible/kt/world',
			position: { start: 21, end: 26 }
		},
		{
			id: 'twl006',
			reference: 'John 3:16',
			occurrence: 1,
			quote: 'eternal life',
			word: 'eternity',
			strongsId: 'G166,G2222',
			rcLink: 'rc://*/tw/dict/bible/kt/eternity',
			position: { start: 108, end: 120 }
		},
		{
			id: 'twl007',
			reference: 'John 3:16',
			occurrence: 1,
			quote: 'perish',
			word: 'perish',
			strongsId: 'G622',
			rcLink: 'rc://*/tw/dict/bible/kt/perish',
			position: { start: 93, end: 99 }
		}
	]
};

/**
 * Fetch translation word links for a reference
 */
async function fetchTranslationWordLinks(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// In real implementation, this would fetch from ZIP cache
	// For now, return mock data
	const links = MOCK_WORD_LINKS[reference as keyof typeof MOCK_WORD_LINKS] || [];

	// Return in standard format
	return createTranslationHelpsResponse(links, reference, language, organization, 'twl');
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-word-links-v2',

	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationWordLinks,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
