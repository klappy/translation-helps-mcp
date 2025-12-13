/**
 * Fetch Translation Academy Endpoint v2
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
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import { parseTranslationAcademyRCLink, isTranslationAcademyRCLink } from '$lib/rcLinkParser.js';
import { createSearchService } from '$lib/../../../src/services/SearchServiceFactory.js';
import { initializeR2Env } from '$lib/../../../src/functions/r2-env.js';

// Import shared filter utilities
import { generateStemmedPattern, computeFilterStatistics } from '$lib/filterUtils.js';

// Categories for Translation Academy
const TA_CATEGORIES = ['translate', 'checking', 'process', 'intro'];

/**
 * Extract module info from file path
 */
function parseModulePath(path: string): { moduleId: string; category: string } | null {
	// Match paths like "translate/figs-metaphor/01.md" or "files/translate/figs-metaphor/01.md"
	const match = path.match(/\/(translate|checking|process|intro)\/([^/]+)\/[^/]+\.md$/i);
	if (match) {
		return {
			category: match[1].toLowerCase(),
			moduleId: match[2]
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
	console.log(`[fetch-translation-academy] R2 Direct Filter: "${filter}" Pattern: ${pattern}`);

	// Build R2 prefix for translation academy
	const r2Prefix = `by-url/git.door43.org/${organization}/${language}_ta/`;

	const matches: Array<{
		moduleId: string;
		title: string;
		category: string;
		excerpt: string;
		matchedTerms: string[];
		matchCount: number;
		path: string;
		rcLink: string;
	}> = [];

	let modulesSearched = 0;
	let modulesFailed = 0;
	let fetchMethod = 'r2-direct';

	// Track unique modules (may have multiple .md files per module)
	const moduleContents = new Map<string, { content: string; category: string; path: string }>();

	try {
		// List to find all .md files
		const listStart = Date.now();
		const listResult = await r2Bucket.list({ prefix: r2Prefix, limit: 2000 });
		const listDuration = Date.now() - listStart;
		tracer.addApiCall({
			url: `r2://list/${r2Prefix}`,
			duration: listDuration,
			status: 200,
			size: listResult.objects?.length || 0,
			cached: true
		});

		if (listResult.objects && listResult.objects.length > 0) {
			// Filter by category if specified
			const categoriesToSearch = categoryFilter ? [categoryFilter.toLowerCase()] : TA_CATEGORIES;

			// Find all .md files in category directories
			const mdFiles = listResult.objects
				.filter((obj: any) => {
					const key = obj.key;
					return key.endsWith('.md') && categoriesToSearch.some((cat) => key.includes(`/${cat}/`));
				})
				.map((obj: any) => obj.key);

			console.log(`[fetch-translation-academy] R2 found ${mdFiles.length} files to search`);

			// Parallel fetch + parse (interleaved I/O and CPU)
			// Note: Academy modules can have multiple files, so we fetch and parse in parallel,
			// then aggregate by module before filtering
			const fetchPromises = mdFiles.map(async (key: string) => {
				const fetchStart = Date.now();
				try {
					const obj = await r2Bucket.get(key);
					const fetchDuration = Date.now() - fetchStart;
					if (obj) {
						const text = await obj.text();
						const parsed = parseModulePath(key);
						tracer.addApiCall({
							url: `r2://get/${parsed?.moduleId || 'unknown'}.md`,
							duration: fetchDuration,
							status: 200,
							size: text.length,
							cached: true
						});
						// Return parsed data for aggregation
						if (parsed) {
							return {
								moduleKey: `${parsed.category}/${parsed.moduleId}`,
								text,
								category: parsed.category,
								moduleId: parsed.moduleId,
								success: true
							};
						}
					}
				} catch {
					// File fetch failed
				}
				return { moduleKey: null, text: null, category: null, moduleId: null, success: false };
			});

			const r2Results = await Promise.all(fetchPromises);

			// Aggregate content by module (concatenate multiple .md files)
			for (const { moduleKey, text, category, moduleId, success } of r2Results) {
				if (success && text && moduleKey && category && moduleId) {
					const existing = moduleContents.get(moduleKey);
					if (existing) {
						existing.content += '\n\n' + text;
					} else {
						moduleContents.set(moduleKey, {
							content: text,
							category,
							path: `${category}/${moduleId}`
						});
					}
				}
			}

			// Filter each module's combined content
			for (const [moduleKey, { content, category, path }] of moduleContents) {
				modulesSearched++;
				const moduleId = moduleKey.split('/')[1];
				const title = extractTitle(content, moduleId);

				const searchText = `${moduleId} ${title} ${content}`;
				pattern.lastIndex = 0;
				const found: string[] = [];
				let match;
				while ((match = pattern.exec(searchText)) !== null) {
					found.push(match[0]);
				}

				if (found.length > 0) {
					// Extract excerpt around first match
					let excerpt = '';
					const firstMatchIndex = searchText.indexOf(found[0]);
					if (firstMatchIndex >= 0) {
						const start = Math.max(0, firstMatchIndex - 100);
						const end = Math.min(searchText.length, firstMatchIndex + 200);
						excerpt = searchText.slice(start, end).replace(/\s+/g, ' ').trim();
						if (start > 0) excerpt = '...' + excerpt;
						if (end < searchText.length) excerpt = excerpt + '...';
					}

					matches.push({
						moduleId,
						title,
						category,
						excerpt,
						matchedTerms: [...new Set(found)],
						matchCount: found.length,
						path,
						rcLink: `rc://*/ta/man/${category}/${moduleId}`
					});
				}
			}

			console.log(
				`[fetch-translation-academy] R2 filter complete: ${matches.length} matches from ${modulesSearched} modules`
			);
		}
	} catch (error) {
		console.error('[fetch-translation-academy] R2 direct fetch failed:', error);
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
			modulesSearched,
			modulesFailed,
			fetchMethod
		},
		matches
	};
}

/**
 * Fallback filter without R2 - uses per-module fetch (slower)
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
	console.log(`[fetch-translation-academy] Fallback Filter: "${filter}" Pattern: ${pattern}`);

	// Get table of contents
	const toc = await fetcher.fetchTranslationAcademy(language, organization);

	if (!toc.modules || toc.modules.length === 0) {
		throw new Error('No Translation Academy modules found');
	}

	const matches: Array<{
		moduleId: string;
		title: string;
		category: string;
		excerpt: string;
		matchedTerms: string[];
		matchCount: number;
		path: string;
		rcLink: string;
	}> = [];

	let modulesToSearch = toc.modules;
	if (categoryFilter) {
		modulesToSearch = toc.modules.filter((m: any) =>
			m.path.toLowerCase().includes(`/${categoryFilter}/`)
		);
	}

	let modulesSearched = 0;
	let modulesFailed = 0;

	// Process modules in batches
	const batchSize = 10;
	for (let i = 0; i < modulesToSearch.length; i += batchSize) {
		const batch = modulesToSearch.slice(i, i + batchSize);

		const batchPromises = batch.map(async (moduleEntry: any) => {
			try {
				const result = await fetcher.fetchTranslationAcademy(
					language,
					organization,
					moduleEntry.id,
					moduleEntry.path
				);

				if (result.modules && result.modules.length > 0) {
					const module = result.modules[0];
					const content = module.markdown || '';
					const title = extractTitle(content, moduleEntry.id);
					const catMatch = moduleEntry.path.match(/\/(translate|checking|process|intro)\//);
					const category = catMatch ? catMatch[1] : 'translate';

					const searchText = `${moduleEntry.id} ${title} ${content}`;
					pattern.lastIndex = 0;
					const found: string[] = [];
					let match;
					while ((match = pattern.exec(searchText)) !== null) {
						found.push(match[0]);
					}

					if (found.length > 0) {
						let excerpt = '';
						const firstMatchIndex = searchText.indexOf(found[0]);
						if (firstMatchIndex >= 0) {
							const start = Math.max(0, firstMatchIndex - 100);
							const end = Math.min(searchText.length, firstMatchIndex + 200);
							excerpt = searchText.slice(start, end).replace(/\s+/g, ' ').trim();
							if (start > 0) excerpt = '...' + excerpt;
							if (end < searchText.length) excerpt = excerpt + '...';
						}

						return {
							success: true,
							match: {
								moduleId: moduleEntry.id,
								title,
								category,
								excerpt,
								matchedTerms: [...new Set(found)],
								matchCount: found.length,
								path: moduleEntry.path,
								rcLink: `rc://*/ta/man/${category}/${moduleEntry.id}`
							}
						};
					}
				}
				return { success: true, match: null };
			} catch (error) {
				console.warn(`[fetch-translation-academy] Filter failed for ${moduleEntry.id}:`, error);
				return { success: false, match: null };
			}
		});

		const batchResults = await Promise.all(batchPromises);
		for (const result of batchResults) {
			if (result.success) {
				modulesSearched++;
				if (result.match) {
					matches.push(result.match);
				}
			} else {
				modulesFailed++;
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
			modulesSearched,
			modulesFailed,
			fetchMethod: 'per-module-fallback'
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
	md += `resource: Translation Academy Filter\n`;
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

	md += `# Translation Academy Filter: "${response.filter}"\n\n`;
	md += `**Total Results**: ${response.totalMatches}\n`;
	md += `**Fetch Method**: ${response.searchScope?.fetchMethod || 'unknown'}\n\n`;

	md += `## Matches\n\n`;
	const displayMatches = response.matches?.slice(0, 100) || [];
	for (const match of displayMatches) {
		md += `### ${match.title} (${match.category})\n`;
		md += `**Module**: ${match.moduleId}\n`;
		md += `${match.excerpt}\n`;
		md += `*Matched: ${match.matchedTerms?.join(', ')}*\n\n`;
	}

	if (response.matches?.length > 100) {
		md += `\n*... and ${response.matches.length - 100} more matches*\n`;
	}

	return md;
}

