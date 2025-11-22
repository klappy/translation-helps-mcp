/**
 * Per-Resource Search Endpoint
 *
 * CPU-bound worker that processes a single resource:
 * 1. Fetches ZIP
 * 2. Lists/filters files with unzipit
 * 3. Indexes content with MiniSearch
 * 4. Returns ranked hits
 *
 * KISS: One resource, one isolate
 * Performance: <400ms CPU budget
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { unzip } from 'unzipit';
import { SearchService, type SearchDocument } from '$lib/../../../src/services/SearchService.js';
import { logger } from '$lib/../../../src/utils/logger.js';

interface ResourceSearchRequest {
	resource: string;
	zipUrl: string;
	query: string;
	reference?: string;
	type: 'bible' | 'notes' | 'words' | 'academy' | 'questions' | 'obs';
}

/**
 * Determine file extensions to search based on resource type
 */
function getFileExtensions(type: string): string[] {
	switch (type) {
		case 'bible':
			return ['.usfm', '.usfm3'];
		case 'notes':
			return ['.tsv', '.md'];
		case 'words':
		case 'academy':
			return ['.md'];
		case 'questions':
			return ['.tsv', '.md'];
		case 'obs':
			return ['.md'];
		default:
			return ['.usfm', '.tsv', '.md'];
	}
}

/**
 * Filter files by extension and optional reference
 */
function filterFiles(
	entries: Record<string, any>,
	extensions: string[],
	reference?: string
): string[] {
	const filtered: string[] = [];

	// entries is an object, not a Map
	for (const [path, entry] of Object.entries(entries)) {
		// Skip directories
		if (entry.isDirectory) {
			continue;
		}

		// Check extension
		const hasValidExt = extensions.some((ext) => path.toLowerCase().endsWith(ext));
		if (!hasValidExt) {
			continue;
		}

		// If reference provided, try to filter by book
		if (reference) {
			const bookMatch = reference.match(/^(\d?\s?[A-Za-z]+)/);
			if (bookMatch) {
				const bookName = bookMatch[1].toLowerCase().trim();
				const pathLower = path.toLowerCase();

				// Check if path contains book name or book code
				if (!pathLower.includes(bookName)) {
					// Try to match book codes (e.g., "43-JHN" for John)
					const hasBookCode = /\d{2,3}-[A-Z]{3}/.test(path.toUpperCase());
					if (!hasBookCode) {
						continue;
					}
				}
			}
		}

		filtered.push(path);
	}

	// Cap at 500 files to prevent CPU timeout
	return filtered.slice(0, 500);
}

/**
 * POST /internal/search-resource
 * Per-resource search worker
 */
export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		// Parse request
		const body: ResourceSearchRequest = await request.json();
		const { resource, zipUrl, query, reference, type } = body;

		logger.info('[Search:Resource] Processing resource', {
			resource,
			type,
			query
		});

		// Step 1: Unzip directly from URL (streaming/lazy)
		// unzipit handles fetching internally using Range requests
		const { entries } = await unzip(zipUrl);
		const unzipTime = Date.now();
		logger.debug('[Search:Resource] ZIP listed', {
			resource,
			fileCount: Object.keys(entries).length,
			elapsed: unzipTime - startTime
		});

		// Step 2: Filter relevant files
		const extensions = getFileExtensions(type);
		const filePaths = filterFiles(entries, extensions, reference);
		const filterTime = Date.now();
		logger.debug('[Search:Resource] Files filtered', {
			resource,
			totalFiles: Object.keys(entries).length,
			filteredFiles: filePaths.length,
			elapsed: filterTime - unzipTime
		});

		if (filePaths.length === 0) {
			return json({
				resource,
				hits: [],
				message: 'No matching files found in resource'
			});
		}

		// Step 3: Extract and index content
		const searchService = new SearchService();
		const documents: SearchDocument[] = [];

		for (const path of filePaths) {
			const entry = entries[path];
			if (!entry) continue;

			try {
				const content = await entry.text();
				if (!content || content.trim().length === 0) {
					continue;
				}

				documents.push({
					id: `${resource}:${path}`,
					content,
					path,
					resource,
					type
				});
			} catch (e) {
				logger.warn('[Search:Resource] Failed to extract file', {
					path,
					error: String(e)
				});
			}
		}

		await searchService.indexDocuments(documents);
		const indexTime = Date.now();
		logger.debug('[Search:Resource] Documents indexed', {
			resource,
			documentCount: documents.length,
			elapsed: indexTime - filterTime
		});

		// Step 5: Search
		const results = await searchService.search(query, {
			fuzzy: 0.2,
			prefix: true,
			maxResults: 50,
			contextLength: 150
		});

		const searchTime = Date.now();

		// Return results
		const response = {
			resource,
			type,
			query,
			took_ms: searchTime - startTime,
			hits: results,
			stats: {
				zipBytes: 0, // Streaming mode, size unknown/irrelevant
				totalFiles: Object.keys(entries).length,
				filteredFiles: filePaths.length,
				indexedDocs: documents.length,
				timing: {
					fetch: 0, // Streaming
					unzip: unzipTime - startTime,
					filter: filterTime - unzipTime,
					index: indexTime - filterTime,
					search: searchTime - indexTime
				}
			}
		};

		logger.info('[Search:Resource] Resource search completed', {
			resource,
			took_ms: response.took_ms,
			hitCount: results.length
		});

		return json(response);
	} catch (error) {
		logger.error('[Search:Resource] Resource search failed', {
			error: error instanceof Error ? error.message : String(error)
		});

		return json(
			{
				error: 'Resource search failed',
				message: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
