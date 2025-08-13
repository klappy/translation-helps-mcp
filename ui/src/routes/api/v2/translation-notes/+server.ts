/**
 * Translation Notes Endpoint v2
 *
 * Another example of consistent endpoint implementation.
 * Same patterns, same utilities, predictable behavior!
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { fetchTranslationNotesFromDCS } from '$lib/edgeTranslationNotesFetcher.js';

// Mock translation notes data for demo
const MOCK_NOTES = {
	'Titus 1:1': [
		{
			id: 'tn001',
			reference: 'Titus 1:1',
			noteType: 'general',
			text: 'Paul identifies himself as the writer of this letter.',
			supportReference: 'rc://*/ta/man/translate/figs-abstractnouns'
		},
		{
			id: 'tn002',
			reference: 'Titus 1:1',
			noteType: 'key-term',
			text: 'A servant is someone who serves others and is committed to obey them.',
			term: 'servant'
		}
	],
	'John 3:16': [
		{
			id: 'tn003',
			reference: 'John 3:16',
			noteType: 'general',
			text: "God's love for the world is the motivation for his giving his Son.",
			supportReference: 'rc://*/ta/man/translate/figs-explicit'
		},
		{
			id: 'tn004',
			reference: 'John 3:16',
			noteType: 'key-term',
			text: 'The word "world" here refers to all people.',
			term: 'world'
		}
	]
};

/**
 * Fetch translation notes for a reference
 */
async function fetchTranslationNotes(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization } = params;

	let notes = [];

	// Try to fetch real data first
	try {
		notes = await fetchTranslationNotesFromDCS(reference, language, organization);
	} catch (error) {
		console.error('Failed to fetch from DCS, falling back to mock data:', error);
	}

	// Fall back to mock data if needed
	if (notes.length === 0) {
		notes = MOCK_NOTES[reference as keyof typeof MOCK_NOTES] || [];
	}

	if (notes.length === 0) {
		throw new Error(`No translation notes found for ${reference}`);
	}

	// Return in standard format
	return createTranslationHelpsResponse(notes, reference, language, organization, 'tn');
}

// Create the endpoint - notice how similar this is to translation-questions!
export const GET = createSimpleEndpoint({
	name: 'translation-notes-v2',

	// Same parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	// Enable format support
	supportsFormats: true,

	fetch: fetchTranslationNotes,

	// Same error handler with custom message
	onError: createStandardErrorHandler({
		'No translation notes found': {
			status: 404,
			message: 'No translation notes available for this reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
