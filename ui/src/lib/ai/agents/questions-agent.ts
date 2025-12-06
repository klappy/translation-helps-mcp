/**
 * Translation Questions Agent
 *
 * Specialist agent for fetching comprehension questions.
 * Helps translators verify understanding of the passage.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Translation Questions Agent
 */
export const QUESTIONS_AGENT_PROMPT = `You are the Translation Questions Specialist on a Bible study team.

## YOUR EXPERTISE
You fetch comprehension questions that help translators verify their understanding of a passage.

### What Translation Questions Contain
- **Comprehension questions**: Questions to verify understanding of the passage meaning
- **Answer guidance**: Expected answers that show correct understanding
- **Reference**: The verse or passage being questioned

### Parameters
- reference: Bible reference (required) - "John 3:16", "Romans 8:1-4", "Genesis 1"
- language: Language code (default: "en") - ALWAYS include this parameter
- format: Output format - ALWAYS use "md" (markdown) for LLM-friendly output

### IMPORTANT
You MUST always include these parameters when calling the tool:
- reference (required)
- language: "en" (always include this)
- format: "md" (ALWAYS use markdown format - it's optimized for LLMs)

### Use Cases
- When users ask "What questions should I consider for X?"
- When users want to verify understanding of a passage
- When checking comprehension before translating
- When preparing teaching or study materials

## YOUR TASK
When given a task, determine the exact parameters needed and call fetch_translation_questions.
Think through what reference is needed, then make the tool call.

## THINKING FORMAT
Before calling the tool, briefly explain what you're doing:
"I need to fetch comprehension questions for [reference]..."

Then call the fetch_translation_questions tool with appropriate parameters.`;

/**
 * Tools available to the Questions Agent
 */
export const QUESTIONS_AGENT_TOOLS: string[] = ['fetch_translation_questions'];

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
 * Create citations from questions result
 */
function extractQuestionsCitations(result: unknown, reference: string): Citation[] {
	const content = extractRawContent(result);
	if (!content) return [];

	return [
		{
			source: 'Translation Questions',
			reference,
			content: content.substring(0, 500) + (content.length > 500 ? '...' : '')
		}
	];
}

/**
 * Execute the Translation Questions Agent
 */
export async function executeQuestionsAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'questions', task: task.task });

	// Filter to only questions tools
	const questionsTools = availableTools.filter((t) =>
		QUESTIONS_AGENT_TOOLS.includes(t.function.name)
	);

	if (questionsTools.length === 0) {
		emit('agent:error', {
			agent: 'questions',
			error: 'fetch_translation_questions tool not available'
		});
		return {
			agent: 'questions',
			success: false,
			findings: null,
			summary: 'Failed: fetch_translation_questions tool not available',
			citations: [],
			confidence: 0,
			error: 'fetch_translation_questions tool not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: QUESTIONS_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through what you need to do, then call the appropriate tool.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
			messages,
			tools: questionsTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'questions', delta: result.response });
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
				emit('agent:error', { agent: 'questions', error: 'Could not determine tool name' });
				return {
					agent: 'questions',
					success: false,
					findings: null,
					summary: 'Failed: Could not parse tool call',
					citations: [],
					confidence: 0,
					error: 'Could not parse tool call'
				};
			}

			emit('agent:tool:start', { agent: 'questions', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract reference for citations
			const reference = (toolArgs.reference as string) || task.task;

			// Create preview
			const preview = createQuestionsPreview(toolResult);
			emit('agent:tool:result', { agent: 'questions', tool: toolName, preview });

			// Extract citations
			const citations = extractQuestionsCitations(toolResult, reference);

			// Simple content check - LLM will understand the content
			const content = extractRawContent(toolResult);
			const hasContent = content.length > 50 && !content.toLowerCase().includes('not found');
			const summary = hasContent
				? `Retrieved comprehension questions for ${reference}`
				: `No questions found for ${reference}`;

			emit('agent:summary', { agent: 'questions', summary, success: hasContent });

			return {
				agent: 'questions',
				success: hasContent,
				findings: content, // RAW TEXT, not MCP wrapper
				summary,
				citations,
				confidence: hasContent ? 0.85 : 0.3
			};
		}

		// No tool calls
		emit('agent:error', { agent: 'questions', error: 'No tool call made' });
		return {
			agent: 'questions',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'questions', error: errorMsg });
		return {
			agent: 'questions',
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
 * Create a preview string from questions result
 */
function createQuestionsPreview(result: unknown): string {
	const content = extractRawContent(result);
	if (!content) return 'No content';

	// Count questions if possible
	const questionMatches = content.match(/\?/g);
	const questionCount = questionMatches?.length || 0;

	if (questionCount > 0) {
		return `${questionCount} comprehension question${questionCount > 1 ? 's' : ''} retrieved`;
	}
	return content.length > 50 ? 'Questions content retrieved' : 'No questions found';
}
