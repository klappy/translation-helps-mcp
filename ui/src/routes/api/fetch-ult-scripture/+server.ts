/**
 * API Route: ULT/GLT Scripture Endpoint
 * GET /api/fetch-ult-scripture
 *
 * Fetches literal (form-centric) Scripture texts with embedded alignment data
 * Supports both ULT (English) and GLT (Strategic Languages)
 */

import { fetchULTScriptureHandler } from '../../../functions/handlers/fetch-ult-scripture.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ request }) => {
	const platformRequest = {
		method: request.method,
		url: request.url,
		headers: Object.fromEntries(request.headers.entries()),
		body: null,
		queryStringParameters: Object.fromEntries(new URL(request.url).searchParams.entries())
	};

	const response = await fetchULTScriptureHandler(platformRequest);

	return new Response(response.body, {
		status: response.statusCode,
		headers: response.headers
	});
};
