/**
 * Unified Resource Fetcher
 *
 * KISS: One class, one way to fetch everything
 * DRY: Reuses the battle-tested ZipResourceFetcher2
 * Consistent: Same patterns for all resources
 * Antifragile: Real data or real errors, no fake fallbacks
 *
 * Clean Content Pipeline:
 * After successful fetches, content is cleaned and stored in R2 /clean/ prefix
 * for AI Search indexing. This happens non-blocking via fire-and-forget promises.
 */

import { EdgeXRayTracer } from '../../../src/functions/edge-xray.js';
import { parseReference } from '../../../src/parsers/referenceParser.js';
import { ZipResourceFetcher2 } from '../../../src/services/ZipResourceFetcher2.js';
import { edgeLogger as logger } from './edgeLogger.js';

export interface ScriptureResult {
	text: string;
	translation: string;
	fullTitle?: string; // Full title from DCS catalog (e.g. "unfoldingWord® Literal Text")
	actualOrganization?: string;
}

export interface TSVRow {
	[key: string]: string;
}

export interface TWResult {
	articles: Array<{
		term: string;
		path: string;
		markdown: string;
	}>;
}

export interface TWArticleResult {
	content: string;
	path: string;
	term: string;
}

export interface TAResult {
	modules?: Array<{
		id: string;
		path: string;
		markdown?: string;
	}>;
	categories?: string[];
}

/**
 * Unified fetcher that wraps ZipResourceFetcher2
 * All resources go through here for consistency
 *
 * Clean Content Pipeline:
 * ZipResourceFetcher2 automatically stores cleaned content in R2 /clean/ prefix
 * for AI Search indexing when resources are fetched. This happens fire-and-forget
 * in the background without blocking responses.
 */
export class UnifiedResourceFetcher {
	private zipFetcher: ZipResourceFetcher2;

	constructor(tracer?: EdgeXRayTracer) {
		this.zipFetcher = new ZipResourceFetcher2(tracer);
	}

	/**
	 * Set request headers for passthrough to DCS
	 */
	setRequestHeaders(headers: Record<string, string>): void {
		this.zipFetcher.setRequestHeaders(headers);
	}

	/**
	 * Fetch scripture - already works great!
	 */
	async fetchScripture(
		reference: string,
		language: string,
		organization: string,
		resources: string[]
	): Promise<ScriptureResult[]> {
		const parsed = parseReference(reference);
		const results: ScriptureResult[] = [];

		if (!parsed) {
			throw new Error(`Invalid reference format: ${reference}`);
		}

		// Fetch all requested resources
		for (const resource of resources) {
			try {
				console.log(`[UnifiedResourceFetcher] Fetching ${resource} for ${reference}`);
				const data = await this.zipFetcher.getScripture(parsed, language, organization, resource);
				console.log(`[UnifiedResourceFetcher] Got ${data.length} results for ${resource}`);
				results.push(...data);
			} catch (error) {
				console.error(
					`[UnifiedResourceFetcher] Failed to fetch ${resource} for ${reference}:`,
					error
				);
				logger.warn(`Failed to fetch ${resource} for ${reference}`, { error });
				// Continue with other resources instead of failing completely
			}
		}

		if (results.length === 0) {
			throw new Error(`No scripture found for ${reference}`);
		}

		return results;
	}

	/**
	 * Fetch Translation Notes (TSV)
	 */
	async fetchTranslationNotes(
		reference: string,
		language: string,
		organization: string
	): Promise<TSVRow[]> {
		const parsed = parseReference(reference);

		if (!parsed) {
			throw new Error(`Invalid reference format: ${reference}`);
		}

		const data = await this.zipFetcher.getTSVData(parsed, language, organization, 'tn');

		if (!data || data.length === 0) {
			throw new Error(`No translation notes found for ${reference}`);
		}

		// Return data as-is for now - the TSV parser should handle filtering
		return data as TSVRow[];
	}

	/**
	 * Fetch Translation Questions (TSV)
	 */
	async fetchTranslationQuestions(
		reference: string,
		language: string,
		organization: string
	): Promise<TSVRow[]> {
		const parsed = parseReference(reference);

		if (!parsed) {
			throw new Error(`Invalid reference format: ${reference}`);
		}

		const data = await this.zipFetcher.getTSVData(parsed, language, organization, 'tq');

		if (!data || data.length === 0) {
			throw new Error(`No translation questions found for ${reference}`);
		}

		return data as TSVRow[];
	}

	/**
	 * Fetch Translation Word Links (TSV) - CRITICAL FUNCTIONALITY
	 */
	async fetchTranslationWordLinks(
		reference: string,
		language: string,
		organization: string
	): Promise<TSVRow[]> {
		const parsed = parseReference(reference);

		if (!parsed) {
			throw new Error(`Invalid reference format: ${reference}`);
		}

		const data = await this.zipFetcher.getTSVData(parsed, language, organization, 'twl');

		if (!data || data.length === 0) {
			throw new Error(`No translation word links found for ${reference}`);
		}

		return data as TSVRow[];
	}

