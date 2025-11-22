/**
 * Search Orchestrator Endpoint
 *
 * I/O-bound orchestrator that:
 * 1. Discovers resources via DCS catalog
 * 2. Fans out to per-resource search endpoints
 * 3. Merges and re-ranks results
 *
 * KISS: Simple fan-out pattern
 * Antifragile: Partial failures return available results
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { logger } from '$lib/../../../src/utils/logger.js';
import { DCSApiClient } from '$lib/../../../src/services/DCSApiClient.js';

interface SearchRequest {
	query: string;
	language?: string;
	owner?: string;
	reference?: string;
	limit?: number;
	includeHelps?: boolean;
}

interface ResourceDescriptor {
	name: string;
	type: 'bible' | 'notes' | 'words' | 'academy' | 'questions' | 'obs';
	zipUrl: string;
	owner: string;
	language: string;
}

interface SearchHit {
	resource: string;
	type: string;
	path: string;
	score: number;
	preview: string;
}

/**
 * Discover available resources from DCS catalog
 */
async function discoverResources(
	language: string,
	owner: string,
	includeHelps: boolean,
	_reference?: string
): Promise<ResourceDescriptor[]> {
	const startTime = Date.now();
	const client = new DCSApiClient();

	try {
		// Query DCS catalog
		const response = await client.getResources({
			lang: language,
			owner: owner,
			stage: 'prod',
			limit: 100
		});

		if (!response.success || !response.data) {
			logger.warn('[Search:Discover] Catalog query failed, using fallbacks', {
				language,
				owner
			});
			return getFallbackResources(language, owner);
		}

		const resources: ResourceDescriptor[] = [];

		// Map catalog entries to resource descriptors
		for (const item of response.data) {
			const resourceType = mapSubjectToType(item.subject);

			// Filter by includeHelps
			if (!includeHelps && !['bible'].includes(resourceType)) {
				continue;
			}

			// Get ZIP URL from catalog
			const zipUrl = item.zipball_url || item.url;
			if (!zipUrl) {
				continue;
			}

			resources.push({
				name: item.identifier || item.name,
				type: resourceType,
				zipUrl,
				owner: item.owner || owner,
				language: item.language || language
			});
		}

		logger.info('[Search:Discover] Resources discovered', {
			count: resources.length,
			elapsed: Date.now() - startTime
		});

		return resources;
	} catch (error) {
		logger.error('[Search:Discover] Discovery failed', {
			error: error instanceof Error ? error.message : String(error)
		});
		return getFallbackResources(language, owner);
	}
}

/**
 * Map DCS subject to resource type
 */
function mapSubjectToType(subject?: string): ResourceDescriptor['type'] {
	if (!subject) return 'bible';

	const sub = subject.toLowerCase();
	if (sub.includes('bible') || sub.includes('scripture')) return 'bible';
	if (sub.includes('notes') || sub === 'translation notes') return 'notes';
	if (sub.includes('words') || sub === 'translation words') return 'words';
	if (sub.includes('academy') || sub === 'translation academy') return 'academy';
	if (sub.includes('questions') || sub === 'translation questions') return 'questions';
	if (sub.includes('obs') || sub === 'open bible stories') return 'obs';

	return 'bible';
}

/**
 * Fallback resources if catalog fails
 */
function getFallbackResources(language: string, owner: string): ResourceDescriptor[] {
	const baseUrl = `https://git.door43.org/${owner}`;

	return [
		{
			name: `${language}_ult`,
			type: 'bible',
			zipUrl: `${baseUrl}/${language}_ult/archive/master.zip`,
			owner,
			language
		},
		{
			name: `${language}_ust`,
			type: 'bible',
			zipUrl: `${baseUrl}/${language}_ust/archive/master.zip`,
			owner,
			language
		},
		{
			name: `${language}_tn`,
			type: 'notes',
			zipUrl: `${baseUrl}/${language}_tn/archive/master.zip`,
			owner,
			language
		},
		{
			name: `${language}_tw`,
			type: 'words',
			zipUrl: `${baseUrl}/${language}_tw/archive/master.zip`,
			owner,
			language
		}
	];
}

/**
 * Fan out search to per-resource endpoints
 */
async function fanOutSearch(
	resources: ResourceDescriptor[],
	query: string,
	reference?: string
): Promise<SearchHit[]> {
	const startTime = Date.now();

	// Create fetch promises for all resources
	const searchPromises = resources.map(async (resource) => {
		try {
			const url = new URL('/internal/search-resource', 'http://localhost');

			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resource: resource.name,
					zipUrl: resource.zipUrl,
					query,
					reference,
					type: resource.type
				}),
				signal: AbortSignal.timeout(800) // 800ms timeout per resource
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			return data.hits || [];
		} catch (error) {
			logger.warn('[Search:FanOut] Resource search failed', {
				resource: resource.name,
				error: error instanceof Error ? error.message : String(error)
			});
			return []; // Partial failure - return empty for this resource
		}
	});

	// Wait for all searches (or timeouts)
	const results = await Promise.all(searchPromises);

	// Flatten and merge results
	const allHits = results.flat();

	logger.info('[Search:FanOut] Fan-out completed', {
		resourceCount: resources.length,
		hitCount: allHits.length,
		elapsed: Date.now() - startTime
	});

	return allHits;
}

/**
 * Re-rank merged results
 */
function reRankResults(hits: SearchHit[], limit: number): SearchHit[] {
	// Sort by score (descending)
	const sorted = hits.sort((a, b) => b.score - a.score);

	// Apply limit
	return sorted.slice(0, limit);
}

/**
 * POST /api/search
 * Main search orchestrator endpoint
 */
export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		// Parse request body
		const body: SearchRequest = await request.json();

		const {
			query,
			language = 'en',
			owner = 'unfoldingWord',
			reference,
			limit = 50,
			includeHelps = true
		} = body;

		// Validate required fields
		if (!query || query.trim().length === 0) {
			return json(
				{
					error: 'Query parameter is required',
					code: 'MISSING_QUERY'
				},
				{ status: 400 }
			);
		}

		logger.info('[Search:Orchestrator] Starting search', {
			query,
			language,
			owner,
			reference,
			limit,
			includeHelps
		});

		// Step 1: Discover resources
		const resources = await discoverResources(language, owner, includeHelps, reference);

		if (resources.length === 0) {
			return json({
				took_ms: Date.now() - startTime,
				hits: [],
				message: 'No resources found for the specified language and owner'
			});
		}

		// Step 2: Fan out to resource-specific searches
		const hits = await fanOutSearch(resources, query, reference);

		// Step 3: Re-rank and limit results
		const rankedHits = reRankResults(hits, limit);

		// Return response
		const response = {
			took_ms: Date.now() - startTime,
			query,
			language,
			owner,
			resourceCount: resources.length,
			hits: rankedHits
		};

		logger.info('[Search:Orchestrator] Search completed', {
			took_ms: response.took_ms,
			hitCount: rankedHits.length
		});

		return json(response);
	} catch (error) {
		logger.error('[Search:Orchestrator] Search failed', {
			error: error instanceof Error ? error.message : String(error)
		});

		return json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : String(error),
				code: 'INTERNAL_ERROR'
			},
			{ status: 500 }
		);
	}
};
