export const config = {
	runtime: 'edge'
};

/**
 * Smart Resource Recommendations API Route
 *
 * GET /api/resource-recommendations
 *
 * Returns intelligent resource recommendations based on user context and scripture reference.
 */

import { resourceRecommendationsHandler } from '../../../../../src/functions/handlers/resource-recommendations.js';
import type { PlatformRequest } from '../../../../../src/functions/platform-adapter.js';

export async function GET(event: { request: Request; url: URL }): Promise<Response> {
	// Convert SvelteKit request to PlatformRequest format
	const headers: Record<string, string> = {};
	event.request.headers.forEach((value, key) => {
		headers[key] = value;
	});

	// Extract query parameters from URL
	const queryStringParameters: Record<string, string> = {};
	event.url.searchParams.forEach((value, key) => {
		queryStringParameters[key] = value;
	});

	const platformRequest: PlatformRequest = {
		method: event.request.method,
		url: event.url.toString(),
		headers,
		body: null, // GET request has no body
		queryStringParameters
	};

	// Call the platform handler
	const result = await resourceRecommendationsHandler(platformRequest);

	return new Response(result.body, {
		status: result.statusCode,
		headers: result.headers
	});
}
