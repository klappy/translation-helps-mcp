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

## YOUR ROLE
1. **Analyze** the user's question to understand what they need
2. **Plan** which team members to dispatch (usually 2-3)
3. **Assign** clear, focused tasks to each agent
4. **Wait** for their reports
5. **Synthesize** findings into a unified, well-cited response
6. **Iterate** if needed - send another round if information is incomplete

## PLANNING RULES
- Scripture questions → Scripture Agent + Notes Agent
- Term definitions → Words Agent (+ Scripture Agent for examples)
- "What does X mean" → Notes Agent + Words Agent + Scripture Agent
- Broad/exploratory → Search Agent first, then specific agents
- Translation concepts → Academy Agent
- Questions about people/places → Words Agent (names category)

## OUTPUT FORMAT (For Planning)
You MUST call the dispatch_agents function with your plan. Structure it as:
{
  "reasoning": "Why I'm choosing these agents...",
  "agents": [
    { "agent": "scripture", "task": "Fetch John 3:16 in ULT and UST", "priority": "high" },
    { "agent": "notes", "task": "Get translation notes for John 3:16", "priority": "normal" }
  ],
  "needsIteration": false
}

## SYNTHESIS RULES
- ONLY use information from agent reports
- CITE every piece of information with source
- If an agent failed, acknowledge it and work with what you have
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
2. CITE every piece of information: "— **Source**, Reference"
3. Use markdown formatting: headers, blockquotes for scripture, bold for emphasis
4. If an agent failed or found nothing, acknowledge it clearly
5. End with 2-3 follow-up questions the user might want to explore

## CITATION FORMAT
- Scripture: > "Quote..." — **ULT**, John 3:16
- Notes: — **Translation Notes**, John 3:16
- Words: — **Translation Words**, [term name]
- Academy: — **Translation Academy**, [module name]

## RESPONSE STRUCTURE
1. Brief intro addressing the user's question
2. Main content organized by topic with citations
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
 * Parse orchestrator plan from tool call response
 */
export function parseOrchestratorPlan(toolCallArgs: string): {
	reasoning: string;
	agents: Array<{ agent: string; task: string; priority: string }>;
	needsIteration: boolean;
} | null {
	try {
		const parsed = JSON.parse(toolCallArgs);
		if (parsed.reasoning && Array.isArray(parsed.agents)) {
			return {
				reasoning: parsed.reasoning,
				agents: parsed.agents,
				needsIteration: parsed.needsIteration ?? false
			};
		}
		return null;
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
