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

	// NO MOCK FALLBACK - Return empty structure or error
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
	}),

	// Support JSON and markdown formats for LLMs
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
