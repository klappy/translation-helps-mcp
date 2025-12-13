/**
 * Get Translation Word Endpoint v2
 *
 * Now with R2 DIRECT ACCESS for blazing fast filter operations!
 * Parallel fetch all markdown files from R2 storage.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher, type TWArticleResult } from '$lib/unifiedResourceFetcher.js';
import { parseRCLink, extractTerm, isRCLink } from '$lib/rcLinkParser.js';
import { createSearchService } from '$lib/../../../src/services/SearchServiceFactory.js';
import { initializeR2Env } from '$lib/../../../src/functions/r2-env.js';

// Import shared filter utilities
import { generateStemmedPattern, computeFilterStatistics } from '$lib/filterUtils.js';

// Categories for Translation Words
const TW_CATEGORIES = ['kt', 'names', 'other'];

/**
 * Generate Table of Contents when no specific term is requested
 */
function generateTableOfContents(language: string, organization: string) {
	return {
		type: 'table-of-contents',
		title: 'Translation Words',
		description: 'Biblical terms and concepts with detailed explanations',
		categories: [
			{
				id: 'kt',
				name: 'Key Terms',
				description: 'Central theological concepts (God, salvation, covenant, righteousness)',
				exampleTerms: ['love', 'grace', 'faith', 'covenant', 'salvation'],
				exampleRCLink: `rc://${language}/tw/dict/bible/kt/love`
			},
			{
				id: 'names',
				name: 'Names',
				description: 'People, places, and proper nouns (Abraham, Jerusalem, Pharaoh)',
				exampleTerms: ['abraham', 'david', 'jerusalem', 'egypt', 'israel'],
				exampleRCLink: `rc://${language}/tw/dict/bible/names/abraham`
			},
			{
				id: 'other',
				name: 'Other Terms',
				description: 'Cultural, historical, and general concepts (Sabbath, temple, sacrifice)',
				exampleTerms: ['sabbath', 'temple', 'sacrifice', 'priest', 'altar'],
				exampleRCLink: `rc://${language}/tw/dict/bible/other/sabbath`
			}
		],
		usage: {
			byRCLink: `?rcLink=rc://${language}/tw/dict/bible/kt/love`,
			byTerm: '?term=love',
			byPath: '?path=bible/kt/love.md',
			byFilter: '?filter=love (searches all words for "love", "loving", "beloved", etc.)'
		},
		language,
		organization
	};
}

/**
 * Extract term and category from file path
 */
function parseWordPath(path: string): { term: string; category: string } | null {
	// Match paths like "bible/kt/love.md" or "files/bible/names/abraham.md"
	const match = path.match(/bible\/(kt|names|other)\/([^/]+)\.md$/i);
	if (match) {
		return {
			category: match[1].toLowerCase(),
			term: match[2].toLowerCase()
		};
	}
	return null;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, fallback: string): string {
	const match = content.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : fallback;
}

/**
 * Extract definition from markdown content
 */
