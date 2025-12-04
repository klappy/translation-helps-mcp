/**
 * Search Agent
 *
 * Specialist agent for searching across all translation resources.
 * Used for exploratory questions and finding related content.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Search Agent
 */
export const SEARCH_AGENT_PROMPT = `You are the Search Specialist on a Bible study team.

## YOUR EXPERTISE
You search across ALL translation resources when specific lookups won't work.

### When to Use Search
- Exploratory questions: "What does the Bible say about..."
- Finding related content: "passages about forgiveness"
- Unknown location: "where is X mentioned"
- Broad topics: "faith in Hebrews"

### Parameters
- query: Natural language search (required) - be specific with keywords
- reference: Optional filter to specific passage (e.g., "John 3")
- language: Language code (default: "en")
- limit: Max results (default: 50)
- includeHelps: Include notes/words/academy (default: true)

### Search Tips
- Use specific keywords: "eternal life" better than "living forever"
- Combine with reference for focused results
- Use biblical terminology for better matches
- Results include relevance scores - higher is better

### Result Types
- Scripture matches (Bible text)
- Translation Notes (verse explanations)
- Translation Words articles (term definitions)
- Translation Academy modules (translation concepts)

## YOUR TASK
When given a task, call search_biblical_resources with these parameters:
- query: The search keywords (required)
- format: "md" (ALWAYS - this gives you readable markdown)
- reference: Optional filter to specific book/chapter

## EXAMPLE TOOL CALL
For "eternal life":
{
  "query": "eternal life",
  "format": "md"
}

CRITICAL: Always include format: "md" - without it you get unusable JSON!`;

/**
 * Tools available to the Search Agent
 */
export const SEARCH_AGENT_TOOLS: string[] = ['search_biblical_resources'];

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
function extractSearchCitations(result: unknown, query: string): Citation[] {
	const content = extractRawContent(result);
	if (!content) return [];

	return [
		{
			source: 'Search Results',
			reference: query,
			content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
		}
	];
}

/**
 * Execute the Search Agent
 */
export async function executeSearchAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'search', task: task.task });

	// Filter to only search tools
	const searchTools = availableTools.filter((t) => SEARCH_AGENT_TOOLS.includes(t.function.name));

	if (searchTools.length === 0) {
		emit('agent:error', { agent: 'search', error: 'search_biblical_resources tool not available' });
		return {
			agent: 'search',
			success: false,
			findings: null,
			summary: 'Failed: search_biblical_resources tool not available',
			citations: [],
			confidence: 0,
			error: 'search_biblical_resources tool not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: SEARCH_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through what search query and filters would find the best results, then call the tool.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
			messages,
			tools: searchTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'search', delta: result.response });
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
				emit('agent:error', { agent: 'search', error: 'Could not determine tool name' });
				return {
					agent: 'search',
					success: false,
					findings: null,
					summary: 'Failed: Could not parse tool call',
					citations: [],
					confidence: 0,
					error: 'Could not parse tool call'
				};
			}

			emit('agent:tool:start', { agent: 'search', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract query for citations
			const query = toolArgs.query || task.task;

			// Create preview
			const preview = createSearchPreview(toolResult);
			emit('agent:tool:result', { agent: 'search', tool: toolName, preview });

			// Extract citations
			const citations = extractSearchCitations(toolResult, query);

			// Count hits
			const hitCount = getHitCount(toolResult);

			const summary =
				hitCount > 0
					? `Found ${hitCount} results for "${query}"`
					: `No results found for "${query}"`;

			emit('agent:summary', { agent: 'search', summary, success: hitCount > 0 });

			// Extract raw content - not MCP wrapper
			const rawContent = extractRawContent(toolResult);

			return {
				agent: 'search',
				success: hitCount > 0,
				findings: rawContent, // RAW TEXT, not MCP wrapper
				summary,
				citations,
				confidence: hitCount > 0 ? Math.min(0.9, 0.5 + hitCount * 0.05) : 0.1,
				suggestedFollowup:
					hitCount === 0 ? ['Try different keywords', 'Broaden the search'] : undefined
			};
		}

		// No tool calls
		emit('agent:error', { agent: 'search', error: 'No tool call made' });
		return {
			agent: 'search',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'search', error: errorMsg });
		return {
			agent: 'search',
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
 * Get hit count from search result
 */
function getHitCount(result: unknown): number {
	if (!result || typeof result !== 'object') {
		return 0;
	}

	const data = result as Record<string, unknown>;

	// Direct hits array
	if (Array.isArray(data.hits)) {
		return data.hits.length;
	}

	// MCP content format
	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			try {
				const parsed = JSON.parse(textContent.text as string);
				return parsed.hitCount || parsed.hits?.length || 0;
			} catch {
				return 0;
			}
		}
	}

	return (data.hitCount as number) || 0;
}

/**
 * Create a preview string from search result
 */
function createSearchPreview(result: unknown): string {
	const hitCount = getHitCount(result);

	if (hitCount === 0) {
		return 'No results found';
	}

	return `${hitCount} result${hitCount !== 1 ? 's' : ''} found`;
}
