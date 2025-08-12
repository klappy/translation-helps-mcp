/**
 * Fetch UST Scripture Endpoint v2
 *
 * Specialized endpoint for fetching only UST (unfoldingWord Simplified Text) scripture.
 * A focused version of fetch-scripture that returns only the simplified translation.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createScriptureResponse } from '$lib/standardResponses.js';

// Mock UST scripture data
const UST_SCRIPTURE_DATA = {
	'John 3:16':
		'God loved all the people in the world in this way: He gave his only Son to die for them. The result is that everyone who trusts in him will not perish. Instead, they will live forever.',
	'Genesis 1:1': 'In the beginning, God created the sky and the earth.',
	'Psalm 23:1': 'Yahweh is like a shepherd who takes care of me; I have everything that I need.',
	'Romans 8:28':
		'And we know that for those who love God, he works to use all things for their good. This is true for those whom he has chosen to be his people.',
	'Matthew 5:3':
		'God is pleased with people who know that they need him. He will let them be part of his kingdom in heaven.',
	'Isaiah 53:5':
		'But people pierced him through because we had done wrong. They crushed him because of our sins. He suffered in our place so that we would have peace. By his wounds we are healed.',
	'Proverbs 3:5': 'Trust Yahweh completely, and do not rely on your own understanding.',
	'Philippians 4:13': 'I am able to do everything because Christ makes me strong.',
	'Jeremiah 29:11':
		'I, Yahweh, know the plans that I have for you. They are plans for your peace and well-being, not plans to harm you. I will give you a future filled with hope.',
	'1 Corinthians 13:4':
		'If you love others, you will be patient with them and kind to them. You will not envy others or boast about yourself. You will not be proud.'
};

// UST metadata
const UST_INFO = {
	name: 'unfoldingWord Simplified Text',
	abbreviation: 'UST',
	description:
		'A meaning-centric translation that expresses the meanings of the Hebrew and Greek texts',
	language: 'en',
	textDirection: 'ltr',
	copyright: 'Public Domain',
	licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
	publisher: 'unfoldingWord',
	version: '38',
	checking_level: '3',
	reading_level: '7th grade'
};

/**
 * Fetch UST scripture for a reference
 */
async function fetchUstScripture(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// Get UST text for reference
	const text = UST_SCRIPTURE_DATA[reference as keyof typeof UST_SCRIPTURE_DATA];

	if (!text) {
		throw new Error(`UST scripture not found for reference: ${reference}`);
	}

	// Build scripture response
	const scripture = [
		{
			reference,
			text,
			resource: 'ust',
			language,
			organization,
			version: 'UST',
			citation: `${reference} (UST)`,
			copyright: UST_INFO.copyright,
			direction: UST_INFO.textDirection,
			resourceInfo: UST_INFO
		}
	];

	return createScriptureResponse(scripture, {
		reference,
		language,
		organization,
		resource: 'ust',
		translator: 'unfoldingWord',
		checkingLevel: UST_INFO.checking_level,
		readingLevel: UST_INFO.reading_level
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-ust-scripture-v2',

	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchUstScripture,

	onError: createStandardErrorHandler({
		'UST scripture not found for reference': {
			status: 404,
			message: 'UST translation not available for the specified reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
