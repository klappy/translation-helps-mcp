import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ResourceAggregator } from '../../../../../src/services/ResourceAggregator.js';
import { parseReference } from '../../../../../src/parsers/referenceParser.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const reference = url.searchParams.get('reference');
		const language = url.searchParams.get('language') || 'en';
		const organization = url.searchParams.get('organization') || 'unfoldingWord';

		if (!reference) {
			return json(
				{
					success: false,
					error: 'Missing required parameter: reference'
				},
				{ status: 400 }
			);
		}

		const aggregator = new ResourceAggregator(language, organization);

		// Parse the reference and get translation word links
		const parsedReference = parseReference(reference);
		const result = await aggregator.aggregateResources(parsedReference, {
			language,
			organization,
			resources: ['wordLinks']
		});

		return json(result);
	} catch (error) {
		console.error('Error in fetch-translation-word-links:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
};
