/**
 * Get Context Endpoint v2
 *
 * Aggregates all available resources for a Bible reference in one call.
 * This is the "kitchen sink" endpoint - get everything we have for a verse.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import type { StandardMetadata } from '$lib/standardResponses.js';

// Mock aggregated context data
const MOCK_CONTEXT = {
	'John 3:16': {
		scripture: {
			reference: 'John 3:16',
			text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
			version: 'ULT'
		},
		translationNotes: [
			{
				id: 'tn_john_3_16_001',
				noteType: 'general',
				content:
					'This is one of the most famous verses in the Bible, summarizing the gospel message.',
				quote: 'For God so loved'
			},
			{
				id: 'tn_john_3_16_002',
				noteType: 'key-term',
				content: 'The Greek word for "world" here refers to all humanity, not the physical earth.',
				quote: 'the world'
			}
		],
		translationWords: [
			{
				term: 'love',
				definition: 'To have a strong affection for someone; to care deeply.',
				occurrence: 'loved',
				strongs: ['G25']
			},
			{
				term: 'eternal-life',
				definition: 'Life that never ends; spiritual life that continues after physical death.',
				occurrence: 'eternal life',
				strongs: ['G166', 'G2222']
			},
			{
				term: 'believe',
				definition: 'To trust; to have faith in someone or something.',
				occurrence: 'believes',
				strongs: ['G4100']
			}
		],
		translationQuestions: [
			{
				id: 'tq_john_3_16_001',
				question: 'What did God give because of his love for the world?',
				answer: 'God gave his only Son.'
			},
			{
				id: 'tq_john_3_16_002',
				question: "What happens to those who believe in God's Son?",
				answer: 'They will not perish but have eternal life.'
			}
		],
		translationAcademy: [
			{
				id: 'ta_metaphor',
				title: 'Metaphor',
				relevance: 'Understanding "perish" as spiritual death'
			},
			{
				id: 'ta_abstract_nouns',
				title: 'Abstract Nouns',
				relevance: 'Translating concepts like "love" and "life"'
			}
		],
		crossReferences: ['Romans 5:8', '1 John 4:9-10', 'John 10:28', 'Romans 6:23']
	},
	'Genesis 1:1': {
		scripture: {
			reference: 'Genesis 1:1',
			text: 'In the beginning, God created the heavens and the earth.',
			version: 'ULT'
		},
		translationNotes: [
			{
				id: 'tn_gen_1_1_001',
				noteType: 'general',
				content: 'This verse introduces the biblical account of creation.',
				quote: 'In the beginning'
			}
		],
		translationWords: [
			{
				term: 'god',
				definition: 'The supreme being who created and rules over everything.',
				occurrence: 'God',
				strongs: ['H430']
			},
			{
				term: 'create',
				definition: 'To make something out of nothing.',
				occurrence: 'created',
				strongs: ['H1254']
			},
			{
				term: 'heaven',
				definition: 'The sky; the dwelling place of God.',
				occurrence: 'heavens',
				strongs: ['H8064']
			}
		],
		translationQuestions: [
			{
				id: 'tq_gen_1_1_001',
				question: 'When did God create the heavens and the earth?',
				answer: 'In the beginning.'
			}
		],
		translationAcademy: [
			{
				id: 'ta_writing_intro',
				title: 'Introduction of a New Event',
				relevance: 'How to translate the opening of narratives'
			}
		],
		crossReferences: ['John 1:1-3', 'Hebrews 11:3', 'Psalm 33:6', 'Revelation 4:11']
	}
};

/**
 * Get aggregated context for a Bible reference
 */
async function getContext(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization, includeEmpty = false } = params;

	// Get mock data for the reference
	const contextData = MOCK_CONTEXT[reference as keyof typeof MOCK_CONTEXT];

	if (!contextData) {
		// Return empty context structure if not found and includeEmpty is true
		if (includeEmpty) {
			return {
				reference,
				language,
				organization,
				scripture: null,
				translationNotes: [],
				translationWords: [],
				translationQuestions: [],
				translationAcademy: [],
				crossReferences: [],
				metadata: {
					reference,
					language,
					organization,
					source: 'aggregated-context',
					timestamp: new Date().toISOString(),
					aggregationTime: 15,
					resourcesFound: {
						scripture: false,
						notes: 0,
						words: 0,
						questions: 0,
						academy: 0,
						crossReferences: 0
					},
					totalResources: 0
				} as StandardMetadata
			};
		}
		throw new Error(`No context found for reference: ${reference}`);
	}

	// Calculate resource counts
	const resourcesFound = {
		scripture: !!contextData.scripture,
		notes: contextData.translationNotes.length,
		words: contextData.translationWords.length,
		questions: contextData.translationQuestions.length,
		academy: contextData.translationAcademy.length,
		crossReferences: contextData.crossReferences.length
	};

	const totalResources =
		(resourcesFound.scripture ? 1 : 0) +
		resourcesFound.notes +
		resourcesFound.words +
		resourcesFound.questions +
		resourcesFound.academy +
		resourcesFound.crossReferences;

	return {
		reference,
		language,
		organization,
		...contextData,
		metadata: {
			reference,
			language,
			organization,
			source: 'aggregated-context',
			timestamp: new Date().toISOString(),
			aggregationTime: Math.floor(Math.random() * 50) + 100, // Mock aggregation time
			resourcesFound,
			totalResources,
			coverage: {
				hasScripture: resourcesFound.scripture,
				hasNotes: resourcesFound.notes > 0,
				hasWords: resourcesFound.words > 0,
				hasQuestions: resourcesFound.questions > 0,
				hasAcademy: resourcesFound.academy > 0,
				hasCrossReferences: resourcesFound.crossReferences > 0
			}
		} as StandardMetadata
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'get-context-v2',

	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'includeEmpty',
			type: 'boolean',
			default: false
		}
	],

	fetch: getContext,

	onError: createStandardErrorHandler({
		'No context found for reference': {
			status: 404,
			message:
				'No resources available for the specified reference. Try includeEmpty=true for empty structure.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
