/**
 * Search Endpoint - Cloudflare AI Search
 *
 * Enhanced search using Cloudflare AI Search with rich metadata filtering.
 * AI Search indexes content from the dedicated search index bucket populated
 * by the event-driven Indexer Worker.
 *
 * Features:
 * - Filter by language, organization, resource type
 * - Multi-level chunk filtering (verse, passage, chapter, note, article, section, question)
 * - Scripture reference filtering (book, chapter, verse)
 * - Article ID filtering for Translation Words/Academy
 * - Contextual results with formatted references
 *
 * LLM-as-Client Design:
 * - Returns all matching chunks at all levels
 * - Rich metadata on every result
 * - No server-side deduplication (LLM handles curation)
 *
 * KISS: Single AI Search call replaces complex fan-out pattern
 * DRY: Clean content populated by Indexer Worker
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

// AI Search index name - configured in Cloudflare dashboard
const AI_SEARCH_INDEX = 'translation-helps-search';

// Resource type aliases for user-friendly queries
const RESOURCE_ALIASES: Record<string, string> = {
	tn: 'tn',
	notes: 'tn',
	translationNotes: 'tn',
	tw: 'tw',
	words: 'tw',
	translationWords: 'tw',
	ta: 'ta',
	academy: 'ta',
	translationAcademy: 'ta',
	tq: 'tq',
	questions: 'tq',
	translationQuestions: 'tq',
	ult: 'ult',
	literal: 'ult',
	ust: 'ust',
	simplified: 'ust',
	scripture: 'scripture',
	bible: 'scripture'
};

// Valid chunk levels
const CHUNK_LEVELS = ['verse', 'passage', 'chapter', 'note', 'article', 'section', 'question'];

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SearchRequest {
	query: string;
	language?: string;
	organization?: string;
	resource?: string; // "ult", "tn", "tw", "ta", "tq", or aliases
	reference?: string; // "John 3:16", "Genesis 1"
	book?: string; // Book filter (3-letter code)
	chapter?: number; // Chapter filter
	chunk_level?: string; // "verse", "passage", "chapter", "note", "article", "section", "question"
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
	content: string; // Full chunk content

	// Core metadata
	resource: string;
	resource_name: string;
	language: string;
	language_name: string;
	organization: string;
	version: string;
	chunk_level: string;
	indexed_at: string;
	path: string;

	// Scripture-specific
	book?: string;
	book_name?: string;
	chapter?: number;
	verse?: number;
	verse_start?: number;
	verse_end?: number;
	passage_title?: string;
	themes?: string[];

	// Article-specific (TW/TA)
	article_id?: string;
	category?: string;
	title?: string;
	section?: number;
	section_title?: string;

	// Question-specific (TQ)
	question_text?: string;
	answer_text?: string;

	// Note-specific (TN)
	phrase?: string;
	note_id?: string;

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
	chunk_level?: string;
	total_hits: number;
	hits: SearchHit[];
	message?: string;
	error?: string;
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

/**
 * Normalize resource type using aliases
 */
