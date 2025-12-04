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
- reference: Bible reference (required) - "John 3:16", "Romans 8:1-4"
- includeIntro: true/false - Include book/chapter introductions (default: true)
- includeContext: true/false - Include notes from surrounding verses (default: true)

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
 * Extract notes-specific citations from tool result
 */
function extractNotesCitations(result: unknown, reference: string): Citation[] {
	const citations: Citation[] = [];

	if (!result || typeof result !== 'object') {
		return citations;
	}

	const data = result as Record<string, unknown>;

	// Handle verse notes
	if (data.verseNotes && Array.isArray(data.verseNotes)) {
		for (const note of data.verseNotes.slice(0, 5)) {
			// Limit to first 5
			if (note && typeof note === 'object') {
				const noteObj = note as Record<string, unknown>;
				citations.push({
					source: 'Translation Notes',
					reference: (noteObj.Reference as string) || reference,
					content: `"${noteObj.Quote || ''}" - ${noteObj.Note || ''}`
				});
			}
		}
	}

	// Handle context notes
	if (data.contextNotes && Array.isArray(data.contextNotes) && data.contextNotes.length > 0) {
		citations.push({
			source: 'Translation Notes (Context)',
			reference: reference,
			content: `${data.contextNotes.length} contextual notes available`
		});
	}

	return citations;
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
		const result = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
			messages,
			tools: notesTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'notes', delta: result.response });
		}

		// Handle tool calls
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];
			const toolName = toolCall.function.name;
			const toolArgs = JSON.parse(toolCall.function.arguments);

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

			// Count notes
			const data = toolResult as Record<string, unknown>;
			const verseNotesCount = Array.isArray(data.verseNotes) ? data.verseNotes.length : 0;
			const contextNotesCount = Array.isArray(data.contextNotes) ? data.contextNotes.length : 0;
			const totalNotes = verseNotesCount + contextNotesCount;

			const summary =
				totalNotes > 0
					? `Found ${verseNotesCount} verse notes and ${contextNotesCount} context notes for ${reference}`
					: `No notes found for ${reference}`;

			emit('agent:summary', { agent: 'notes', summary, success: totalNotes > 0 });

			return {
				agent: 'notes',
				success: totalNotes > 0,
				findings: toolResult,
				summary,
				citations,
				confidence: totalNotes > 0 ? 0.85 : 0.3
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
 * Create a preview string from notes result
 */
function createNotesPreview(result: unknown): string {
	if (!result || typeof result !== 'object') {
		return 'No content';
	}

	const data = result as Record<string, unknown>;

	const verseNotesCount = Array.isArray(data.verseNotes) ? data.verseNotes.length : 0;
	const contextNotesCount = Array.isArray(data.contextNotes) ? data.contextNotes.length : 0;

	if (verseNotesCount === 0 && contextNotesCount === 0) {
		return 'No notes found';
	}

	return `${verseNotesCount} verse notes, ${contextNotesCount} context notes`;
}