function extractDefinition(content: string): string {
	const defMatch = content.match(/##\s*Definition:?\s*\n\n([\s\S]+?)(?=\n##|$)/i);
	if (defMatch) {
		return defMatch[1].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
	}

	// Fallback: first paragraph after title
	const lines = content.split('\n');
	let foundTitle = false;
	for (const line of lines) {
		if (line.startsWith('#') && !foundTitle) {
			foundTitle = true;
			continue;
		}
		if (foundTitle && line.trim() && !line.startsWith('#')) {
			return line.trim();
		}
	}
	return '';
}

/**
 * Handle filter requests with R2 DIRECT ACCESS
 */
async function handleFilterRequestWithR2(
	filter: string,
	params: Record<string, any>,
	r2Bucket: any,
	tracer: EdgeXRayTracer
): Promise<any> {
	const { language = 'en', organization = 'unfoldingWord', category: categoryFilter } = params;

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-word] R2 Direct Filter: "${filter}" Pattern: ${pattern}`);

	// Build R2 prefix for translation words
	const r2Prefix = `by-url/git.door43.org/${organization}/${language}_tw/`;

	const matches: Array<{
		term: string;
		title: string;
		category: string;
		definition: string;
		matchedTerms: string[];
		matchCount: number;
		path: string;
		rcLink: string;
	}> = [];

	let termsSearched = 0;
	let termsFailed = 0;
	let fetchMethod = 'r2-direct';

	try {
		// List to find all .md files
		const listStart = Date.now();
		const listResult = await r2Bucket.list({ prefix: r2Prefix, limit: 1000 });
		const listDuration = Date.now() - listStart;
		tracer.addApiCall({
			url: `r2://list/${r2Prefix}`,
			duration: listDuration,
			status: 200,
			size: listResult.objects?.length || 0,
			cached: true
		});

		if (listResult.objects && listResult.objects.length > 0) {
			// Find all .md files in bible/ directory
			const mdFiles = listResult.objects
				.filter((obj: any) => obj.key.includes('/bible/') && obj.key.endsWith('.md'))
				.map((obj: any) => obj.key);

			// Filter by category if specified
			const categoriesToSearch = categoryFilter ? [categoryFilter.toLowerCase()] : TW_CATEGORIES;

			const filesToFetch = mdFiles.filter((key: string) =>
				categoriesToSearch.some((cat) => key.includes(`/bible/${cat}/`))
			);

			console.log(`[fetch-translation-word] R2 found ${filesToFetch.length} word files to search`);

			// BATCHED concurrency - process in groups of 100 for optimal throughput
			const BATCH_SIZE = 100;
			const processBatch = async (keys: string[]) => {
				return Promise.all(
					keys.map(async (key: string) => {
						const fetchStart = Date.now();
						try {
							const obj = await r2Bucket.get(key);
							const fetchDuration = Date.now() - fetchStart;
							if (obj) {
								const text = await obj.text();
								const parsed = parseWordPath(key);
								tracer.addApiCall({
									url: `r2://get/${parsed?.term || 'unknown'}.md`,
									duration: fetchDuration,
									status: 200,
									size: text.length,
									cached: true
								});

								// Parse and filter INSIDE the promise - interleaves with other fetches
								if (parsed) {
									const title = extractTitle(text, parsed.term);
									const definition = extractDefinition(text);

									// Check if content matches pattern
									const searchText = `${parsed.term} ${title} ${definition} ${text}`;
									pattern.lastIndex = 0;
									const found: string[] = [];
									let match;
									while ((match = pattern.exec(searchText)) !== null) {
										found.push(match[0]);
									}

									if (found.length > 0) {
										return {
											success: true,
											match: {
												term: parsed.term,
												title,
												category: parsed.category,
												definition:
													definition.slice(0, 200) + (definition.length > 200 ? '...' : ''),
												matchedTerms: [...new Set(found)],
												matchCount: found.length,
												path: `bible/${parsed.category}/${parsed.term}.md`,
												rcLink: `rc://${language}/tw/dict/bible/${parsed.category}/${parsed.term}`
											}
										};
									}
								}
								return { success: true, match: null };
							}
						} catch {
							// File fetch failed
						}
						return { success: false, match: null };
					})
				);
			};

			// Process in batches
			for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
				const batch = filesToFetch.slice(i, i + BATCH_SIZE);
				const batchResults = await processBatch(batch);

				// Aggregate batch results immediately
				for (const { success, match } of batchResults) {
					if (success) {
						termsSearched++;
						if (match) {
							matches.push(match);
						}
					} else {
						termsFailed++;
					}
				}
			}

			console.log(
				`[fetch-translation-word] R2 filter complete: ${matches.length} matches from ${termsSearched} terms`
			);
		}
	} catch (error) {
		console.error('[fetch-translation-word] R2 direct fetch failed:', error);
		fetchMethod = 'r2-failed';
	}

	// Compute statistics by category
	const statistics = computeFilterStatistics(matches, {
		includeTestament: false,
		includeBook: false,
		includeCategory: true
	});

	return {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			category: categoryFilter || 'all',
			termsSearched,
			termsFailed,
			fetchMethod
		},
		matches
	};
}

