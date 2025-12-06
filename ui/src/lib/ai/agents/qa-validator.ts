/**
 * QA Citation Validator
 *
 * Validates citations in synthesized responses by re-fetching resources
 * and verifying that quoted content matches the source.
 *
 * No LLM needed - pure deterministic lookups.
 */

import type {
	CitationValidation,
	CitationValidationStatus,
	ValidationResult,
	ToolExecutor,
	StreamEmitter
} from './types.js';

/**
 * Extracted citation with its superscript number
 */
interface ExtractedCitation {
	number: number;
	article: string;
	resource: string;
	fullMatch: string;
}

/**
 * Extracted quote with its superscript number
 */
interface ExtractedQuote {
	number: number;
	text: string;
}

/**
 * Status emoji mapping
 */
const STATUS_EMOJI: Record<CitationValidationStatus, string> = {
	verified: '✅',
	uncertain: '⚠️',
	invalid: '❌'
};

/**
 * Resource type to MCP tool mapping
 */
const RESOURCE_TO_TOOL: Record<
	string,
	{ tool: string; paramBuilder: (article: string) => Record<string, unknown> }
> = {
	ULT: {
		tool: 'fetch_scripture',
		paramBuilder: (article) => ({ reference: article, resource: 'ult', format: 'md' })
	},
	UST: {
		tool: 'fetch_scripture',
		paramBuilder: (article) => ({ reference: article, resource: 'ust', format: 'md' })
	},
	'Translation Words': {
		tool: 'fetch_translation_word',
		paramBuilder: (article) => ({ term: article.toLowerCase(), format: 'md' })
	},
	'Translation Academy': {
		tool: 'fetch_translation_academy',
		paramBuilder: (article) => ({ moduleId: article.toLowerCase(), format: 'md' })
	},
	'Translation Notes': {
		tool: 'fetch_translation_notes',
		paramBuilder: (article) => ({ reference: article, format: 'md' })
	},
	'Translation Questions': {
		tool: 'fetch_translation_questions',
		paramBuilder: (article) => ({ reference: article, format: 'md' })
	}
};

/**
 * Extract numbered citations from response text
 * Matches patterns like: ^1^[[John 3:16|ULT]] or ^2^[[love|Translation Words]]
 */
export function extractNumberedCitations(text: string): ExtractedCitation[] {
	const citations: ExtractedCitation[] = [];

	// Match ^N^[[article|resource]] pattern
	const regex = /\^(\d+)\^\[\[([^\]|]+)\|([^\]]+)\]\]/g;
	let match;

	while ((match = regex.exec(text)) !== null) {
		citations.push({
			number: parseInt(match[1], 10),
			article: match[2].trim(),
			resource: match[3].trim(),
			fullMatch: match[0]
		});
	}

	return citations;
}

/**
 * Extract quotes with their superscript numbers
 * Matches patterns like: "quoted text"^1^ or "some words"^2^
 */
export function extractQuotesWithNumbers(text: string): ExtractedQuote[] {
	const quotes: ExtractedQuote[] = [];

	// Match "text"^N^ pattern (handles both straight and curly quotes)
	const regex = /[""]([^""]+)[""]\^(\d+)\^/g;
	let match;

	while ((match = regex.exec(text)) !== null) {
		quotes.push({
			number: parseInt(match[2], 10),
			text: match[1].trim()
		});
	}

	return quotes;
}

/**
 * Map a resource type to its MCP tool and parameters
 */
export function mapCitationToTool(
	article: string,
	resource: string
): { tool: string; params: Record<string, unknown> } | null {
	const mapping = RESOURCE_TO_TOOL[resource];
	if (!mapping) {
		return null;
	}

	return {
		tool: mapping.tool,
		params: mapping.paramBuilder(article)
	};
}

/**
 * Check if quoted text appears in the source content
 * Uses fuzzy matching to handle minor variations
 */
export function validateCitationContent(quotedText: string, sourceContent: string): boolean {
	if (!quotedText || !sourceContent) {
		return false;
	}

	// Normalize both strings for comparison
	const normalizeText = (text: string): string => {
		return text
			.toLowerCase()
			.replace(/[""'']/g, '"') // Normalize quotes
			.replace(/\s+/g, ' ') // Normalize whitespace
			.replace(/[.,!?;:]/g, '') // Remove punctuation
			.trim();
	};

	const normalizedQuote = normalizeText(quotedText);
	const normalizedSource = normalizeText(sourceContent);

	// Direct inclusion check
	if (normalizedSource.includes(normalizedQuote)) {
		return true;
	}

	// Check for significant overlap (at least 60% of words match)
	const quoteWords = normalizedQuote.split(' ').filter((w) => w.length > 2);
	const sourceWords = new Set(normalizedSource.split(' '));

	if (quoteWords.length === 0) {
		return false;
	}

	const matchingWords = quoteWords.filter((word) => sourceWords.has(word));
	const matchRatio = matchingWords.length / quoteWords.length;

	return matchRatio >= 0.6;
}

/**
 * Extract text content from MCP tool response
 */
function extractContentFromResponse(response: unknown): string {
	if (!response) {
		return '';
	}

	// Handle string responses
	if (typeof response === 'string') {
		return response;
	}

	// Handle object responses with common content fields
	if (typeof response === 'object') {
		const obj = response as Record<string, unknown>;

		// Try common content fields
		const contentFields = ['content', 'text', 'body', 'markdown', 'data', 'result'];
		for (const field of contentFields) {
			if (typeof obj[field] === 'string') {
				return obj[field] as string;
			}
		}

		// Try to stringify if it has meaningful content
		const str = JSON.stringify(obj);
		if (str.length > 10) {
			return str;
		}
	}

	return '';
}

