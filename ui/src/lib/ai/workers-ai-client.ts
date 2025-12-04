/**
 * Workers AI Client
 *
 * Provides native tool calling integration with Cloudflare Workers AI
 * using Llama 4 Scout 17B for Bible study assistance.
 *
 * Key features:
 * - MCP self-discovery (tools fetched dynamically, not hardcoded)
 * - Native tool calling (model decides when to call tools)
 * - Streaming support for SSE responses
 */

import { edgeLogger as logger } from '$lib/edgeLogger.js';
import type { MCPTool } from '@translation-helps/mcp-client';
import type {
	AIBinding,
	WorkersAIMessage,
	WorkersAIToolCall,
	WorkersAIToolDefinition
} from './types.js';

// Re-export types for consumers
export type {
	AIBinding,
	WorkersAIMessage,
	WorkersAIResponse,
	WorkersAIRunOptions,
	WorkersAIToolCall,
	WorkersAIToolDefinition
} from './types.js';

// Model constant - Llama 4 Scout 17B with MoE architecture
export const WORKERS_AI_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/**
 * Helper to stream Workers AI response and emit SSE events
 * Reads from the Workers AI stream and emits llm:delta events
 */
async function streamWorkersAIResponse(
	streamResponse: ReadableStream<Uint8Array>,
	controller: ReadableStreamDefaultController,
	emit: (controller: ReadableStreamDefaultController, event: string, data: unknown) => void
): Promise<void> {
	const reader = streamResponse.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let done = false;

	while (!done) {
		const result = await reader.read();
		done = result.done;
		if (done) break;

		buffer += decoder.decode(result.value, { stream: true });

		// Parse SSE events from Workers AI stream
		const lines = buffer.split('\n');
		buffer = lines.pop() || ''; // Keep incomplete line in buffer

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const data = line.slice(6);
				if (data === '[DONE]') continue;
				try {
					const parsed = JSON.parse(data);
					if (parsed.response) {
						emit(controller, 'llm:delta', { text: parsed.response });
					}
				} catch {
					// Ignore parse errors
				}
			}
		}
	}
}

/**
 * Convert MCP tools to Workers AI tool definitions
 * MCP tools already have JSON Schema from zodToJsonSchema() - no manual conversion needed
 */
export function mcpToolsToWorkersAI(mcpTools: MCPTool[]): WorkersAIToolDefinition[] {
	return mcpTools.map((tool) => ({
		type: 'function' as const,
		function: {
			name: tool.name,
			description: tool.description || `Tool: ${tool.name}`,
			parameters: tool.inputSchema // Already JSON Schema from zodToJsonSchema
		}
	}));
}

/**
 * Basic Workers AI call (non-streaming)
 * Phase 1 replacement for callOpenAI
 */
