/**
 * Translation Questions Endpoint v2
 *
 * Demonstrates using all our consistent utilities:
 * - Common validators
 * - Standard error handlers
 * - Consistent response shapes
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';

// Mock translation questions data for demo
const MOCK_QUESTIONS = {
	'Titus 1:1': [
		{
			id: 'tq001',
			question: "What was Paul's purpose in his service to God?",
			answer:
				"Paul's purpose was to establish the faith of God's chosen people and to establish the knowledge of the truth.",
			reference: 'Titus 1:1'
		},
		{
			id: 'tq002',
			question: 'What does Paul mean by the truth?',
			answer: 'The truth is what agrees with godliness.',
			reference: 'Titus 1:1'
		}
	],
	'John 3:16': [
		{
			id: 'tq003',
			question: 'What did God give because he loved the world?',
			answer: 'God gave his one and only Son.',
			reference: 'John 3:16'
		},
		{
			id: 'tq004',
			question: 'What will happen to whoever believes in the Son?',
			answer: 'Whoever believes in the Son will not perish but have eternal life.',
			reference: 'John 3:16'
		}
	]
};

/**
 * Fetch translation questions for a reference
 */
async function fetchTranslationQuestions(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { reference, language, organization } = params;

	// In real implementation, this would fetch from ZIP cache
	// For now, return mock data
	const questions = MOCK_QUESTIONS[reference as keyof typeof MOCK_QUESTIONS] || [];

	if (questions.length === 0) {
		throw new Error(`No translation questions found for ${reference}`);
	}

	// Return in standard format
	return createTranslationHelpsResponse(questions, reference, language, organization, 'tq');
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'translation-questions-v2',

	// Use common parameter validators
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],

	fetch: fetchTranslationQuestions,

	// Use standard error handler
	onError: createStandardErrorHandler({
		'No translation questions found': {
			status: 404,
			message: 'No translation questions available for this reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
