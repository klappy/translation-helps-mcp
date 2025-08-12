/**
 * Get Translation Word Endpoint v2
 *
 * Retrieves detailed information about a specific translation word/term.
 * Can look up by term name or direct path.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';

// Mock word database (same as browse endpoint for consistency)
const WORD_DATABASE = {
	faith: {
		id: 'tw_kt_001',
		word: 'faith',
		category: 'kt',
		categoryName: 'Key Terms',
		definition:
			'Trust or confidence in someone or something; belief in the truth of God and his Word.',
		extendedDefinition:
			'Faith is being sure of the things we hope for and knowing that something is real even if we do not see it. Faith in Jesus saves us from our sins and gives us eternal life.',
		facts: [
			'Faith involves believing that God exists, that he is who the Bible says he is, and that he will do what he has promised.',
			'Having faith in Jesus means believing that he is the Son of God, that he died on the cross to pay for our sins, and that he rose from the dead.',
			'True faith or belief in Jesus includes repenting of sin and obeying Jesus.'
		],
		strongs: ['G4102'],
		aliases: ['believe', 'trust', 'confidence', 'faithful', 'believer'],
		examples: [
			{
				reference: 'Hebrews 11:1',
				text: 'Now faith is being sure of the things we hope for and knowing that something is real even if we do not see it.'
			},
			{
				reference: 'Romans 10:9',
				text: 'If you declare with your mouth that Jesus is Lord and believe in your heart that God raised him from the dead, you will be saved.'
			}
		],
		translationSuggestions: [
			'In some contexts, "faith" can be translated as "belief" or "conviction" or "confidence" or "trust."',
			'Some languages may have more than one word that translates "faith," depending on the context.',
			'The phrase "keep the faith" could be translated as "keep believing in Jesus" or "continue to believe in Jesus."'
		],
		occurrences: 243,
		relatedWords: ['believe', 'faithful', 'faithfulness', 'trust']
	},
	love: {
		id: 'tw_kt_002',
		word: 'love',
		category: 'kt',
		categoryName: 'Key Terms',
		definition:
			'To have a strong affection for someone or something; to care deeply about someone.',
		extendedDefinition:
			"The Bible teaches that God's love is unconditional and sacrificial. He loved us while we were still sinners and sent his Son to die for us.",
		facts: [
			'God is love, and the source of true love.',
			'Jesus showed the greatest love by giving his life to rescue people from sin and death.',
			'We love God and others because God first loved us.',
			'Love is patient, kind, does not envy, does not boast, and is not proud.'
		],
		strongs: ['G25', 'G26'],
		aliases: ['beloved', 'affection', 'charity', 'care for'],
		examples: [
			{
				reference: 'John 3:16',
				text: 'For God so loved the world that he gave his one and only Son...'
			},
			{
				reference: '1 Corinthians 13:4-5',
				text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.'
			}
		],
		translationSuggestions: [
			'This term can be translated with a word or phrase that means "deep caring" or "valuing someone or something very much."',
			'Some languages might translate "love" with different words depending on the context (love for God, brotherly love, romantic love, etc.).',
			"Make sure the word used to translate God's love can include the concept of sacrifice."
		],
		occurrences: 714,
		relatedWords: ['beloved', 'loving', 'lovingkindness']
	},
	abraham: {
		id: 'tw_names_001',
		word: 'Abraham',
		category: 'names',
		categoryName: 'Names',
		definition: 'The ancestor of the Israelites, known for his faith in God.',
		extendedDefinition:
			'Abraham, originally named Abram, was called by God to leave his home and go to the land that God would show him. God promised to make him into a great nation.',
		facts: [
			'God changed Abram\'s name to Abraham, which means "father of many."',
			"Abraham believed God's promise that he would have a son, even though he and Sarah were very old.",
			'Abraham is an important person in Judaism, Christianity, and Islam.',
			'Abraham showed great faith when he was willing to sacrifice his son Isaac in obedience to God.'
		],
		strongs: ['G11'],
		aliases: ['Abram'],
		examples: [
			{
				reference: 'Genesis 12:1',
				text: 'The LORD said to Abram, "Go from your country... to the land I will show you."'
			},
			{
				reference: 'Romans 4:3',
				text: 'Abraham believed God, and it was credited to him as righteousness.'
			}
		],
		translationSuggestions: [
			'Abraham and Abram are names, so they should be transliterated, not translated.',
			'If your language has a common way of spelling Abraham from Bible translations, use that spelling.',
			'Some languages may need to add a note explaining that Abram and Abraham are the same person.'
		],
		occurrences: 231,
		relatedWords: ['Sarah', 'Isaac', 'patriarch']
	},
	servant: {
		id: 'tw_other_001',
		word: 'servant',
		category: 'other',
		categoryName: 'Other',
		definition: 'A person who serves another person, especially a person who serves God.',
		extendedDefinition:
			'In Bible times, a servant was someone who worked for another person, either by choice or by force. The word is also used figuratively for someone who serves God.',
		facts: [
			'Some servants were slaves who were owned by their master.',
			'Other servants worked for pay or to repay a debt.',
			'In the New Testament, Christians are called servants of God and of Christ.',
			"Being God's servant is an honor, not a burden."
		],
		strongs: ['G1401'],
		aliases: ['slave', 'bondservant', 'minister', 'attendant'],
		examples: [
			{
				reference: 'Romans 1:1',
				text: 'Paul, a servant of Christ Jesus, called to be an apostle...'
			},
			{
				reference: 'Luke 17:10',
				text: 'So you also, when you have done everything you were told to do, should say, "We are unworthy servants; we have only done our duty."'
			}
		],
		translationSuggestions: [
			'When referring to a person who serves God, this can be translated as "one who serves God" or "one who worships God" or "one who obeys God."',
			'When referring to a slave, this could be translated as "one who is owned by another" or "one who must serve another."',
			'In the context of a servant doing his duty, this could be translated as "worker" or "laborer" or "employee."'
		],
		occurrences: 454,
		relatedWords: ['serve', 'service', 'ministry', 'bondservant']
	}
};

/**
 * Get a specific translation word
 */
