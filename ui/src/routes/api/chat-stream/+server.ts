/**
 * AI-Powered Chat Stream Endpoint
 *
 * Uses Cloudflare Workers AI (Llama 4 Scout 17B) with native tool calling
 * for intelligent Bible study assistance using Translation Helps MCP data.
 *
 * Architecture:
 * 1. MCP self-discovery - Tools fetched dynamically from MCP server
 * 2. Native tool calling - Model decides when to call tools via structured output
 * 3. Edge-native - Runs on Cloudflare Workers AI, no external API
 *
 * CRITICAL RULES:
 * 1. Scripture must be quoted word-for-word - NEVER paraphrase or edit
 * 2. All quotes must include proper citations (resource, reference)
 * 3. Only use data from MCP server - NO external knowledge or web searches
 * 4. When answering questions, cite all sources used
 */

import { SYSTEM_PROMPT } from '$lib/ai/system-prompt.js';
import {
	WORKERS_AI_MODEL,
	callWorkersAIStream,
	chatWithTools,
	mcpToolsToWorkersAI
} from '$lib/ai/workers-ai-client.js';
import { edgeLogger as logger } from '$lib/edgeLogger.js';
import { callTool, listTools } from '$lib/mcp/client.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ChatRequest {
	message: string;
	chatHistory?: Array<{ role: string; content: string }>;
	enableXRay?: boolean;
}

/**
 * Main POST handler for chat requests
 */
