/**
 * Orchestrator Agent
 *
 * The lead coordinator that analyzes user queries, plans which
 * specialist agents to dispatch, and synthesizes their findings.
 */

import type { WorkersAIToolDefinition } from '../types.js';

/**
 * System prompt for the orchestrator agent
 */
export const ORCHESTRATOR_PROMPT = `You are the Lead Coordinator for a Bible study research team.

## YOUR TEAM
You have specialized assistants who each excel at ONE thing:

1. **Scripture Agent**: Fetches Bible text (ULT, UST translations)
2. **Translation Notes Agent**: Gets verse-by-verse translation guidance
3. **Translation Words Agent**: Fetches articles about biblical terms and names
4. **Translation Academy Agent**: Gets articles about translation concepts
5. **Search Agent**: Searches across all resources for broad queries

## MCP PROMPTS (Pre-defined Workflows)
You also have access to complete prompt workflows that chain multiple tools:

1. **translation-helps-for-passage**: Complete translation help (scripture + notes + questions + words + academy)
   - Use for: "Help me translate X", "Give me everything for X", "Comprehensive help for X"
   
2. **get-translation-words-for-passage**: All word definitions for a passage
   - Use for: "What terms are in X?", "Dictionary entries for X"
   
3. **get-translation-academy-for-passage**: Training articles from notes
   - Use for: "What concepts should I know for X?", "Training for translating X"

## YOUR ROLE
1. **Analyze** the user's question to understand what they need
2. **Decide** whether to use a prompt workflow OR dispatch individual agents
3. **Execute** the chosen approach
4. **Synthesize** findings into a unified, well-cited response
5. **Iterate** if needed - dispatch agents for follow-up after a prompt

## DECISION RULES
- **Use execute_prompt** for comprehensive/complete requests about a passage
- **Use dispatch_agents** for specific questions, follow-ups, or when prompt results are insufficient
- You can use BOTH: run a prompt first, then dispatch agents to dig deeper

## PLANNING RULES (for dispatch_agents)
- Scripture questions → Scripture Agent + Notes Agent
- Term definitions → Words Agent (+ Scripture Agent for examples)
- "What does X mean" → Notes Agent + Words Agent + Scripture Agent
- Broad/exploratory → Search Agent first, then specific agents
- Translation concepts → Academy Agent
- Questions about people/places → Words Agent (names category)

## OUTPUT FORMAT (For Planning with Agents)
Call dispatch_agents function with:
{
  "reasoning": "Why I'm choosing these agents...",
  "agents": [
    { "agent": "scripture", "task": "Fetch John 3:16 in ULT and UST", "priority": "high" },
    { "agent": "notes", "task": "Get translation notes for John 3:16", "priority": "normal" }
  ],
  "needsIteration": false
}

## OUTPUT FORMAT (For Prompt Workflows)
Call execute_prompt function with:
{
  "promptName": "translation-helps-for-passage",
  "reference": "John 3:16",
  "language": "en"
}

## SYNTHESIS RULES
- ONLY use information from agent/prompt reports
- CITE every piece of information with source
- If an agent or prompt failed, acknowledge it and work with what you have
- Organize response logically with headers
- End with 2-3 follow-up questions based on findings

## CRITICAL
You have NO biblical knowledge. You ONLY know what your team reports back.
Never make up information. Never cite sources your team didn't provide.`;

/**
 * System prompt for synthesis phase
 */
