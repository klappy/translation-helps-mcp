export const config = {
	runtime: 'edge'
};

/**
 * Language Coverage Matrix API Route
 *
 * GET /api/language-coverage
 *
 * ⚠️ WARNING: Uses EXPERIMENTAL language coverage handler
 */

import { languageCoverageHandler } from '../../../../../src/experimental/language-coverage-experimental.js';
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
		body: null,
		requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`
	};

	// Call the platform handler
	const result = await languageCoverageHandler(platformRequest);

	return new Response(result.body, {
		status: result.statusCode,
		headers: result.headers
	});
}