export const POST: RequestHandler = async ({ request, url, platform }) => {
	const startTime = Date.now();
	const timings: Record<string, number> = {};

	try {
		// Parse request
		const { message, chatHistory = [], enableXRay = false }: ChatRequest = await request.json();

		if (!message || typeof message !== 'string') {
			return json(
				{
					success: false,
					error: 'Message is required',
					timestamp: new Date().toISOString()
				},
				{ status: 400 }
			);
		}

		logger.info('Chat request received', {
			messageLength: message.length,
			historyLength: chatHistory.length,
			enableXRay
		});

		// Get Workers AI binding
		const ai = platform?.env?.AI;
		if (!ai) {
			logger.error('Workers AI binding not available');
			return json(
				{
					success: false,
					error: 'AI service not configured. Workers AI binding is missing.',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Build base URL for MCP calls
		const baseUrl = url.origin;

		// Step 1: Discover MCP tools (self-discovery - not hardcoded!)
		const discoveryStart = Date.now();
		const serverUrl = `${baseUrl}/api/mcp`;
		const mcpTools = await listTools(serverUrl);
		timings.toolDiscovery = Date.now() - discoveryStart;

		logger.info('Discovered MCP tools', {
			toolCount: mcpTools.length,
			tools: mcpTools.map((t) => t.name)
		});

		if (mcpTools.length === 0) {
			return json(
				{
					success: false,
					error: 'Failed to discover MCP tools',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Check if streaming is requested
		const streamMode =
			url.searchParams.get('stream') === '1' ||
			(request.headers.get('accept') || '').includes('text/event-stream');

		if (streamMode) {
			// Streaming response
			return handleStreamingResponse(
				ai,
				message,
				chatHistory,
				mcpTools,
				baseUrl,
				serverUrl,
				enableXRay,
				timings,
				startTime
			);
		}

		// Non-streaming response
		return handleNonStreamingResponse(
			ai,
			message,
			chatHistory,
			mcpTools,
			baseUrl,
			serverUrl,
			enableXRay,
			timings,
			startTime
		);
	} catch (error) {
		logger.error('Chat stream error', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined
		});

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};

/**
 * Handle non-streaming chat response
 */
async function handleNonStreamingResponse(
	ai: AIBinding,
	message: string,
	chatHistory: Array<{ role: string; content: string }>,
	mcpTools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>,
	baseUrl: string,
	serverUrl: string,
	enableXRay: boolean,
	timings: Record<string, number>,
	startTime: number
): Promise<Response> {
	// Execute tool function for MCP calls
	const executeToolFn = async (name: string, args: Record<string, unknown>) => {
		const toolStart = Date.now();
		const result = await callTool(name, args, serverUrl);
		logger.info('Tool executed', {
			tool: name,
			duration: Date.now() - toolStart
		});
		return result;
	};

	// Call LLM with native tool calling
	const llmStart = Date.now();
	const result = await chatWithTools(
		ai,
		message,
		chatHistory,
		mcpTools,
		SYSTEM_PROMPT,
		executeToolFn
	);
	timings.llmWithTools = Date.now() - llmStart;

	if (result.error) {
		return json(
			{
				success: false,
				error: result.error,
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}

	if (!result.content || result.content.trim() === '') {
		logger.error('Empty response from LLM', { message });
		return json(
			{
				success: false,
				error: 'No response generated from AI. Please try again.',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}

	const totalDuration = Date.now() - startTime;

	// Build response matching ChatInterface expectations
	const response: Record<string, unknown> = {
		success: true,
		content: result.content,
		timestamp: new Date().toISOString(),
		contextUsed: {
			type: 'mcp-data',
			endpoints: result.toolCalls.map((tc) => tc.name),
			dataPoints: result.toolCalls.length
		},
		metadata: {
			model: WORKERS_AI_MODEL,
			streaming: false,
			duration: totalDuration
		}
	};

	// Add X-ray data if requested
	if (enableXRay) {
		response.xrayData = buildXRayData(result.toolCalls, timings, totalDuration);
	}

	return json(response, {
		headers: {
			'X-Chat-Model': WORKERS_AI_MODEL,
			'X-Chat-Duration': `${totalDuration}ms`,
			'X-Chat-Tool-Calls': String(result.toolCalls.length)
		}
	});
}

/**
 * Handle streaming chat response via SSE
 */
async function handleStreamingResponse(
	ai: AIBinding,
	message: string,
	chatHistory: Array<{ role: string; content: string }>,
	mcpTools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown> }>,
	baseUrl: string,
	serverUrl: string,
	enableXRay: boolean,
	timings: Record<string, number>,
	startTime: number
): Promise<Response> {
	// Convert MCP tools to Workers AI format
	const tools = mcpToolsToWorkersAI(mcpTools);

	// Build messages array
	const messages: WorkersAIMessage[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		...chatHistory.slice(-6).map((msg) => ({
			role: msg.role as 'user' | 'assistant',
			content: msg.content
		})),
		{ role: 'user', content: message }
	];

	// Tool execution tracking for X-Ray
	const executedTools: Array<{
		name: string;
		args: Record<string, unknown>;
		duration: number;
		result: unknown;
	}> = [];

	// Create tool executor that tracks execution
	const onToolCalls = async (toolCalls: WorkersAIToolCall[]): Promise<WorkersAIMessage[]> => {
		const results: WorkersAIMessage[] = [];

		for (const tc of toolCalls) {
			const toolStart = Date.now();
			try {
				const args = JSON.parse(tc.function.arguments);
				const result = await callTool(tc.function.name, args, serverUrl);

				executedTools.push({
					name: tc.function.name,
					args,
					duration: Date.now() - toolStart,
					result
				});

				results.push({
					role: 'tool',
					content: JSON.stringify(result),
					tool_call_id: tc.id
				});
			} catch (error) {
				logger.error('Tool execution failed', { tool: tc.function.name, error });
				results.push({
					role: 'tool',
					content: JSON.stringify({ error: 'Tool execution failed' }),
					tool_call_id: tc.id
				});
			}
		}

		return results;
	};

	// Build initial X-Ray data
	const xrayInit = enableXRay
		? {
				queryType: 'ai-assisted',
				model: WORKERS_AI_MODEL,
				toolsAvailable: mcpTools.length,
				timings: {
					toolDiscovery: timings.toolDiscovery || 0
				}
			}
		: undefined;

	// Create streaming response
	const sseStream = await callWorkersAIStream(ai, messages, {
		tools,
		toolChoice: 'auto',
		onToolCalls,
		xrayInit,
		timings,
		startTime
	});

	return new Response(sseStream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-store',
			'X-Chat-Model': WORKERS_AI_MODEL,
			'X-Chat-Duration': `${Date.now() - startTime}ms`
		}
	});
}

/**
 * Build X-Ray data structure for debugging UI
 */
function buildXRayData(
	toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>,
	timings: Record<string, number>,
	totalDuration: number
): Record<string, unknown> {
	return {
		queryType: 'ai-assisted-native-tools',
		apiCallsCount: toolCalls.length,
		totalDuration,
		totalTime: totalDuration,
		hasErrors: false,
		// Transform tool calls to match XRayPanel expectations
		tools: toolCalls.map((tc, index) => ({
			id: `tool-${index}`,
			name: tc.name,
			params: tc.args,
			status: 200,
			cacheStatus: 'miss',
			response: tc.result
		})),
		timings: {
			toolDiscovery: timings.toolDiscovery || 0,
			llmWithTools: timings.llmWithTools || 0,
			total: totalDuration,
			breakdown: {
				'Tool Discovery': `${timings.toolDiscovery || 0}ms (${Math.round(((timings.toolDiscovery || 0) / totalDuration) * 100)}%)`,
				'LLM + Tool Execution': `${timings.llmWithTools || 0}ms (${Math.round(((timings.llmWithTools || 0) / totalDuration) * 100)}%)`
			}
		}
	};
}