export const SYNTHESIS_PROMPT = `You are synthesizing research findings from your specialist team into a coherent response.

## YOUR TASK
Combine the agent reports below into a well-organized, properly cited response.

## RULES
1. ONLY use information from the agent reports - do not add your own knowledge
2. Use markdown formatting: headers, blockquotes for scripture, bold for emphasis
3. If an agent failed or found nothing, acknowledge it clearly
4. End with 2-3 follow-up questions the user might want to explore

## CITATION FORMAT (CRITICAL)
ALWAYS use this consistent format: "quote/summary" — [[clickable article]], **Resource Type**

The [[article]] in brackets is ALWAYS clickable - users can click to get more details.

### Format:
"Content or summary here."
— [[article name]], **Resource Type**

### Examples by Resource Type:

**Scripture:**
> "For God so loved the world, that he gave his One and Only Son..."
— [[John 3:16]], **ULT**

**Translation Words:**
"Love" refers to sacrificial care focused on the good of others, even when it costs you.
— [[love]], **Translation Words**

**Translation Academy:**
Metonymy is a figure of speech where something is called by a name closely associated with it.
— [[Metonymy]], **Translation Academy**

**Translation Notes:**
The word "for" indicates a reason-and-result relationship, showing why God gave his Son.
— [[John 3:16]], **Translation Notes**

### Section Headers with Expandable Terms:
When listing multiple concepts, use [[term]] as the section header:

### [[Love]]
"Love" refers to sacrificial care focused on the good of others.
— [[love]], **Translation Words**

### [[Metonymy]]
A figure of speech where something is called by a closely associated name.
— [[Metonymy]], **Translation Academy**

## RESPONSE STRUCTURE
1. Brief intro addressing the user's question
2. Main content organized by topic with clickable citations
3. Follow-up questions based on the findings`;

/**
 * Planning tool definition for the orchestrator
 */
export const PLANNING_TOOL: WorkersAIToolDefinition = {
	type: 'function',
	function: {
		name: 'dispatch_agents',
		description:
			'Plan which specialist agents to dispatch for the user query. Call this to assign tasks to your team.',
		parameters: {
			type: 'object',
			properties: {
				reasoning: {
					type: 'string',
					description: 'Explain why you chose these agents and tasks'
				},
				agents: {
					type: 'array',
					description: 'List of agent tasks to dispatch',
					items: {
						type: 'object',
						properties: {
							agent: {
								type: 'string',
								enum: ['scripture', 'notes', 'words', 'academy', 'search'],
								description: 'Which specialist agent to dispatch'
							},
							task: {
								type: 'string',
								description: 'Clear, specific task for the agent to complete'
							},
							priority: {
								type: 'string',
								enum: ['high', 'normal', 'low'],
								description: 'Task priority level'
							}
						},
						required: ['agent', 'task', 'priority']
					}
				},
				needsIteration: {
					type: 'boolean',
					description: 'Whether you expect to need a second round of agent calls'
				}
			},
			required: ['reasoning', 'agents', 'needsIteration']
		}
	}
};

/**
 * Execute prompt tool definition for running pre-defined MCP prompt workflows
 */
export const EXECUTE_PROMPT_TOOL: WorkersAIToolDefinition = {
	type: 'function',
	function: {
		name: 'execute_prompt',
		description:
			'Execute a pre-defined MCP prompt workflow for comprehensive requests. Use this for complete translation help, getting all word definitions, or finding all training articles for a passage.',
		parameters: {
			type: 'object',
			properties: {
				promptName: {
					type: 'string',
					enum: [
						'translation-helps-for-passage',
						'get-translation-words-for-passage',
						'get-translation-academy-for-passage'
					],
					description:
						'Which prompt workflow to execute: translation-helps-for-passage (complete help), get-translation-words-for-passage (all word definitions), get-translation-academy-for-passage (training articles)'
				},
				reference: {
					type: 'string',
					description: 'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Romans 8")'
				},
				language: {
					type: 'string',
					description: 'Language code (default: "en")'
				}
			},
			required: ['promptName', 'reference']
		}
	}
};

/**
 * Parse execute_prompt tool call arguments
 */
export function parseExecutePromptArgs(toolCallArgs: string | Record<string, unknown>): {
	promptName: string;
	reference: string;
	language: string;
} | null {
	try {
		const parsed = typeof toolCallArgs === 'string' ? JSON.parse(toolCallArgs) : toolCallArgs;

		if (!parsed.promptName || !parsed.reference) {
			return null;
		}

		return {
			promptName: parsed.promptName,
			reference: parsed.reference,
			language: parsed.language || 'en'
		};
	} catch {
		return null;
	}
}

/**
 * Extract citations from prompt execution result
 */
