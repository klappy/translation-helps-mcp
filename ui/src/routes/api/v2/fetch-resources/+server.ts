/**
 * Fetch Resources Endpoint v2
 *
 * Selectively fetch specific resource types for a Bible reference.
 * Like get-context but you choose which resources you want.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import type { StandardMetadata } from '$lib/standardResponses.js';

// Available resource types
const RESOURCE_TYPES = ['scripture', 'notes', 'questions', 'words', 'academy', 'links'];

// Mock resource data (reusing patterns from other endpoints)
const MOCK_RESOURCES = {
	'John 3:16': {
		scripture: {
			reference: 'John 3:16',
			text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
			version: 'ULT'
		},
		notes: [
			{
				id: 'tn_john_3_16_001',
				noteType: 'general',
				content: 'This is one of the most famous verses in the Bible.',
				quote: 'For God so loved'
			}
		],
		questions: [
			{
				id: 'tq_john_3_16_001',
				question: 'What did God give because of his love?',
				answer: 'His only Son.'
			}
		],
		words: [
			{
				term: 'love',
				definition: 'To have a strong affection.',
				strongs: ['G25']
			},
			{
				term: 'eternal-life',
				definition: 'Life that never ends.',
				strongs: ['G166', 'G2222']
			}
		],
		academy: [
			{
				id: 'ta_metaphor',
				title: 'Metaphor',
				path: 'translate/figs-metaphor'
			}
		],
		links: [
			{
				word: 'loved',
				linkedTo: 'love',
				strongs: 'G25'
			},
			{
				word: 'believes',
				linkedTo: 'believe',
				strongs: 'G4100'
			}
		]
	},
	'Genesis 1:1': {
		scripture: {
			reference: 'Genesis 1:1',
			text: 'In the beginning, God created the heavens and the earth.',
			version: 'ULT'
		},
		notes: [
			{
				id: 'tn_gen_1_1_001',
				noteType: 'general',
				content: 'This verse introduces the creation account.',
				quote: 'In the beginning'
			}
		],
		questions: [
			{
				id: 'tq_gen_1_1_001',
				question: 'When did God create?',
				answer: 'In the beginning.'
			}
		],
		words: [
			{
				term: 'god',
				definition: 'The supreme being.',
				strongs: ['H430']
			},
			{
				term: 'create',
				definition: 'To make from nothing.',
				strongs: ['H1254']
			}
		],
		academy: [
			{
				id: 'ta_writing_intro',
				title: 'Introduction of a New Event',
				path: 'writing/writing-intro'
			}
		],
		links: [
			{
				word: 'God',
				linkedTo: 'god',
				strongs: 'H430'
			},
			{
				word: 'created',
				linkedTo: 'create',
				strongs: 'H1254'
			}
		]
	}
};

/**
 * Parse resources parameter
 */
function parseResources(resourcesParam: string | undefined): string[] {
	if (!resourcesParam) {
		return RESOURCE_TYPES; // Default to all resources
	}

	// Try parsing as JSON array
	try {
		const parsed = JSON.parse(resourcesParam);
		if (Array.isArray(parsed)) {
			return parsed.filter((r) => RESOURCE_TYPES.includes(r));
		}
	} catch {
		// Not JSON, continue
	}

	// Parse as comma-separated string
	return resourcesParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => RESOURCE_TYPES.includes(r));
}

/**
 * Fetch selected resources for a reference
 */
async function fetchResources(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization, resources: resourcesParam } = params;

	// Parse requested resources
	const requestedResources = parseResources(resourcesParam);

	// Get mock data
	const allData = MOCK_RESOURCES[reference as keyof typeof MOCK_RESOURCES];

	if (!allData) {
		// Return empty structure
		return {
			reference,
			language,
			organization,
			resources: {},
			metadata: {
				reference,
				language,
				organization,
				source: 'selective-resources',
				timestamp: new Date().toISOString(),
				requestedResources,
				foundResources: [],
				missingResources: requestedResources,
				totalItems: 0
			} as StandardMetadata
		};
	}

	// Build response with only requested resources
	const resources: Record<string, any> = {};
	const foundResources: string[] = [];
	let totalItems = 0;

	for (const resourceType of requestedResources) {
		if (allData[resourceType as keyof typeof allData]) {
			resources[resourceType] = allData[resourceType as keyof typeof allData];
			foundResources.push(resourceType);

			// Count items
			const data = resources[resourceType];
			if (Array.isArray(data)) {
				totalItems += data.length;
			} else if (data) {
				totalItems += 1;
			}
		}
	}

	const missingResources = requestedResources.filter((r) => !foundResources.includes(r));

	return {
		reference,
		language,
		organization,
		resources,
		metadata: {
			reference,
			language,
			organization,
			source: 'selective-resources',
			timestamp: new Date().toISOString(),
			requestedResources,
			foundResources,
			missingResources,
			totalItems,
			coverage: {
				requested: requestedResources.length,
				found: foundResources.length,
				percentage: Math.round((foundResources.length / requestedResources.length) * 100)
			}
		} as StandardMetadata
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-resources-v2',

	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'resources',
			validate: (value) => {
				if (!value) return true; // Optional, defaults to all

				try {
					// Validate resources list
					const resources = parseResources(value);
					return resources.length > 0;
				} catch {
					return false;
				}
			}
		}
	],

	fetch: fetchResources,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