async function getTranslationWord(params: Record<string, any>, _request: Request): Promise<any> {
	const { term, path, language, organization } = params;

	// Extract term from path if provided
	let wordKey = term;
	if (!wordKey && path) {
		// Extract from paths like "bible/kt/faith.md" or "bible/names/abraham.md"
		const match = path.match(/\/([^/]+)\.md$/);
		if (match) {
			wordKey = match[1].toLowerCase();
		}
	}

	if (!wordKey) {
		throw new Error('Either term or path parameter is required');
	}

	// Look up the word
	const word = WORD_DATABASE[wordKey.toLowerCase() as keyof typeof WORD_DATABASE];

	if (!word) {
		throw new Error(`Translation word not found: ${wordKey}`);
	}

	// Return the word data with metadata
	return {
		...word,
		language,
		organization,
		source: 'TW',
		metadata: {
			language,
			organization,
			source: 'TW',
			category: word.categoryName,
			relatedCount: word.relatedWords.length,
			exampleCount: word.examples.length
		}
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'get-translation-word-v2',

	params: [
		{
			name: 'term',
			validate: (value) => {
				// Optional, but if provided must be non-empty
				if (!value) return true;
				return value.length > 0;
			}
		},
		{
			name: 'path',
			validate: (value) => {
				// Optional, but if provided must match expected format
				if (!value) return true;
				return value.endsWith('.md');
			}
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization
	],

	fetch: getTranslationWord,

	onError: createStandardErrorHandler({
		'Either term or path parameter is required': {
			status: 400,
			message: 'Please provide either a term (e.g., "faith") or path (e.g., "bible/kt/faith.md")'
		},
		'Translation word not found': {
			status: 404,
			message: 'The requested translation word was not found in our database.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
