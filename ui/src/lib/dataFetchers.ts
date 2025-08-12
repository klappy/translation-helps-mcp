/**
 * Common Data Fetchers
 *
 * Reusable functions for fetching data from external sources
 * with circuit breaker protection and consistent error handling.
 */

import { circuitBreakers } from './circuitBreaker.js';
import { logger } from '../../../src/utils/logger.js';

/**
 * Fetch from DCS API with circuit breaker protection
 */
export async function fetchFromDCS(
	endpoint: string,
	params?: Record<string, string>
): Promise<any> {
	const baseUrl = 'https://git.door43.org';
	const url = new URL(`${baseUrl}${endpoint}`);

	// Add query parameters
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
	}

	return circuitBreakers.dcs.execute(async () => {
		logger.info('Fetching from DCS', { url: url.toString() });

		const response = await fetch(url.toString(), {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'TranslationHelps/1.0'
			},
			// Add timeout
			signal: AbortSignal.timeout(15000) // 15 seconds
		});

		if (!response.ok) {
			throw new Error(`DCS API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	});
}

/**
 * Fetch catalog search results from DCS
 */
export async function fetchCatalogSearch(params: {
	owner?: string;
	lang?: string;
	subject?: string;
	resource?: string;
	tag?: string;
	includeHistory?: boolean;
	checksum?: string;
	limit?: number;
	page?: number;
}): Promise<any> {
	const queryParams: Record<string, string> = {};

	// Map parameters to DCS API format
	if (params.owner) queryParams.owner = params.owner;
	if (params.lang) queryParams.lang = params.lang;
	if (params.subject) queryParams.subject = params.subject;
	if (params.resource) queryParams.resource = params.resource;
	if (params.tag) queryParams.tag = params.tag;
	if (params.includeHistory !== undefined)
		queryParams.includeHistory = String(params.includeHistory);
	if (params.checksum) queryParams.checksum = params.checksum;
	if (params.limit) queryParams.limit = String(params.limit);
	if (params.page) queryParams.page = String(params.page);

	const data = await fetchFromDCS('/api/v1/catalog/search', queryParams);

	// Ensure we have the expected structure
	return {
		data: data.data || [],
		meta: {
			total: data.total || 0,
			page: data.page || 1,
			limit: data.limit || 50
		}
	};
}

/**
 * Fetch repository contents from DCS
 */
export async function fetchRepoContents(
	owner: string,
	repo: string,
	path: string = '',
	ref?: string
): Promise<any[]> {
	let endpoint = `/api/v1/repos/${owner}/${repo}/contents`;
	if (path) {
		endpoint += `/${path}`;
	}

	const params: Record<string, string> = {};
	if (ref) params.ref = ref;

	const data = await fetchFromDCS(endpoint, params);

	// Ensure we return an array
	return Array.isArray(data) ? data : [];
}

/**
 * Mock data fetchers for development/testing
 */
export const mockFetchers = {
	/**
	 * Mock available books data
	 */
	async getAvailableBooks(_language: string = 'en', resource?: string): Promise<any> {
		// Mock book data structure
		const allBooks = [
			{ id: 'gen', name: 'Genesis', testament: 'ot', chapters: 50, available: true },
			{ id: 'exo', name: 'Exodus', testament: 'ot', chapters: 40, available: true },
			{ id: 'lev', name: 'Leviticus', testament: 'ot', chapters: 27, available: false },
			{ id: 'mat', name: 'Matthew', testament: 'nt', chapters: 28, available: true },
			{ id: 'mrk', name: 'Mark', testament: 'nt', chapters: 16, available: true },
			{ id: 'luk', name: 'Luke', testament: 'nt', chapters: 24, available: true },
			{ id: 'jhn', name: 'John', testament: 'nt', chapters: 21, available: true },
			{ id: 'rom', name: 'Romans', testament: 'nt', chapters: 16, available: true },
			{ id: 'rev', name: 'Revelation', testament: 'nt', chapters: 22, available: true }
		];

		// Filter by resource availability
		let books = allBooks;
		if (resource === 'tn' || resource === 'tq') {
			// Translation helps might not have all books
			books = books.filter((b) => b.testament === 'nt' || b.id === 'gen');
		}

		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		return books;
	}
};