/**
 * Validate a single citation by calling the MCP tool
 */
async function validateSingleCitation(
	citation: ExtractedCitation,
	quotedText: string | undefined,
	executeToolFn: ToolExecutor
): Promise<CitationValidation> {
	const startTime = Date.now();

	const toolMapping = mapCitationToTool(citation.article, citation.resource);

	if (!toolMapping) {
		return {
			number: citation.number,
			citation: `[[${citation.article}|${citation.resource}]]`,
			article: citation.article,
			resource: citation.resource,
			quotedText,
			status: 'invalid',
			emoji: STATUS_EMOJI.invalid,
			reason: `Unknown resource type: ${citation.resource}`,
			duration: Date.now() - startTime
		};
	}

	try {
		const response = await executeToolFn(toolMapping.tool, toolMapping.params);
		const duration = Date.now() - startTime;

		// Check if we got a valid response
		const content = extractContentFromResponse(response);

		if (!content || content.length < 10) {
			return {
				number: citation.number,
				citation: `[[${citation.article}|${citation.resource}]]`,
				article: citation.article,
				resource: citation.resource,
				quotedText,
				status: 'invalid',
				emoji: STATUS_EMOJI.invalid,
				reason: 'Resource not found or empty response',
				duration
			};
		}

		// If we have quoted text, verify it appears in the source
		if (quotedText) {
			const contentMatches = validateCitationContent(quotedText, content);

			if (contentMatches) {
				return {
					number: citation.number,
					citation: `[[${citation.article}|${citation.resource}]]`,
					article: citation.article,
					resource: citation.resource,
					quotedText,
					status: 'verified',
					emoji: STATUS_EMOJI.verified,
					duration
				};
			} else {
				return {
					number: citation.number,
					citation: `[[${citation.article}|${citation.resource}]]`,
					article: citation.article,
					resource: citation.resource,
					quotedText,
					status: 'uncertain',
					emoji: STATUS_EMOJI.uncertain,
					reason: 'Quoted text not found in source (may be paraphrased)',
					duration
				};
			}
		}

		// No quoted text to verify, but resource exists
		return {
			number: citation.number,
			citation: `[[${citation.article}|${citation.resource}]]`,
			article: citation.article,
			resource: citation.resource,
			status: 'verified',
			emoji: STATUS_EMOJI.verified,
			reason: 'Resource exists (no quote to verify)',
			duration
		};
	} catch (error) {
		return {
			number: citation.number,
			citation: `[[${citation.article}|${citation.resource}]]`,
			article: citation.article,
			resource: citation.resource,
			quotedText,
			status: 'invalid',
			emoji: STATUS_EMOJI.invalid,
			reason: `Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			duration: Date.now() - startTime
		};
	}
}

/**
 * Inject validation emoji after each citation in the response
 */
export function injectValidationEmoji(response: string, validations: CitationValidation[]): string {
	let annotated = response;

	// Create a map of citation string to validation for quick lookup
	const validationMap = new Map<string, CitationValidation>();
	for (const v of validations) {
		// Map both the numbered citation and unnumbered version
		validationMap.set(`^${v.number}^[[${v.article}|${v.resource}]]`, v);
	}

	// Replace each ^N^[[article|resource]] with ^N^[[article|resource]] emoji
	annotated = annotated.replace(
		/\^(\d+)\^\[\[([^\]|]+)\|([^\]]+)\]\]/g,
		(match, num, article, resource) => {
			const key = `^${num}^[[${article.trim()}|${resource.trim()}]]`;
			const validation = validationMap.get(key);
			if (validation) {
				return `${match} ${validation.emoji}`;
			}
			return match;
		}
	);

	return annotated;
}

/**
 * Main validation function - validates all citations in a response
 */
export async function validateResponse(
	response: string,
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<ValidationResult> {
	const startTime = Date.now();

	// Extract citations and quotes
	const citations = extractNumberedCitations(response);
	const quotes = extractQuotesWithNumbers(response);

	// Create quote lookup by number
	const quotesByNumber = new Map<number, string>();
	for (const quote of quotes) {
		quotesByNumber.set(quote.number, quote.text);
	}

	// Emit start event
	emit('validation:start', { citationCount: citations.length });

	if (citations.length === 0) {
		// No citations to validate
		const result: ValidationResult = {
			validations: [],
			summary: { verified: 0, uncertain: 0, invalid: 0, total: 0 },
			annotatedResponse: response,
			totalTime: Date.now() - startTime
		};
		emit('validation:complete', { result });
		return result;
	}

	// Validate all citations in parallel (they're cached, should be fast)
	const validationPromises = citations.map(async (citation, index) => {
		const quotedText = quotesByNumber.get(citation.number);
		const validation = await validateSingleCitation(citation, quotedText, executeToolFn);

		// Emit progress
		emit('validation:progress', {
			validated: index + 1,
			total: citations.length,
			current: validation
		});

		return validation;
	});

	const validations = await Promise.all(validationPromises);

	// Calculate summary
	const summary = {
		verified: validations.filter((v) => v.status === 'verified').length,
		uncertain: validations.filter((v) => v.status === 'uncertain').length,
		invalid: validations.filter((v) => v.status === 'invalid').length,
		total: validations.length
	};

	// Inject emoji annotations
	const annotatedResponse = injectValidationEmoji(response, validations);

	const result: ValidationResult = {
		validations,
		summary,
		annotatedResponse,
		totalTime: Date.now() - startTime
	};

	emit('validation:complete', { result });

	return result;
}
