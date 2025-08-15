/**
 * List Available Resources Endpoint v2
 *
 * Returns the list of all available resource types with descriptions.
 * This is mostly static data about what resources we support.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createListResponse } from '$lib/standardResponses.js';

// Resource type definitions
const RESOURCE_TYPES = [
	{
		type: 'ult',
		name: 'unfoldingWord Literal Text',
		description:
			'A form-centric, literal translation that accurately reflects the grammar and syntax of the original biblical languages.',
		category: 'scripture'
	},
	{
		type: 'ust',
		name: 'unfoldingWord Simplified Text',
		description:
			'A meaning-centric, dynamic translation that clearly communicates the message of the original biblical languages.',
		category: 'scripture'
	},
	{
		type: 'tn',
		name: 'Translation Notes',
		description:
			'Provides historical, cultural, and linguistic information to help translators make the best possible translation decisions.',
		category: 'helps'
	},
	{
		type: 'tw',
		name: 'Translation Words',
		description: 'Provides definitions and translation suggestions for important biblical terms.',
		category: 'helps'
	},
	{
		type: 'ta',
		name: 'Translation Academy',
		description:
			'A modular translation training program that helps translators learn how to translate the Bible.',
		category: 'helps'
	},
	{
		type: 'tq',
		name: 'Translation Questions',
		description: 'Comprehension and theological questions that help translators check their work.',
		category: 'helps'
	},
	{
		type: 'twl',
		name: 'Translation Word Links',
		description: 'Links between biblical text and translation words entries.',
		category: 'helps'
	},
	{
		type: 'obs',
		name: 'Open Bible Stories',
		description:
			'50 key Bible stories from Creation to Revelation, useful for evangelism and discipleship.',
		category: 'scripture'
	},
	{
		type: 'obs-tn',
		name: 'Open Bible Stories Translation Notes',
		description: 'Translation notes specifically for Open Bible Stories.',
		category: 'helps'
	},
	{
		type: 'obs-tq',
		name: 'Open Bible Stories Translation Questions',
		description: 'Comprehension questions for Open Bible Stories.',
		category: 'helps'
	}
];

/**
 * List available resource types
 */
async function listAvailableResources(
	params: Record<string, any>,
	_request: Request
): Promise<any> {
	const { category, query } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`resources-${Date.now()}`, 'list-available-resources');

	let resources = [...RESOURCE_TYPES];

	// Filter by category if provided
	if (category) {
		resources = resources.filter((r) => r.category === category);
	}

	// Filter by search query if provided
	if (query) {
		const searchTerm = query.toLowerCase();
		resources = resources.filter(
			(r) =>
				r.type.toLowerCase().includes(searchTerm) ||
				r.name.toLowerCase().includes(searchTerm) ||
				r.description.toLowerCase().includes(searchTerm)
		);
	}

	const response = createListResponse(resources, {
		source: 'static',
		...(category && { filteredBy: { category } }),
		...(query && { searchQuery: query })
	});

	return {
		...response,
		_trace: tracer.getTrace()
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'list-available-resources-v2',

	params: [
		{
			name: 'category',
			validate: (value) => {
				if (!value) return true;
				return ['scripture', 'helps'].includes(value);
			}
		},
		{
			name: 'query',
			validate: (value) => {
				if (!value) return true;
				return value.length >= 2; // Minimum 2 characters for search
			}
		}
	],

	fetch: listAvailableResources
});

// CORS handler
export const OPTIONS = createCORSHandler();
