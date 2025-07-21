import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { fetchTranslationNotes } from '../../../../../src/functions/translation-notes-service.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const reference = url.searchParams.get('reference');
		const language = url.searchParams.get('language');
		const organization = url.searchParams.get('organization');

		if (!reference || !language || !organization) {
			return json(
				{
					success: false,
					error: 'Missing required parameters: reference, language, organization'
				},
				{ status: 400 }
			);
		}

		const result = await fetchTranslationNotes({
			reference,
			language,
			organization
		});
		return json(result);
	} catch (error) {
		console.error('Error in fetch-translation-notes:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// Enable CORS
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};
