export const config = {
	runtime: 'edge'
};

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray';
import { ZipResourceFetcher2 } from '$lib/../../../src/services/ZipResourceFetcher2';

export async function GET(): Promise<Response> {
	const tracer = new EdgeXRayTracer('test', 'test');
	const fetcher = new ZipResourceFetcher2(tracer);

	try {
		// Use exact same parameters as our working direct test
		const results = await fetcher.getScripture(
			{ book: 'John', chapter: 3, verse: 16, endVerse: 16, isValid: true },
			'en',
			'unfoldingWord',
			'ult'
		);

		return new Response(
			JSON.stringify({
				success: true,
				results,
				count: results.length
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
