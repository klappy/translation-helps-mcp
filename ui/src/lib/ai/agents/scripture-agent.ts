/**
 * Scripture Agent
 *
 * Specialist agent for fetching Bible text in various translations.
 * Knows ULT, UST, reference formats, and formatting options.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Scripture Agent
 */
export const SCRIPTURE_AGENT_PROMPT = `You are the Scripture Specialist on a Bible study team.

## YOUR EXPERTISE
You are the ONLY team member who fetches Bible text. You know:

### Available Translations
- **ULT** (Unfoldingword Literal Text): Word-for-word literal translation
- **UST** (Unfoldingword Simplified Text): Meaning-based, easier to understand
- Use resource: "all" to get both, or "ult" / "ust" for specific

### Reference Formats
- Single verse: "John 3:16"
- Verse range: "Genesis 1:1-3"  
- Full chapter: "Matthew 5"
- Book abbreviations work: "Gen", "Matt", "1Cor"

### Parameters (REQUIRED)
- reference: Bible reference (required) - "John 3:16", "Genesis 1:1-3"
- format: "md" (ALWAYS use "md" for markdown output - this is REQUIRED)
- resource: "all" for all translations, or "ult", "ust" for specific
- includeVerseNumbers: true/false (default: true)
- language: "en" for English (default)

### Common Failures & Solutions
- "404 Not Found": Book name may be misspelled or translation unavailable
- Empty response: Reference may be out of range (e.g., "Jude 2" doesn't exist)
- For non-English: Set language parameter (e.g., "es" for Spanish)

## YOUR TASK
When given a task, call fetch_scripture with these REQUIRED parameters:
- reference: The Bible reference from the task
- format: "md" (ALWAYS - this gives you readable markdown)
- resource: "all" or specific translation

## EXAMPLE TOOL CALL
For "John 3:16", call fetch_scripture with:
{
  "reference": "John 3:16",
  "format": "md",
  "resource": "all"
}

CRITICAL: Always include format: "md" - without it you get unusable JSON!`;

/**
 * Tools available to the Scripture Agent
 */
export const SCRIPTURE_AGENT_TOOLS: string[] = ['fetch_scripture'];

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
function extractScriptureCitations(result: unknown, reference: string): Citation[] {
	const content = extractRawContent(result);
	if (!content) return [];

	// Just pass through - the synthesizer LLM will read the markdown
	return [
		{
			source: 'Scripture',
			reference,
			content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
		}
	];
}

/**
 * Execute the Scripture Agent
 */
export async function executeScriptureAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'scripture', task: task.task });

	// Filter to only scripture tools
	const scriptureTools = availableTools.filter((t) =>
		SCRIPTURE_AGENT_TOOLS.includes(t.function.name)
	);

	if (scriptureTools.length === 0) {
		emit('agent:error', { agent: 'scripture', error: 'fetch_scripture tool not available' });
		return {
			agent: 'scripture',
			success: false,
			findings: null,
			summary: 'Failed: fetch_scripture tool not available',
			citations: [],
			confidence: 0,
			error: 'fetch_scripture tool not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: SCRIPTURE_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through what you need to do, then call the appropriate tool.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
			messages,
			tools: scriptureTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'scripture', delta: result.response });
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
				emit('agent:error', { agent: 'scripture', error: 'Could not determine tool name' });
				return {
					agent: 'scripture',
					success: false,
					findings: null,
					summary: 'Failed: Could not parse tool call',
					citations: [],
					confidence: 0,
					error: 'Could not parse tool call'
				};
			}

			emit('agent:tool:start', { agent: 'scripture', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract reference for citations
			const reference = toolArgs.reference || task.task;

			// Create preview
			const preview = createScripturePreview(toolResult);
			emit('agent:tool:result', { agent: 'scripture', tool: toolName, preview });

			// Extract citations
			const citations = extractScriptureCitations(toolResult, reference);

			const summary =
				citations.length > 0
					? `Retrieved ${citations.length} translation(s) for ${reference}`
					: `Fetched scripture for ${reference}`;

			emit('agent:summary', { agent: 'scripture', summary, success: true });

			// Pass the RAW TEXT as findings - not the MCP wrapper!
			// The synthesizer LLM will read this directly
			const rawContent = extractRawContent(toolResult);

			return {
				agent: 'scripture',
				success: true,
				findings: rawContent, // RAW TEXT, not MCP wrapper
				summary,
				citations,
				confidence: rawContent.length > 100 ? 0.9 : 0.5
			};
		}

		// No tool calls - something went wrong
		emit('agent:error', { agent: 'scripture', error: 'No tool call made' });
		return {
			agent: 'scripture',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'scripture', error: errorMsg });
		return {
			agent: 'scripture',
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
 * Create a preview string from scripture result
 */
function createScripturePreview(result: unknown): string {
	if (!result || typeof result !== 'object') {
		return 'No content';
	}

	const data = result as Record<string, unknown>;

	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			const text = (textContent.text as string).substring(0, 150);
			return text + (text.length >= 150 ? '...' : '');
		}
	}

	return 'Scripture fetched';
}
