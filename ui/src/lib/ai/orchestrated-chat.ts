/**
 * Orchestrated Chat
 *
 * Main entry point for multi-agent orchestrated conversations.
 * Coordinates the orchestrator and sub-agents to handle user queries.
 */

import {
	DEFAULT_ORCHESTRATION_CONFIG,
	EXECUTE_PROMPT_TOOL,
	ORCHESTRATOR_PROMPT,
	PLANNING_TOOL,
	SYNTHESIS_PROMPT,
	buildSynthesisContext,
	executeAgent,
	extractCitationsFromPromptResult,
	getAgentDisplayName,
	parseExecutePromptArgs,
	parseOrchestratorPlan,
	type AgentName,
	type AgentResponse,
	type AgentTask,
	type OrchestrationConfig,
	type OrchestratorPlan,
	type StreamEmitter
} from './agents/index.js';
import type { AIBinding, WorkersAIMessage, WorkersAIToolDefinition } from './types.js';

// Using Llama 4 Scout for more reliable tool calling
const WORKERS_AI_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

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
			// Comprehensive X-Ray data collection for full execution visibility
			const startTime = Date.now();

			// Timeline of ALL operations (LLM calls + tool calls)
			const xrayTimeline: Array<{
				type: 'llm' | 'tool' | 'phase';
				name: string;
				description?: string;
				startTime: number;
				endTime?: number;
				duration?: number;
				agent?: string;
				model?: string;
				params?: Record<string, unknown>;
				success?: boolean;
				preview?: string;
				tokens?: { input?: number; output?: number };
			}> = [];

			// Legacy tool calls array for backwards compatibility
			const xrayToolCalls: Array<{
				name: string;
				endpoint?: string;
				params?: Record<string, unknown>;
				duration?: number;
				success?: boolean;
				preview?: string;
				agent?: string;
				_startTime?: number; // Internal: track when tool call started
			}> = [];

			const timings: Record<string, number> = {};
			let ttft: number | null = null; // Time to First Token

			// Helper to add timeline entry
			const addTimelineEntry = (entry: (typeof xrayTimeline)[0]) => {
				xrayTimeline.push(entry);
			};

			const emit: StreamEmitter = (event: string, data: unknown) => {
				const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(msg));

				const now = Date.now();

				// Track TTFT (Time to First Token) - when user first sees content
				if (event === 'synthesis:delta' && ttft === null) {
					ttft = now - startTime;
				}

				// Track orchestrator events
				if (event === 'orchestrator:thinking') {
					// Mark orchestrator LLM start if not already started (and not already completed)
					const existing = xrayTimeline.find(
						(t) => t.type === 'llm' && t.name === 'Orchestrator Planning'
					);
					// Only create entry if none exists at all (prevents duplicates after completion)
					if (!existing) {
						addTimelineEntry({
							type: 'llm',
							name: 'Orchestrator Planning',
							description: 'Planning which agents to dispatch',
							startTime: now,
							model: WORKERS_AI_MODEL
						});
					}
				}

				if (event === 'orchestrator:plan') {
					// Mark orchestrator LLM complete
					const entry = xrayTimeline.find(
						(t) => t.type === 'llm' && t.name === 'Orchestrator Planning' && !t.endTime
					);
					if (entry) {
						entry.endTime = now;
						entry.duration = now - entry.startTime;
						entry.success = true;
					}
				}

				// Track agent LLM calls
				if (event === 'agent:start') {
					const eventData = data as { agent?: string; task?: string };
					// Only create entry if this agent doesn't already have an uncompleted entry
					// (prevents duplicates from emit in both index.ts and individual agent files)
					const existing = xrayTimeline.find(
						(t) => t.type === 'llm' && t.agent === eventData.agent && !t.endTime
					);
					if (!existing) {
						addTimelineEntry({
							type: 'llm',
							name: `${eventData.agent} Agent`,
							description: eventData.task,
							startTime: now,
							agent: eventData.agent,
							model: WORKERS_AI_MODEL
						});
					}
				}

				// Track agent tool calls
				if (event === 'agent:tool:start') {
					const eventData = data as { agent?: string; tool?: string; args?: unknown };

					// Mark agent LLM as complete (it decided to call a tool)
					const agentLlm = xrayTimeline.find(
						(t) =>
							t.type === 'llm' &&
							t.agent === eventData.agent &&
							!t.endTime &&
							t.name.includes('Agent')
					);
					if (agentLlm && !agentLlm.endTime) {
						agentLlm.endTime = now;
						agentLlm.duration = now - agentLlm.startTime;
						agentLlm.success = true;
					}

					// Add tool call to timeline
					addTimelineEntry({
						type: 'tool',
						name: eventData.tool || 'unknown',
						description: `Tool call from ${eventData.agent}`,
						startTime: now,
						agent: eventData.agent,
						params: eventData.args as Record<string, unknown>
					});

					// Legacy support - store startTime for accurate duration calculation
					xrayToolCalls.push({
						name: eventData.tool || 'unknown',
						endpoint: `/api/mcp (${eventData.tool})`,
						params: eventData.args as Record<string, unknown>,
						agent: eventData.agent,
						_startTime: now // Track when this tool call started
					});
				}

				if (event === 'agent:tool:result') {
					const eventData = data as { agent?: string; tool?: string; preview?: string };

					// Update timeline entry
					const toolEntry = xrayTimeline.find(
						(t) =>
							t.type === 'tool' &&
							t.name === eventData.tool &&
							t.agent === eventData.agent &&
							!t.endTime
					);
					if (toolEntry) {
						toolEntry.endTime = now;
						toolEntry.duration = now - toolEntry.startTime;
						toolEntry.success = true;
						toolEntry.preview = eventData.preview;
					}

					// Legacy support - use the tool's own start time, not global
					const lastCall = xrayToolCalls.find(
						(c) => c.name === eventData.tool && c.agent === eventData.agent && !c.duration
					);
					if (lastCall) {
						lastCall.duration = now - (lastCall._startTime || startTime);
						lastCall.success = true;
						lastCall.preview = eventData.preview;
					}
				}

				if (event === 'agent:summary' || event === 'agent:error') {
					const eventData = data as { agent?: string; success?: boolean; error?: string };
					// Mark any unclosed agent LLM entries as complete
					const agentLlm = xrayTimeline.find(
						(t) =>
							t.type === 'llm' &&
							t.agent === eventData.agent &&
							!t.endTime &&
							t.name.includes('Agent')
					);
					if (agentLlm) {
						agentLlm.endTime = now;
						agentLlm.duration = now - agentLlm.startTime;
						agentLlm.success = event === 'agent:summary' ? (eventData.success ?? true) : false;
					}
				}

				// Track synthesis
				if (event === 'synthesis:start') {
					addTimelineEntry({
						type: 'llm',
						name: 'Response Synthesis',
						description: 'Synthesizing final response from agent findings',
						startTime: now,
						model: WORKERS_AI_MODEL
					});
				}
			};

			try {
				// PHASE 1: Orchestrator Planning
				const planStart = Date.now();
				emit('orchestrator:thinking', { delta: 'Analyzing your question...\n' });

				const planningResult = await planAgentDispatch(ai, userMessage, chatHistory, emit);
				timings.planning = Date.now() - planStart;

				if (!planningResult) {
					emit('error', { message: 'Failed to create execution plan' });
					controller.close();
					return;
				}

				let agentResults: AgentResponse[] = [];
				let plan: OrchestratorPlan | null = null;

				// PHASE 2: Execute based on planning result (prompt OR agents)
				if (planningResult.type === 'prompt') {
					// Execute MCP prompt workflow
					emit('prompt:start', {
						promptName: planningResult.promptName,
						reference: planningResult.reference
					});

					addTimelineEntry({
						type: 'tool',
						name: `MCP Prompt: ${planningResult.promptName}`,
						description: `Executing ${planningResult.promptName} for ${planningResult.reference}`,
						startTime: Date.now()
					});

					const promptStart = Date.now();

					try {
						// Call the execute-prompt API endpoint (use absolute URL for server-side)
						const promptUrl = finalConfig.baseUrl
							? `${finalConfig.baseUrl}/api/execute-prompt`
							: '/api/execute-prompt';
						const promptResponse = await fetch(promptUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								promptName: planningResult.promptName,
								parameters: {
									reference: planningResult.reference,
									language: planningResult.language
								}
							})
						});

						const promptResult = await promptResponse.json();
						timings.agentExecution = Date.now() - promptStart;

						// Mark prompt tool call as complete
						const promptEntry = xrayTimeline.find(
							(t) => t.type === 'tool' && t.name.includes('MCP Prompt') && !t.endTime
						);
						if (promptEntry) {
							promptEntry.endTime = Date.now();
							promptEntry.duration = promptEntry.endTime - promptEntry.startTime;
							promptEntry.success = promptResponse.ok;
						}

						// Build a summary of what the prompt returned
						const promptResultKeys = Object.keys(promptResult);
						const promptSummaryParts: string[] = [];
						for (const key of promptResultKeys) {
							const value = promptResult[key];
							if (value && typeof value === 'object') {
								if (Array.isArray(value)) {
									promptSummaryParts.push(`${key}: ${value.length} items`);
								} else if ('text' in value) {
									promptSummaryParts.push(`${key}: ✓`);
								} else if ('items' in value && Array.isArray(value.items)) {
									promptSummaryParts.push(`${key}: ${value.items.length} items`);
								} else {
									promptSummaryParts.push(`${key}: ✓`);
								}
							}
						}

						emit('prompt:complete', {
							promptName: planningResult.promptName,
							success: promptResponse.ok,
							duration: Date.now() - promptStart,
							resultSummary: promptSummaryParts.join(', '),
							dataKeys: promptResultKeys
						});

						// Convert prompt result to agent-like format for synthesis
						const citations = extractCitationsFromPromptResult(
							promptResult as Record<string, unknown>,
							planningResult.reference
						);

						agentResults.push({
							agent: 'prompt' as AgentName,
							success: promptResponse.ok,
							findings: promptResult,
							summary: `Executed ${planningResult.promptName} for ${planningResult.reference}`,
							citations,
							confidence: promptResponse.ok ? 0.9 : 0.1
						});

						// Create a pseudo-plan for X-Ray tracking (don't emit to UI - prompt:complete already updated it)
						plan = {
							reasoning: `Using ${planningResult.promptName} workflow`,
							agents: [
								{
									agent: 'prompt' as AgentName,
									task: `${planningResult.promptName} for ${planningResult.reference}`,
									priority: 'high'
								}
							],
							needsIteration: false
						};
						// Note: NOT emitting orchestrator:plan here because prompt:complete already updated the UI
					} catch (promptError) {
						console.error('Prompt execution failed:', promptError);
						timings.agentExecution = Date.now() - promptStart;

						emit('prompt:error', {
							promptName: planningResult.promptName,
							error: promptError instanceof Error ? promptError.message : 'Unknown error'
						});

						// Fall back to dispatching agents
						emit('orchestrator:thinking', {
							delta: '\nPrompt failed, falling back to agents...\n'
						});

						// Create a fallback plan with relevant agents
						plan = {
							reasoning: 'Prompt failed, dispatching agents as fallback',
							agents: [
								{
									agent: 'scripture' as AgentName,
									task: `Fetch scripture for ${planningResult.reference}`,
									priority: 'high'
								},
								{
									agent: 'notes' as AgentName,
									task: `Get translation notes for ${planningResult.reference}`,
									priority: 'normal'
								}
							],
							needsIteration: false
						};

						emit('orchestrator:plan', { plan });
						emit('orchestrator:thinking', {
							delta: `\nDispatching ${plan.agents.length} specialist${plan.agents.length > 1 ? 's' : ''}...\n`
						});

						agentResults = await executeAgentsInParallel(
							ai,
							plan.agents,
							mcpTools,
							executeToolFn,
							emit,
							finalConfig.parallelExecution
						);
					}
				} else {
					// Execute agents as before
					plan = planningResult.plan;

					if (plan.agents.length === 0) {
						emit('error', { message: 'No agents to dispatch' });
						controller.close();
						return;
					}

					emit('orchestrator:plan', { plan });
					emit('orchestrator:thinking', {
						delta: `\nDispatching ${plan.agents.length} specialist${plan.agents.length > 1 ? 's' : ''}...\n`
					});

					// PHASE 2: Parallel Agent Execution
					const agentStart = Date.now();
					agentResults = await executeAgentsInParallel(
						ai,
						plan.agents,
						mcpTools,
						executeToolFn,
						emit,
						finalConfig.parallelExecution
					);
					timings.agentExecution = Date.now() - agentStart;

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
				}

				// PHASE 4: Synthesis
				const synthesisStart = Date.now();
				emit('synthesis:start', {});

				await synthesizeResponse(ai, userMessage, agentResults, controller, emit);
				timings.synthesis = Date.now() - synthesisStart;

				// Calculate total time
				const totalTime = Date.now() - startTime;

				// Mark synthesis as complete
				const synthesisEntry = xrayTimeline.find(
					(t) => t.type === 'llm' && t.name === 'Response Synthesis' && !t.endTime
				);
				if (synthesisEntry) {
					synthesisEntry.endTime = Date.now();
					synthesisEntry.duration = synthesisEntry.endTime - synthesisEntry.startTime;
					synthesisEntry.success = true;
				}

				// Count LLM calls vs tool calls
				const llmCalls = xrayTimeline.filter((t) => t.type === 'llm');
				const toolCalls = xrayTimeline.filter((t) => t.type === 'tool');

				// Emit comprehensive X-Ray data for debugging panel
				const xrayData = {
					totalTime,
					mode: 'orchestrated',

					// High-level summary
					summary: {
						llmCalls: llmCalls.length,
						toolCalls: toolCalls.length,
						agentsDispatched: plan?.agents.length || 0,
						agentsSuccessful: agentResults.filter((r) => r.success).length,
						agentsFailed: agentResults.filter((r) => !r.success).length
					},

					// Phase timings
					timings: {
						ttft: ttft, // Time to First Token - when user first sees content
						planning: timings.planning,
						agentExecution: timings.agentExecution,
						synthesis: timings.synthesis,
						total: totalTime
					},

					// Full execution timeline (NEW - shows everything)
					timeline: xrayTimeline.map((entry) => ({
						type: entry.type,
						name: entry.name,
						description: entry.description,
						duration: entry.duration,
						agent: entry.agent,
						model: entry.model,
						success: entry.success,
						preview: entry.preview,
						params: entry.params
					})),

					// Legacy: API/tool calls for backwards compatibility
					apiCalls: xrayToolCalls,
					tools: xrayToolCalls.map((c) => ({
						name: c.name,
						duration: c.duration,
						success: c.success,
						params: c.params,
						agent: c.agent
					})),

					// Agent details
					agents: {
						dispatched: plan?.agents.length || 0,
						successful: agentResults.filter((r) => r.success).length,
						failed: agentResults.filter((r) => !r.success).length,
						details: agentResults.map((r) => ({
							name: getAgentDisplayName(r.agent),
							agent: r.agent,
							success: r.success,
							confidence: r.confidence,
							summary: r.summary
						}))
					}
				};

				emit('xray', xrayData);
				emit('xray:final', xrayData);
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
 * Result type for orchestrator planning - can be either agents or a prompt
 */