/**
 * Fetch a specific translation academy module (non-filter requests)
 */
async function fetchTranslationAcademy(
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const {
		moduleId,
		path,
		rcLink,
		language = 'en',
		organization = 'unfoldingWord',
		search
	} = params;

	const tracer = new EdgeXRayTracer(`ta-${Date.now()}`, 'fetch-translation-academy');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	let finalPath: string | undefined;

	if (rcLink || isTranslationAcademyRCLink(moduleId)) {
		const linkToParse = rcLink || moduleId;
		const parsed = parseTranslationAcademyRCLink(linkToParse, language);
		if (!parsed.isValid) {
			throw new Error(`Invalid RC link format: ${linkToParse}`);
		}
		finalPath = parsed.dirPath;
	} else if (path) {
		finalPath = path;
	}

	const requestingTOC = !moduleId && !finalPath && !rcLink;
	const result = await fetcher.fetchTranslationAcademy(language, organization, moduleId, finalPath);

	if (requestingTOC) {
		return {
			type: 'toc',
			categories: result.categories || [],
			modules: (result.modules || []).map((m: any) => ({
				id: m.id,
				path: m.path,
				category: m.path.match(/\/(translate|checking|process|audio|gateway)\//)?.[1] || 'translate'
			})),
			metadata: {
				language,
				organization,
				resourceType: 'ta',
				description: 'Translation Academy Table of Contents'
			},
			usage: {
				byModuleId: '?moduleId=figs-metaphor',
				byPath: '?path=translate/figs-metaphor',
				byRCLink: '?rcLink=rc://*/ta/man/translate/figs-metaphor',
				byFilter: '?filter=metaphor (searches all modules for matching terms)'
			},
			_trace: fetcher.getTrace()
		};
	}

	if (result.modules && result.modules.length > 0) {
		const module = result.modules[0];
		const id = module.id || moduleId;
		const cat = module.path.match(/\/(translate|checking|process|intro)\//)?.[1] || 'translate';
		const content = module.markdown || '';
		const title = extractTitle(content, id);

		const article = {
			moduleId: id,
			title,
			category: cat,
			path: module.path,
			content,
			rcLink: `rc://*/ta/man/${cat}/${id}`,
			language,
			organization,
			metadata: {
				source: 'TA',
				resourceType: 'ta',
				license: 'CC BY-SA 4.0',
				...(search && { searchQuery: search, searchApplied: true })
			}
		};

		if (search && search.trim().length > 0) {
			const searchService = createSearchService('academy');
			await searchService.indexDocuments([
				{
					id: id,
					content: `${title} ${content}`,
					path: module.path || '',
					resource: 'translation-academy',
					type: 'academy'
				}
			]);

			const results = await searchService.search(search, { maxResults: 1 });
			if (results.length === 0) {
				throw new Error(
					`Translation Academy module "${id}" does not match search query "${search}"`
				);
			}

			article.metadata.searchScore = results[0].score;
			article.metadata.matchedTerms = results[0].match.terms;
		}

		return article;
	} else {
		const identifier = moduleId || finalPath || rcLink || 'unknown';
		throw new Error(`Translation Academy module not found: ${identifier}`);
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
		const tracer = new EdgeXRayTracer(`ta-filter-${Date.now()}`, 'translation-academy-filter');

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
			console.log('[fetch-translation-academy] No R2 bucket, using fallback');
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
	name: 'fetch-translation-academy-v2',

	params: [
		{
			name: 'moduleId',
			type: 'string',
			required: false,
			description: 'Translation Academy module ID (e.g., "figs-metaphor")'
		},
		{
			name: 'path',
			type: 'string',
			required: false,
			description: 'Path to TA module (e.g., "translate/figs-metaphor")'
		},
		{
			name: 'rcLink',
			type: 'string',
			required: false,
			description: 'RC link to TA module (e.g., "rc://*/ta/man/translate/figs-metaphor")'
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
			validate: (value) =>
				!value || ['translate', 'checking', 'process', 'intro'].includes(value.toLowerCase()),
			description: 'Limit filter to category: translate, checking, process, or intro'
		}
	],

	fetch: fetchTranslationAcademy,

	onError: createStandardErrorHandler({
		'Translation Academy module not found': {
			status: 404,
			message: 'The requested Translation Academy module was not found.'
		},
		'does not match search query': {
			status: 404,
			message: 'The requested module does not contain the search query.'
		},
		'Invalid RC link format': {
			status: 400,
			message: 'Invalid RC link format.'
		},
		'No Translation Academy modules found': {
			status: 404,
			message: 'No Translation Academy modules available.'
		}
	}),

	supportsFormats: ['json', 'md', 'markdown']
});

export const OPTIONS = createCORSHandler();
