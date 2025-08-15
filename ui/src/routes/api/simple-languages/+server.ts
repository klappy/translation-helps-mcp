/**
 * Simple Languages Endpoint v2
 *
 * A simplified languages endpoint to demonstrate the pattern.
 * This shows how to handle basic data fetching without RouteGenerator.
 *
 * Returns items array for consistency with other list endpoints.
 */

import { fetchLanguagesFromDCS } from '$lib/edgeLanguagesFetcher.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';

export const config = {
	runtime: 'edge'
};

/**
 * Fetch languages with optional filtering
 */
async function fetchLanguages(params: Record<string, any>, _request: Request) {
	const { resource, includeMetadata = true, includeStats = false } = params;

	let languages = [];

	// Try to fetch real data first
	try {
		languages = await fetchLanguagesFromDCS(resource, includeMetadata, includeStats);

		if (languages.length > 0) {
			console.log(`[languages] Fetched ${languages.length} real languages from DCS`);
		}
	} catch (error) {
		console.error('[languages] Failed to fetch real data:', error);
		throw error; // Propagate the real error
	}

	// NO MOCK FALLBACK - If real data fails, throw error
	if (languages.length === 0) {
		throw new Error('Failed to fetch languages from DCS');
	}

	// Return in consistent format
	return {
		items: languages,
		metadata: {
			totalCount: languages.length,
			hasMore: false,
			...(resource && { filteredBy: resource })
		}
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'simple-languages-v2',

	params: [
		{
			name: 'resource',
			validate: (value) => {
				if (!value) return true;
				return ['ult', 'ust', 'tn', 'tw', 'tq', 'ta'].includes(value);
			}
		},
		{ name: 'includeMetadata', type: 'boolean', default: true },
		{ name: 'includeStats', type: 'boolean', default: false }
	],

	fetch: fetchLanguages,

	// Support JSON and markdown formats for LLMs
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
