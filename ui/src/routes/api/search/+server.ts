/**
 * Search Endpoint - Cloudflare AI Search
 *
 * Enhanced search using Cloudflare AI Search with rich metadata filtering.
 * AI Search automatically indexes content stored in /clean/ prefix of R2.
 *
 * Features:
 * - Filter by language, organization, resource type
 * - Scripture reference filtering (book, chapter, verse)
 * - Article ID filtering for Translation Words/Academy
 * - Contextual results with formatted references
 *
 * KISS: Single AI Search call replaces complex fan-out pattern
 * DRY: Clean content populated by normal data fetching operations
 * Antifragile: Graceful fallback if AI Search unavailable
 */

import { logger } from '$lib/../../../src/utils/logger.js';
import {
	BOOK_CODES,
	formatScriptureReference,
	formatTAReference,
	formatTWReference
} from '$lib/../../../src/utils/metadata-extractors.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher';
import { initializeR2Env } from '$lib/../../../src/functions/r2-env.js';

// AI Search index name - created in Cloudflare dashboard
const AI_SEARCH_INDEX = 'translation-helps-search';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SearchRequest {
	query: string;
	language?: string;
	organization?: string;
	resource?: string; // "ult", "tn", "tw", "ta", "tq"
	reference?: string; // "John 3:16", "Genesis 1"
	articleId?: string; // For TW/TA: "grace", "figs-metaphor"
	limit?: number;
	includeHelps?: boolean;
}

/**
 * Enhanced SearchHit with rich metadata and contextual content
 */
interface SearchHit {
	// Unique identifier
	id: string;

	// Formatted reference for display
	reference: string; // "John 3:16" or "Grace (Key Term)"

	// Content
	preview: string; // Matching snippet with context
	context: string; // Surrounding paragraph/verse

	// Metadata for filtering
	resource: string;
	language: string;
	organization: string;
	path: string;

	// Scripture-specific
	book?: string;
	chapter?: number;
	verse?: number;

	// Article-specific
	articleId?: string;
	articleCategory?: string;
	title?: string;

	// Scoring
	score: number;
	highlights: string[];
}

interface SearchResponse {
	took_ms: number;
	query: string;
	language: string;
	organization: string;
	resource?: string;
	reference?: string;
	resourceCount: number;
	total_hits?: number; // Total matches after filtering (before limit applied)
	hits: SearchHit[];
	message?: string;
	error?: string;
	indexing?: boolean; // True if background population was triggered
}

// =============================================================================
// REFERENCE PARSING
// =============================================================================

/**
 * Parse a reference string into components
 * Handles: "John 3:16", "Genesis 1", "JHN", "1 Corinthians 13:4-7"
 */
function parseReferenceForFilter(reference: string): {
	book?: string;
	chapter?: number;
	verseStart?: number;
	verseEnd?: number;
} {
	// First try to extract book code
	const bookMatch = reference.match(/^(\d?\s*[A-Za-z]+)/);
	if (!bookMatch) return {};

	const bookName = bookMatch[1].replace(/\s+/g, '').toLowerCase();
	const book = BOOK_CODES[bookName];

	if (!book) return {};

	// Try to parse chapter:verse
	const refMatch = reference.match(/(\d+)(?::(\d+)(?:-(\d+))?)?/);
	if (!refMatch) return { book };

	return {
		book,
		chapter: parseInt(refMatch[1], 10),
		verseStart: refMatch[2] ? parseInt(refMatch[2], 10) : undefined,
		verseEnd: refMatch[3] ? parseInt(refMatch[3], 10) : undefined
	};
}

// =============================================================================
// FILTER BUILDING
// =============================================================================

/**
 * Build AI Search filters from request parameters
 * Uses R2 metadata stored during content cleaning
 */