export type PlanningResult =
	| { type: 'agents'; plan: OrchestratorPlan }
	| { type: 'prompt'; promptName: string; reference: string; language: string };

/**
 * Plan which agents to dispatch OR which prompt to execute using the orchestrator
 */
async function planAgentDispatch(
	ai: AIBinding,
	userMessage: string,
	chatHistory: Array<{ role: string; content: string }>,
	emit: StreamEmitter
): Promise<PlanningResult | null> {
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
			tools: [PLANNING_TOOL, EXECUTE_PROMPT_TOOL],
			tool_choice: 'required'
		});

		// Stream any thinking
		if (result.response) {
			emit('orchestrator:thinking', { delta: result.response });
		}

		// Parse tool call - handle different response formats
		if (result.tool_calls && result.tool_calls.length > 0) {
			const toolCall = result.tool_calls[0];

			// Handle both standard OpenAI format and Workers AI format
			// OpenAI format: { function: { name, arguments: string } }
			// Workers AI format: { name, arguments: object }
			const functionName =
				toolCall.function?.name || (toolCall as unknown as { name?: string }).name;
			const rawArgs =
				toolCall.function?.arguments || (toolCall as unknown as { arguments?: unknown }).arguments;

			// Arguments can be a string (OpenAI) or object (Workers AI)
			const functionArgs =
				typeof rawArgs === 'string' ? rawArgs : (rawArgs as Record<string, unknown>);

			// Handle execute_prompt tool call
			if (functionName === 'execute_prompt') {
				const promptArgs = parseExecutePromptArgs(functionArgs);
				if (promptArgs) {
					emit('orchestrator:thinking', {
						delta: `\nUsing ${promptArgs.promptName} workflow for ${promptArgs.reference}...\n`
					});
					return {
						type: 'prompt',
						promptName: promptArgs.promptName,
						reference: promptArgs.reference,
						language: promptArgs.language
					};
				}
			}

			// Handle dispatch_agents tool call
			if (functionName === 'dispatch_agents') {
				const plan = parseOrchestratorPlan(functionArgs);
				if (plan) {
					emit('orchestrator:thinking', { delta: `\n${plan.reasoning}\n` });
					return {
						type: 'agents',
						plan: {
							reasoning: plan.reasoning,
							agents: plan.agents.map((a) => ({
								agent: a.agent as AgentName,
								task: a.task,
								priority: a.priority as 'high' | 'normal' | 'low'
							})),
							needsIteration: plan.needsIteration
						}
					};
				}
			}

			// If the format is completely unexpected, try to parse it as a plan directly
			// (some models return the plan object directly instead of through tool calling)
			if (!functionName) {
				const possiblePlan = toolCall as unknown as Record<string, unknown>;
				if (possiblePlan.reasoning && Array.isArray(possiblePlan.agents)) {
					emit('orchestrator:thinking', { delta: `\n${possiblePlan.reasoning}\n` });
					return {
						type: 'agents',
						plan: {
							reasoning: possiblePlan.reasoning as string,
							agents: (
								possiblePlan.agents as Array<{ agent: string; task: string; priority: string }>
							).map((a) => ({
								agent: a.agent as AgentName,
								task: a.task,
								priority: a.priority as 'high' | 'normal' | 'low'
							})),
							needsIteration: (possiblePlan.needsIteration as boolean) || false
						}
					};
				}
			}
		}

		// If no tool calls, check if the response contains a plan
		if (result.response) {
			try {
				const parsed = JSON.parse(result.response);
				if (parsed.reasoning && Array.isArray(parsed.agents)) {
					emit('orchestrator:thinking', { delta: `\n${parsed.reasoning}\n` });
					return {
						type: 'agents',
						plan: {
							reasoning: parsed.reasoning,
							agents: parsed.agents.map((a: { agent: string; task: string; priority: string }) => ({
								agent: a.agent as AgentName,
								task: a.task,
								priority: a.priority as 'high' | 'normal' | 'low'
							})),
							needsIteration: parsed.needsIteration || false
						}
					};
				}
			} catch {
				// Response is not JSON - that's fine
			}
		}

		console.error(
			'Could not parse orchestrator plan from response:',
			JSON.stringify(result, null, 2)
		);
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
	_ai: AIBinding,
	userMessage: string,
	agentResults: AgentResponse[],
	confidenceThreshold: number,
	_emit: StreamEmitter
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
		let streamDone = false;

		while (!streamDone) {
			const { done, value } = await reader.read();
			if (done) {
				streamDone = true;
				continue;
			}

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
	let streamDone = false;

	while (!streamDone) {
		const { done, value } = await reader.read();
		if (done) {
			streamDone = true;
			continue;
		}

		const text = decoder.decode(value);
		const lines = text.split('\n');

		for (const line of lines) {
			if (line.startsWith('event: ')) {
				// Skip event type lines - we parse the data lines
				continue;
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