	/**
	 * Fetch Translation Word article (Markdown) - CRITICAL FUNCTIONALITY
	 */
	async fetchTranslationWord(
		term: string,
		language: string,
		organization: string,
		path?: string
	): Promise<TWArticleResult> {
		const identifier = path || term;
		const result = await this.zipFetcher.getMarkdownContent(
			language,
			organization,
			'tw',
			identifier
		);

		if (!result || typeof result !== 'object') {
			throw new Error(`Translation word not found: ${term}`);
		}

		// getMarkdownContent returns { articles: [{ term, markdown, path }] }
		const twResult = result as {
			articles: Array<{ term: string; markdown: string; path: string }>;
			debug?: any;
		};

		if (!twResult.articles || twResult.articles.length === 0) {
			// If we have debug info, include it in the error
			if (twResult.debug) {
				const error = new Error(`Translation word not found: ${term}`);
				(error as any).debug = twResult.debug;
				throw error;
			}
			throw new Error(`Translation word not found: ${term}`);
		}

		// Return the first article's content
		const article = twResult.articles[0];
		return {
			content: article.markdown,
			path: article.path,
			term: article.term
		};
	}

	/**
	 * Fetch Translation Academy module (Markdown) - CRITICAL FUNCTIONALITY
	 *
	 * @param path - Path to module. Can be:
	 *               - Directory path (e.g., 'translate/figs-metaphor') - returns all .md files concatenated
	 *               - File path (e.g., 'translate/figs-metaphor/01.md') - returns single file
	 *               If not provided and moduleId is given, searches in order:
	 *               translate/{moduleId}, process/{moduleId}, checking/{moduleId}, intro/{moduleId}
	 */
	async fetchTranslationAcademy(
		language: string,
		organization: string,
		moduleId?: string,
		path?: string
	): Promise<TAResult> {
		// If path is provided (directory or file), use it directly
		if (path) {
			const result = await this.zipFetcher.getMarkdownContent(language, organization, 'ta', path);
			if (!result) {
				throw new Error(`Translation Academy module not found at path: ${path}`);
			}
			return result as TAResult;
		}

		// If only moduleId is provided, search with category fallback
		if (moduleId) {
			const categories = ['translate', 'process', 'checking', 'intro'];
			const errors: string[] = [];

			try {
				logger.info(
					`Searching for TA module "${moduleId}" in categories: ${categories.join(', ')}`
				);
			} catch {
				// Ignore logger errors
			}

			for (const category of categories) {
				const searchPath = `${category}/${moduleId}`;
				try {
					const result = await this.zipFetcher.getMarkdownContent(
						language,
						organization,
						'ta',
						searchPath
					);

					try {
						logger.debug(`Category "${category}" search result:`, {
							hasResult: !!result,
							hasModules: !!(result as any)?.modules,
							moduleCount: (result as any)?.modules?.length || 0
						});
					} catch {
						// Ignore logger errors
					}

					if (result && (result as any).modules && (result as any).modules.length > 0) {
						try {
							logger.info(`✓ Found TA module "${moduleId}" in category "${category}"`);
						} catch {
							// Ignore logger errors
						}
						return result as TAResult;
					} else {
						const detail = !result
							? 'null result'
							: !(result as any).modules
								? 'no modules property'
								: 'empty modules array';
						errors.push(`${category}: ${detail}`);
					}
				} catch (error) {
					// Try next category
					const errorMsg = error instanceof Error ? error.message : String(error);
					errors.push(`${category}: ${errorMsg}`);
					try {
						logger.debug(`✗ TA module "${moduleId}" not found in "${category}": ${errorMsg}`);
					} catch {
						// Ignore logger errors
					}
				}
			}

			// If we get here, module wasn't found in any category
			const errorMessage = `Translation Academy module "${moduleId}" not found. Searched categories: ${categories.join(', ')}. Details: ${errors.join('; ')}`;

			try {
				logger.error(`Category search exhausted for "${moduleId}":`, { errors });
			} catch {
				// Ignore logger errors
			}

			throw new Error(errorMessage);
		}

		// No moduleId or dirPath - return TOC
		const result = await this.zipFetcher.getMarkdownContent(language, organization, 'ta');
		if (!result) {
			throw new Error('Translation Academy not found');
		}

		return result as TAResult;
	}

	/**
	 * Browse Translation Words - Returns list of available words
	 * NOTE: This requires adding a new method to ZipResourceFetcher2
	 * to scan ZIP contents for available words
	 */
	async browseTranslationWords(
		_language: string,
		_organization: string,
		_category?: string
	): Promise<{ words: any[]; categories: string[]; totalWords: number }> {
		// TODO: Implement ZIP scanning in ZipResourceFetcher2
		// For now, throw honest error instead of returning mock data
		throw new Error('Browse Translation Words not yet implemented - needs ZIP scanning capability');
	}

	/**
	 * Browse Translation Academy - Returns TOC
	 */
	async browseTranslationAcademy(
		language: string,
		organization: string,
		category?: string
	): Promise<TAResult> {
		// Get TOC - no moduleId means browse mode
		const result = await this.zipFetcher.getMarkdownContent(language, organization, 'ta');

		if (!result) {
			throw new Error('Translation Academy catalog not found');
		}

		// Filter by category if provided
		if (category && (result as TAResult).modules) {
			(result as TAResult).modules = (result as TAResult).modules!.filter((m) =>
				m.path.toLowerCase().includes(`/${category}/`)
			);
		}

		return result as TAResult;
	}

	/**
	 * Get trace information for debugging
	 */
	getTrace(): unknown {
		return this.zipFetcher.getTrace();
	}

	/**
	 * Check if a resource type supports passthrough format
	 */
	static supportsPassThrough(resourceType: string, format: string): boolean {
		// TSV resources can pass through as TSV
		if (['tn', 'tq', 'twl'].includes(resourceType) && format === 'tsv') {
			return true;
		}
		// Markdown resources can pass through as MD
		if (['tw', 'ta'].includes(resourceType) && ['md', 'markdown'].includes(format)) {
			return true;
		}
		return false;
	}
}
