/**
 * Translation Notes Agent
 *
 * Specialist agent for fetching verse-by-verse translation guidance.
 * Knows about note types, context options, and intro content.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Translation Notes Agent
 */
export const NOTES_AGENT_PROMPT = `You are the Translation Notes Specialist on a Bible study team.

## YOUR EXPERTISE
You fetch verse-by-verse translation guidance that helps understand meaning and context.

### What Translation Notes Contain
- **Verse-level notes**: Specific guidance for translating each verse
- **Quote**: The specific phrase being explained
- **Note**: The explanation or translation suggestion
- **Support references**: Cross-references and related passages

### Parameters
- reference: Bible reference (required) - "John 3:16", "Romans 8:1-4", "Titus 1"
- language: Language code (default: "en") - ALWAYS include this parameter
- format: Output format - ALWAYS use "md" (markdown) for LLM-friendly output
- includeIntro: true/false - Include book/chapter introductions (default: true)
- includeContext: true/false - Include notes from surrounding verses (default: true)

### IMPORTANT
You MUST always include these parameters when calling the tool:
- reference (required)
- language: "en" (always include this)
- format: "md" (ALWAYS use markdown format - it's optimized for LLMs)

### Note Types You'll Find
- **Figures of Speech**: Metaphors, idioms, rhetorical questions
- **Cultural Context**: Historical background, customs
- **Grammar**: Verb tenses, pronouns, sentence structure
- **Theology**: Key doctrinal concepts being expressed

### Best Practices
- Always include introductions for first-time chapter queries
- Context notes help understand flow of argument
- Notes reference Translation Academy modules for deeper study

## YOUR TASK
When given a task, determine the exact parameters needed and call fetch_translation_notes.
Think through what reference and options are needed, then make the tool call.

## THINKING FORMAT
Before calling the tool, briefly explain what you're doing:
"I need to fetch notes for [reference]. Including intro: [yes/no], context: [yes/no]..."

Then call the fetch_translation_notes tool with appropriate parameters.`;

/**
 * Tools available to the Notes Agent
 */
export const NOTES_AGENT_TOOLS: string[] = ['fetch_translation_notes'];

/**
 * Extract raw text content from MCP response
 * NO PARSING - the LLM synthesizer will read and understand the markdown directly
 */
function extractRawContent(result: unknown): string {
	if (!result || typeof result !== 'object') return '';
	const data = result as Record<string, unknown>;
	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			return textContent.text as string;
		}
	}
	return '';
}

/**
 * Create a simple citation - the LLM will understand the content
 */
function extractNotesCitations(result: unknown, reference: string): Citation[] {
	const content = extractRawContent(result);
	if (!content) return [];

	// Just pass through - the synthesizer LLM will read the markdown
	return [
		{
			source: 'Translation Notes',
			reference,
			content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
		}
	];
}

/**
 * Execute the Translation Notes Agent
 */
export async function executeNotesAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'notes', task: task.task });

	// Filter to only notes tools
	const notesTools = availableTools.filter((t) => NOTES_AGENT_TOOLS.includes(t.function.name));

	if (notesTools.length === 0) {
		emit('agent:error', { agent: 'notes', error: 'fetch_translation_notes tool not available' });
		return {
			agent: 'notes',
			success: false,
			findings: null,
			summary: 'Failed: fetch_translation_notes tool not available',
			citations: [],
			confidence: 0,
			error: 'fetch_translation_notes tool not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: NOTES_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through what you need to do, then call the appropriate tool.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
			messages,
			tools: notesTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'notes', delta: result.response });
		}

		// Handle tool calls - support both OpenAI and Workers AI formats
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];

			// Workers AI format: { name, arguments: object }
			// OpenAI format: { function: { name, arguments: string } }
			const toolName = toolCall.function?.name || (toolCall as unknown as { name?: string }).name;
			const rawArgs =
				toolCall.function?.arguments || (toolCall as unknown as { arguments?: unknown }).arguments;
			const toolArgs =
				typeof rawArgs === 'string' ? JSON.parse(rawArgs) : (rawArgs as Record<string, unknown>);

			if (!toolName) {
				emit('agent:error', { agent: 'notes', error: 'Could not determine tool name' });
				return {
					agent: 'notes',
					success: false,
					findings: null,
					summary: 'Failed: Could not parse tool call',
					citations: [],
					confidence: 0,
					error: 'Could not parse tool call'
				};
			}

			emit('agent:tool:start', { agent: 'notes', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract reference for citations
			const reference = toolArgs.reference || task.task;

			// Create preview
			const preview = createNotesPreview(toolResult);
			emit('agent:tool:result', { agent: 'notes', tool: toolName, preview });

			// Extract citations
			const citations = extractNotesCitations(toolResult, reference);

			// Simple content check - LLM will understand the content
			const content = extractRawContent(toolResult);
			const hasContent = content.length > 100 && !content.toLowerCase().includes('not found');
			const summary = hasContent
				? `Retrieved notes for ${reference}`
				: `No notes found for ${reference}`;

			emit('agent:summary', { agent: 'notes', summary, success: hasContent });

			return {
				agent: 'notes',
				success: hasContent,
				findings: content, // RAW TEXT, not MCP wrapper
				summary,
				citations,
				confidence: hasContent ? 0.85 : 0.3
			};
		}

		// No tool calls
		emit('agent:error', { agent: 'notes', error: 'No tool call made' });
		return {
			agent: 'notes',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'notes', error: errorMsg });
		return {
			agent: 'notes',
			success: false,
			findings: null,
			summary: `Failed: ${errorMsg}`,
			citations: [],
			confidence: 0,
			error: errorMsg
		};
	}
}

/**
 * Create a preview string from notes result - SIMPLE
 */
function createNotesPreview(result: unknown): string {
	const content = extractRawContent(result);
	if (!content) return 'No content';
	return content.length > 100 ? 'Notes content retrieved' : 'No notes found';
}
