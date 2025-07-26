export const config = {
	runtime: 'edge'
};

/**
 * Language Coverage Matrix API Route
 *
 * GET /api/language-coverage
 *
 * Returns a comprehensive matrix showing resource availability across all Strategic Languages.
 */

import { languageCoverageHandler } from '../../../../../src/functions/handlers/language-coverage.js';
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
	const result = await languageCoverageHandler(platformRequest);

	return new Response(result.body, {
		status: result.statusCode,
		headers: result.headers
	});
}
