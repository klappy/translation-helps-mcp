/**
 * QA Citation Validator
 *
 * Uses the citations ALREADY COLLECTED by agents.
 * No parsing needed - we already have the data!
 *
 * 1. Take citations from agents
 * 2. Re-fetch to verify they still exist
 * 3. Have LLM annotate the response with emojis
 */

import type {
	CitationValidation,
	ValidationResult,
	ToolExecutor,
	StreamEmitter,
	Citation
} from './types.js';

const WORKERS_AI_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

interface AIBinding {
	run(model: string, options: unknown): Promise<unknown>;
}

/**
 * Resource type to MCP tool mapping
 */
const RESOURCE_TO_TOOL: Record<
	string,
	{ tool: string; paramBuilder: (article: string) => Record<string, unknown> }
> = {
	Scripture: {
		tool: 'fetch_scripture',
		paramBuilder: (ref) => ({ reference: ref, resource: 'ult', format: 'md' })
	},
	scripture: {
		tool: 'fetch_scripture',
		paramBuilder: (ref) => ({ reference: ref, resource: 'ult', format: 'md' })
	},
	ULT: {
		tool: 'fetch_scripture',
		paramBuilder: (ref) => ({ reference: ref, resource: 'ult', format: 'md' })
	},
	UST: {
		tool: 'fetch_scripture',
		paramBuilder: (ref) => ({ reference: ref, resource: 'ust', format: 'md' })
	},
	words: {
		tool: 'fetch_translation_word',
		paramBuilder: (term) => ({ term: term.toLowerCase(), format: 'md' })
	},
	'Translation Words': {
		tool: 'fetch_translation_word',
		paramBuilder: (term) => ({ term: term.toLowerCase(), format: 'md' })
	},
	academy: {
		tool: 'fetch_translation_academy',
		paramBuilder: (moduleId) => ({
			moduleId: moduleId.toLowerCase().replace(/\s+/g, '-'),
			format: 'md'
		})
	},
	'Translation Academy': {
		tool: 'fetch_translation_academy',
		paramBuilder: (moduleId) => ({
			moduleId: moduleId.toLowerCase().replace(/\s+/g, '-'),
			format: 'md'
		})
	},
	notes: {
		tool: 'fetch_translation_notes',
		paramBuilder: (ref) => ({ reference: ref, format: 'md' })
	},
	'Translation Notes': {
		tool: 'fetch_translation_notes',
		paramBuilder: (ref) => ({ reference: ref, format: 'md' })
	},
	questions: {
		tool: 'fetch_translation_questions',
		paramBuilder: (ref) => ({ reference: ref, format: 'md' })
	},
	'Translation Questions': {
		tool: 'fetch_translation_questions',
		paramBuilder: (ref) => ({ reference: ref, format: 'md' })
	}
};

/**
 * Validate a single citation by fetching the source
 */
async function validateCitation(
	reference: string,
	source: string,
	executeToolFn: ToolExecutor
): Promise<{ status: 'verified' | 'uncertain' | 'invalid'; emoji: string; reason: string }> {
	const mapping = RESOURCE_TO_TOOL[source];

	if (!mapping) {
		console.log(`[QA] Unknown source type: ${source}`);
		return { status: 'uncertain', emoji: '⚠️', reason: `Unknown source: ${source}` };
	}

	try {
		console.log(`[QA] Validating: ${reference} from ${source} using ${mapping.tool}`);
		const result = await executeToolFn(mapping.tool, mapping.paramBuilder(reference));

		const content = typeof result === 'string' ? result : JSON.stringify(result);

		const startsWithError =
			content.toLowerCase().startsWith('error') ||
			content.toLowerCase().startsWith('not found') ||
			content.toLowerCase().startsWith('module not found');

		const hasContent = content.length > 50 && !startsWithError;

		if (hasContent) {
			return { status: 'verified', emoji: '✅', reason: 'Source verified' };
		} else {
			return { status: 'invalid', emoji: '❌', reason: 'Source not found' };
		}
	} catch (error) {
		console.error(`[QA] Validation error for ${reference}:`, error);
		return { status: 'invalid', emoji: '❌', reason: `Fetch failed: ${error}` };
	}
}

