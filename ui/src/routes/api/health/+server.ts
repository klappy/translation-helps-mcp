/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { VERSION } from '$lib/version.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

// Define test cases for each endpoint organized by category
interface EndpointTest {
	name: string;
	url: string;
	params: Record<string, string>;
	expectedFields: string[];
	method?: 'GET' | 'POST';
	body?: Record<string, unknown>;
	category: 'core' | 'extended' | 'experimental';
}

interface EndpointResult {
	name: string;
	status: 'healthy' | 'warning' | 'error';
	responseTime: number;
	category: 'core' | 'extended' | 'experimental';
	cached?: {
		status: 'healthy' | 'warning' | 'error';
		responseTime: number;
		error?: string;
		missingFields?: string[];
		hasData?: boolean;
		cacheStatus?: string;
	};
	bypassed?: {
		status: 'healthy' | 'warning' | 'error';
		responseTime: number;
		error?: string;
		missingFields?: string[];
		hasData?: boolean;
		cacheStatus?: string;
	};
	error?: string;
	missingFields?: string[];
	hasData?: boolean;
}

const ENDPOINT_TESTS: EndpointTest[] = [
	// CORE - Essential Bible content endpoints
	{
		name: 'fetch-scripture',
		url: '/api/fetch-scripture',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['scripture'],
		category: 'core'
	},
	{
		name: 'fetch-translation-notes',
		url: '/api/fetch-translation-notes',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationNotes'],
		category: 'core'
	},
	{
		name: 'fetch-translation-questions',
		url: '/api/fetch-translation-questions',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationQuestions'],
		category: 'core'
	},
	{
		name: 'get-languages',
		url: '/api/get-languages',
		params: { organization: 'unfoldingWord' },
		expectedFields: ['languages'],
		category: 'core'
	},
	{
		name: 'get-available-books',
		url: '/api/get-available-books',
		params: { language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['books'],
		category: 'core'
	},

	// EXTENDED - Enhanced features and comprehensive resources
	{
		name: 'fetch-translation-words',
		url: '/api/fetch-translation-words',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationWords'],
		category: 'extended'
	},
	{
		name: 'fetch-resources',
		url: '/api/fetch-resources',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['resources'],
		category: 'extended'
	},
	{
		name: 'get-context',
		url: '/api/get-context',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['context'],
		category: 'extended'
	},
	{
		name: 'browse-translation-words',
		url: '/api/browse-translation-words',
		params: { language: 'en', category: 'kt', organization: 'unfoldingWord' },
		expectedFields: ['words'],
		category: 'extended'
	},
	{
		name: 'get-translation-word',
		url: '/api/get-translation-word',
		params: { term: 'grace', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['term'],
		category: 'extended'
	},
	{
		name: 'list-available-resources',
		url: '/api/list-available-resources',
		params: { language: 'en', query: 'faith' },
		expectedFields: ['resources'],
		category: 'extended'
	},
	{
		name: 'extract-references',
		url: '/api/extract-references',
		params: { text: 'See John 3:16 and Romans 1:1 for more details' },
		expectedFields: ['references'],
		category: 'extended'
	},

	// EXPERIMENTAL - Newer features and integrations
	{
		name: 'fetch-translation-word-links',
		url: '/api/fetch-translation-word-links',
		params: { reference: 'Genesis 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['wordLinks'],
		category: 'experimental'
	},
	{
		name: 'get-words-for-reference',
		url: '/api/get-words-for-reference',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['words'],
		category: 'experimental'
	},
	{
		name: 'mcp-endpoint',
		url: '/api/mcp',
		params: {},
		expectedFields: ['tools'],
		method: 'POST',
		body: { jsonrpc: '2.0', method: 'tools/list', id: 1 },
		category: 'experimental'
	}
];

async function testSingleEndpoint(baseUrl: string, test: EndpointTest, bypassCache = false) {
	const startTime = Date.now();

	try {
		const url = new URL(test.url, baseUrl);

		// Handle different request methods
		const method = test.method || 'GET';
		const fetchOptions: RequestInit = { method };

		if (method === 'POST' && test.body) {
			// POST request with JSON body (for MCP)
			fetchOptions.headers = {
				'Content-Type': 'application/json',
				...(bypassCache && { 'X-Cache-Bypass': 'true' })
			};
			fetchOptions.body = JSON.stringify(test.body);
		} else {
			// GET request with query parameters
			Object.entries(test.params).forEach(([key, value]) => {
				url.searchParams.set(key, String(value));
			});

			// Add cache bypass parameter if needed
			if (bypassCache) {
				url.searchParams.set('bypass', 'true');
			}

			if (bypassCache) {
				fetchOptions.headers = { 'X-Cache-Bypass': 'true' };
			}
		}

		const response = await fetch(url.toString(), fetchOptions);
		const responseTime = Date.now() - startTime;
		const cacheStatus =
			response.headers.get('X-Cache-Status') || response.headers.get('X-Cache') || 'unknown';

		if (!response.ok) {
			return {
				status: 'error' as const,
				error: `HTTP ${response.status}: ${response.statusText}`,
				responseTime,
				cacheStatus
			};
		}

		const data = await response.json();

		// Check if expected fields exist
		const missingFields = test.expectedFields.filter((field) => !data[field]);

		return {
			status: missingFields.length === 0 ? ('healthy' as const) : ('warning' as const),
			responseTime,
			missingFields: missingFields.length > 0 ? missingFields : undefined,
			hasData: test.expectedFields.some(
				(field) =>
					data[field] &&
					(Array.isArray(data[field])
						? data[field].length > 0
						: typeof data[field] === 'object'
							? Object.keys(data[field]).length > 0
							: !!data[field])
			),
			cacheStatus
		};
	} catch (error) {
		return {
			status: 'error' as const,
			error: error instanceof Error ? error.message : 'Unknown error',
			responseTime: Date.now() - startTime,
			cacheStatus: 'unknown'
		};
	}
}

async function testEndpointDual(baseUrl: string, test: EndpointTest): Promise<EndpointResult> {
	// Test with cache
	const cachedResult = await testSingleEndpoint(baseUrl, test, false);

	// Test with cache bypass
	const bypassedResult = await testSingleEndpoint(baseUrl, test, true);

	// Determine overall status (error > warning > healthy)
	let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
	if (cachedResult.status === 'error' || bypassedResult.status === 'error') {
		overallStatus = 'error';
	} else if (cachedResult.status === 'warning' || bypassedResult.status === 'warning') {
		overallStatus = 'warning';
	}

	// Calculate average response time
	const avgResponseTime = Math.round((cachedResult.responseTime + bypassedResult.responseTime) / 2);

	return {
		name: test.name,
		status: overallStatus,
		responseTime: avgResponseTime,
		category: test.category,
		cached: cachedResult,
		bypassed: bypassedResult,
		// Include legacy fields for backward compatibility
		error: overallStatus === 'error' ? cachedResult.error || bypassedResult.error : undefined,
		missingFields: [
			...(cachedResult.missingFields || []),
			...(bypassedResult.missingFields || [])
		].filter((field, index, arr) => arr.indexOf(field) === index),
		hasData: cachedResult.hasData || bypassedResult.hasData
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const startTime = Date.now();
	const baseUrl = url.origin;

	// Test all endpoints in parallel
	const results = await Promise.all(ENDPOINT_TESTS.map((test) => testEndpointDual(baseUrl, test)));

	// Group results by category
	const coreResults = results.filter((r: EndpointResult) => r.category === 'core');
	const extendedResults = results.filter((r: EndpointResult) => r.category === 'extended');
	const experimentalResults = results.filter((r: EndpointResult) => r.category === 'experimental');

	// Summary stats
	const totalEndpoints = results.length;
	const healthyEndpoints = results.filter((r: EndpointResult) => r.status === 'healthy').length;
	const warningEndpoints = results.filter((r: EndpointResult) => r.status === 'warning').length;
	const errorEndpoints = results.filter((r: EndpointResult) => r.status === 'error').length;
	const avgResponseTime =
		results.reduce((sum: number, r: EndpointResult) => sum + r.responseTime, 0) / totalEndpoints;

	// Category-based stats
	const getCategoryStats = (categoryResults: EndpointResult[]) => ({
		total: categoryResults.length,
		healthy: categoryResults.filter((r) => r.status === 'healthy').length,
		warning: categoryResults.filter((r) => r.status === 'warning').length,
		error: categoryResults.filter((r) => r.status === 'error').length,
		avgResponseTime:
			categoryResults.length > 0
				? Math.round(
						categoryResults.reduce((sum, r) => sum + r.responseTime, 0) / categoryResults.length
					)
				: 0
	});

	// Overall health status
	let overallStatus = 'healthy';
	if (errorEndpoints > 0) overallStatus = 'error';
	else if (warningEndpoints > 0) overallStatus = 'warning';

	const healthData = {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		version: VERSION,
		uptime: typeof process !== 'undefined' && process.uptime ? process.uptime() : 0,
		memory: typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null,
		summary: {
			totalEndpoints,
			healthyEndpoints,
			warningEndpoints,
			errorEndpoints,
			avgResponseTime: Math.round(avgResponseTime)
		},
		categories: {
			core: getCategoryStats(coreResults),
			extended: getCategoryStats(extendedResults),
			experimental: getCategoryStats(experimentalResults)
		},
		endpoints: results,
		responseTime: Date.now() - startTime
	};

	// Health check endpoint should ALWAYS return 200
	// Problems are reported in the response data, not HTTP status codes
	return json(healthData, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'GET, OPTIONS'
		}
	});
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
