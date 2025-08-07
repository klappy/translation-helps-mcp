export const config = {
	runtime: 'edge'
};

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray';
import { ZipResourceFetcher2 } from '$lib/../../../src/services/ZipResourceFetcher2';

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const iterations = parseInt(url.searchParams.get('iterations') || '3');

	const results = {
		firstRun: { time: 0, cached: false },
		subsequentRuns: [] as Array<{ time: number; cached: boolean }>,
		average: 0,
		cacheHitRate: 0
	};

	for (let i = 0; i < iterations; i++) {
		const startTime = Date.now();
		const tracer = new EdgeXRayTracer(`bench-${i}`, 'benchmark');
		const fetcher = new ZipResourceFetcher2(tracer);

		try {
			await fetcher.getScripture(
				{ book: 'John', chapter: 3, verse: 16, endVerse: 16, isValid: true },
				'en',
				'unfoldingWord',
				'ult'
			);

			const duration = Date.now() - startTime;
			const trace = tracer.getTrace();
			const wasCached = trace.cacheStats.hits > 0;

			if (i === 0) {
				results.firstRun = { time: duration, cached: wasCached };
			} else {
				results.subsequentRuns.push({ time: duration, cached: wasCached });
			}
		} catch (error) {
			return new Response(
				JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	// Calculate averages
	if (results.subsequentRuns.length > 0) {
		const totalTime = results.subsequentRuns.reduce((sum, run) => sum + run.time, 0);
		results.average = Math.round(totalTime / results.subsequentRuns.length);

		const cacheHits = results.subsequentRuns.filter((run) => run.cached).length;
		results.cacheHitRate = (cacheHits / results.subsequentRuns.length) * 100;
	}

	return new Response(
		JSON.stringify(
			{
				success: true,
				iterations,
				results,
				summary: {
					firstRunTime: `${results.firstRun.time}ms`,
					averageCachedTime: `${results.average}ms`,
					improvement:
						results.average > 0
							? `${Math.round((1 - results.average / results.firstRun.time) * 100)}%`
							: 'N/A',
					cacheHitRate: `${results.cacheHitRate}%`
				}
			},
			null,
			2
		),
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
}