/**
 * Fallback filter without R2 - uses per-word fetch (slower)
 */
async function handleFilterRequestFallback(
	filter: string,
	params: Record<string, any>,
	request: Request,
	tracer: EdgeXRayTracer
): Promise<any> {
	const { language, organization, category: categoryFilter } = params;

	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-word] Fallback Filter: "${filter}" Pattern: ${pattern}`);

	// Get list of all words
	const wordList = await fetcher.listTranslationWords(language, organization, categoryFilter);

	if (!wordList || wordList.length === 0) {
		throw new Error('No Translation Words found in repository');
	}

	console.log(
		`[fetch-translation-word] Searching ${wordList.length} words for filter: "${filter}"`
	);

	const matches: Array<{
		term: string;
		title: string;
		category: string;
		definition: string;
		matchedTerms: string[];
		matchCount: number;
		path: string;
		rcLink: string;
	}> = [];

	let termsSearched = 0;
	let termsFailed = 0;

	// Process words in batches
	const batchSize = 20;
	for (let i = 0; i < wordList.length; i += batchSize) {
		const batch = wordList.slice(i, i + batchSize);

		const batchPromises = batch.map(async (wordEntry) => {
			try {
				const result = await fetcher.fetchTranslationWord(
					wordEntry.term,
					language,
					organization,
					wordEntry.path
				);

				if (result && result.content) {
					const mdContent = result.content;
					const termTitle = extractTitle(mdContent, wordEntry.term);
					const definition = extractDefinition(mdContent);

					const searchText = `${wordEntry.term} ${termTitle} ${definition} ${mdContent}`;
					pattern.lastIndex = 0;
					const found: string[] = [];
					let match;
					while ((match = pattern.exec(searchText)) !== null) {
						found.push(match[0]);
					}

					if (found.length > 0) {
						return {
							success: true,
							match: {
								term: wordEntry.term,
								title: termTitle,
								category: wordEntry.category,
								definition: definition.slice(0, 200) + (definition.length > 200 ? '...' : ''),
								matchedTerms: [...new Set(found)],
								matchCount: found.length,
								path: result.path || wordEntry.path,
								rcLink: `rc://${language}/tw/dict/bible/${wordEntry.category}/${wordEntry.term}`
							}
						};
					}
				}
				return { success: true, match: null };
			} catch (_error) {
				return { success: false, match: null };
			}
		});

		const batchResults = await Promise.all(batchPromises);
		for (const result of batchResults) {
			if (result.success) {
				termsSearched++;
				if (result.match) {
					matches.push(result.match);
				}
			} else {
				termsFailed++;
			}
		}
	}

	const statistics = computeFilterStatistics(matches, {
		includeTestament: false,
		includeBook: false,
		includeCategory: true
	});

	return {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			category: categoryFilter || 'all',
			termsSearched,
			termsFailed,
			fetchMethod: 'per-word-fallback'
		},
		matches
	};
}

/**
 * Format filter response as markdown
 */
function formatFilterResponseAsMarkdown(response: any): string {
	let md = '';

	md += '---\n';
	md += `resource: Translation Words Filter\n`;
	md += `filter: "${response.filter}"\n`;
	md += `language: ${response.language}\n`;
	md += `organization: ${response.organization}\n`;
	md += `\n# Result Statistics\n`;
	md += `total_results: ${response.totalMatches}\n`;

	if (response.statistics?.byCategory) {
		md += `\n# By Category\n`;
		for (const [cat, count] of Object.entries(response.statistics.byCategory)) {
			md += `${cat}: ${count}\n`;
		}
	}
	md += '---\n\n';

	md += `# Translation Words Filter: "${response.filter}"\n\n`;
	md += `**Total Results**: ${response.totalMatches}\n`;
	md += `**Fetch Method**: ${response.searchScope?.fetchMethod || 'unknown'}\n\n`;

	md += `## Matches\n\n`;
	const displayMatches = response.matches?.slice(0, 100) || [];
	for (const match of displayMatches) {
		md += `### ${match.title} (${match.category})\n`;
		md += `**Term**: ${match.term}\n`;
		md += `${match.definition}\n`;
		md += `*Matched: ${match.matchedTerms?.join(', ')}*\n\n`;
	}

	if (response.matches?.length > 100) {
		md += `\n*... and ${response.matches.length - 100} more matches*\n`;
	}

	return md;
}

