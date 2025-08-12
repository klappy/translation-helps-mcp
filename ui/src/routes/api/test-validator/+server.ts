import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const config = {
	runtime: 'edge'
};

/**
 * Test endpoint to verify response validator is working
 * This intentionally tries to return forbidden keys
 */
export const GET: RequestHandler = async ({ url }) => {
	const test = url.searchParams.get('test') || 'default';

	// Different test cases to verify our validator
	const testCases: Record<string, unknown> = {
		// Clean response - should pass
		clean: {
			data: 'This is clean data',
			metadata: {
				count: 10,
				resources: ['ult', 'ust']
			}
		},

		// Dirty response - should trigger validator
		dirty: {
			data: 'This has forbidden keys',
			xrayTrace: {
				// FORBIDDEN!
				traceId: '12345',
				duration: 100
			},
			debug: {
				// FORBIDDEN!
				internal: 'secret data'
			},
			traceId: 'abc123', // FORBIDDEN!
			metadata: {
				count: 5
			}
		},

		// Nested violations - should be caught
		nested: {
			results: [
				{
					text: 'Result 1',
					xrayTrace: 'hidden' // FORBIDDEN!
				},
				{
					text: 'Result 2',
					internal: {
						// FORBIDDEN!
						secret: 'data'
					}
				}
			]
		}
	};

	const response = testCases[test] || testCases.clean;

	// The RouteGenerator with validator should clean this automatically
	return json(response);
};
