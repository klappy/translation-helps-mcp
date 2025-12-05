/**
 * Translation Academy Agent
 *
 * Specialist agent for fetching articles about translation concepts and techniques.
 * Knows about module IDs, categories, and translation methodology.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Translation Academy Agent
 */
export const ACADEMY_AGENT_PROMPT = `You are the Translation Academy Specialist on a Bible study team.

## YOUR EXPERTISE
You fetch training content and articles about translation concepts and techniques.

### KNOWN MODULE IDs (use these EXACT values)

**Figures of Speech (figs-):**
- figs-metaphor (metaphors, comparisons)
- figs-simile (similes, "like" or "as" comparisons)
- figs-idiom (idioms, expressions)
- figs-rquestion (rhetorical questions)
- figs-personification (personification)
- figs-parallelism (parallelism)
- figs-metonymy (metonymy, using associated name)
- figs-explicit (making implicit information explicit)
- figs-ellipsis (ellipsis, omitted words)
- figs-hyperbole (hyperbole, exaggeration)
- figs-irony (irony, sarcasm)
- figs-litotes (litotes, understatement)
- figs-euphemism (euphemism, mild expression)
- figs-merism (merism, extremes representing whole)
- figs-doublet (doublets, paired words)
- figs-activepassive (active/passive voice)
- figs-abstractnouns (abstract nouns)
- figs-possession (possession relationships)

**Writing Styles (writing-):**
- writing-poetry (poetry)
- writing-proverbs (proverbs)
- writing-apocalypticwriting (apocalyptic)

**Grammar (grammar-):**
- grammar-connect-logic-result (result clauses)
- grammar-connect-logic-goal (purpose clauses)
- grammar-connect-condition-fact (conditional: fact)
- grammar-connect-condition-hypothetical (conditional: hypothetical)
- grammar-connect-time-simultaneous (simultaneous time)
- grammar-connect-time-sequential (sequential time)

**Guidelines:**
- guidelines-sonofgodprinciples (Son of God translation)
- guidelines-authoritative (authoritative sources)

### Module ID Format
- Use lowercase with hyphens: "figs-metaphor", "writing-poetry"
- Common prefixes: figs- (figures of speech), writing- (writing styles), grammar- (grammar topics)
- If you're unsure of the exact module ID, use the closest match from the list above

### Parameters (REQUIRED)
- moduleId: The academy module to fetch (e.g., "figs-metaphor")
- format: "md" (ALWAYS use "md" for markdown output - this is REQUIRED)
- language: "en" for English (default)

## YOUR TASK
When given a task, extract the module ID and call fetch_translation_academy.

### If task contains a specific module ID:
- Use that EXACT module ID (e.g., "guidelines-sonofgodprinciples", "figs-metaphor")
- Don't modify or guess - use the ID as given

### If task describes a concept:
- Map to the appropriate module ID (e.g., "metaphors" → "figs-metaphor")

### Required parameters:
- moduleId: The academy module to fetch
- format: "md" (ALWAYS use "md" for markdown output)

## EXAMPLE TOOL CALLS

For "Show me the Translation Academy article on guidelines-sonofgodprinciples":
{
  "moduleId": "guidelines-sonofgodprinciples",
  "format": "md"
}

For a question about metaphors:
{
  "moduleId": "figs-metaphor",
  "format": "md"
}

CRITICAL: Always include format: "md" - without it you get unusable JSON!`;

/**
 * Tools available to the Academy Agent
 */
export const ACADEMY_AGENT_TOOLS: string[] = ['fetch_translation_academy'];

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
function extractAcademyCitations(result: unknown, moduleId: string): Citation[] {
	const content = extractRawContent(result);
	if (!content) return [];

	return [
		{
			source: 'Translation Academy',
			reference: moduleId,
			content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
		}
	];
}

/**
 * Execute the Translation Academy Agent
 */
export async function executeAcademyAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'academy', task: task.task });

	// Filter to only academy tools
	const academyTools = availableTools.filter((t) => ACADEMY_AGENT_TOOLS.includes(t.function.name));

	if (academyTools.length === 0) {
		emit('agent:error', {
			agent: 'academy',
			error: 'fetch_translation_academy tool not available'
		});
		return {
			agent: 'academy',
			success: false,
			findings: null,
			summary: 'Failed: fetch_translation_academy tool not available',
			citations: [],
			confidence: 0,
			error: 'fetch_translation_academy tool not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: ACADEMY_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through which Translation Academy module would be most relevant, then call the tool.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
			messages,
			tools: academyTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'academy', delta: result.response });
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
				emit('agent:error', { agent: 'academy', error: 'Could not determine tool name' });
				return {
					agent: 'academy',
					success: false,
					findings: null,
					summary: 'Failed: Could not parse tool call',
					citations: [],
					confidence: 0,
					error: 'Could not parse tool call'
				};
			}

			emit('agent:tool:start', { agent: 'academy', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract moduleId for citations
			const moduleId = toolArgs.moduleId || task.task;

			// Create preview
			const preview = createAcademyPreview(toolResult);
			emit('agent:tool:result', { agent: 'academy', tool: toolName, preview });

			// Extract citations
			const citations = extractAcademyCitations(toolResult, moduleId);

			// Check for content
			const hasContent = citations.length > 0 || (toolResult as Record<string, unknown>).content;

			const summary = hasContent
				? `Retrieved Translation Academy article on "${moduleId}"`
				: `No academy module found for "${moduleId}"`;

			emit('agent:summary', { agent: 'academy', summary, success: !!hasContent });

			// Extract raw content - not MCP wrapper
			const rawContent = extractRawContent(toolResult);

			return {
				agent: 'academy',
				success: !!hasContent,
				findings: rawContent, // RAW TEXT, not MCP wrapper
				summary,
				citations,
				confidence: hasContent ? 0.9 : 0.2
			};
		}

		// No tool calls
		emit('agent:error', { agent: 'academy', error: 'No tool call made' });
		return {
			agent: 'academy',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'academy', error: errorMsg });
		return {
			agent: 'academy',
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
 * Create a preview string from academy result
 */
function createAcademyPreview(result: unknown): string {
	if (!result || typeof result !== 'object') {
		return 'No content';
	}

	const data = result as Record<string, unknown>;

	if (data.title && data.content) {
		return `Article: ${data.title}`;
	}

	if (data.success === false) {
		return 'Module not found';
	}

	return 'Academy content retrieved';
}