/**
 * Fetch translation word for a specific term (non-filter requests)
 */
async function getTranslationWord(params: Record<string, any>, request: Request): Promise<any> {
	const { term, path, rcLink, language = 'en', organization = 'unfoldingWord', search } = params;

	const tracer = new EdgeXRayTracer(`tw-${Date.now()}`, 'fetch-translation-word');

	// Debug modes
	if (term === 'debug-info') {
		return {
			debug: true,
			message: 'Debug mode active - returning diagnostic info',
			params: { term, path, rcLink, language, organization },
			timestamp: new Date().toISOString()
		};
	}

	if (term === 'love-debug') {
		const debugTrace: any[] = [];
		debugTrace.push({ step: 1, message: 'Starting debug trace for love term' });
		try {
			debugTrace.push({ step: 2, message: 'Creating fetcher' });
			const fetcher = new UnifiedResourceFetcher(tracer);
			debugTrace.push({
				step: 3,
				message: 'Calling fetchTranslationWord',
				params: { term: 'love', language, organization }
			});
			const result = await fetcher.fetchTranslationWord('love', language, organization);
			debugTrace.push({ step: 4, message: 'Success!', result });
			return { debug: true, success: true, trace: debugTrace, result };
		} catch (error: any) {
			debugTrace.push({ step: 'error', message: error.message, debug: error.debug });
			return { debug: true, success: false, trace: debugTrace, error: error.message };
		}
	}

	// If no parameters provided, return Table of Contents
	if (!term && !path && !rcLink) {
		const toc = generateTableOfContents(language, organization);
		return createTranslationHelpsResponse([toc], 'Table of Contents', language, organization, 'tw');
	}

	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let wordKey: string;
	let targetPath: string | undefined;
	let searchCategory: string | undefined;

	if (rcLink || isRCLink(term)) {
		const linkToParse = rcLink || term;
		const parsed = parseRCLink(linkToParse, language);
		if (!parsed.isValid) {
			throw new Error(`Invalid RC link format: ${linkToParse}`);
		}
		wordKey = parsed.term;
		searchCategory = parsed.category;
	} else if (path) {
		const extracted = extractTerm(path, language);
		wordKey = extracted.term;
		targetPath = extracted.path;
		searchCategory = extracted.category;
	} else if (term) {
		const extracted = extractTerm(term, language);
		wordKey = extracted.term;
		searchCategory = extracted.category;
	} else {
		throw new Error('Either term, path, or rcLink parameter is required');
	}

	if (!wordKey) {
		throw new Error('Could not determine term to look up');
	}

	try {
		let result: TWArticleResult;
		try {
			result = await fetcher.fetchTranslationWord(wordKey, language, organization, targetPath);
		} catch (error) {
			if (targetPath) {
				result = await fetcher.fetchTranslationWord(wordKey, language, organization);
			} else {
				throw error;
			}
		}

		if (!result || !result.content) {
			throw new Error(`Translation word not found: ${wordKey}`);
		}

		const mdContent = result.content;
		const termTitle = extractTitle(mdContent, wordKey);
		const definition = extractDefinition(mdContent);

		const categoryMatch = result.path?.match(/bible\/(kt|names|other)\//);
		const categoryKey = categoryMatch ? categoryMatch[1] : searchCategory || 'other';
		const categoryNames: Record<string, string> = {
			kt: 'Key Terms',
			names: 'Names',
			other: 'Other'
		};

		const article = {
			term: wordKey,
			title: termTitle,
			category: categoryKey,
			categoryName: categoryNames[categoryKey] || 'Other',
			definition,
			content: mdContent,
			path: result.path,
			rcLink: `rc://${language}/tw/dict/bible/${categoryKey}/${wordKey}`,
			reference: params.reference || null,
			language,
			organization,
			metadata: {
				source: 'TW',
				resourceType: 'tw',
				license: 'CC BY-SA 4.0',
				...(search && { searchQuery: search, searchApplied: true })
			}
		};

		if (search && search.trim().length > 0) {
			const searchService = createSearchService('words');
			await searchService.indexDocuments([
				{
					id: wordKey,
					content: `${termTitle} ${definition} ${mdContent}`,
					path: result.path || '',
					resource: 'translation-words',
					type: 'words'
				}
			]);

			const results = await searchService.search(search, { maxResults: 1 });
			if (results.length === 0) {
				throw new Error(`Translation word "${wordKey}" does not match search query "${search}"`);
			}

			article.metadata.searchScore = results[0].score;
			article.metadata.matchedTerms = results[0].match.terms;
		}

		return article;
	} catch (error) {
		const trace = fetcher.getTrace();
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`${errorMessage} (Trace: ${JSON.stringify(trace)})`);
	}
}

