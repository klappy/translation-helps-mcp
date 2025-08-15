/**
 * Unified Resource Fetcher
 *
 * KISS: One class, one way to fetch everything
 * DRY: Reuses the battle-tested ZipResourceFetcher2
 * Consistent: Same patterns for all resources
 * Antifragile: Real data or real errors, no fake fallbacks
 */

import { EdgeXRayTracer } from '../../../src/functions/edge-xray.js';
import { ZipResourceFetcher2 } from '../../../src/services/ZipResourceFetcher2.js';
import { edgeLogger as logger } from './edgeLogger.js';
import { parseReference } from './referenceParser.js';

export interface ScriptureResult {
	text: string;
	translation: string;
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

		// Fetch all requested resources
		for (const resource of resources) {
			try {
				const data = await this.zipFetcher.getScripture(parsed, language, organization, resource);
				results.push(...data);
			} catch (error) {
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
		const data = await this.zipFetcher.getTSVData(parsed, language, organization, 'tn');

		if (!data || data.length === 0) {
			throw new Error(`No translation notes found for ${reference}`);
		}

		// Filter out book/chapter level notes (those without verse numbers)
		// Keep only notes that have both chapter AND verse
		const filteredData = data.filter((row: any) => {
			// Skip if no reference
			if (!row.Reference) return false;

			// Parse the reference to check if it has a verse
			const refParts = row.Reference.split(':');
			if (refParts.length < 2) return false; // No verse separator

			const versePart = refParts[1];
			// Check if verse part contains a number (not just "intro" or empty)
			return /\d/.test(versePart);
		});

		// Add trace for debugging
		this.tracer.addApiCall({
			url: `internal://filter/translation-notes`,
			duration: 1,
			status: 200,
			size: 0,
			cached: false,
			metadata: {
				totalRows: data.length,
				filteredRows: filteredData.length,
				reference: reference,
				sampleRows: data.slice(0, 3).map((r: any) => r.Reference)
			}
		});

		if (filteredData.length === 0) {
			throw new Error(
				`No verse-level translation notes found for ${reference}. Total rows: ${data.length}, after filtering: ${filteredData.length}`
			);
		}

		return filteredData as TSVRow[];
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
	): Promise<TWResult> {
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
		};

		if (!twResult.articles || twResult.articles.length === 0) {
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
	 */
	async fetchTranslationAcademy(
		language: string,
		organization: string,
		moduleId?: string
	): Promise<TAResult> {
		const result = await this.zipFetcher.getMarkdownContent(language, organization, 'ta', moduleId);

		if (!result) {
			throw new Error('Translation Academy not found');
		}

		// getMarkdownContent returns different structures for TOC vs specific module
		// TOC: { modules: [{ id, path }], categories: string[] }
		// Module: { modules: [{ id, markdown, path }] }
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
