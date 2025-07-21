/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Define test cases for each endpoint
interface EndpointTest {
	name: string;
	url: string;
	params: Record<string, string>;
	expectedFields: string[];
	method?: 'GET' | 'POST';
	body?: Record<string, unknown>;
}

const ENDPOINT_TESTS: EndpointTest[] = [
	// Core Bible content endpoints
	{
		name: 'fetch-scripture',
		url: '/api/fetch-scripture',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['scripture']
	},
	{
		name: 'fetch-translation-notes',
		url: '/api/fetch-translation-notes',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationNotes']
	},
	{
		name: 'fetch-translation-questions',
		url: '/api/fetch-translation-questions',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationQuestions']
	},
	{
		name: 'fetch-translation-words',
		url: '/api/fetch-translation-words',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationWords']
	},
	{
		name: 'fetch-translation-word-links',
		url: '/api/fetch-translation-word-links',
		params: { reference: 'Genesis 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['wordLinks']
	},

	// Comprehensive resource endpoints
	{
		name: 'fetch-resources',
		url: '/api/fetch-resources',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['resources']
	},
	{
		name: 'get-context',
		url: '/api/get-context',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['context']
	},

	// Metadata and search endpoints
	{
		name: 'get-languages',
		url: '/api/get-languages',
		params: { organization: 'unfoldingWord' },
		expectedFields: ['languages']
	},
	{
		name: 'get-available-books',
		url: '/api/get-available-books',
		params: { language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['books']
	},
	{
		name: 'list-available-resources',
		url: '/api/list-available-resources',
		params: { language: 'en', query: 'faith' },
		expectedFields: ['resources']
	},

	// Translation words browsing
	{
		name: 'browse-translation-words',
		url: '/api/browse-translation-words',
		params: { language: 'en', category: 'kt', organization: 'unfoldingWord' },
		expectedFields: ['words']
	},
	{
		name: 'get-translation-word',
		url: '/api/get-translation-word',
		params: { term: 'grace', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['term']
	},
	{
		name: 'get-words-for-reference',
		url: '/api/get-words-for-reference',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['words']
	},

	// Parsing and utility endpoints
	{
		name: 'extract-references',
		url: '/api/extract-references',
		params: { text: 'See John 3:16 and Romans 1:1 for more details' },
		expectedFields: ['references']
	},

	// MCP protocol endpoint
	{
		name: 'mcp-endpoint',
		url: '/api/mcp',
		params: {},
		expectedFields: ['tools'],
		method: 'POST',
		body: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
	}
];

async function testEndpoint(baseUrl: string, test: EndpointTest) {
	const startTime = Date.now();

	try {
		const url = new URL(test.url, baseUrl);

		// Handle different request methods
		const method = test.method || 'GET';
		const fetchOptions: RequestInit = { method };

		if (method === 'POST' && test.body) {
			// POST request with JSON body (for MCP)
			fetchOptions.headers = { 'Content-Type': 'application/json' };
			fetchOptions.body = JSON.stringify(test.body);
		} else {
			// GET request with query parameters
			Object.entries(test.params).forEach(([key, value]) => {
				url.searchParams.set(key, String(value));
			});
		}

		const response = await fetch(url.toString(), fetchOptions);
		const responseTime = Date.now() - startTime;

		if (!response.ok) {
			return {
				name: test.name,
				status: 'error',
				error: `HTTP ${response.status}: ${response.statusText}`,
				responseTime
			};
		}

		const data = await response.json();

		// Check if expected fields exist
		const missingFields = test.expectedFields.filter((field) => !data[field]);

		return {
			name: test.name,
			status: missingFields.length === 0 ? 'healthy' : 'warning',
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
			)
		};
	} catch (error) {
		return {
			name: test.name,
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error',
			responseTime: Date.now() - startTime
		};
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const startTime = Date.now();
	const baseUrl = url.origin;

	// Test all endpoints in parallel
	const results = await Promise.all(ENDPOINT_TESTS.map((test) => testEndpoint(baseUrl, test)));

	// Summary stats
	const totalEndpoints = results.length;
	const healthyEndpoints = results.filter((r) => r.status === 'healthy').length;
	const warningEndpoints = results.filter((r) => r.status === 'warning').length;
	const errorEndpoints = results.filter((r) => r.status === 'error').length;
	const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalEndpoints;

	// Overall health status
	let overallStatus = 'healthy';
	if (errorEndpoints > 0) overallStatus = 'error';
	else if (warningEndpoints > 0) overallStatus = 'warning';

	const healthData = {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		version: '4.0.0',
		uptime: process.uptime?.() || 0,
		memory: process.memoryUsage?.() || null,
		summary: {
			totalEndpoints,
			healthyEndpoints,
			warningEndpoints,
			errorEndpoints,
			avgResponseTime: Math.round(avgResponseTime)
		},
		endpoints: results,
		responseTime: Date.now() - startTime
	};

	// Return appropriate HTTP status based on health
	const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'warning' ? 200 : 503;

	return json(healthData, {
		status: httpStatus,
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
