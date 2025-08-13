/**
 * Resource Catalog Endpoint v2
 *
 * Demonstrates circuit breaker integration with simple endpoints.
 * Fetches available resources from DCS with automatic failure protection.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { circuitBreakers } from '$lib/circuitBreaker.js';

interface CatalogParams {
	organization: string;
	language?: string;
	subject?: string;
}

/**
 * Fetch resource catalog from DCS with circuit breaker protection
 */
async function fetchResourceCatalog(params: CatalogParams): Promise<any> {
	const { organization, language, subject } = params;

	// Build DCS API URL
	const baseUrl = 'https://git.door43.org/api/v1/catalog/search';
	const queryParams = new URLSearchParams({
		owner: organization,
		...(language && { lang: language }),
		...(subject && { subject })
	});

	// Use circuit breaker for external API call
	return circuitBreakers.dcs.execute(async () => {
		const response = await fetch(`${baseUrl}?${queryParams}`);

		if (!response.ok) {
			throw new Error(`DCS API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Transform DCS response to our format
		return {
			resources:
				data.data?.map((item: any) => ({
					id: item.id,
					name: item.name,
					language: item.language,
					subject: item.subject,
					title: item.title,
					version: item.version,
					format: item.format,
					url: item.url,
					modified: item.modified_at
				})) || [],
			metadata: {
				totalCount: data.data?.length || 0,
				organization,
				language,
				subject,
				source: 'DCS API',
				circuitBreakerState: circuitBreakers.dcs.getState().state
			}
		};
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'resource-catalog-v2',

	params: [
		{
			name: 'organization',
			required: true,
			default: 'unfoldingWord'
		},
		{
			name: 'language',
			pattern: /^[a-z]{2,3}$/
		},
		{
			name: 'subject',
			validate: (value) => {
				if (!value) return true;
				return ['Bible', 'Aligned Bible', 'Translation Notes', 'Translation Words'].includes(value);
			}
		}
	],

	fetch: fetchResourceCatalog,

	onError: (error) => {
		// Circuit breaker errors are service unavailable
		if (error.message.includes('Circuit breaker is OPEN')) {
			return {
				status: 503,
				message: 'Resource catalog service is temporarily unavailable. Please try again later.'
			};
		}

		// DCS API errors
		if (error.message.includes('DCS API error')) {
			return {
				status: 502,
				message: 'Unable to fetch resources from catalog service.'
			};
		}

		// Default
		return { status: 500, message: 'Internal server error' };
	}
});

// CORS handler
export const OPTIONS = createCORSHandler();
