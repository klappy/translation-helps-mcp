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

### Content Categories
- **translate**: Translation techniques and principles
  - figs-metaphor (metaphors)
  - figs-simile (similes)
  - figs-idiom (idioms)
  - figs-rquestion (rhetorical questions)
  - figs-personification (personification)
  - figs-parallelism (parallelism)
  - writing-poetry (poetry)
  - grammar-connect-logic-result (result clauses)
  
- **checking**: Quality checking procedures
- **process**: Translation process guidelines
- **intro**: Introduction to translation

### Module ID Format
- Use lowercase with hyphens: "figs-metaphor", "writing-poetry"
- Common prefixes: figs- (figures of speech), writing- (writing styles), grammar- (grammar topics)

### Parameters
- moduleId: The academy module to fetch (e.g., "figs-metaphor")
- path: Direct path to module file
- rcLink: RC link format "rc://*/ta/man/translate/figs-metaphor"

## YOUR TASK
When given a task about translation concepts, determine the appropriate module and fetch it.
Think through which module best matches the question.

## THINKING FORMAT
Before calling the tool, briefly explain what you're doing:
"This question is about [concept]. The relevant Translation Academy module is [moduleId]..."

Then call the fetch_translation_academy tool with the moduleId.`;

/**
 * Tools available to the Academy Agent
 */
export const ACADEMY_AGENT_TOOLS: string[] = ['fetch_translation_academy'];

/**
 * Extract academy-specific citations from tool result
 */
function extractAcademyCitations(result: unknown, moduleId: string): Citation[] {
	const citations: Citation[] = [];

	if (!result || typeof result !== 'object') {
		return citations;
	}

	const data = result as Record<string, unknown>;

	// Handle direct module content
	if (data.content && typeof data.content === 'string') {
		citations.push({
			source: 'Translation Academy',
			reference: (data.title as string) || moduleId,
			content: data.content.substring(0, 300)
		});
	}

	// Handle modules array format
	if (data.modules && Array.isArray(data.modules)) {
		for (const module of data.modules) {
			if (module && typeof module === 'object') {
				const modObj = module as Record<string, unknown>;
				citations.push({
					source: 'Translation Academy',
					reference: (modObj.title as string) || (modObj.id as string) || moduleId,
					content: ((modObj.markdown as string) || (modObj.content as string) || '').substring(
						0,
						300
					)
				});
			}
		}
	}

	return citations;
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
		const result = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
			messages,
			tools: academyTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'academy', delta: result.response });
		}

		// Handle tool calls
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];
			const toolName = toolCall.function.name;
			const toolArgs = JSON.parse(toolCall.function.arguments);

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

			return {
				agent: 'academy',
				success: !!hasContent,
				findings: toolResult,
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