function buildFilters(params: SearchRequest): Record<string, string> {
	const filters: Record<string, string> = {};
	const { language = 'en', organization, resource, reference, articleId } = params;

	// Build path prefix filter
	// Path structure: /clean/{language}/{organization}/{resource}/{version}/{file}
	let pathPrefix = `clean/${language}/`;

	if (organization) {
		pathPrefix += `${organization}/`;
		if (resource) {
			// Resource is embedded in repo name like "en_ult"
			pathPrefix += `${language}_${resource}/`;
		}
	}

	filters.path_prefix = pathPrefix;

	// Add metadata filters
	if (reference) {
		const parsed = parseReferenceForFilter(reference);
		if (parsed.book) {
			filters.book = parsed.book;
		}
		if (parsed.chapter !== undefined) {
			filters.chapter = String(parsed.chapter);
		}
	}

	if (articleId) {
		filters.article_id = articleId.toLowerCase();
	}

	if (resource) {
		filters.resource = resource.toLowerCase();
	}

	logger.debug('[Search] Built filters', { filters, params });

	return filters;
}

// =============================================================================
// POPULATION TRIGGER
// =============================================================================

/**
 * Trigger background population of clean content for a specific scope
 */
async function triggerScopedPopulation(
	language: string,
	organization: string,
	resource: string | undefined,
	reference: string | undefined,
	platform: App.Platform
): Promise<void> {
	try {
		// Initialize R2 environment if needed
		const r2Bucket = platform?.env?.ZIP_FILES;
		const caches = (platform as any)?.caches;
		if (r2Bucket || caches) {
			initializeR2Env(r2Bucket, caches);
		}

		const fetcher = new UnifiedResourceFetcher();
		const promises: Promise<any>[] = [];

		// Parse reference to get book/chapter
		const parsed = reference ? parseReferenceForFilter(reference) : null;

		if (resource === 'ult' || resource === 'ust' || !resource) {
			// Scripture resources
			if (parsed?.book) {
				// Specific book requested - fetch first 3 chapters
				logger.info('[Population] Fetching scripture for book', {
					book: parsed.book,
					language,
					organization
				});

				for (let chapter = 1; chapter <= 3; chapter++) {
					const ref = `${parsed.book} ${chapter}`;
					const resources = resource ? [resource] : ['ult', 'ust'];
					promises.push(
						fetcher
							.fetchScripture(ref, language, organization, resources)
							.catch((err) => logger.debug(`[Population] Failed: ${ref}`, { err }))
					);
				}
			} else {
				// No specific book - fetch key verses
				const keyReferences = ['John 3:16', 'Genesis 1:1', 'Matthew 5:1-10'];
				for (const ref of keyReferences) {
					const resources = resource ? [resource] : ['ult'];
					promises.push(
						fetcher
							.fetchScripture(ref, language, organization, resources)
							.catch((err) => logger.debug(`[Population] Failed: ${ref}`, { err }))
					);
				}
			}
		} else if (resource === 'tn') {
			// Translation Notes
			const refs = parsed?.book
				? [`${parsed.book} 1`, `${parsed.book} 2`, `${parsed.book} 3`]
				: ['John 3:16', 'Genesis 1:1'];

			for (const ref of refs) {
				promises.push(
					fetcher
						.fetchTranslationNotes(ref, language, organization)
						.catch((err) => logger.debug(`[Population] TN failed: ${ref}`, { err }))
				);
			}
		} else if (resource === 'tq') {
			// Translation Questions
			const refs = parsed?.book
				? [`${parsed.book} 1`, `${parsed.book} 2`]
				: ['John 3', 'Genesis 1'];

			for (const ref of refs) {
				promises.push(
					fetcher
						.fetchTranslationQuestions(ref, language, organization)
						.catch((err) => logger.debug(`[Population] TQ failed: ${ref}`, { err }))
				);
			}
		} else if (resource === 'tw') {
			// Translation Words
			const terms = ['god', 'love', 'faith', 'grace', 'salvation'];
			for (const term of terms) {
				promises.push(
					fetcher
						.fetchTranslationWord(term, language, organization)
						.catch((err) => logger.debug(`[Population] TW failed: ${term}`, { err }))
				);
			}
		} else if (resource === 'ta') {
			// Translation Academy
			const modules = ['translate', 'checking', 'process'];
			for (const moduleId of modules) {
				promises.push(
					fetcher
						.fetchTranslationAcademy(language, organization, moduleId)
						.catch((err) => logger.debug(`[Population] TA failed: ${moduleId}`, { err }))
				);
			}
		}

		// Execute all fetches in parallel
		if (promises.length > 0) {
			logger.info('[Population] Starting parallel fetches', {
				count: promises.length,
				language,
				organization,
				resource,
				reference
			});
			await Promise.allSettled(promises);
			logger.info('[Population] Parallel fetches completed');
		}
	} catch (error) {
		logger.error('[Population] Failed to trigger population', { error });
	}
}

