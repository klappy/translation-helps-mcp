export const config = {
	runtime: 'edge'
};

import type { RequestHandler } from '@sveltejs/kit';
import { fetchTranslationAcademyHandler } from '../../../../../src/functions/handlers/fetch-translation-academy.js';

/**
 * Translation Academy API Endpoint
 * GET /api/fetch-translation-academy
 *
 * Fetches training materials and educational articles from Translation Academy
 * to help translators learn translation principles and techniques.
 *
 * Query Parameters:
 * - topic (optional): Specific translation topic or article (e.g., "metaphor")
 * - language (optional): Target language code (default: "en")
 * - organization (optional): Content organization (default: "unfoldingWord")
 * - category (optional): Filter by category
 * - difficulty (optional): Filter by difficulty level (beginner, intermediate, advanced)
 * - moduleId (optional): Specific module ID to fetch
 * - bypassCache (optional): Skip cache and fetch fresh data
 */

export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Create platform-compatible request
		const platformRequest = {
			url: url.toString(),
			method: 'GET',
			headers: Object.fromEntries(request.headers.entries()),
			queryStringParameters: Object.fromEntries(url.searchParams.entries()),
			body: null
		};

		const result = await fetchTranslationAcademyHandler(platformRequest);

		return new Response(result.body, {
			status: result.statusCode,
			headers: result.headers
		});
	} catch (error) {
		console.error('Translation Academy API error:', error);

		return new Response(
			JSON.stringify({
				success: false,
				error: 'Internal server error while fetching Translation Academy content',
				timestamp: new Date().toISOString()
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache'
				}
			}
		);
	}
};
