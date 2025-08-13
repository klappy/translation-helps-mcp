/**
 * Edge-Compatible ZIP Fetcher
 *
 * Implements the proper data flow:
 * 1. Catalog call (cached in KV)
 * 2. ZIP for latest tagged release (cached in KV)
 * 3. File from ZIP (cached in KV)
 * 4. Parse file
 * 5. Shape for response
 *
 * KISS: One fetcher for all resources
 * DRY: Reuses the battle-tested ZipResourceFetcher2
 */

import { EdgeXRayTracer } from '../../../src/functions/edge-xray.js';
import { ZipResourceFetcher2 } from '../../../src/services/ZipResourceFetcher2.js';
import { edgeLogger as logger } from './edgeLogger.js';
import type { ParsedReference } from './referenceParser.js';

// Singleton instance for reuse across requests
let zipFetcher: ZipResourceFetcher2 | null = null;

/**
 * Get or create the ZIP fetcher instance
 */
function getZipFetcher(tracer?: EdgeXRayTracer): ZipResourceFetcher2 {
	if (!zipFetcher) {
		zipFetcher = new ZipResourceFetcher2(tracer);
		logger.info('Created new ZipResourceFetcher2 instance');
	} else if (tracer) {
		zipFetcher.setTracer(tracer);
	}
	return zipFetcher;
}

/**
 * Result with trace information
 */
export interface ZipFetchResult<T> {
	data: T;
	trace?: any;
}

/**
 * Fetch scripture using ZIP-based approach
 */
export async function fetchScriptureFromZIP(
	reference: ParsedReference,
	language: string,
	organization: string,
	resource?: string | string[]
): Promise<ZipFetchResult<Array<{ text: string; translation: string; metadata?: any }>>> {
	const tracer = new EdgeXRayTracer(`scripture-${Date.now()}`, 'edge-scripture');
	const fetcher = getZipFetcher(tracer);

	try {
		logger.info('Fetching scripture via ZIP', { reference, language, organization, resource });

		// Handle resource parameter
		const resourceList = Array.isArray(resource) ? resource : resource?.split(',') || [];

		// Get scripture from ZIP fetcher
		const results = await fetcher.getScripture(reference, language, organization);

		// Filter by requested resources if specified
		let filteredResults = results;
		if (resourceList.length > 0 && resource !== 'all') {
			filteredResults = results.filter((r) => {
				const trans = r.translation.toLowerCase();
				return resourceList.some((res) => trans.includes(res.toLowerCase()));
			});
		}

		// Get trace information
		const trace = fetcher.getTrace();

		return {
			data: filteredResults,
			trace
		};
	} catch (error) {
		logger.error('Failed to fetch scripture from ZIP', { error });
		throw error;
	}
}

/**
 * Fetch TSV data (Translation Notes, Questions) using ZIP-based approach
 */
export async function fetchTSVFromZIP(
	reference: ParsedReference,
	language: string,
	organization: string,
	resourceType: 'tn' | 'tq' | 'twl'
): Promise<ZipFetchResult<any[]>> {
	const tracer = new EdgeXRayTracer(`tsv-${Date.now()}`, 'edge-tsv');
	const fetcher = getZipFetcher(tracer);

	try {
		logger.info('Fetching TSV via ZIP', { reference, language, organization, resourceType });

		const results = await fetcher.getTSVData(reference, language, organization, resourceType);

		// Get trace information
		const trace = fetcher.getTrace();

		return {
			data: results,
			trace
		};
	} catch (error) {
		logger.error('Failed to fetch TSV from ZIP', { error });
		throw error;
	}
}

/**
 * Fetch Markdown content (Translation Words, Academy) using ZIP-based approach
 */
export async function fetchMarkdownFromZIP(
	language: string,
	organization: string,
	resourceType: 'tw' | 'ta',
	identifier?: string
): Promise<any> {
	const tracer = new EdgeXRayTracer(`md-${Date.now()}`, 'edge-markdown');
	const fetcher = getZipFetcher(tracer);

	try {
		logger.info('Fetching Markdown via ZIP', { language, organization, resourceType, identifier });

		const result = await fetcher.getMarkdownContent(
			language,
			organization,
			resourceType,
			identifier
		);

		return result;
	} catch (error) {
		logger.error('Failed to fetch Markdown from ZIP', { error });
		throw error;
	} finally {
		// Log trace info
		const trace = fetcher.getTrace();
		logger.debug('ZIP fetch trace', { trace });
	}
}

/**
 * List ZIP files for a resource (useful for Translation Words)
 */
export async function listZIPFiles(
	language: string,
	organization: string,
	resourceType: string
): Promise<string[]> {
	// const tracer = new EdgeXRayTracer(`list-${Date.now()}`, 'edge-list');
	// const fetcher = getZipFetcher(tracer);

	try {
		logger.info('Listing ZIP files', { language, organization, resourceType });

		// This is a simplified version - in reality we'd need to:
		// 1. Get catalog
		// 2. Find resource
		// 3. Download ZIP
		// 4. List files
		// For now, return empty array
		return [];
	} catch (error) {
		logger.error('Failed to list ZIP files', { error });
		throw error;
	}
}
