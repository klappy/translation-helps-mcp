export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-scripture
 * Uses ResourceAggregator with ingredients pattern for dynamic resource discovery
 */

import { parseReference } from '$lib/../../../dist/src/parsers/referenceParser.js';
import { ResourceAggregator } from '$lib/../../../dist/src/services/ResourceAggregator.js';

// Initialize ResourceAggregator
const resourceAggregator = new ResourceAggregator();

// Create unified handler for all HTTP methods
async function handleRequest(request: Request): Promise<Response> {
	const startTime = Date.now();
	const traceId = `fetch-scripture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		// Extract URL parameters
		const url = new URL(request.url);
		const reference = url.searchParams.get('reference') || 'John 3:16';
		const language = url.searchParams.get('language') || 'en';
		const organization = url.searchParams.get('organization') || 'unfoldingWord';
		const resource = url.searchParams.get('resource') || 'all';

		console.log(
			`🔍 Fetching scripture: ${reference} (${language}, ${resource}) [trace: ${traceId}]`
		);

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
		const fetchStartTime = Date.now();
		const result = (await resourceAggregator.aggregateResources(parsedRef, {
			language,
			organization,
			resources: ['scripture']
		})) as { scriptures?: Array<{ text: string; translation: string }> };
		const fetchEndTime = Date.now();

		console.log(`🔍 ResourceAggregator returned ${result.scriptures?.length || 0} scriptures`);

		// Filter results based on requested resource(s)
		let filteredScriptures = result.scriptures || [];

		if (resource !== 'all' && !resource.includes(',')) {
			// Single specific resource - filter by resource abbreviation
			const targetResource = resource.toUpperCase();
			filteredScriptures = filteredScriptures.filter(
				(scripture) => scripture.translation === targetResource
			);
			console.log(
				`🎯 Filtered to ${filteredScriptures.length} scriptures for resource '${targetResource}'`
			);
		} else if (resource !== 'all' && resource.includes(',')) {
			// Multiple specific resources
			const requestedResources = resource.split(',').map((r) => r.trim().toUpperCase());
			filteredScriptures = filteredScriptures.filter((scripture) =>
				requestedResources.includes(scripture.translation)
			);
			console.log(
				`🎯 Filtered to ${filteredScriptures.length} scriptures for resources: ${requestedResources.join(', ')}`
			);
		}
		// If resource === 'all', use all results without filtering

		// Build metadata for UI performance tracking
		const endTime = Date.now();
		const responseTime = endTime - startTime;
		const fetchDuration = fetchEndTime - fetchStartTime;

		const metadata = {
			responseTime,
			cached: false, // ResourceAggregator doesn't expose cache status yet
			cacheStatus: 'miss',
			format: 'scripture',
			translationsFound: filteredScriptures.length,
			filesFound: result.scriptures?.length || 0,
			booksFound: 1, // Single book per request
			languagesFound: 1, // Single language per request
			success: true,
			status: 200,
			xrayTrace: {
				traceId,
				mainEndpoint: '/api/fetch-scripture',
				totalDuration: responseTime,
				performance: {
					fastest: fetchDuration,
					slowest: fetchDuration,
					average: fetchDuration
				},
				calls: [
					{
						endpoint: 'ResourceAggregator.aggregateResources',
						duration: fetchDuration,
						success: true,
						cached: false
					}
				],
				cacheStats: {
					hits: 0,
					misses: 1,
					total: 1,
					hitRate: 0
				}
			}
		};

		// Handle multiple resources response
		if (resource === 'all' || resource.includes(',')) {
			return new Response(
				JSON.stringify({
					data: {
						success: true,
						resources: filteredScriptures,
						total: filteredScriptures.length,
						reference,
						language,
						organization,
						resourcesRequested: resource
					},
					metadata
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} else {
			// Single resource - return first match or null
			const firstScripture = filteredScriptures.length > 0 ? filteredScriptures[0] : null;

			console.log(`📖 Returning single scripture: ${firstScripture ? 'found' : 'null'}`);

			return new Response(
				JSON.stringify({
					data: firstScripture,
					metadata
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