/**
 * Use LLM to annotate response with validation emojis
 */
async function annotateWithLLM(
	ai: AIBinding,
	response: string,
	validations: Array<{ reference: string; source: string; emoji: string }>
): Promise<string> {
	if (validations.length === 0) return response;

	const validationList = validations
		.map((v) => `"${v.reference}" (${v.source}): should show ${v.emoji}`)
		.join('\n');

	try {
		const result = (await ai.run(WORKERS_AI_MODEL, {
			messages: [
				{
					role: 'system',
					content: `Update citation emojis in the text.

Find each citation and replace the ⏳ (or any emoji) with the correct validation emoji.
- ✅ = verified
- ⚠️ = uncertain  
- ❌ = invalid

Keep ALL other text exactly the same. Only change the emojis.
Return the complete updated text.`
				},
				{
					role: 'user',
					content: `Validation results:\n${validationList}\n\nText:\n${response}`
				}
			],
			max_tokens: 4000,
			temperature: 0
		})) as { response?: string };

		if (result.response && result.response.length > response.length * 0.5) {
			return result.response;
		}
		return response;
	} catch (error) {
		console.error('[QA] Annotation failed:', error);
		return response;
	}
}

/**
 * Main validation function - USES COLLECTED CITATIONS
 */
export async function validateResponse(
	ai: AIBinding,
	response: string,
	executeToolFn: ToolExecutor,
	emit: StreamEmitter,
	collectedCitations?: Citation[]
): Promise<ValidationResult> {
	const startTime = Date.now();
	emit('validation:start', { status: 'Starting validation...' });

	// USE CITATIONS ALREADY COLLECTED BY AGENTS
	const citations = collectedCitations || [];

	console.log('[QA] Collected citations from agents:', JSON.stringify(citations, null, 2));

	if (citations.length === 0) {
		console.log('[QA] No citations collected - nothing to validate');
		emit('validation:complete', {
			result: {
				validations: [],
				summary: { verified: 0, uncertain: 0, invalid: 0, total: 0 },
				annotatedResponse: response,
				totalTime: Date.now() - startTime
			}
		});
		return {
			validations: [],
			summary: { verified: 0, uncertain: 0, invalid: 0, total: 0 },
			annotatedResponse: response,
			totalTime: Date.now() - startTime
		};
	}

	emit('validation:progress', {
		validated: 0,
		total: citations.length,
		current: { status: `Validating ${citations.length} citations from agents` }
	});

	// Validate each citation by RE-FETCHING
	const validationResults: CitationValidation[] = [];
	const annotationData: Array<{ reference: string; source: string; emoji: string }> = [];

	for (let i = 0; i < citations.length; i++) {
		const citation = citations[i];
		const reference = citation.reference || '';
		const source = citation.source || 'Scripture';

		if (!reference) {
			console.log('[QA] Skipping citation with no reference:', citation);
			continue;
		}

		emit('validation:progress', {
			validated: i,
			total: citations.length,
			current: { article: reference, resource: source, status: 'validating' }
		});

		const result = await validateCitation(reference, source, executeToolFn);

		annotationData.push({ reference, source, emoji: result.emoji });

		validationResults.push({
			citation: {
				id: i + 1,
				article: reference,
				resource: source,
				originalText: `${reference}, ${source}`
			},
			status: result.status,
			emoji: result.emoji,
			reason: result.reason,
			duration: 0
		});
	}

	// Annotate response with emojis
	emit('validation:progress', {
		validated: citations.length,
		total: citations.length,
		current: { status: 'Annotating response...' }
	});

	const annotatedResponse = await annotateWithLLM(ai, response, annotationData);

	// Summary
	const summary = {
		verified: validationResults.filter((v) => v.status === 'verified').length,
		uncertain: validationResults.filter((v) => v.status === 'uncertain').length,
		invalid: validationResults.filter((v) => v.status === 'invalid').length,
		total: validationResults.length
	};

	const result: ValidationResult = {
		validations: validationResults,
		summary,
		annotatedResponse,
		totalTime: Date.now() - startTime
	};

	emit('validation:complete', { result });
	console.log(`[QA] Complete: ${summary.verified}✅ ${summary.uncertain}⚠️ ${summary.invalid}❌`);

	return result;
}