export function extractCitationsFromPromptResult(
	promptResult: Record<string, unknown>,
	reference: string
): Array<{ source: string; reference?: string; content: string }> {
	const citations: Array<{ source: string; reference?: string; content: string }> = [];

	// Extract scripture citation
	if (promptResult.scripture) {
		const scripture = promptResult.scripture as { text?: string };
		if (scripture.text) {
			citations.push({
				source: 'Scripture',
				reference: reference,
				content: scripture.text.substring(0, 200) + (scripture.text.length > 200 ? '...' : '')
			});
		}
	}

	// Extract word citations
	if (Array.isArray(promptResult.words)) {
		for (const word of promptResult.words as Array<{ title?: string; term?: string }>) {
			if (word.title || word.term) {
				citations.push({
					source: 'Translation Words',
					reference: word.title || word.term,
					content: `Definition for ${word.title || word.term}`
				});
			}
		}
	}

	// Extract notes citation
	if (promptResult.notes) {
		const notes = promptResult.notes as { items?: unknown[]; notes?: unknown[] };
		const noteCount = notes.items?.length || notes.notes?.length || 0;
		if (noteCount > 0) {
			citations.push({
				source: 'Translation Notes',
				reference: reference,
				content: `${noteCount} translation notes`
			});
		}
	}

	// Extract questions citation
	if (promptResult.questions) {
		const questions = promptResult.questions as { count?: number; items?: unknown[] };
		const questionCount = questions.count || questions.items?.length || 0;
		if (questionCount > 0) {
			citations.push({
				source: 'Translation Questions',
				reference: reference,
				content: `${questionCount} comprehension questions`
			});
		}
	}

	// Extract academy citations
	if (Array.isArray(promptResult.academyArticles)) {
		for (const article of promptResult.academyArticles as Array<{
			title?: string;
			moduleId?: string;
		}>) {
			if (article.title || article.moduleId) {
				citations.push({
					source: 'Translation Academy',
					reference: article.title || article.moduleId,
					content: `Training article: ${article.title || article.moduleId}`
				});
			}
		}
	}

	return citations;
}

/**
 * Parse orchestrator plan from tool call response
 * Handles both string and object arguments, and stringified nested fields
 */
export function parseOrchestratorPlan(toolCallArgs: string | Record<string, unknown>): {
	reasoning: string;
	agents: Array<{ agent: string; task: string; priority: string }>;
	needsIteration: boolean;
} | null {
	try {
		// If it's a string, parse it first
		const parsed = typeof toolCallArgs === 'string' ? JSON.parse(toolCallArgs) : toolCallArgs;

		if (!parsed.reasoning) {
			return null;
		}

		// Handle agents - could be an array or a JSON string
		let agents = parsed.agents;
		if (typeof agents === 'string') {
			try {
				agents = JSON.parse(agents);
			} catch {
				// Could be a description string, not JSON
				return null;
			}
		}

		if (!Array.isArray(agents)) {
			return null;
		}

		// Handle needsIteration - could be boolean or string
		let needsIteration = parsed.needsIteration;
		if (typeof needsIteration === 'string') {
			needsIteration = needsIteration.toLowerCase() === 'true';
		}

		return {
			reasoning: parsed.reasoning,
			agents: agents,
			needsIteration: needsIteration ?? false
		};
	} catch {
		return null;
	}
}

/**
 * Build context for synthesis from agent results
 */
export function buildSynthesisContext(
	agentResults: Array<{
		agent: string;
		success: boolean;
		summary: string;
		findings: unknown;
		citations: Array<{ source: string; reference?: string; content: string }>;
		error?: string;
	}>
): string {
	const sections = agentResults.map((result) => {
		const header = `## ${result.agent.toUpperCase()} AGENT REPORT`;

		if (!result.success) {
			return `${header}\nStatus: FAILED\nError: ${result.error || 'Unknown error'}`;
		}

		const citationsText = result.citations
			.map((c) => `- ${c.source}${c.reference ? ` (${c.reference})` : ''}: ${c.content}`)
			.join('\n');

		return `${header}
Status: SUCCESS
Summary: ${result.summary}

Findings:
${JSON.stringify(result.findings, null, 2)}

Citations:
${citationsText || 'None'}`;
	});

	return sections.join('\n\n---\n\n');
}
