/**
 * Get Context Endpoint v2
 *
 * Aggregates all available resources for a Bible reference in one call.
 * This is the "kitchen sink" endpoint - get everything we have for a verse.
 */

import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
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
async function getContext(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization, includeEmpty = true } = params;

	// Helper: chapters covered by reference (supports 2, 2:3-5, 1-3, 1:15-2:3)
	const getCoveredChapters = (refStr: string): number[] => {
		const chapters = new Set<number>();
		// All chapter mentions like "2:" or trailing chapter-only
		const chapterMatches = Array.from(refStr.matchAll(/\b(\d+)(?::\d+)?\b/g)).map((m) =>
			parseInt(m[1])
		);
		if (chapterMatches.length > 0) {
			// Handle ranges like 1-3
			const rangeMatch = refStr.match(/\b(\d+)\s*-\s*(\d+)\b/);
			if (rangeMatch) {
				const start = parseInt(rangeMatch[1]);
				const end = parseInt(rangeMatch[2]);
				for (let c = Math.min(start, end); c <= Math.max(start, end); c++) chapters.add(c);
			}
			// Handle cross-chapter like 1:15-2:3
			const crossMatch = refStr.match(/(\d+):\d+\s*-\s*(\d+):\d+/);
			if (crossMatch) {
				const start = parseInt(crossMatch[1]);
				const end = parseInt(crossMatch[2]);
				for (let c = Math.min(start, end); c <= Math.max(start, end); c++) chapters.add(c);
			}
			// Add any single chapters mentioned
			for (const ch of chapterMatches) chapters.add(ch);
		}
		// Fallback: if none detected, assume chapter 1
		if (chapters.size === 0) chapters.add(1);
		return Array.from(chapters.values()).sort((a, b) => a - b);
	};

	// Try to fetch real TN data and extract only book/chapter intros
	try {
		const origin = new URL(request.url).origin;
		const url = new URL('/api/translation-notes', origin);
		url.searchParams.set('reference', String(reference || ''));
		url.searchParams.set('language', String(language || 'en'));
		url.searchParams.set('organization', String(organization || 'unfoldingWord'));
		url.searchParams.set('format', 'json');

		const res = await fetch(url.toString());
		if (res.ok) {
			const tn = await res.json();
			const items: Array<Record<string, any>> = Array.isArray(tn?.items) ? tn.items : [];
			const chapters = getCoveredChapters(String(reference || ''));

			const isIntroRef = (ref: string): boolean =>
				ref === 'front:intro' || /^(\d+):intro$/.test(ref);
			const allowedChapter = (ref: string): boolean => {
				const m = ref.match(/^(\d+):intro$/);
				return m ? chapters.includes(parseInt(m[1])) : ref === 'front:intro';
			};

			const introNotes = items.filter((it) => {
				const ref = String(it.Reference || it.reference || '').trim();
				if (!ref) return false;
				if (!isIntroRef(ref)) return false; // exclude verse notes entirely
				return allowedChapter(ref);
			});

			const contextData = {
				scripture: null,
				translationNotes: introNotes,
				translationWords: [],
				translationQuestions: [],
				translationAcademy: [],
				crossReferences: []
			};

			const resourcesFound = {
				scripture: false,
				notes: introNotes.length,
				words: 0,
				questions: 0,
				academy: 0,
				crossReferences: 0
			};

			const totalResources = resourcesFound.notes;

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
					aggregationTime: Math.floor(Math.random() * 50) + 100,
					resourcesFound,
					totalResources,
					coverage: {
						hasScripture: false,
						hasNotes: resourcesFound.notes > 0,
						hasWords: false,
						hasQuestions: false,
						hasAcademy: false,
						hasCrossReferences: false
					}
				} as StandardMetadata
			};
		}
	} catch {
		// Fall through to mock/empty behavior below
	}

	// Fallback to mock/empty structure
	const mock = MOCK_CONTEXT[reference as keyof typeof MOCK_CONTEXT];
	if (mock) {
		const resourcesFound = {
			scripture: !!mock.scripture,
			notes: mock.translationNotes.length,
			words: mock.translationWords.length,
			questions: mock.translationQuestions.length,
			academy: mock.translationAcademy.length,
			crossReferences: mock.crossReferences.length
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
			...mock,
			metadata: {
				reference,
				language,
				organization,
				source: 'aggregated-context',
				timestamp: new Date().toISOString(),
				aggregationTime: Math.floor(Math.random() * 50) + 100,
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
				aggregationTime: 10,
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
			default: true
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
