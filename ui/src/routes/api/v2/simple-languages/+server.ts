/**
 * Simple Languages Endpoint v2
 *
 * A simplified languages endpoint to demonstrate the pattern.
 * This shows how to handle basic data fetching without RouteGenerator.
 *
 * Returns items array for consistency with other list endpoints.
 */

import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';

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

	// Filter by resource if specified
	let languages = LANGUAGE_DATA;
	if (resource) {
		languages = languages.filter((lang) => lang.resources[resource as keyof typeof lang.resources]);
	}

	// Format response based on options
	return {
		items: languages.map((lang) => ({
			code: lang.code,
			name: lang.name,
			direction: lang.direction,
			...(includeMetadata && { resources: lang.resources }),
			...(includeStats && { coverage: lang.coverage })
		})),
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
