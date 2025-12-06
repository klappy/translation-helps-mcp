/**
 * Multi-Agent System Exports
 *
 * Central export file for all agent-related functionality.
 */

// Type exports
export * from './types.js';

// Orchestrator exports
export {
	ORCHESTRATOR_PROMPT,
	SYNTHESIS_PROMPT,
	PLANNING_TOOL,
	EXECUTE_PROMPT_TOOL,
	parseOrchestratorPlan,
	parseExecutePromptArgs,
	extractCitationsFromPromptResult,
	buildSynthesisContext
} from './orchestrator.js';

// Agent exports
export {
	SCRIPTURE_AGENT_PROMPT,
	SCRIPTURE_AGENT_TOOLS,
	executeScriptureAgent
} from './scripture-agent.js';
export { NOTES_AGENT_PROMPT, NOTES_AGENT_TOOLS, executeNotesAgent } from './notes-agent.js';
export { WORDS_AGENT_PROMPT, WORDS_AGENT_TOOLS, executeWordsAgent } from './words-agent.js';
export { ACADEMY_AGENT_PROMPT, ACADEMY_AGENT_TOOLS, executeAcademyAgent } from './academy-agent.js';
export { SEARCH_AGENT_PROMPT, SEARCH_AGENT_TOOLS, executeSearchAgent } from './search-agent.js';

// QA Validator exports
export { validateResponse } from './qa-validator.js';

// Agent registry for dynamic dispatch
import { executeScriptureAgent } from './scripture-agent.js';
import { executeNotesAgent } from './notes-agent.js';
import { executeWordsAgent } from './words-agent.js';
import { executeAcademyAgent } from './academy-agent.js';
import { executeSearchAgent } from './search-agent.js';
import type { AgentName, AgentTask, AgentResponse, ToolExecutor, StreamEmitter } from './types.js';
import type { AIBinding, WorkersAIToolDefinition } from '../types.js';

/**
 * Agent executor registry
 */
export const AGENT_EXECUTORS: Record<
	AgentName,
	(
		ai: AIBinding,
		task: AgentTask,
		tools: WorkersAIToolDefinition[],
		executeToolFn: ToolExecutor,
		emit: StreamEmitter
	) => Promise<AgentResponse>
> = {
	scripture: executeScriptureAgent,
	notes: executeNotesAgent,
	words: executeWordsAgent,
	academy: executeAcademyAgent,
	search: executeSearchAgent
};

/**
 * Execute an agent by name
 */
export async function executeAgent(
	agentName: AgentName,
	ai: AIBinding,
	task: AgentTask,
	tools: WorkersAIToolDefinition[],
	executeToolFn: ToolExecutor,
	emit: StreamEmitter
): Promise<AgentResponse> {
	const executor = AGENT_EXECUTORS[agentName];
	if (!executor) {
		throw new Error(`Unknown agent: ${agentName}`);
	}

	// Emit agent start for X-Ray timeline tracking
	emit('agent:start', { agent: agentName, task: task.task });

	return executor(ai, task, tools, executeToolFn, emit);
}
