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

### Formatting Options
- includeVerseNumbers: true/false (default: true)
- format: "text" (plain) or "json" (structured)
- includeAlignment: true for Greek/Hebrew word alignment (advanced)

### Common Failures & Solutions
- "404 Not Found": Book name may be misspelled or translation unavailable
- Empty response: Reference may be out of range (e.g., "Jude 2" doesn't exist)
- For non-English: Set language parameter (e.g., "es" for Spanish)

## YOUR TASK
When given a task, determine the exact parameters needed and call fetch_scripture.
Think through what reference and options are needed, then make the tool call.

## THINKING FORMAT
Before calling the tool, briefly explain what you're doing:
"I need to fetch [reference] in [translation(s)]. Using parameters: ..."

Then call the fetch_scripture tool with appropriate parameters.`;

/**
 * Tools available to the Scripture Agent
 */
export const SCRIPTURE_AGENT_TOOLS: string[] = ['fetch_scripture'];

/**
 * Extract scripture-specific citations from tool result
 */
function extractScriptureCitations(result: unknown, reference: string): Citation[] {
	const citations: Citation[] = [];

	if (!result || typeof result !== 'object') {
		return citations;
	}

	const data = result as Record<string, unknown>;

	// Handle content array format (MCP response)
	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			const text = textContent.text as string;

			// Try to parse as JSON first
			try {
				const parsed = JSON.parse(text);
				if (parsed.scriptures && Array.isArray(parsed.scriptures)) {
					for (const scripture of parsed.scriptures) {
						citations.push({
							source: scripture.translation || 'ULT',
							reference: scripture.reference || reference,
							content: scripture.text || ''
						});
					}
				} else if (parsed.text) {
					citations.push({
						source: parsed.translation || 'ULT',
						reference: reference,
						content: parsed.text
					});
				}
			} catch {
				// Plain text response - likely multiple translations separated by newlines
				const lines = text.split('\n\n');
				for (const line of lines) {
					const match = line.match(/^(ULT|UST|[A-Z]+):\s*(.+)/s);
					if (match) {
						citations.push({
							source: match[1],
							reference: reference,
							content: match[2].trim()
						});
					} else if (line.trim()) {
						citations.push({
							source: 'Scripture',
							reference: reference,
							content: line.trim()
						});
					}
				}
			}
		}
	}

	return citations;
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

			return {
				agent: 'scripture',
				success: true,
				findings: toolResult,
				summary,
				citations,
				confidence: citations.length > 0 ? 0.9 : 0.5
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
