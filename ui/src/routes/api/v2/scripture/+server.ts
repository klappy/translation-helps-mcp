/**
 * Simple Scripture Endpoint v2
 *
 * This is what all endpoints should look like:
 * - Direct handler
 * - Simple service call
 * - Clean response
 * - No magic
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// NOTE: In a real implementation, we'd import a simple service here
// For now, this is a proof of concept showing the endpoint structure

export const config = {
	runtime: 'edge'
};

export const GET: RequestHandler = async ({ url }) => {
	// 1. Parse parameters (simple and direct)
	const reference = url.searchParams.get('reference');
	const language = url.searchParams.get('language') || 'en';
	const organization = url.searchParams.get('organization') || 'unfoldingWord';
	const _resource = url.searchParams.get('resource') || undefined;

	// 2. Validate
	if (!reference) {
		return json(
			{
				error: 'Reference parameter is required',
				status: 400
			},
			{
				status: 400,
				headers: {
					'X-Error': 'Missing reference',
					'Content-Type': 'application/json'
				}
			}
		);
	}

	// 3. Fetch data (mock for proof of concept)
	try {
		// In real implementation, this would call our simple service
		// For now, return mock data to show the endpoint structure
		const scripture = [
			{
				text: 'For God so loved the world, that he gave his One and Only Son...',
				reference: reference,
				resource: 'ULT v86',
				language: language,
				citation: `${reference} (ULT v86)`,
				organization: organization
			},
			{
				text: "This is because God loved the world's people in this way...",
				reference: reference,
				resource: 'UST v86',
				language: language,
				citation: `${reference} (UST v86)`,
				organization: organization
			}
		];

		// Handle no results
		if (scripture.length === 0) {
			return json(
				{
					error: `No scripture found for ${reference} in ${language}`,
					reference,
					language,
					organization,
					status: 404
				},
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						'X-Content-Type': 'error'
					}
				}
			);
		}

		// 4. Return clean response
		return json(
			{
				scripture,
				language,
				organization,
				citation: reference,
				metadata: {
					sourceCount: scripture.length,
					resources: scripture.map((s) => s.resource)
				}
			},
			{
				headers: {
					'Cache-Control': 'public, max-age=3600',
					'X-Content-Type': 'scripture',
					'X-Language': language,
					'X-Organization': organization,
					'X-Resource-Count': String(scripture.length)
				}
			}
		);
	} catch (error) {
		// 5. Handle errors cleanly
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return json(
			{
				error: errorMessage,
				reference,
				status: 500
			},
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'X-Error': 'Internal server error'
				}
			}
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
