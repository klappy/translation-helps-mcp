/**
 * HTTP Client utilities for the UI
 * Browser-side version of the User-Agent configuration
 */

import { VERSION } from '../version';

// Core MCP server identity
const MCP_NAME = 'Translation-Helps-MCP';
const MCP_ROLE = 'Bible translation resource aggregator for LLM tools';
const CONTACT = 'klappy@github.com';
const HOMEPAGE = 'https://github.com/klappy/translation-helps-mcp';

// Construct a compliant, descriptive User-Agent
export const USER_AGENT = `${MCP_NAME}/${VERSION} (${MCP_ROLE}; +${HOMEPAGE}; contact=${CONTACT})`;

/**
 * Adds User-Agent to fetch headers
 * Note: In browsers, the User-Agent header is often restricted and may not be settable
 * We include it anyway for server-side rendering and API proxies
 */
export function addUserAgentHeader(headers?: HeadersInit): Headers {
	const newHeaders = new Headers(headers);

	// Add our custom user agent (may be ignored by browser security policies)
	if (!newHeaders.has('User-Agent')) {
		newHeaders.set('User-Agent', USER_AGENT);
	}

	// Add a custom header that won't be blocked
	newHeaders.set('X-Client-Name', MCP_NAME);
	newHeaders.set('X-Client-Version', VERSION);

	return newHeaders;
}

/**
 * Enhanced fetch that includes our identification headers
 */
export async function fetchWithUserAgent(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const headers = addUserAgentHeader(init?.headers);

	return fetch(input, {
		...init,
		headers
	});
}
