/**
 * Orchestrated Chat
 *
 * Main entry point for multi-agent orchestrated conversations.
 * Coordinates the orchestrator and sub-agents to handle user queries.
 */

import type { AIBinding, WorkersAIToolDefinition, WorkersAIMessage } from './types.js';
import {
	ORCHESTRATOR_PROMPT,
	SYNTHESIS_PROMPT,
	PLANNING_TOOL,
	parseOrchestratorPlan,
	buildSynthesisContext,
	executeAgent,
	type AgentName,
	type AgentTask,
	type AgentResponse,
	type OrchestratorPlan,
	type StreamEmitter,
	type OrchestrationConfig,
	DEFAULT_ORCHESTRATION_CONFIG,
	getAgentDisplayName
} from './agents/index.js';

const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Execute orchestrated chat with streaming
 *
 * Returns a ReadableStream that emits SSE events for real-time UI updates.
 */
export async function orchestratedChat(
	ai: AIBinding,
	userMessage: string,
	chatHistory: Array<{ role: string; content: string }>,
	mcpTools: WorkersAIToolDefinition[],
	executeToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>,
	config: Partial<OrchestrationConfig> = {}
): Promise<ReadableStream<Uint8Array>> {
	const finalConfig = { ...DEFAULT_ORCHESTRATION_CONFIG, ...config };
	const encoder = new TextEncoder();

	return new ReadableStream<Uint8Array>({
		start: async (controller) => {
			const emit: StreamEmitter = (event: string, data: unknown) => {
				const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(msg));
			};

			try {
				// PHASE 1: Orchestrator Planning
				emit('orchestrator:thinking', { delta: 'Analyzing your question...\n' });

				const plan = await planAgentDispatch(ai, userMessage, chatHistory, emit);

				if (!plan || plan.agents.length === 0) {
					emit('error', { message: 'Failed to create execution plan' });
					controller.close();
					return;
				}

				emit('orchestrator:plan', { plan });
				emit('orchestrator:thinking', {
					delta: `\nDispatching ${plan.agents.length} specialist${plan.agents.length > 1 ? 's' : ''}...\n`
				});

				// PHASE 2: Parallel Agent Execution
				const agentResults = await executeAgentsInParallel(
					ai,
					plan.agents,
					mcpTools,
					executeToolFn,
					emit,
					finalConfig.parallelExecution
				);

				// PHASE 3: Check for iteration
				const lowConfidenceAgents = agentResults.filter(
					(r) => !r.success || r.confidence < finalConfig.confidenceThreshold
				);

				let iterationResults: AgentResponse[] = [];

				if (
					lowConfidenceAgents.length > 0 &&
					plan.needsIteration &&
					finalConfig.maxIterations > 1
				) {
					emit('orchestrator:iterating', {
						reason: `${lowConfidenceAgents.length} agent(s) need more information`
					});

					// Plan follow-up tasks based on suggestions from failed/low-confidence agents
					const followUpTasks = await planIterationTasks(
						ai,
						userMessage,
						agentResults,
						finalConfig.confidenceThreshold,
						emit
					);

					if (followUpTasks.length > 0) {
						emit('orchestrator:thinking', {
							delta: `\nDispatching ${followUpTasks.length} follow-up agent(s)...\n`
						});

						iterationResults = await executeAgentsInParallel(
							ai,
							followUpTasks,
							mcpTools,
							executeToolFn,
							emit,
							finalConfig.parallelExecution
						);

						// Merge iteration results with original results
						for (const iterResult of iterationResults) {
							const existingIdx = agentResults.findIndex((r) => r.agent === iterResult.agent);
							if (existingIdx >= 0 && iterResult.success) {
								// Replace failed result with successful iteration result
								agentResults[existingIdx] = iterResult;
							} else if (existingIdx < 0) {
								// Add new agent result
								agentResults.push(iterResult);
							}
						}
					}
				}

				// PHASE 4: Synthesis
				emit('synthesis:start', {});

				await synthesizeResponse(ai, userMessage, agentResults, controller, emit);

				emit('done', { success: true });
				controller.close();
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				emit('error', { message: errorMsg });
				controller.close();
			}
		}
	});
}

