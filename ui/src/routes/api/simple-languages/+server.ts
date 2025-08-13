/**
 * Simple Languages Endpoint v2
 *
 * A simplified languages endpoint to demonstrate the pattern.
 * This shows how to handle basic data fetching without RouteGenerator.
 *
 * Returns items array for consistency with other list endpoints.
 */

import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { fetchLanguagesFromDCS } from '$lib/edgeLanguagesFetcher.js';

export const config = {
	runtime: 'edge'
};

// Mock language data for demonstration
const LANGUAGE_DATA = [
	{
		code: 'en',
		name: 'English',
		direction: 'ltr',
		resources: {
			ult: true,
			ust: true,
			tn: true,
			tw: true,
			tq: true,
			ta: true
		},
		coverage: {
			books: 66,
			chapters: 1189,
			verses: 31103
		}
	},
	{
		code: 'es',
		name: 'Español',
		direction: 'ltr',
		resources: {
			ult: true,
			ust: true,
			tn: true,
			tw: true,
			tq: false,
			ta: false
		},
		coverage: {
			books: 66,
			chapters: 1189,
			verses: 31103
		}
	},
	{
		code: 'fr',
		name: 'Français',
		direction: 'ltr',
		resources: {
			ult: true,
			ust: true,
			tn: false,
			tw: false,
			tq: false,
			ta: false
		},
		coverage: {
			books: 27,
			chapters: 260,
			verses: 7957
		}
	},
	{
		code: 'ar',
		name: 'العربية',
		direction: 'rtl',
		resources: {
			ult: true,
			ust: false,
			tn: false,
			tw: false,
			tq: false,
			ta: false
		},
		coverage: {
			books: 27,
			chapters: 260,
			verses: 7957
		}
	}
];

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
		console.warn('[languages] Failed to fetch real data, falling back to mock:', error);
	}

	// Fall back to mock data if real data failed
	if (languages.length === 0) {
		// Filter mock languages by resource if specified
		languages = LANGUAGE_DATA;
		if (resource) {
			languages = languages.filter(
				(lang) => lang.resources[resource as keyof typeof lang.resources]
			);
		}

		// Transform mock data to match expected format
		languages = languages.map((lang) => ({
			code: lang.code,
			name: lang.name,
			direction: lang.direction,
			...(includeMetadata && {
				resources: Object.keys(lang.resources).filter((r) => lang.resources[r])
			}),
			...(includeStats && { coverage: lang.coverage })
		}));

		console.log(`[languages] Using ${languages.length} mock languages`);
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

	fetch: fetchLanguages
});

// CORS handler
export const OPTIONS = createCORSHandler();