/**
 * Main GET handler - with R2 direct access for filter operations
 */
export const GET: RequestHandler = async (event) => {
	const r2Bucket = (event.platform as any)?.env?.ZIP_FILES;
	const caches: CacheStorage | undefined = (event.platform as any)?.caches;
	if (r2Bucket || caches) {
		initializeR2Env(r2Bucket, caches);
	}

	const url = new URL(event.request.url);
	const filter = url.searchParams.get('filter');

	// Handle filter requests with R2 direct access
	if (filter) {
		const tracer = new EdgeXRayTracer(`tw-filter-${Date.now()}`, 'translation-word-filter');

		const params = {
			filter,
			language: url.searchParams.get('language') || 'en',
			organization: url.searchParams.get('organization') || 'unfoldingWord',
			category: url.searchParams.get('category')
		};

		let response: any;

		if (r2Bucket) {
			response = await handleFilterRequestWithR2(filter, params, r2Bucket, tracer);
		} else {
			console.log('[fetch-translation-word] No R2 bucket, using fallback');
			response = await handleFilterRequestFallback(filter, params, event.request, tracer);
		}

		const format = url.searchParams.get('format')?.toLowerCase() || 'json';
		if (format === 'md' || format === 'markdown') {
			return new Response(formatFilterResponseAsMarkdown(response), {
				headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
			});
		}

		return json(response);
	}

	// Non-filter requests use the simple endpoint pattern
	return simpleEndpointHandler(event);
};

// Simple endpoint for non-filter requests
const simpleEndpointHandler = createSimpleEndpoint({
	name: 'fetch-translation-word-v2',

	params: [
		{
			name: 'term',
			validate: (value) => !value || value.length > 0
		},
		{
			name: 'path',
			validate: (value) => !value || value.endsWith('.md')
		},
		{
			name: 'rcLink',
			validate: (value) => !value || isRCLink(value)
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search,
		{
			name: 'filter',
			required: false,
			description: 'Stemmed regex filter (handled separately with R2 direct access)'
		},
		{
			name: 'category',
			required: false,
			validate: (value) => !value || ['kt', 'names', 'other'].includes(value.toLowerCase()),
			description: 'Limit filter to category: kt (Key Terms), names, or other'
		}
	],

	fetch: getTranslationWord,

	onError: createStandardErrorHandler({
		'Either term, path, or rcLink parameter is required': {
			status: 400,
			message: 'Please provide either a term, path, or RC link'
		},
		'Translation word not found': {
			status: 404,
			message: 'The requested translation word was not found.'
		},
		'does not match search query': {
			status: 404,
			message: 'The requested translation word does not contain the search query.'
		},
		'Invalid RC link format': {
			status: 400,
			message: 'Invalid RC link format.'
		},
		'No Translation Words found': {
			status: 404,
			message: 'No Translation Words found in the repository.'
		}
	}),

	supportsFormats: true
});

export const OPTIONS = createCORSHandler();