/**
 * Plan which agents to dispatch using the orchestrator
 */
async function planAgentDispatch(
	ai: AIBinding,
	userMessage: string,
	chatHistory: Array<{ role: string; content: string }>,
	emit: StreamEmitter
): Promise<OrchestratorPlan | null> {
	// Build context from recent history
	const recentHistory = chatHistory.slice(-4).map((msg) => ({
		role: msg.role as 'user' | 'assistant',
		content: msg.content
	}));

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: ORCHESTRATOR_PROMPT },
		...recentHistory,
		{ role: 'user', content: userMessage }
	];

	try {
		const result = await ai.run(WORKERS_AI_MODEL, {
			messages,
			tools: [PLANNING_TOOL],
			tool_choice: 'required'
		});

		// Stream any thinking
		if (result.response) {
			emit('orchestrator:thinking', { delta: result.response });
		}

		// Parse tool call
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];
			if (toolCall.function.name === 'dispatch_agents') {
				const plan = parseOrchestratorPlan(toolCall.function.arguments);
				if (plan) {
					emit('orchestrator:thinking', { delta: `\n${plan.reasoning}\n` });
					return {
						reasoning: plan.reasoning,
						agents: plan.agents.map((a) => ({
							agent: a.agent as AgentName,
							task: a.task,
							priority: a.priority as 'high' | 'normal' | 'low'
						})),
						needsIteration: plan.needsIteration
					};
				}
			}
		}

		return null;
	} catch (error) {
		console.error('Planning failed:', error);
		return null;
	}
}

/**
 * Execute agents in parallel or sequence
 */
async function executeAgentsInParallel(
	ai: AIBinding,
	tasks: AgentTask[],
	tools: WorkersAIToolDefinition[],
	executeToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>,
	emit: StreamEmitter,
	parallel: boolean = true
): Promise<AgentResponse[]> {
	if (parallel) {
		// Execute all agents in parallel
		const promises = tasks.map((task) =>
			executeAgent(task.agent, ai, task, tools, executeToolFn, emit)
		);
		return Promise.all(promises);
	} else {
		// Execute agents sequentially
		const results: AgentResponse[] = [];
		for (const task of tasks) {
			const result = await executeAgent(task.agent, ai, task, tools, executeToolFn, emit);
			results.push(result);
		}
		return results;
	}
}

/**
 * Plan iteration tasks based on failed or low-confidence agent results
 */
async function planIterationTasks(
	ai: AIBinding,
	userMessage: string,
	agentResults: AgentResponse[],
	confidenceThreshold: number,
	emit: StreamEmitter
): Promise<AgentTask[]> {
	const followUpTasks: AgentTask[] = [];

	for (const result of agentResults) {
		// Skip successful high-confidence results
		if (result.success && result.confidence >= confidenceThreshold) {
			continue;
		}

		// Check for suggested follow-ups
		if (result.suggestedFollowup && result.suggestedFollowup.length > 0) {
			// Create follow-up task based on suggestions
			const suggestion = result.suggestedFollowup[0];

			// Determine which agent to use based on the suggestion
			let targetAgent: AgentName = result.agent;

			// If the original agent failed, try search as fallback
			if (!result.success) {
				targetAgent = 'search';
			}

			followUpTasks.push({
				agent: targetAgent,
				task: `Follow up on previous attempt: ${suggestion}. Original question context: "${userMessage.substring(0, 100)}"`,
				priority: 'normal'
			});
		} else if (!result.success && result.error) {
			// If an agent failed with an error, try a different approach
			if (result.agent === 'words') {
				// Try search instead of direct word lookup
				followUpTasks.push({
					agent: 'search',
					task: `Search for biblical terms related to the original question: "${userMessage.substring(0, 100)}"`,
					priority: 'normal'
				});
			} else if (result.agent === 'scripture') {
				// Try with different parameters or search
				followUpTasks.push({
					agent: 'search',
					task: `Find scripture passages related to: "${userMessage.substring(0, 100)}"`,
					priority: 'normal'
				});
			}
		}
	}

	// Limit follow-up tasks to avoid excessive iteration
	return followUpTasks.slice(0, 2);
}

