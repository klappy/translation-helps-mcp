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
import { initializeKVCache } from '../../../src/functions/kv-cache.js';
import { logger } from '../../../src/utils/logger.js';
import { formatResponse, type ResponseFormat } from './responseFormatter.js';

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

	// Format support
	supportsFormats?: boolean | ResponseFormat[]; // true = all formats, or specify allowed formats
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
	return async ({ url, request, platform }) => {
		const startTime = Date.now();
		let parsedParams: Record<string, any> = {};

		// Initialize KV cache if available
		try {
			// @ts-expect-error platform typing differs by adapter
			const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
			if (kv) {
				initializeKVCache(kv);
				logger.debug('KV cache initialized for endpoint', { endpoint: config.name });
			} else {
				// Log why KV wasn't initialized
				logger.debug('KV cache not available', { 
					endpoint: config.name,
					hasPlatform: !!platform,
					hasPlatformEnv: !!platform?.env,
					// @ts-expect-error platform typing
					envKeys: platform?.env ? Object.keys(platform.env) : []
				});
			}
		} catch (error) {
			logger.warn('Failed to initialize KV cache', { error });
		}

		try {
			// 1. Parse parameters including format if supported
			let formatParam: ParamSchema | undefined;
			const params = config.params || [];

			// Add format parameter if endpoint supports formats
			if (config.supportsFormats) {
				formatParam = {
					name: 'format',
					type: 'string',
					default: 'json',
					validate: (value) => {
						const allowedFormats =
							config.supportsFormats === true
								? ['json', 'md', 'text']
								: (config.supportsFormats as ResponseFormat[]);
						return allowedFormats.includes(value);
					}
				};
			}

			const allParams = formatParam ? [...params, formatParam] : params;
			const parseResult = parseParams(url, allParams);
			parsedParams = parseResult.params;
			const errors = parseResult.errors;

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
			logger.info(`${config.name}: Fetching data`, { params: parsedParams });
			let data = await config.fetch(parsedParams, request);

			// 3. Transform if needed
			if (config.transform) {
				data = config.transform(data);
			}

			// 4. Apply formatting if requested
			const format = (parsedParams.format as ResponseFormat) || 'json';
			let formattedData = data;
			let contentType = 'application/json';

			if (config.supportsFormats && format !== 'json') {
				formattedData = formatResponse(data, {
					format,
					includeMetadata: parsedParams.includeMetadata !== false
				});
				contentType = format === 'md' ? 'text/markdown' : 'text/plain';
			}

			// 5. Extract trace data if present
			let traceData: any = null;
			if (data && typeof data === 'object' && '_trace' in data) {
				traceData = data._trace;
				// Remove _trace from the response data for clean output
				delete data._trace;
				if (formattedData && typeof formattedData === 'object' && '_trace' in formattedData) {
					delete formattedData._trace;
				}
			}

			// 6. Build response headers with X-ray trace data
			const responseTime = Date.now() - startTime;
			const headers: Record<string, string> = {
				'Cache-Control': 'public, max-age=3600',
				'X-Response-Time': `${responseTime}ms`,
				'X-Endpoint': config.name
			};

			// Add X-ray trace headers if available
			if (traceData) {
				// Calculate cache status
				const cacheStats = traceData.cacheStats || { hits: 0, misses: 0 };
				let cacheStatus = 'miss';
				if (cacheStats.hits > 0 && cacheStats.misses === 0) {
					cacheStatus = 'hit';
				} else if (cacheStats.hits > 0 && cacheStats.misses > 0) {
					cacheStatus = 'partial';
				}

				headers['X-Cache-Status'] = cacheStatus;

				// Add full trace as base64 encoded JSON
				const fullTrace = {
					traceId: traceData.traceId,
					mainEndpoint: traceData.mainEndpoint,
					startTime: traceData.startTime,
					totalDuration: traceData.totalDuration || responseTime,
					apiCalls: traceData.apiCalls || [],
					cacheStats: traceData.cacheStats
				};
				headers['X-XRay-Trace'] = btoa(JSON.stringify(fullTrace));
			}

			// 7. Return response with appropriate format
			if (format !== 'json' && typeof formattedData === 'string') {
				return new Response(formattedData, {
					status: 200,
					headers: {
						...headers,
						'Content-Type': `${contentType}; charset=utf-8`,
						'X-Format': format
					}
				});
			}

			return json(formattedData, {
				headers: {
					...headers,
					'X-Content-Type': contentType
				}
			});
		} catch (error) {
			const responseTime = Date.now() - startTime;
			logger.error(`${config.name}: Error`, { error });

			// Build detailed error response
			const errorDetails: any = {
				endpoint: config.name,
				path: url.pathname,
				params: parsedParams || {},
				timestamp: new Date().toISOString()
			};

			// Include stack trace in development
			if (import.meta.env.DEV && error instanceof Error) {
				errorDetails.stack = error.stack?.split('\n').slice(0, 5);
			}

			// Build error headers with X-ray trace
			const errorHeaders: Record<string, string> = {
				'X-Response-Time': `${responseTime}ms`,
				'X-Endpoint': config.name,
				'X-Error': 'true',
				'X-Path': url.pathname,
				'X-Cache-Status': 'miss' // Errors are never cached
			};

			// Add simplified X-ray trace for errors
			const errorTrace = {
				traceId: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				mainEndpoint: config.name,
				startTime: startTime,
				totalDuration: responseTime,
				apiCalls: [],
				cacheStats: { hits: 0, misses: 0 },
				error: error instanceof Error ? error.message : 'Unknown error'
			};
			errorHeaders['X-XRay-Trace'] = btoa(JSON.stringify(errorTrace));

			// Custom error handling
			if (config.onError && error instanceof Error) {
				const { status, message } = config.onError(error);
				return json(
					{
						error: message,
						details: errorDetails,
						status
					},
					{
						status,
						headers: errorHeaders
					}
				);
			}

			// Default error
			return json(
				{
					error: error instanceof Error ? error.message : 'Internal server error',
					details: errorDetails,
					status: 500
				},
				{
					status: 500,
					headers: errorHeaders
				}
			);
		}
	};
}

/**
 * Create OPTIONS handler for CORS
 */
export function createCORSHandler(): RequestHandler {
	return async ({ platform }) => {
		// Initialize KV cache if available (even for OPTIONS requests to keep singleton warm)
		try {
			// @ts-expect-error platform typing differs by adapter
			const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
			if (kv) {
				initializeKVCache(kv);
			}
		} catch {
			// Ignore errors for OPTIONS requests
		}

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