function normalizeResource(resource: string | undefined): string | undefined {
	if (!resource) return undefined;
	return RESOURCE_ALIASES[resource] || resource.toLowerCase();
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

	// Extract core metadata with fallbacks
	const language = metadata.language || 'en';
	const languageName = metadata.language_name || language;
	const organization = metadata.organization || 'unfoldingWord';
	const resource = metadata.resource || inferResourceFromPath(filePath);
	const resourceName = metadata.resource_name || resource;
	const version = metadata.version || 'unknown';
	const chunkLevel = metadata.chunk_level || 'unknown';
	const indexedAt = metadata.indexed_at || new Date().toISOString();

	// Scripture metadata
	const book = metadata.book;
	const bookName = metadata.book_name;
	const chapter = metadata.chapter ? parseInt(metadata.chapter, 10) : undefined;
	const verse = metadata.verse ? parseInt(metadata.verse, 10) : undefined;
	const verseStart = metadata.verse_start ? parseInt(metadata.verse_start, 10) : undefined;
	const verseEnd = metadata.verse_end ? parseInt(metadata.verse_end, 10) : undefined;
	const passageTitle = metadata.passage_title;
	const themes = metadata.themes;

	// Article metadata (TW/TA)
	const articleId = metadata.article_id;
	const category = metadata.category || metadata.article_category;
	const title = metadata.title || metadata.article_title;
	const section = metadata.section ? parseInt(metadata.section, 10) : undefined;
	const sectionTitle = metadata.section_title;

	// Question metadata (TQ)
	const questionText = metadata.question_text;
	const answerText = metadata.answer_text;

	// Note metadata (TN)
	const phrase = metadata.phrase;
	const noteId = metadata.note_id;

	// Build formatted reference
	let reference: string;
	if (book) {
		reference = formatScriptureReference(book, chapter, verse || verseStart, verseEnd);
	} else if (articleId) {
		if (resource === 'tw') {
			reference = formatTWReference(articleId, category, title);
		} else if (resource === 'ta') {
			reference = formatTAReference(articleId, category, title);
		} else {
			reference = title || articleId;
		}
	} else if (questionText) {
		reference = `${bookName || book || 'Question'} ${chapter}:${verse}`;
	} else if (noteId) {
		reference = `${bookName || book || 'Note'} ${chapter}:${verse}`;
	} else {
		reference = filePath || `Result ${index + 1}`;
	}

	// Extract content
	let content = '';
	if (typeof match.content === 'string') {
		content = match.content;
	} else if (match.content && typeof match.content === 'object') {
		content = JSON.stringify(match.content);
	}

	const preview = createPreview(content, query, 200);

	// Find query terms that matched (for highlighting)
	const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const highlights = content
		? queryTerms.filter((term) => content.toLowerCase().includes(term))
		: [];

	return {
		id: filePath || `hit-${index}`,
		reference,
		preview,
		content,
		resource,
		resource_name: resourceName,
		language,
		language_name: languageName,
		organization,
		version,
		chunk_level: chunkLevel,
		indexed_at: indexedAt,
		path: filePath,
		book,
		book_name: bookName,
		chapter,
		verse,
		verse_start: verseStart,
		verse_end: verseEnd,
		passage_title: passageTitle,
		themes,
		article_id: articleId,
		category,
		title,
		section,
		section_title: sectionTitle,
		question_text: questionText,
		answer_text: answerText,
		phrase,
		note_id: noteId,
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
 * Infer resource type from file path
 * New path structure: {language}/{organization}/{resource}/{version}/...
 */
function inferResourceFromPath(path: string): string {
	const parts = path.split('/');
	if (parts.length >= 3) {
		const resource = parts[2].toLowerCase();
		if (['ult', 'ust', 'ueb'].includes(resource)) return 'scripture';
		if (resource === 'tn') return 'tn';
		if (resource === 'tw') return 'tw';
		if (resource === 'ta') return 'ta';
		if (resource === 'tq') return 'tq';
	}
	return 'unknown';
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
			resource: rawResource,
			reference,
			book: bookParam,
			chapter: chapterParam,
			chunk_level,
			articleId,
			limit = 50,
			includeHelps = true
		} = params;

		// Normalize resource type
		const resource = normalizeResource(rawResource);

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

		// Validate chunk_level if provided
		if (chunk_level && !CHUNK_LEVELS.includes(chunk_level)) {
			return json(
				{
					error: `Invalid chunk_level. Must be one of: ${CHUNK_LEVELS.join(', ')}`,
					code: 'INVALID_CHUNK_LEVEL'
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
			book: bookParam,
			chapter: chapterParam,
			chunk_level,
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
				total_hits: 0,
				hits: [],
				message:
					'AI binding not available. Ensure [ai] binding is configured in wrangler.toml and AI Search index is set up.'
			} as SearchResponse);
		}

		// Parse reference if provided
		const parsedRef = reference ? parseReferenceForFilter(reference) : null;

		// Execute AI Search query
		let searchResults;
		try {
			const aiSearchStart = Date.now();
			const autorag = ai.autorag(AI_SEARCH_INDEX);
			searchResults = await autorag.aiSearch({
				query
			});
			logger.info('[Search] AI Search call completed', {
				aiSearchDuration: Date.now() - aiSearchStart
			});
		} catch (searchError) {
			const errorMessage = searchError instanceof Error ? searchError.message : String(searchError);
			logger.error('[Search] AI Search query failed', {
				error: errorMessage,
				indexName: AI_SEARCH_INDEX,
				query
			});

			const isApiIssue =
				errorMessage.includes('not a function') || errorMessage.includes('autorag');

			return json({
				took_ms: Date.now() - startTime,
				query,
				language,
				organization,
				total_hits: 0,
				hits: [],
				error: errorMessage,
				message: isApiIssue
					? 'AI Search (AutoRAG) is not available. This may be a local development limitation.'
					: 'AI Search query failed. The index may not be ready or may not have indexed content yet.'
			} as SearchResponse);
		}

		// AutoRAG returns { response: string, data: AutoRAGSearchResult[] }
		const searchData = searchResults.data || [];
		logger.info('[Search] Raw results count', { rawCount: searchData.length });

		// Format results
		const formatStart = Date.now();
		let hits: SearchHit[] = searchData.map((match: any, index: number) =>
			formatHit(match, index, query)
		);
		logger.info('[Search] Formatting completed', {
			formatDuration: Date.now() - formatStart,
			hitsBeforeFilter: hits.length
		});

		// Apply filters
		const filterStart = Date.now();

		// Language filter
		hits = hits.filter((hit) => hit.language === language);

		// Organization filter
		hits = hits.filter((hit) => hit.organization.toLowerCase() === organization.toLowerCase());

		// Resource filter
		if (resource && resource !== 'scripture') {
			hits = hits.filter((hit) => hit.resource === resource);
		} else if (resource === 'scripture') {
			hits = hits.filter((hit) => ['ult', 'ust', 'ueb', 'scripture'].includes(hit.resource));
		}

		// Include helps filter
		if (!includeHelps) {
			hits = hits.filter((hit) => ['ult', 'ust', 'ueb', 'scripture'].includes(hit.resource));
		}

		// Chunk level filter
		if (chunk_level) {
			hits = hits.filter((hit) => hit.chunk_level === chunk_level);
		}

		// Book filter (from reference or explicit)
		const bookFilter = bookParam || parsedRef?.book;
		if (bookFilter) {
			hits = hits.filter((hit) => hit.book?.toUpperCase() === bookFilter.toUpperCase());
		}

		// Chapter filter (from reference or explicit)
		const chapterFilter = chapterParam || parsedRef?.chapter;
		if (chapterFilter !== undefined) {
			hits = hits.filter((hit) => hit.chapter === chapterFilter);
		}

		// Article ID filter
		if (articleId) {
			hits = hits.filter((hit) => hit.article_id?.toLowerCase() === articleId.toLowerCase());
		}

		// Sort by score descending
		hits.sort((a, b) => b.score - a.score);

		logger.info('[Search] Filtering completed', {
			filterDuration: Date.now() - filterStart,
			hitsAfterFilter: hits.length
		});

		const took_ms = Date.now() - startTime;
		const totalHits = hits.length;

		const response: SearchResponse = {
			took_ms,
			query,
			language,
			organization,
			resource,
			reference,
			chunk_level,
			total_hits: totalHits,
			hits: hits.slice(0, limit)
		};

		logger.info('[Search] AI Search completed', {
			took_ms,
			totalHits,
			returnedHits: response.hits.length,
			rawMatchCount: searchData.length,
			filters: {
				language,
				organization,
				resource,
				chunk_level,
				book: bookFilter,
				chapter: chapterFilter,
				articleId
			}
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
	const book = url.searchParams.get('book') || undefined;
	const chapterParam = url.searchParams.get('chapter');
	const chapter = chapterParam ? parseInt(chapterParam, 10) : undefined;
	const chunk_level = url.searchParams.get('chunk_level') || undefined;
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
		book,
		chapter,
		chunk_level,
		articleId,
		limit,
		includeHelps
	};

	return executeSearch(params, platform);
};
