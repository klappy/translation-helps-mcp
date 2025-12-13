/**
 * Fetch Translation Academy Endpoint v2
 *
 * ✅ PRODUCTION READY - Uses real DCS data via ZIP fetcher
 *
 * Returns a specific translation academy module by ID or path.
 * Academy articles are linked from Translation Notes via RC links.
 * Optional search parameter for filtering content relevance.
 * Filter parameter for stemmed regex matching across all modules with statistics.
 */

import { json } from '@sveltejs/kit';
import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';
import { parseTranslationAcademyRCLink, isTranslationAcademyRCLink } from '$lib/rcLinkParser.js';
import { createSearchService } from '$lib/../../../src/services/SearchServiceFactory.js';

// Import shared filter utilities
import {
	generateStemmedPattern,
	computeFilterStatistics,
	formatFilterResponseAsMarkdown
} from '$lib/filterUtils.js';

/**
 * Handle filter requests - stemmed regex matching across all TA modules
 */
async function handleFilterRequest(
	filter: string,
	params: Record<string, any>,
	request: Request
): Promise<any> {
	const { language, organization, category: categoryFilter } = params;
	const url = new URL(request.url);

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`ta-filter-${Date.now()}`, 'translation-academy-filter');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Generate stemmed pattern
	const pattern = generateStemmedPattern(filter);
	console.log(`[fetch-translation-academy] Filter: "${filter}" Pattern: ${pattern}`);

	// First, get the table of contents to know all modules
	const toc = await fetcher.fetchTranslationAcademy(language, organization);

	if (!toc.modules || toc.modules.length === 0) {
		throw new Error('No Translation Academy modules found');
	}

	// Collect matches
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

	// Filter by category if specified
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
				// Fetch full module content
				const result = await fetcher.fetchTranslationAcademy(
					language,
					organization,
					moduleEntry.id,
					moduleEntry.path
				);

				if (result.modules && result.modules.length > 0) {
					const module = result.modules[0];
					const content = module.markdown || '';

					// Extract title
					const titleMatch = content.match(/^#\s+(.+)$/m);
					const title = titleMatch ? titleMatch[1].trim() : moduleEntry.id;

					// Extract category from path
					const catMatch = moduleEntry.path.match(/\/(translate|checking|process|intro)\//);
					const category = catMatch ? catMatch[1] : 'translate';

					// Check if content matches pattern
					const searchText = `${moduleEntry.id} ${title} ${content}`;
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

	console.log(
		`[fetch-translation-academy] Filter complete: ${matches.length} matches from ${modulesSearched} modules`
	);

	// Compute statistics by category
	const statistics = computeFilterStatistics(matches, {
		includeTestament: false,
		includeBook: false,
		includeCategory: true
	});

	// Build response
	const response = {
		filter,
		pattern: pattern.toString(),
		language,
		organization,
		totalMatches: matches.length,
		statistics,
		searchScope: {
			category: categoryFilter || 'all',
			modulesSearched,
			modulesFailed
		},
		matches
	};

	// Check format parameter
	const format = url.searchParams.get('format') || 'json';

	if (format === 'md' || format === 'markdown') {
		const markdown = formatFilterResponseAsMarkdown(
			response,
			statistics,
			'translation-academy',
			(match: (typeof matches)[0]) => {
				let md = `### ${match.title} (\`${match.moduleId}\`)\n\n`;
				md += `**Category:** ${match.category}\n\n`;
				md += `${match.excerpt}\n\n`;
				if (match.matchedTerms.length > 0) {
					md += `*Matched: ${match.matchedTerms.join(', ')}*\n`;
				}
				md += `*Link: ${match.rcLink}*\n\n`;
				md += '---\n\n';
				return md;
			}
		);
		return new Response(markdown, {
			status: 200,
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'X-Format': 'md'
			}
		});
	}

	return json(response);
}

/**
 * Fetch a specific translation academy module
 * Uses real markdown content from DCS ZIP archives
 * Supports moduleId, path, and rcLink parameters with priority: rcLink > path > moduleId
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
		search,
		filter,
		category
	} = params;

	// Handle filter requests first (stemmed regex matching across all modules)
	if (filter) {
		return handleFilterRequest(filter, params, request);
	}

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`ta-${Date.now()}`, 'fetch-translation-academy');

	// Initialize fetcher with request headers
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// Determine path using priority: rcLink > path > moduleId
	let finalPath: string | undefined;

	if (rcLink || isTranslationAcademyRCLink(moduleId)) {
		const linkToParse = rcLink || moduleId;
		const parsed = parseTranslationAcademyRCLink(linkToParse, language);
		if (!parsed.isValid) {
			throw new Error(
				`Invalid RC link format: ${linkToParse}. Expected format: rc://*/ta/man/translate/figs-metaphor`
			);
		}
		finalPath = parsed.dirPath;
	} else if (path) {
		finalPath = path;
	}
	// If only moduleId provided (and not an RC link), let fetchTranslationAcademy handle fallback search

	// Determine if we're requesting TOC or specific content
	const requestingTOC = !moduleId && !finalPath && !rcLink;

	// Fetch real TA module from markdown
	const result = await fetcher.fetchTranslationAcademy(language, organization, moduleId, finalPath);

	// If we requested TOC (no specific identifier), return table of contents format
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

	// We requested specific content - check if we got it
	if (result.modules && result.modules.length > 0) {
		// Got specific module(s)
		const module = result.modules[0];

		// Parse module ID from path if needed
		const id = module.id || moduleId;
		const cat = module.path.match(/\/(translate|checking|process|intro)\//)?.[1] || 'translate';

		// Extract title from concatenated content
		// Title is now at the beginning as # Title
		const content = module.markdown || '';
		let title = id;

		// Extract title from first H1 heading
		const titleMatch = content.match(/^#\s+(.+)$/m);
		if (titleMatch) {
			title = titleMatch[1].trim();
		}

		// Create article object
		const article = {
			moduleId: id,
			title,
			category: cat,
			path: module.path,
			content: module.markdown || '',
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

		// Apply search relevance check if search parameter provided
		if (search && search.trim().length > 0) {
			// Create ephemeral search service to check relevance
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
				// Search term not found in this article
				throw new Error(
					`Translation Academy module "${id}" does not match search query "${search}"`
				);
			}

			// Add search score to metadata
			article.metadata.searchScore = results[0].score;
			article.metadata.matchedTerms = results[0].match.terms;

			console.log(
				`[fetch-translation-academy-v2] Search "${search}" matched "${id}" with score ${results[0].score}`
			);
		}

		// Return article directly (not wrapped in type/module structure)
		// This makes it consistent with fetch-translation-word endpoint
		return article;
	} else {
		// We requested specific content but got empty results
		const identifier = moduleId || finalPath || rcLink || 'unknown';
		throw new Error(
			`Translation Academy module not found: ${identifier}. ` +
				`The fetcher returned empty results. This may indicate the module doesn't exist in the DCS repository.`
		);
	}
}

