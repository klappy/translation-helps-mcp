/**
 * Translation Words Agent
 *
 * Specialist agent for fetching definitions and articles about biblical terms.
 * Knows about categories (kt, names, other) and language limitations.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from '../types.js';
import type { AgentTask, AgentResponse, ToolExecutor, StreamEmitter, Citation } from './types.js';

/**
 * System prompt for the Translation Words Agent
 */
export const WORDS_AGENT_PROMPT = `You are the Translation Words Specialist on a Bible study team.

## YOUR EXPERTISE
You fetch definitions and articles about biblical terms, names, people, and places.

### Categories
- **kt** (Key Terms): Theological concepts like "grace", "faith", "salvation", "covenant"
- **names**: People and places like "Abraham", "Jerusalem", "Moses", "Israel"
- **other**: Common terms like "bread", "water", "house"

### Lookup Methods
1. **By term** (preferred): term: "love" - searches for the English term
2. **By path**: path: "bible/kt/grace.md" - exact file path
3. **By RC link**: rcLink: "rc://*/tw/dict/bible/kt/love" - resource container link
4. **By reference**: reference: "John 3:16" - gets words linked to that verse

### CRITICAL: Language Limitations
- Translation Words uses ENGLISH terms only
- Greek/Hebrew terms (agape, hesed, logos) will NOT be found
- If asked about Greek/Hebrew, translate to English first:
  - "agape" → search for "love"
  - "hesed" → search for "covenant" or "faithfulness"
  - "logos" → search for "word"
  - "pneuma" → search for "spirit"
  - "sarx" → search for "flesh"
  - "kardia" → search for "heart"

### Browsing
- Use browse_translation_words to see all available terms in a category
- Helpful when unsure of exact term name

## YOUR TASK
When given a task, determine the best lookup method and call fetch_translation_word.
If asked about a Greek/Hebrew term, translate it to English first.

## THINKING FORMAT
Before calling the tool, briefly explain what you're doing:
"Looking up [term] - this is in the [category] category. Using term lookup..."

Then call the fetch_translation_word tool with appropriate parameters.`;

/**
 * Tools available to the Words Agent
 */
export const WORDS_AGENT_TOOLS: string[] = [
	'fetch_translation_word',
	'fetch_translation_word_links'
];

/**
 * Extract words-specific citations from tool result
 */
function extractWordsCitations(result: unknown, term: string): Citation[] {
	const citations: Citation[] = [];

	if (!result || typeof result !== 'object') {
		return citations;
	}

	const data = result as Record<string, unknown>;

	// Handle MCP content format
	if (Array.isArray(data.content)) {
		const textContent = data.content.find((c: { type: string }) => c.type === 'text');
		if (textContent && typeof textContent === 'object' && 'text' in textContent) {
			try {
				const parsed = JSON.parse(textContent.text as string);
				if (parsed.articles && Array.isArray(parsed.articles)) {
					for (const article of parsed.articles) {
						citations.push({
							source: 'Translation Words',
							reference: article.term || article.id || term,
							content:
								article.markdown?.substring(0, 200) ||
								article.content?.substring(0, 200) ||
								'Article content'
						});
					}
				}
			} catch {
				// Plain text response
				citations.push({
					source: 'Translation Words',
					reference: term,
					content: (textContent.text as string).substring(0, 200)
				});
			}
		}
	}

	// Handle direct articles format
	if (data.articles && Array.isArray(data.articles)) {
		for (const article of data.articles) {
			if (article && typeof article === 'object') {
				const articleObj = article as Record<string, unknown>;
				citations.push({
					source: 'Translation Words',
					reference: (articleObj.term as string) || (articleObj.id as string) || term,
					content: (
						(articleObj.markdown as string) ||
						(articleObj.content as string) ||
						''
					).substring(0, 200)
				});
			}
		}
	}

	// Handle translation word links format
	if (data.translationWordLinks && Array.isArray(data.translationWordLinks)) {
		citations.push({
			source: 'Translation Word Links',
			reference: term,
			content: `${data.translationWordLinks.length} linked terms found`
		});
	}

	return citations;
}

/**
 * Execute the Translation Words Agent
 */
export async function executeWordsAgent(
	ai: AIBinding,
	task: AgentTask,
	availableTools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	emit('agent:start', { agent: 'words', task: task.task });

	// Filter to only words tools
	const wordsTools = availableTools.filter((t) => WORDS_AGENT_TOOLS.includes(t.function.name));

	if (wordsTools.length === 0) {
		emit('agent:error', { agent: 'words', error: 'Translation word tools not available' });
		return {
			agent: 'words',
			success: false,
			findings: null,
			summary: 'Failed: Translation word tools not available',
			citations: [],
			confidence: 0,
			error: 'Translation word tools not available'
		};
	}

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: WORDS_AGENT_PROMPT },
		{
			role: 'user',
			content: `Task: ${task.task}\n\nThink through what you need to do, then call the appropriate tool. Remember: if this is a Greek/Hebrew term, translate it to English first.`
		}
	];

	try {
		// Call LLM to decide tool parameters
		const result = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
			messages,
			tools: wordsTools,
			tool_choice: 'required'
		});

		// Stream thinking if there's text response
		if (result.response) {
			emit('agent:thinking', { agent: 'words', delta: result.response });
		}

		// Handle tool calls
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];
			const toolName = toolCall.function.name;
			const toolArgs = JSON.parse(toolCall.function.arguments);

			emit('agent:tool:start', { agent: 'words', tool: toolName, args: toolArgs });

			// Execute the tool
			const toolResult = await executeToolFn(toolName, toolArgs);

			// Extract term for citations
			const term = toolArgs.term || toolArgs.reference || task.task;

			// Create preview
			const preview = createWordsPreview(toolResult);
			emit('agent:tool:result', { agent: 'words', tool: toolName, preview });

			// Extract citations
			const citations = extractWordsCitations(toolResult, term);

			// Check for articles
			const hasContent = citations.length > 0;

			const summary = hasContent
				? `Found article(s) for "${term}"`
				: `No article found for "${term}"`;

			emit('agent:summary', { agent: 'words', summary, success: hasContent });

			return {
				agent: 'words',
				success: hasContent,
				findings: toolResult,
				summary,
				citations,
				confidence: hasContent ? 0.9 : 0.2,
				suggestedFollowup: hasContent
					? undefined
					: ['Try a different English term', 'Search for related concepts']
			};
		}

		// No tool calls
		emit('agent:error', { agent: 'words', error: 'No tool call made' });
		return {
			agent: 'words',
			success: false,
			findings: null,
			summary: 'Failed: Agent did not call any tools',
			citations: [],
			confidence: 0,
			error: 'No tool call made'
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		emit('agent:error', { agent: 'words', error: errorMsg });
		return {
			agent: 'words',
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
 * Create a preview string from words result
 */
function createWordsPreview(result: unknown): string {
	if (!result || typeof result !== 'object') {
		return 'No content';
	}

	const data = result as Record<string, unknown>;

	if (Array.isArray(data.articles) && data.articles.length > 0) {
		return `Found ${data.articles.length} article(s)`;
	}

	if (Array.isArray(data.translationWordLinks)) {
		return `${data.translationWordLinks.length} word links found`;
	}

	if (Array.isArray(data.content)) {
		return 'Article content retrieved';
	}

	return 'Translation word lookup complete';
}