// =============================================================================
// RESULT FORMATTING
// =============================================================================

/**
 * Format AutoRAG search result into enhanced SearchHit
 * AutoRAG returns: { id, score, metadata, content, filename }
 */
function formatHit(match: any, index: number, query: string): SearchHit {
	const metadata = match.metadata || {};

	// AutoRAG may use 'filename' instead of 'id' for the R2 path
	const filePath = match.id || match.filename || metadata.original_path || '';

	// Extract metadata fields
	const language = metadata.language || 'en';
	const organization = metadata.organization || 'unfoldingWord';
	const resource = metadata.resource || inferResourceFromPath(filePath);
	const book = metadata.book;
	const chapter = metadata.chapter ? parseInt(metadata.chapter, 10) : undefined;
	const verseStart = metadata.verse_start ? parseInt(metadata.verse_start, 10) : undefined;
	const verseEnd = metadata.verse_end ? parseInt(metadata.verse_end, 10) : undefined;
	const articleId = metadata.article_id;
	const articleCategory = metadata.article_category;
	const title = metadata.title;

	// Build formatted reference
	let reference: string;
	if (book) {
		reference = formatScriptureReference(book, chapter, verseStart, verseEnd);
	} else if (articleId) {
		if (resource === 'tw' || resource === 'words') {
			reference = formatTWReference(articleId, articleCategory, title);
		} else if (resource === 'ta' || resource === 'academy') {
			reference = formatTAReference(articleId, articleCategory, title);
		} else {
			reference = title || articleId;
		}
	} else {
		reference = filePath || `Result ${index + 1}`;
	}

	// Extract content and create preview
	// Handle various content formats from AutoRAG
	let content = '';
	if (typeof match.content === 'string') {
		content = match.content;
	} else if (match.content && typeof match.content === 'object') {
		// AutoRAG might return content as an object
		content = JSON.stringify(match.content);
		logger.warn('[Search] Content is an object, stringifying', {
			contentType: typeof match.content,
			contentKeys: Object.keys(match.content)
		});
	}

	const preview = createPreview(content, query, 200);
	const context = createContext(content, query, 500);

	// Find query terms that matched (for highlighting)
	const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const highlights = content
		? queryTerms.filter((term) => content.toLowerCase().includes(term))
		: [];

	return {
		id: filePath || `hit-${index}`,
		reference,
		preview,
		context,
		resource,
		language,
		organization,
		path: filePath,
		book,
		chapter,
		verse: verseStart,
		articleId,
		articleCategory,
		title,
		score: match.score || 0,
		highlights
	};
}

/**
 * Create a preview snippet around matched terms
 */
function createPreview(content: string, query: string, maxLength: number): string {
	if (!content || typeof content !== 'string') return '';

	const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const contentLower = content.toLowerCase();

	// Find the first match position
	let bestStart = 0;
	for (const term of queryTerms) {
		const pos = contentLower.indexOf(term);
		if (pos !== -1) {
			// Center the preview around the match
			bestStart = Math.max(0, pos - Math.floor(maxLength / 4));
			break;
		}
	}

	// Extract preview
	let preview = content.substring(bestStart, bestStart + maxLength);

	// Clean up boundaries
	if (bestStart > 0) {
		// Find word boundary
		const spacePos = preview.indexOf(' ');
		if (spacePos > 0 && spacePos < 20) {
			preview = '...' + preview.substring(spacePos + 1);
		} else {
			preview = '...' + preview;
		}
	}

	if (bestStart + maxLength < content.length) {
		const lastSpace = preview.lastIndexOf(' ');
		if (lastSpace > maxLength - 30) {
			preview = preview.substring(0, lastSpace) + '...';
		} else {
			preview = preview + '...';
		}
	}

	return preview.trim();
}