export async function callWorkersAI(
	ai: AIBinding,
	messages: WorkersAIMessage[],
	options: {
		tools?: WorkersAIToolDefinition[];
		toolChoice?: 'auto' | 'none' | 'required';
		maxTokens?: number;
		temperature?: number;
	} = {}
): Promise<{ response: string; toolCalls?: WorkersAIToolCall[]; error?: string }> {
	// Default to 'required' when tools are present to force tool usage
	const {
		tools,
		toolChoice = tools?.length ? 'required' : 'auto',
		maxTokens = 2000,
		temperature = 0.3
	} = options;

	try {
		logger.info('Calling Workers AI', {
			model: WORKERS_AI_MODEL,
			messageCount: messages.length,
			hasTools: !!tools?.length,
			toolCount: tools?.length || 0
		});

		const result = await ai.run(WORKERS_AI_MODEL, {
			messages,
			tools,
			tool_choice: tools?.length ? toolChoice : undefined,
			max_tokens: maxTokens,
			temperature
		});

		// Handle tool calls response
		if (result.tool_calls && result.tool_calls.length > 0) {
			logger.info('Workers AI requested tool calls', {
				toolCallCount: result.tool_calls.length,
				tools: result.tool_calls.map((tc) => tc.function.name)
			});
			return {
				response: '',
				toolCalls: result.tool_calls
			};
		}

		// Handle text response
		const responseText = result.response || '';
		logger.info('Workers AI response', {
			responseLength: responseText.length
		});

		return { response: responseText };
	} catch (error) {
		logger.error('Workers AI call failed', { error });
		return {
			response: '',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Streaming Workers AI call
 * Returns a ReadableStream for SSE responses
 */
export async function callWorkersAIStream(
	ai: AIBinding,
	messages: WorkersAIMessage[],
	options: {
		tools?: WorkersAIToolDefinition[];
		toolChoice?: 'auto' | 'none' | 'required';
		maxTokens?: number;
		temperature?: number;
		onToolCalls?: (toolCalls: WorkersAIToolCall[]) => Promise<WorkersAIMessage[]>;
		xrayInit?: Record<string, unknown>;
		timings?: Record<string, number>;
		startTime?: number;
	} = {}
): Promise<ReadableStream<Uint8Array>> {
	const {
		tools,
		// Default to 'required' when tools are present to force tool usage
		toolChoice = tools?.length ? 'required' : 'auto',
		maxTokens = 2000,
		temperature = 0.3,
		onToolCalls,
		// X-Ray is always enabled - default to minimal data if not provided
		xrayInit = { queryType: 'ai-assisted', model: WORKERS_AI_MODEL },
		timings = {},
		startTime = Date.now()
	} = options;

	const encoder = new TextEncoder();

	// Helper to emit SSE events
	const emit = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
		const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
		controller.enqueue(encoder.encode(msg));
	};

	return new ReadableStream<Uint8Array>({
		start: async (controller) => {
			// Detailed timing tracking
			const detailedTimings: Record<string, number> = { ...timings };
			const toolExecutions: Array<{
				name: string;
				args: string;
				duration: number;
			}> = [];

			try {
				logger.info('Starting Workers AI stream', {
					model: WORKERS_AI_MODEL,
					messageCount: messages.length,
					hasTools: !!tools?.length
				});

				// STEP 1: Initial LLM call to get tool decisions
				const initialLlmStart = Date.now();
				const result = await ai.run(WORKERS_AI_MODEL, {
					messages,
					tools,
					tool_choice: tools?.length ? toolChoice : undefined,
					max_tokens: maxTokens,
					temperature
				});
				detailedTimings.initialLlmCall = Date.now() - initialLlmStart;

				// Handle tool calls if present
				let finalMessages = messages;

				if (result.tool_calls && result.tool_calls.length > 0 && onToolCalls) {
					logger.info('Processing tool calls', {
						count: result.tool_calls.length
					});

					// STEP 2: Execute tools and track timing for each
					const toolExecStart = Date.now();
					const toolResults = await onToolCalls(result.tool_calls);
					detailedTimings.toolExecution = Date.now() - toolExecStart;

					// Track individual tool timings (from onToolCalls metadata if available)
					result.tool_calls.forEach((tc, _i) => {
						toolExecutions.push({
							name: tc.function.name,
							args: tc.function.arguments,
							duration: Math.round(detailedTimings.toolExecution / result.tool_calls!.length)
						});
					});

					// Build final messages with tool results
					finalMessages = [
						...messages,
						{
							role: 'assistant' as const,
							content: '',
							tool_calls: result.tool_calls
						},
						...toolResults
					];

					// STEP 3: Final LLM call with REAL STREAMING
					const finalLlmStart = Date.now();
					emit(controller, 'llm:start', { started: true });

					// Emit X-Ray data BEFORE streaming starts so UI can show it
					emit(controller, 'xray', {
						...xrayInit,
						toolCalls: toolExecutions,
						timings: {
							...detailedTimings,
							toolDiscovery: timings.toolDiscovery || 0
						}
					});

					// Make final call WITH stream: true for real streaming
					const streamResponse = (await ai.run(WORKERS_AI_MODEL, {
						messages: finalMessages,
						max_tokens: maxTokens,
						temperature,
						stream: true
					})) as ReadableStream<Uint8Array>;

					// Read from the actual stream and forward to client
					await streamWorkersAIResponse(streamResponse, controller, emit);

					detailedTimings.finalLlmCall = Date.now() - finalLlmStart;
					detailedTimings.total = Date.now() - startTime;

					// Emit final done event with all timings
					emit(controller, 'done', {
						timings: detailedTimings
					});
				} else {
					// No tool calls - stream response directly
					emit(controller, 'llm:start', { started: true });

					// Emit X-Ray data
					emit(controller, 'xray', {
						...xrayInit,
						toolCalls: [],
						timings: {
							...detailedTimings,
							toolDiscovery: timings.toolDiscovery || 0
						}
					});

					// If we got a response without tools, stream it
					if (result.response) {
						// Re-call with streaming for real stream
						// Include tools and tool_choice to maintain consistency with initial call
						const streamResponse = (await ai.run(WORKERS_AI_MODEL, {
							messages,
							tools,
							tool_choice: tools?.length ? toolChoice : undefined,
							max_tokens: maxTokens,
							temperature,
							stream: true
						})) as ReadableStream<Uint8Array>;

						await streamWorkersAIResponse(streamResponse, controller, emit);
					}

					detailedTimings.total = Date.now() - startTime;
					emit(controller, 'done', {
						timings: detailedTimings
					});
				}

				controller.close();
			} catch (error) {
				logger.error('Workers AI stream error', { error });
				emit(controller, 'error', {
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				controller.close();
			}
		}
	});
}

/**
 * Chat with native tool calling
 * Main entry point for the new architecture
 */
export async function chatWithTools(
	ai: AIBinding,
	userMessage: string,
	chatHistory: Array<{ role: string; content: string }>,
	mcpTools: MCPTool[],
	systemPrompt: string,
	executeToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<{
	content: string;
	toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
	error?: string;
}> {
	const toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

	// Convert MCP tools to Workers AI format
	const tools = mcpToolsToWorkersAI(mcpTools);

	// Build messages array
	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: systemPrompt },
		...chatHistory.slice(-6).map((msg) => ({
			role: msg.role as WorkersAIMessage['role'],
			content: msg.content
		})),
		{ role: 'user', content: userMessage }
	];

	logger.info('chatWithTools starting', {
		toolCount: tools.length,
		historyLength: chatHistory.length,
		messageLength: userMessage.length
	});

	// First call - model may request tools
	const firstResult = await callWorkersAI(ai, messages, { tools });

	if (firstResult.error) {
		return { content: '', toolCalls: [], error: firstResult.error };
	}

	// If no tool calls, return response directly
	if (!firstResult.toolCalls || firstResult.toolCalls.length === 0) {
		return { content: firstResult.response, toolCalls: [] };
	}

	// Execute tool calls
	const toolMessages: WorkersAIMessage[] = [];

	for (const tc of firstResult.toolCalls) {
		try {
			const args = JSON.parse(tc.function.arguments);
			logger.info('Executing tool', { name: tc.function.name, args });

			const result = await executeToolFn(tc.function.name, args);

			toolCalls.push({
				name: tc.function.name,
				args,
				result
			});

			toolMessages.push({
				role: 'tool',
				content: JSON.stringify(result),
				tool_call_id: tc.id
			});
		} catch (error) {
			logger.error('Tool execution failed', {
				tool: tc.function.name,
				error
			});

			toolMessages.push({
				role: 'tool',
				content: JSON.stringify({ error: 'Tool execution failed' }),
				tool_call_id: tc.id
			});
		}
	}

	// Second call with tool results
	const finalMessages: WorkersAIMessage[] = [
		...messages,
		{
			role: 'assistant',
			content: '',
			tool_calls: firstResult.toolCalls
		},
		...toolMessages
	];

	const finalResult = await callWorkersAI(ai, finalMessages, {});

	if (finalResult.error) {
		return { content: '', toolCalls, error: finalResult.error };
	}

	return {
		content: finalResult.response,
		toolCalls
	};
}

/**
 * Create tool execution callback for use with streaming
 * Wraps MCP callTool for use with onToolCalls callback
 */
export function createToolExecutor(
	callToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>
): (toolCalls: WorkersAIToolCall[]) => Promise<WorkersAIMessage[]> {
	return async (toolCalls: WorkersAIToolCall[]): Promise<WorkersAIMessage[]> => {
		const results: WorkersAIMessage[] = [];

		// Execute tools in parallel for better performance
		const executions = await Promise.all(
			toolCalls.map(async (tc) => {
				try {
					const args = JSON.parse(tc.function.arguments);
					const result = await callToolFn(tc.function.name, args);
					return { tc, result, error: null };
				} catch (error) {
					return { tc, result: null, error };
				}
			})
		);

		for (const { tc, result, error } of executions) {
			if (error) {
				logger.error('Tool execution failed', { tool: tc.function.name, error });
				results.push({
					role: 'tool',
					content: JSON.stringify({ error: 'Tool execution failed' }),
					tool_call_id: tc.id
				});
			} else {
				results.push({
					role: 'tool',
					content: JSON.stringify(result),
					tool_call_id: tc.id
				});
			}
		}

		return results;
	};
}
