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
- includeIntro: true/false - Include book/chapter introductions (default: true)
- includeContext: true/false - Include notes from surrounding verses (default: true)

### IMPORTANT
You MUST always include these parameters when calling the tool:
- reference (required)
- language: "en" (always include this)

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
 * Parse MCP content format to get actual data
 */
function parseMCPContent(result: unknown): Record<string, unknown> | null {
	if (!result || typeof result !== 'object') {
		return null;
	}

	const data = result as Record<string, unknown>;

	// Handle MCP content format (array with text content)
	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			try {
				return JSON.parse(textContent.text as string);
			} catch {
				// Not JSON, return the raw text as content
				return { rawText: textContent.text };
			}
		}
	}

	// Already in direct format
	return data;
}

/**
 * Extract notes-specific citations from tool result
 */
function extractNotesCitations(result: unknown, reference: string): Citation[] {
	const citations: Citation[] = [];

	const data = parseMCPContent(result);
	if (!data) {
		return citations;
	}

	// The MCP tool returns notes in an "items" array
	// Each item has: Reference, ID, Quote, Note, etc.
	if (data.items && Array.isArray(data.items)) {
		for (const note of data.items.slice(0, 5)) {
			// Limit to first 5
			if (note && typeof note === 'object') {
				const noteObj = note as Record<string, unknown>;
				const noteRef = (noteObj.Reference as string) || reference;
				const noteText = (noteObj.Note as string) || '';
				const quote = (noteObj.Quote as string) || '';

				// Clean up the note text (remove markdown formatting for preview)
				const cleanNote = noteText.replace(/\\n/g, ' ').replace(/[#*]/g, '').substring(0, 150);

				citations.push({
					source: 'Translation Notes',
					reference: noteRef,
					content: quote ? `"${quote}" - ${cleanNote}` : cleanNote
				});
			}
		}
	}

	// Fallback: Handle verse notes (legacy format)
	if (data.verseNotes && Array.isArray(data.verseNotes)) {
		for (const note of data.verseNotes.slice(0, 5)) {
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

	// Fallback: Handle notes (alternative key)
	if (data.notes && Array.isArray(data.notes)) {
		for (const note of data.notes.slice(0, 5)) {
			if (note && typeof note === 'object') {
				const noteObj = note as Record<string, unknown>;
				citations.push({
					source: 'Translation Notes',
					reference: (noteObj.reference as string) || reference,
					content:
						(noteObj.note as string) ||
						(noteObj.content as string) ||
						(noteObj.text as string) ||
						''
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

			// Count notes - parse MCP content first
			// The MCP tool returns notes in an "items" array
			const parsedData = parseMCPContent(toolResult);
			const itemsCount =
				parsedData && Array.isArray(parsedData.items) ? parsedData.items.length : 0;
			const verseNotesCount = parsedData
				? Array.isArray(parsedData.verseNotes)
					? parsedData.verseNotes.length
					: Array.isArray(parsedData.notes)
						? parsedData.notes.length
						: 0
				: 0;
			const contextNotesCount =
				parsedData && Array.isArray(parsedData.contextNotes) ? parsedData.contextNotes.length : 0;
			const totalNotes = itemsCount || verseNotesCount + contextNotesCount;

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
	const data = parseMCPContent(result);
	if (!data) {
		return 'No content';
	}

	// The MCP tool returns notes in an "items" array
	const itemsCount = Array.isArray(data.items) ? data.items.length : 0;
	if (itemsCount > 0) {
		// Show a preview of the first note
		const firstItem = data.items[0] as Record<string, unknown>;
		const notePreview = ((firstItem?.Note as string) || '')
			.replace(/\\n/g, ' ')
			.replace(/[#*]/g, '')
			.substring(0, 50);
		return `${itemsCount} notes found. First: ${notePreview}...`;
	}

	const verseNotesCount = Array.isArray(data.verseNotes)
		? data.verseNotes.length
		: Array.isArray(data.notes)
			? data.notes.length
			: 0;
	const contextNotesCount = Array.isArray(data.contextNotes) ? data.contextNotes.length : 0;

	if (verseNotesCount === 0 && contextNotesCount === 0) {
		// Check for raw text content
		if (data.rawText) {
			const preview = (data.rawText as string).substring(0, 50);
			return `Content: ${preview}...`;
		}
		return 'No notes found';
	}

	return `${verseNotesCount} verse notes, ${contextNotesCount} context notes`;
}
