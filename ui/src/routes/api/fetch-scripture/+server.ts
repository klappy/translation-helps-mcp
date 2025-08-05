export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-scripture
 * Uses ResourceAggregator with ingredients pattern for dynamic resource discovery
 */

import { parseReference } from '$lib/../../../src/parsers/referenceParser.js';
import { ResourceAggregator } from '$lib/../../../src/services/ResourceAggregator.js';
import type { PlatformRequest } from '$lib/../../../src/functions/platform-adapter.js';

// Initialize ResourceAggregator
const resourceAggregator = new ResourceAggregator();

// Create unified handler for all HTTP methods
async function handleRequest(request: Request): Promise<Response> {
	try {
		// Extract URL parameters
		const url = new URL(request.url);
		const reference = url.searchParams.get('reference') || 'John 3:16';
		const language = url.searchParams.get('language') || 'en';
		const organization = url.searchParams.get('organization') || 'unfoldingWord';
		const resource = url.searchParams.get('resource') || 'all';

		console.log(`🔍 Fetching scripture: ${reference} (${language}, ${resource})`);

		// Parse and validate reference
		const parsedRef = parseReference(reference);
		if (!parsedRef.isValid) {
			return new Response(
				JSON.stringify({
					error: 'Invalid reference format',
					reference,
					hint: 'Use format like "John 3:16" or "Genesis 1:1-3"'
				}),
				{ 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Use ResourceAggregator to fetch scripture with ingredients discovery
		console.log(`📖 Fetching scripture using ResourceAggregator...`);
		const result = await resourceAggregator.aggregateResources(parsedRef, {
			language,
			organization,
			resources: ['scripture']
		});

		// Handle multiple resources response
		if (resource === 'all' || resource.includes(',')) {
			return new Response(
				JSON.stringify({
					data: {
						success: true,
						resources: result.scriptures || [],
						total: result.scriptures?.length || 0,
						reference,
						language,
						organization
					},
					_trace: null // ResourceAggregator handles its own tracing internally
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} else {
			// Single resource - return first match or null
			const firstScripture = result.scriptures && result.scriptures.length > 0 
				? result.scriptures[0] 
				: null;

			return new Response(
				JSON.stringify({
					data: firstScripture,
					_trace: null // ResourceAggregator handles its own tracing internally
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

	} catch (error) {
		console.error('❌ Scripture fetch error:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

// Export HTTP method handlers
export const GET = handleRequest;
export const POST = handleRequest;
export const OPTIONS = handleRequest;
