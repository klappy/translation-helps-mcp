export const config = {
	runtime: 'edge'
};

/**
 * Test endpoint for ZIP-based scripture fetching
 * Demonstrates the simplicity of the new approach
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray';
import { initializeKVCache } from '$lib/../../../src/functions/kv-cache';
import { parseReference } from '$lib/../../../src/parsers/referenceParser';
import { ZipResourceFetcher2 } from '$lib/../../../src/services/ZipResourceFetcher2';

export async function GET({
	request,
	platform
}: {
	request: Request;
	platform?: { env?: { TRANSLATION_HELPS_CACHE?: unknown } };
}): Promise<Response> {
	const startTime = Date.now();
	const traceId = `test-zip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const tracer = new EdgeXRayTracer(traceId, '/api/test-zip-scripture');

	try {
		console.log('🎯 test-zip-scripture endpoint called');

		// Initialize KV cache if available
		const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) {
			console.log('☁️ Initializing KV cache');
			initializeKVCache(kv);
		} else {
			console.log('⚠️ No KV namespace available - using memory-only cache');
		}

		const url = new URL(request.url);
		const reference = url.searchParams.get('reference') || 'John 3:16';
		const language = url.searchParams.get('language') || 'en';
		const organization = url.searchParams.get('organization') || 'unfoldingWord';
		const version = url.searchParams.get('version') || 'ult';

		console.log('📝 Parameters:', { reference, language, organization, version });

		// Parse reference
		const parsedRef = parseReference(reference);
		console.log('📖 Parsed reference:', parsedRef);

		if (!parsedRef.isValid) {
			return new Response(
				JSON.stringify({
					error: 'Invalid reference format',
					reference,
					hint: 'Use format like "John 3:16"'
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Create ZIP fetcher
		console.log('🔨 Creating ZipResourceFetcher2...');
		const zipFetcher = new ZipResourceFetcher2(tracer);

		// Fetch scripture using ZIP approach
		console.log('🔍 Calling getScripture...');
		try {
			const results = await zipFetcher.getScripture(parsedRef, language, organization, version);
			console.log('📊 Results:', results);
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						resources: results || [],
						total: results?.length || 0,
						reference: reference,
						language: language,
						organization: organization
					},
					metadata: {
						responseTime: Date.now() - startTime,
						method: 'ZIP',
						cached: false,
						xrayTrace: tracer.getTrace()
					}
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'X-Response-Time': (Date.now() - startTime).toString()
					}
				}
			);
		} catch (fetchError) {
			console.error('🔥 Error calling getScripture:', fetchError);
			throw fetchError;
		}
	} catch (error) {
		console.error('💥 Error in test-zip-scripture:', error);
		console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