/**
 * Synthesize final response from agent results with streaming
 */
async function synthesizeResponse(
	ai: AIBinding,
	userMessage: string,
	agentResults: AgentResponse[],
	controller: ReadableStreamDefaultController<Uint8Array>,
	emit: StreamEmitter
): Promise<void> {
	const encoder = new TextEncoder();

	// Build synthesis context
	const synthesisContext = buildSynthesisContext(agentResults);

	// Create agent summary for the model
	const agentSummary = agentResults
		.map(
			(r) => `- ${getAgentDisplayName(r.agent)}: ${r.success ? r.summary : `FAILED: ${r.error}`}`
		)
		.join('\n');

	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: SYNTHESIS_PROMPT },
		{
			role: 'user',
			content: `Original question: ${userMessage}

Agent summaries:
${agentSummary}

Full agent reports:
${synthesisContext}

Please synthesize these findings into a comprehensive, well-cited response.`
		}
	];

	try {
		// Make streaming call
		const streamResponse = (await ai.run(WORKERS_AI_MODEL, {
			messages,
			stream: true,
			max_tokens: 2000,
			temperature: 0.3
		})) as ReadableStream<Uint8Array>;

		// Process stream and forward to client
		const reader = streamResponse.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Parse SSE events from Workers AI
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // Keep incomplete line in buffer

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') continue;

					try {
						const parsed = JSON.parse(data);
						const text = parsed.response || '';
						if (text) {
							emit('synthesis:delta', { delta: text });
						}
					} catch {
						// Not JSON, might be raw text
						if (data && data !== '[DONE]') {
							emit('synthesis:delta', { delta: data });
						}
					}
				}
			}
		}

		// Process any remaining buffer
		if (buffer && !buffer.includes('[DONE]')) {
			const trimmed = buffer.replace(/^data:\s*/, '');
			if (trimmed) {
				try {
					const parsed = JSON.parse(trimmed);
					if (parsed.response) {
						emit('synthesis:delta', { delta: parsed.response });
					}
				} catch {
					emit('synthesis:delta', { delta: trimmed });
				}
			}
		}
	} catch (error) {
		console.error('Synthesis streaming failed:', error);
		// Fallback to non-streaming
		try {
			const result = await ai.run(WORKERS_AI_MODEL, {
				messages,
				max_tokens: 2000,
				temperature: 0.3
			});

			if (result.response) {
				emit('synthesis:delta', { delta: result.response });
			}
		} catch (fallbackError) {
			emit('error', {
				message: `Synthesis failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
			});
		}
	}
}

/**
 * Non-streaming version for simpler use cases
 */
export async function orchestratedChatSimple(
	ai: AIBinding,
	userMessage: string,
	chatHistory: Array<{ role: string; content: string }>,
	mcpTools: WorkersAIToolDefinition[],
	executeToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<{
	content: string;
	agentResults: AgentResponse[];
	plan: OrchestratorPlan | null;
	error?: string;
}> {
	// Collect all streamed content
	let content = '';
	const agentResults: AgentResponse[] = [];
	let plan: OrchestratorPlan | null = null;
	let error: string | undefined;

	const stream = await orchestratedChat(ai, userMessage, chatHistory, mcpTools, executeToolFn);
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const text = decoder.decode(value);
		const lines = text.split('\n');

		for (const line of lines) {
			if (line.startsWith('event: ')) {
				const eventType = line.slice(7);
				continue; // Event type line
			}
			if (line.startsWith('data: ')) {
				const data = JSON.parse(line.slice(6));

				// Collect synthesis content
				if (data.delta && line.includes('synthesis:delta')) {
					content += data.delta;
				}

				// Collect plan
				if (data.plan) {
					plan = data.plan;
				}

				// Collect errors
				if (data.message && line.includes('error')) {
					error = data.message;
				}
			}
		}
	}

	return { content, agentResults, plan, error };
}
