/**
 * Fetch ULT Scripture Endpoint v2
 *
 * Specialized endpoint for fetching only ULT (unfoldingWord Literal Text) scripture.
 * A focused version of fetch-scripture that returns only the literal translation.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createScriptureResponse } from '$lib/standardResponses.js';

// Mock ULT scripture data
const ULT_SCRIPTURE_DATA = {
	'John 3:16':
		'For God loved the world in this way: he gave his one and only Son, so that everyone who believes in him will not perish but will have eternal life.',
	'Genesis 1:1': 'In the beginning, God created the heavens and the earth.',
	'Psalm 23:1': 'A psalm of David. Yahweh is my shepherd; I will lack nothing.',
	'Romans 8:28':
		'We know that for those who love God, he works all things together for good, for those who are called according to his purpose.',
	'Matthew 5:3': 'Blessed are the poor in spirit, for theirs is the kingdom of heaven.',
	'Isaiah 53:5':
		'But he was pierced for our transgressions; he was crushed for our iniquities; the punishment for our peace was on him, and by his wounds we are healed.',
	'Proverbs 3:5': 'Trust in Yahweh with all your heart and do not lean on your own understanding.',
	'Philippians 4:13': 'I can do all things through him who strengthens me.',
	'Jeremiah 29:11':
		"For I know the plans that I have for you—this is Yahweh's declaration—plans for peace and not for disaster, to give you a future and a hope.",
	'1 Corinthians 13:4': 'Love is patient and kind. Love does not envy or boast. It is not arrogant'
};

// ULT metadata
const ULT_INFO = {
	name: 'unfoldingWord Literal Text',
	abbreviation: 'ULT',
	description: 'A form-centric translation that closely follows the Hebrew and Greek texts',
	language: 'en',
	textDirection: 'ltr',
	copyright: 'Public Domain',
	licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
	publisher: 'unfoldingWord',
	version: '37',
	checking_level: '3'
};

/**
 * Fetch ULT scripture for a reference
 */
async function fetchUltScripture(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	// Get ULT text for reference
	const text = ULT_SCRIPTURE_DATA[reference as keyof typeof ULT_SCRIPTURE_DATA];

	if (!text) {
		throw new Error(`ULT scripture not found for reference: ${reference}`);
	}

	// Build scripture response
	const scripture = [
		{
			reference,
			text,
			resource: 'ult',
			language,
			organization,
			version: 'ULT',
			citation: `${reference} (ULT)`,
			copyright: ULT_INFO.copyright,
			direction: ULT_INFO.textDirection,
			resourceInfo: ULT_INFO
		}
	];

	return createScriptureResponse(scripture, {
		reference,
		language,
		organization,
		resource: 'ult',
		translator: 'unfoldingWord',
		checkingLevel: ULT_INFO.checking_level
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-ult-scripture-v2',

	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchUltScripture,

	onError: createStandardErrorHandler({
		'ULT scripture not found for reference': {
			status: 404,
			message: 'ULT translation not available for the specified reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
