/**
 * Simple Endpoint Wrapper
 *
 * KISS: Direct, minimal abstraction for API endpoints
 * DRY: Reusable patterns without magic
 *
 * This is how endpoints SHOULD work - clean, simple, testable.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { logger } from '../../../src/utils/logger.js';

// Simple parameter validation
export interface ParamSchema {
	name: string;
	required?: boolean;
	type?: 'string' | 'number' | 'boolean';
	default?: any;
	validate?: (value: any) => boolean;
}

// Simple endpoint configuration
export interface SimpleEndpointConfig {
	// Basic info
	name: string;

	// Parameters
	params?: ParamSchema[];

	// Data fetcher - just a function!
	fetch: (params: Record<string, any>, request: Request) => Promise<any>;

	// Optional transform
	transform?: (data: any) => any;

	// Optional custom error handler
	onError?: (error: Error) => { status: number; message: string };
}

/**
 * Parse parameters from request
 */
function parseParams(
	url: URL,
	schema: ParamSchema[] = []
): { params: Record<string, any>; errors: string[] } {
	const params: Record<string, any> = {};
	const errors: string[] = [];

	for (const param of schema) {
		const value = url.searchParams.get(param.name);

		// Check required
		if (param.required && !value) {
			errors.push(`Missing required parameter: ${param.name}`);
			continue;
		}

		// Apply default
		if (!value && param.default !== undefined) {
			params[param.name] = param.default;
			continue;
		}

		// Skip if not provided and not required
		if (!value) continue;

		// Type conversion
		let parsed: any = value;
		if (param.type === 'number') {
			parsed = Number(value);
			if (isNaN(parsed)) {
				errors.push(`Parameter ${param.name} must be a number`);
				continue;
			}
		} else if (param.type === 'boolean') {
			parsed = value === 'true' || value === '1';
		}

		// Custom validation
		if (param.validate && !param.validate(parsed)) {
			errors.push(`Parameter ${param.name} is invalid`);
			continue;
		}

		params[param.name] = parsed;
	}

	return { params, errors };
}

/**
 * Create a simple endpoint handler
 *
 * Example usage:
 * ```typescript
 * export const GET = createSimpleEndpoint({
 *   name: 'fetch-scripture',
 *   params: [
 *     { name: 'reference', required: true },
 *     { name: 'language', default: 'en' }
 *   ],
 *   fetch: async (params) => {
 *     return scriptureService.getScripture(params);
 *   }
 * });
 * ```
 */
export function createSimpleEndpoint(config: SimpleEndpointConfig): RequestHandler {
	return async ({ url, request }) => {
		const startTime = Date.now();

		try {
			// 1. Parse parameters
			const { params, errors } = parseParams(url, config.params);

			if (errors.length > 0) {
				return json(
					{
						error: 'Invalid parameters',
						details: errors,
						status: 400
					},
					{
						status: 400,
						headers: {
							'X-Response-Time': `${Date.now() - startTime}ms`,
							'X-Endpoint': config.name
						}
					}
				);
			}

			// 2. Fetch data
			logger.info(`${config.name}: Fetching data`, { params });
			let data = await config.fetch(params, request);

			// 3. Transform if needed
			if (config.transform) {
				data = config.transform(data);
			}

			// 4. Return success response
			const responseTime = Date.now() - startTime;

			return json(data, {
				headers: {
					'Cache-Control': 'public, max-age=3600',
					'X-Response-Time': `${responseTime}ms`,
					'X-Endpoint': config.name,
					'X-Content-Type': 'application/json'
				}
			});
		} catch (error) {
			logger.error(`${config.name}: Error`, { error });

			// Custom error handling
			if (config.onError && error instanceof Error) {
				const { status, message } = config.onError(error);
				return json(
					{
						error: message,
						endpoint: config.name,
						status
					},
					{
						status,
						headers: {
							'X-Response-Time': `${Date.now() - startTime}ms`,
							'X-Endpoint': config.name,
							'X-Error': 'true'
						}
					}
				);
			}

			// Default error
			return json(
				{
					error: error instanceof Error ? error.message : 'Internal server error',
					endpoint: config.name,
					status: 500
				},
				{
					status: 500,
					headers: {
						'X-Response-Time': `${Date.now() - startTime}ms`,
						'X-Endpoint': config.name,
						'X-Error': 'true'
					}
				}
			);
		}
	};
}

/**
 * Create OPTIONS handler for CORS
 */
export function createCORSHandler(): RequestHandler {
	return async () => {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400'
			}
		});
	};
}
