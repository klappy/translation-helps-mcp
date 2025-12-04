/**
 * Orchestrated Chat Endpoint
 *
 * Uses multi-agent orchestration for complex Bible study queries.
 * Dispatches specialized agents (scripture, notes, words, academy, search)
 * in parallel and synthesizes their findings.
 *
 * Features:
 * - Orchestrator plans which agents to dispatch
 * - Parallel agent execution for speed
 * - Multi-round iteration when needed
 * - Full streaming of agent thoughts and synthesis
 */

import { orchestratedChat } from '$lib/ai/orchestrated-chat.js';
import { mcpToolsToWorkersAI } from '$lib/ai/workers-ai-client.js';
import { edgeLogger as logger } from '$lib/edgeLogger.js';
import { callTool, listTools } from '$lib/mcp/client.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ChatRequest {
	message: string;
	chatHistory?: Array<{ role: string; content: string }>;
	config?: {
		maxIterations?: number;
		confidenceThreshold?: number;
		parallelExecution?: boolean;
	};
}

/**
 * POST handler for orchestrated chat
 */
export const POST: RequestHandler = async ({ request, url, platform }) => {
	const startTime = Date.now();

	try {
		const { message, chatHistory = [], config = {} }: ChatRequest = await request.json();

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

		logger.info('Orchestrated chat request', {
			messageLength: message.length,
			historyLength: chatHistory.length
		});

		// Get Workers AI binding
		const ai = platform?.env?.AI;
		if (!ai) {
			logger.error('Workers AI binding not available');
			return json(
				{
					success: false,
					error: 'AI service not configured',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Discover MCP tools
		const baseUrl = url.origin;
		const serverUrl = `${baseUrl}/api/mcp`;
		const mcpTools = await listTools(serverUrl);

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

		// Convert MCP tools to Workers AI format
		const tools = mcpToolsToWorkersAI(mcpTools);

		// Create tool executor
		const executeToolFn = async (name: string, args: Record<string, unknown>) => {
			const toolStart = Date.now();
			const result = await callTool(name, args, serverUrl);
			logger.debug('Tool executed', {
				tool: name,
				duration: Date.now() - toolStart
			});
			return result;
		};

		// Run orchestrated chat
		const stream = await orchestratedChat(ai, message, chatHistory, tools, executeToolFn, {
			maxIterations: config.maxIterations ?? 2,
			confidenceThreshold: config.confidenceThreshold ?? 0.5,
			enableStreaming: true,
			parallelExecution: config.parallelExecution ?? true
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-store',
				'X-Chat-Mode': 'orchestrated',
				'X-Chat-Duration': `${Date.now() - startTime}ms`
			}
		});
	} catch (error) {
		logger.error('Orchestrated chat error', {
			error: error instanceof Error ? error.message : 'Unknown error'
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
 * GET handler for health check
 */
export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		mode: 'orchestrated',
		features: ['multi-agent', 'parallel-execution', 'streaming', 'iteration']
	});
};
