export const config = {
	runtime: 'edge'
};

/**
 * Test endpoint for properly formatted scripture with ZIP caching
 * This is how fetch-scripture SHOULD work
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray';
import { initializeKVCache } from '$lib/../../../src/functions/kv-cache';
import { parseReference } from '$lib/../../../src/parsers/referenceParser';
import { ZipResourceFetcher2 } from '$lib/../../../src/services/ZipResourceFetcher2';

interface ScriptureResult {
	text: string;
	translation: string;
	citation: {
		resource: string;
		organization: string;
		language: string;
		version: string;
		url: string;
	};
}

export async function GET({
	request,
	platform
}: {
	request: Request;
	platform?: { env?: { TRANSLATION_HELPS_CACHE?: unknown } };
}): Promise<Response> {
	const startTime = Date.now();
	const traceId = `test-fmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const tracer = new EdgeXRayTracer(traceId, '/api/test-formatted-scripture');

	try {
		// Initialize KV cache if available
		const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) {
			initializeKVCache(kv);
		}

		const url = new URL(request.url);
		const reference = url.searchParams.get('reference') || 'John 3:16';
		const language = url.searchParams.get('language') || 'en';
		const organization = url.searchParams.get('organization') || 'unfoldingWord';
		const format = url.searchParams.get('format') || 'json';
		const resource = url.searchParams.get('resource'); // Optional: specific resource

		// Parse reference
		const parsedRef = parseReference(reference);
		if (!parsedRef.isValid) {
			return new Response(
				JSON.stringify({
					error: 'Invalid reference format',
					reference,
					hint: 'Use format like "John 3:16" or "John 3:16-18"'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Create ZIP fetcher
		const zipFetcher = new ZipResourceFetcher2(tracer);

		// Fetch scripture - if no specific resource, get all (ULT & UST)
		const versions = resource ? [resource] : ['ult', 'ust'];
		const allResults: ScriptureResult[] = [];

		for (const version of versions) {
			const results = await zipFetcher.getScripture(parsedRef, language, organization, version);

			// Transform results to include proper citations
			for (const result of results) {
				// Extract version from xray trace if available
				const xrayTrace = tracer.getTrace();
				let versionNumber = 'master';

				if (xrayTrace?.apiCalls) {
					for (const call of xrayTrace.apiCalls) {
						if (call.url?.includes('/archive/')) {
							const match = call.url.match(/\/(v\d+)\.zip/);
							if (match) {
								versionNumber = match[1];
								break;
							}
						}
					}
				}

				allResults.push({
					text: formatScriptureText(result.text, parsedRef, format),
					translation: result.translation,
					citation: {
						resource: version.toUpperCase(),
						organization,
						language,
						version: versionNumber,
						url: `https://git.door43.org/${organization}/${language}_${version}`
					}
				});
			}
		}

		// Format response based on requested format
		if (format === 'md' || format === 'markdown') {
			return formatMarkdownResponse(allResults, parsedRef, reference, tracer);
		} else if (format === 'text') {
			return formatTextResponse(allResults, parsedRef, reference);
		} else {
			return formatJsonResponse(allResults, parsedRef, reference, startTime, tracer);
		}
	} catch (error) {
		console.error('💥 Error in test-formatted-scripture:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

/**
 * Format scripture text based on reference type
 */
function formatScriptureText(text: string, parsedRef: any, format: string): string {
	// For JSON, return as-is
	if (format === 'json') return text;

	// Check if we have a verse range
	const hasVerseRange = parsedRef.verseEnd && parsedRef.verseEnd > parsedRef.verse;
	const isFullChapter = !parsedRef.verse;

	// For single verse, return as-is
	if (!hasVerseRange && !isFullChapter) {
		return text;
	}

	// For verse ranges and chapters, add verse numbers
	// This is a simplified version - the full implementation would parse USFM properly
	if (hasVerseRange) {
		// Add verse numbers for ranges
		let verseNum = parsedRef.verse;
		const lines = text.split(/\s+/);
		let result = '';
		let currentVerse = `${verseNum}. `;

		// Simple heuristic: add verse numbers at sentence boundaries
		for (const word of lines) {
			result += currentVerse + word + ' ';
			currentVerse = '';

			// Check for sentence end
			if (word.match(/[.!?]$/)) {
				verseNum++;
				if (verseNum <= parsedRef.verseEnd) {
					result += '\n\n';
					currentVerse = `${verseNum}. `;
				}
			}
		}

		return result.trim();
	}

	return text;
}

/**
 * Format markdown response
 */
function formatMarkdownResponse(
	results: ScriptureResult[],
	parsedRef: any,
	reference: string,
	tracer: EdgeXRayTracer
): Response {
	let body = `# ${reference}\n\n`;

	for (const result of results) {
		const isLongPassage = result.text.length > 500 || !parsedRef.verse;
		const hasVerseNumbers = result.text.includes('\n') && /^\d+\.\s/m.test(result.text);

		// Section header for each translation
		body += `## ${result.translation}\n\n`;

		if (isLongPassage) {
			// For long passages, add metadata upfront
			body += `*${reference} · ${result.citation.organization} ${result.citation.version}*\n\n`;
			body += `${result.text}\n\n`;
		} else if (hasVerseNumbers) {
			// For multi-verse with numbers, just add the text
			body += `${result.text}\n\n`;
		} else {
			// For single verse, use blockquote
			body += `> ${result.text}\n\n`;
		}

		// Citation
		body += `— **${reference} (${result.translation})** · ${result.citation.organization} ${result.citation.version}\n\n`;
	}

	// Add trace summary
	const trace = tracer.getTrace();
	if (trace?.cacheStats) {
		body += `---\n\n`;
		body += `*Cache: ${trace.cacheStats.hits} hits, ${trace.cacheStats.misses} misses`;
		body += ` · Response time: ${trace.totalDuration || 0}ms*\n`;
	}

	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'X-Resources': results.map((r) => r.translation).join(','),
			'X-Cache-Status': trace?.cacheStats?.hits > 0 ? 'hit' : 'miss'
		}
	});
}

/**
 * Format text response
 */
function formatTextResponse(
	results: ScriptureResult[],
	parsedRef: any,
	reference: string
): Response {
	let body = '';

	for (const result of results) {
		body += `${result.text}\n`;
		body += `-${reference} (${result.translation}, ${result.citation.organization})\n\n`;
	}

	return new Response(body.trim(), {
		status: 200,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'X-Resources': results.map((r) => r.translation).join(',')
		}
	});
}

/**
 * Format JSON response
 */
function formatJsonResponse(
	results: ScriptureResult[],
	parsedRef: any,
	reference: string,
	startTime: number,
	tracer: EdgeXRayTracer
): Response {
	const response = {
		scripture: {
			reference,
			language: parsedRef.language || 'en',
			book: parsedRef.book,
			chapter: parsedRef.chapter,
			verse: parsedRef.verse,
			verseEnd: parsedRef.verseEnd
		},
		resources: results,
		metadata: {
			responseTime: Date.now() - startTime,
			cached: false,
			timestamp: new Date().toISOString(),
			translationsFound: results.length,
			xrayTrace: tracer.getTrace()
		}
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'X-Resources': results.map((r) => r.translation).join(',')
		}
	});
}