// Create the endpoint with all our consistent utilities
export const GET = createSimpleEndpoint({
	name: 'fetch-translation-academy-v2',

	// Use common parameter validators + moduleId, path, rcLink, search, filter
	params: [
		{
			name: 'moduleId',
			type: 'string',
			required: false,
			description:
				'Translation Academy module ID (e.g., "figs-metaphor"). Searches in order: translate, process, checking, intro. If not provided, returns table of contents.'
		},
		{
			name: 'path',
			type: 'string',
			required: false,
			description:
				'Path to TA module. Can be directory path (e.g., "translate/figs-metaphor") to get all .md files concatenated, or file path (e.g., "translate/figs-metaphor/01.md") for a single file.'
		},
		{
			name: 'rcLink',
			type: 'string',
			required: false,
			description:
				'RC link to TA module (e.g., "rc://*/ta/man/translate/figs-metaphor"). Supports wildcards for language, resource, and type segments.'
		},
		COMMON_PARAMS.language,
		COMMON_PARAMS.organization,
		COMMON_PARAMS.search,
		{
			name: 'filter',
			required: false,
			description:
				'Stemmed regex filter to search all modules (e.g., "metaphor" matches "metaphor", "metaphors", "metaphorical")'
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

	// Use standard error handler
	onError: createStandardErrorHandler({
		'Translation Academy module not found': {
			status: 404,
			message: 'The requested Translation Academy module was not found in the repository.'
		},
		'does not match search query': {
			status: 404,
			message: 'The requested Translation Academy module does not contain the search query.'
		},
		'Invalid RC link format': {
			status: 400,
			message: 'Invalid RC link format. Expected: rc://*/ta/man/[category]/[moduleId]'
		},
		'No Translation Academy modules found': {
			status: 404,
			message: 'No Translation Academy modules available to search.'
		}
	}),

	// Support passthrough for markdown
	supportsFormats: ['json', 'md', 'markdown']
});

// CORS handler
export const OPTIONS = createCORSHandler();
