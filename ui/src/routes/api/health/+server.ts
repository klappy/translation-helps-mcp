/**
 * SvelteKit API Route for health
 * Auto-generated from shared handler with in-memory caching
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Define test cases for each endpoint
const ENDPOINT_TESTS = [
	{
		name: 'fetch-scripture',
		url: '/api/fetch-scripture',
		params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['scripture']
	},
	{
		name: 'get-languages',
		url: '/api/get-languages',
		params: { organization: 'unfoldingWord' },
		expectedFields: ['languages']
	},
	{
		name: 'fetch-translation-notes',
		url: '/api/fetch-translation-notes',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationNotes']
	},
	{
		name: 'fetch-translation-words',
		url: '/api/fetch-translation-words',
		params: { reference: 'Titus 1:1', language: 'en', organization: 'unfoldingWord' },
		expectedFields: ['translationWords']
	}
];

async function testEndpoint(baseUrl: string, test: (typeof ENDPOINT_TESTS)[0]) {
	const startTime = Date.now();

	try {
		const url = new URL(test.url, baseUrl);
		Object.entries(test.params).forEach(([key, value]) => {
			url.searchParams.set(key, String(value));
		});

		const response = await fetch(url.toString());
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
