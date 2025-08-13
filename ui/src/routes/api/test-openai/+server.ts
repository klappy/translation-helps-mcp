import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	// Direct test of API key access
	const tests = {
		// Test 1: Direct access
		directAccess: platform?.env?.OPENAI_API_KEY,

		// Test 2: Check if it's a string
		isString: typeof platform?.env?.OPENAI_API_KEY === 'string',

		// Test 3: Check length (don't expose actual length)
		hasLength: (platform?.env?.OPENAI_API_KEY?.length || 0) > 0,

		// Test 4: Try bracket notation
		bracketAccess: platform?.env?.['OPENAI_API_KEY'],

		// Test 5: Check first few chars match expected pattern (sk-)
		startsWithSK: platform?.env?.OPENAI_API_KEY?.startsWith('sk-') || false,

		// Platform debug
		platform: {
			exists: !!platform,
			envExists: !!platform?.env,
			envType: platform?.env ? typeof platform.env : 'undefined',
			envKeys: platform?.env ? Object.keys(platform.env).sort() : []
		}
	};

	// Log for server-side debugging
	console.log('OpenAI API Key Test Results:', JSON.stringify(tests, null, 2));

	return json({
		success: tests.hasLength && tests.startsWithSK,
		tests,
		timestamp: new Date().toISOString()
	});
};