/**
 * Create broader context around matched terms
 */
function createContext(content: string, query: string, maxLength: number): string {
	// For context, try to capture a full sentence or paragraph
	if (!content || typeof content !== 'string') return '';

	if (content.length <= maxLength) {
		return content;
	}

	// Use the same logic as preview but with more length
	return createPreview(content, query, maxLength);
}

/**
 * Infer resource type from file path
 */
function inferResourceFromPath(path: string): string {
	if (path.includes('_ult') || path.includes('_ust')) return 'ult';
	if (path.includes('_tn')) return 'tn';
	if (path.includes('_tw')) return 'tw';
	if (path.includes('_ta')) return 'ta';
	if (path.includes('_tq')) return 'tq';
	return 'bible';
}

// =============================================================================
// MAIN SEARCH EXECUTION
// =============================================================================

/**
 * Execute search with AI Search
 */
async function executeSearch(
	params: SearchRequest,
	platform: App.Platform | undefined
): Promise<Response> {
	const startTime = Date.now();

	try {
		const {
			query,
			language = 'en',
			organization = 'unfoldingWord',
			resource,
			reference,
			articleId,
			limit = 50,
			includeHelps = true
		} = params;

		// Validate required fields
		if (!query || query.trim().length === 0) {
			return json(
				{
					error: 'Query parameter is required',
					code: 'MISSING_QUERY'
				},
				{ status: 400 }
			);
		}

		logger.info('[Search] Starting AI Search', {
			query,
			language,
			organization,
			resource,
			reference,
			articleId,
			limit,
			includeHelps
		});

		// Check if AI binding is available
		const ai = platform?.env?.AI;

		if (!ai) {
			logger.warn('[Search] AI binding not available');
			return json({
				took_ms: Date.now() - startTime,
				query,
				language,
				organization,
				resourceCount: 0,
				hits: [],
				message: 'AI binding not available. Ensure [ai] binding is configured in wrangler.toml.'
			} as SearchResponse);
		}

		// Build filters from parameters
		const filters = buildFilters(params);

		// Execute AI Search query using AutoRAG API
		// API: env.AI.autorag(indexName).aiSearch({ query })
		let searchResults;
		try {
			const autorag = ai.autorag(AI_SEARCH_INDEX);
			searchResults = await autorag.aiSearch({
				query
			});
		} catch (searchError) {
			const errorMessage = searchError instanceof Error ? searchError.message : String(searchError);
			logger.error('[Search] AI Search query failed', {
				error: errorMessage,
				indexName: AI_SEARCH_INDEX,
				query,
				filters
			});

			// Check if this is a function/method error (local dev or API mismatch)
			const isApiIssue =
				errorMessage.includes('not a function') || errorMessage.includes('autorag');

			return json({
				took_ms: Date.now() - startTime,
				query,
				language,
				organization,
				resourceCount: 0,
				hits: [],
				error: errorMessage,
				message: isApiIssue
					? 'AI Search (AutoRAG) is not available. This may be a local development limitation or the AI binding may not support AutoRAG. Use resource-specific endpoints (fetch-scripture, fetch-translation-notes, etc.) instead.'
					: 'AI Search query failed. The index may not be ready or the /clean/ prefix in R2 may not have indexed content yet.'
			} as SearchResponse);
		}

		// AutoRAG returns { response: string, data: AutoRAGSearchResult[] }
		const searchData = searchResults.data || [];

		// Log the AI-generated response if available
		if (searchResults.response) {
			logger.debug('[Search] AutoRAG AI response', {
				responseLength: searchResults.response.length,
				preview: searchResults.response.substring(0, 200)
			});
		}

		// POST-FILTER: Only include results from /clean/ prefix
		// This prevents duplicates from raw content files that AI Search may also index
		const cleanMatches = searchData.filter((match: any) => {
			// Check the match ID or filename (R2 path)
			const matchId = match.id || match.filename || '';

			// Also check metadata paths as fallback
			const metadataPath = match.metadata?.clean_path || match.metadata?.original_path || '';

			// Return true only if path starts with clean/
			return matchId.startsWith('clean/') || (matchId === '' && metadataPath.startsWith('clean/'));
		});

		// Log filtering effectiveness for debugging
		logger.debug('[Search] Post-filter applied', {
			originalCount: searchData.length,
			filteredCount: cleanMatches.length,
			removedCount: searchData.length - cleanMatches.length
		});

		// Format only the filtered results
		let hits: SearchHit[] = cleanMatches.map((match: any, index: number) =>
			formatHit(match, index, query)
		);

		// Post-filter by resource type if needed
		if (!includeHelps) {
			hits = hits.filter(
				(hit) => hit.resource === 'ult' || hit.resource === 'ust' || hit.resource === 'bible'
			);
		}

		// Filter by specific resource if requested
		if (resource) {
			hits = hits.filter(
				(hit) => hit.resource === resource || hit.resource === `${language}_${resource}`
			);
		}

		const took_ms = Date.now() - startTime;
		const response: SearchResponse = {
			took_ms,
			query,
			language,
			organization,
			resource,
			reference,
			resourceCount: hits.length,
			total_hits: cleanMatches.length, // Total after filtering, before limit
			hits: hits.slice(0, limit)
		};

		// If we have very few or no results, trigger population for the scope
		if (response.hits.length < 3 && platform?.context) {
			logger.info('[Search] Low/no results, triggering scoped population', {
				hits: response.hits.length,
				language,
				organization,
				resource,
				reference
			});

			// Trigger background population for this specific scope
			const populationPromise = triggerScopedPopulation(
				language,
				organization,
				resource,
				reference,
				platform
			);

			if (populationPromise) {
				platform.context.waitUntil(populationPromise);
				response.message =
					response.hits.length === 0
						? 'No results found yet. Content is being prepared for this scope. Please try again in 30 seconds.'
						: 'Limited results found. Additional content is being prepared for this scope.';
				response.indexing = true;
			}
		}

		logger.info('[Search] AI Search completed', {
			took_ms,
			hitCount: hits.length,
			cleanMatchCount: cleanMatches.length,
			rawMatchCount: searchData.length,
			duplicatesRemoved: searchData.length - cleanMatches.length,
			hasAIResponse: !!searchResults.response,
			filters
		});

		return json(response);
	} catch (error) {
		logger.error('[Search] Search failed', {
			error: error instanceof Error ? error.message : String(error)
		});

		return json(
			{
				error: 'Search failed',
				message: error instanceof Error ? error.message : String(error),
				code: 'SEARCH_ERROR'
			},
			{ status: 500 }
		);
	}
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

/**
 * POST /api/search
 * Main search endpoint (JSON body)
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const body: SearchRequest = await request.json();
	return executeSearch(body, platform);
};

/**
 * GET /api/search
 * Main search endpoint (Query params)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('query') || '';
	const language = url.searchParams.get('language') || 'en';
	const organization =
		url.searchParams.get('organization') || url.searchParams.get('owner') || 'unfoldingWord';
	const resource = url.searchParams.get('resource') || undefined;
	const reference = url.searchParams.get('reference') || undefined;
	const articleId = url.searchParams.get('articleId') || undefined;
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 50;
	const includeHelpsParam = url.searchParams.get('includeHelps');
	const includeHelps = includeHelpsParam !== 'false';

	const params: SearchRequest = {
		query,
		language,
		organization,
		resource,
		reference,
		articleId,
		limit,
		includeHelps
	};

	return executeSearch(params, platform);
};
