/**
 * API Route: UST/GST Scripture Endpoint
 * GET /api/fetch-ust-scripture
 *
 * Fetches meaning-based (simplified) Scripture texts with embedded alignment data
 * Supports both UST (English) and GST (Strategic Languages)
 */

import { fetchUSTScriptureHandler } from '../../../../../../src/functions/handlers/fetch-ust-scripture.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ request }) => {
	const platformRequest = {
		method: request.method,
		url: request.url,
		headers: Object.fromEntries(request.headers.entries()),
		body: null,
		queryStringParameters: Object.fromEntries(new URL(request.url).searchParams.entries())
	};

	const response = await fetchUSTScriptureHandler(platformRequest);

	return new Response(response.body, {
		status: response.statusCode,
		headers: response.headers
	});
};
