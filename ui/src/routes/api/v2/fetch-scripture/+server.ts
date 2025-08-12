/**
 * Fetch Scripture Endpoint v2
 *
 * The golden standard endpoint - fetches scripture text for any Bible reference.
 * Supports multiple translations and formats.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createScriptureResponse } from '$lib/standardResponses.js';

// Mock scripture data
const MOCK_SCRIPTURE_DATA = {
	'John 3:16': {
		ult: 'For God loved the world in this way: he gave his one and only Son, so that everyone who believes in him will not perish but will have eternal life.',
		ust: 'God loved all the people in the world in this way: He gave his only Son to die for them. The result is that everyone who trusts in him will not perish. Instead, they will live forever.',
		t4t: 'God loved us people in the world so much that he gave his only Son as a sacrifice for us, in order that everyone who believes in him would not be separated from God forever. Instead, they would have eternal life.',
		ueb: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.'
	},
	'Genesis 1:1': {
		ult: 'In the beginning, God created the heavens and the earth.',
		ust: 'In the beginning, God created the sky and the earth.',
		t4t: 'Long, long ago God created the heavens and the earth.',
		ueb: 'In the beginning, God created the heavens and the earth.'
	},
	'Psalm 23:1': {
		ult: 'A psalm of David. Yahweh is my shepherd; I will lack nothing.',
		ust: 'Yahweh is like a shepherd who takes care of me; I have everything that I need.',
		t4t: 'Yahweh, you are like a shepherd to me. You give me everything that I need.',
		ueb: 'The Lord is my shepherd; I shall not want.'
	},
	'Romans 8:28': {
		ult: 'We know that for those who love God, he works all things together for good, for those who are called according to his purpose.',
		ust: 'And we know that for those who love God, he works to use all things for their good. This is true for those whom he has chosen to be his people.',
		t4t: 'And we know that to those who love God, he works to cause all the things that happen to them to produce a good result. That is true for those whom God has chosen to be his people.',
		ueb: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.'
	}
};

// Resource metadata
const RESOURCE_INFO = {
	ult: {
		name: 'unfoldingWord Literal Text',
		description: 'A form-centric translation that closely follows the Hebrew and Greek texts',
		language: 'en',
		textDirection: 'ltr'
	},
	ust: {
		name: 'unfoldingWord Simplified Text',
		description:
			'A meaning-centric translation that expresses the meanings of the Hebrew and Greek texts',
		language: 'en',
		textDirection: 'ltr'
	},
	t4t: {
		name: 'Translation for Translators',
		description: 'A meaning-based translation designed to help translators understand the text',
		language: 'en',
		textDirection: 'ltr'
	},
	ueb: {
		name: 'Unlocked English Bible',
		description: 'An open-licensed English translation designed for clarity',
		language: 'en',
		textDirection: 'ltr'
	}
};

/**
 * Parse resource parameter
 */
function parseResources(resourceParam: string | undefined): string[] {
	if (!resourceParam || resourceParam === 'all') {
		return ['ult', 'ust', 't4t', 'ueb'];
	}

	// Handle comma-separated resources
	return resourceParam
		.split(',')
		.map((r) => r.trim())
		.filter((r) => ['ult', 'ust', 't4t', 'ueb'].includes(r));
}

/**
 * Format scripture for response
 */
function formatScripture(
	reference: string,
	text: string,
	resource: string,
	language: string,
	organization: string
): any {
	const info = RESOURCE_INFO[resource as keyof typeof RESOURCE_INFO];
	return {
		reference,
		text,
		resource,
		language,
		organization,
		version: resource.toUpperCase(),
		citation: `${reference} (${resource.toUpperCase()})`,
		copyright: 'Public Domain',
		direction: info?.textDirection || 'ltr',
		resourceInfo: info
	};
}

/**
 * Fetch scripture for a reference
 */
async function fetchScripture(params: Record<string, any>, _request: Request): Promise<any> {
	const { reference, language, organization, resource: resourceParam, format = 'json' } = params;

	// Get requested resources
	const requestedResources = parseResources(resourceParam);

	// Get mock data for reference
	const scriptureData = MOCK_SCRIPTURE_DATA[reference as keyof typeof MOCK_SCRIPTURE_DATA];

	if (!scriptureData) {
		throw new Error(`Scripture not found for reference: ${reference}`);
	}

	// Build scripture array
	const scripture = [];
	for (const resource of requestedResources) {
		const text = scriptureData[resource as keyof typeof scriptureData];
		if (text) {
			scripture.push(formatScripture(reference, text, resource, language, organization));
		}
	}

	// Handle different formats
	if (format === 'text') {
		// Plain text format
		return {
			body: scripture.map((s) => `${s.citation}\n${s.text}`).join('\n\n'),
			headers: { 'Content-Type': 'text/plain' }
		};
	} else if (format === 'md' || format === 'markdown') {
		// Markdown format
		const markdown = scripture.map((s) => `## ${s.citation}\n\n${s.text}\n\n---`).join('\n\n');
		return {
			body: markdown,
			headers: { 'Content-Type': 'text/markdown' }
		};
	}

	// Default JSON format
	return createScriptureResponse(scripture, {
		reference,
		language,
		organization,
		format,
		requestedResources,
		foundResources: scripture.map((s) => s.resource)
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'fetch-scripture-v2',

	params: [
		COMMON_PARAMS.reference,
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		{
			name: 'resource',
			default: 'all',
			validate: (value) => {
				if (!value) return true;
				if (value === 'all') return true;
				const resources = value.split(',').map((r) => r.trim());
				return resources.every((r) => ['ult', 'ust', 't4t', 'ueb'].includes(r));
			}
		},
		{
			name: 'format',
			default: 'json',
			validate: (value) => {
				if (!value) return true;
				return ['json', 'text', 'md', 'markdown', 'usfm'].includes(value);
			}
		}
	],

	fetch: fetchScripture,

	onError: createStandardErrorHandler({
		'Scripture not found for reference': {
			status: 404,
			message: 'No scripture available for the specified reference.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
