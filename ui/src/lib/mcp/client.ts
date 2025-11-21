/**
 * MCP Client Utility using @translation-helps/mcp-client SDK
 *
 * This provides a clean interface for the chat API to interact with the MCP server
 * using the official SDK instead of direct HTTP calls.
 */

import { TranslationHelpsClient } from '@translation-helps/mcp-client';
import type { MCPTool, MCPPrompt, MCPResponse } from '@translation-helps/mcp-client';

let clientInstance: TranslationHelpsClient | null = null;

/**
 * Get or create the MCP client instance
 */
export function getMCPClient(serverUrl?: string, enableMetrics = false): TranslationHelpsClient {
	if (!clientInstance) {
		clientInstance = new TranslationHelpsClient({
			serverUrl: serverUrl || undefined, // Will use default if not provided
			timeout: 30000,
			enableMetrics // Enable metrics collection for development
		});
	} else if (enableMetrics && !clientInstance['enableMetrics']) {
		// If metrics were requested but client doesn't have them, create new instance
		clientInstance = new TranslationHelpsClient({
			serverUrl: serverUrl || clientInstance['serverUrl'],
			timeout: 30000,
			enableMetrics: true
		});
	}
	return clientInstance;
}

/**
 * Initialize the MCP client connection
 */
export async function initializeMCPClient(
	serverUrl?: string,
	enableMetrics = false
): Promise<void> {
	const client = getMCPClient(serverUrl, enableMetrics);
	if (!client.isConnected()) {
		await client.connect();
	}
}

/**
 * List all available tools
 */
export async function listTools(serverUrl?: string, enableMetrics = false): Promise<MCPTool[]> {
	await initializeMCPClient(serverUrl, enableMetrics);
	const client = getMCPClient(serverUrl, enableMetrics);
	return await client.listTools();
}

/**
 * List all available prompts
 */
export async function listPrompts(serverUrl?: string, enableMetrics = false): Promise<MCPPrompt[]> {
	await initializeMCPClient(serverUrl, enableMetrics);
	const client = getMCPClient(serverUrl, enableMetrics);
	return await client.listPrompts();
}

/**
 * Call an MCP tool
 */
export async function callTool(
	name: string,
	arguments_: Record<string, any>,
	serverUrl?: string,
	enableMetrics = false
): Promise<MCPResponse> {
	await initializeMCPClient(serverUrl, enableMetrics);
	const client = getMCPClient(serverUrl, enableMetrics);
	return await client.callTool(name, arguments_);
}

/**
 * Get an MCP prompt (returns template/instructions)
 */
export async function getPrompt(
	name: string,
	arguments_: Record<string, any> = {},
	serverUrl?: string,
	enableMetrics = false
): Promise<MCPResponse> {
	await initializeMCPClient(serverUrl, enableMetrics);
	const client = getMCPClient(serverUrl, enableMetrics);
	return await client.getPrompt(name, arguments_);
}

/**
 * Execute an MCP prompt (executes the prompt and returns results)
 *
 * NOTE: This is NOT part of the MCP protocol. The MCP protocol's `prompts/get` only returns
 * template instructions. This function uses the REST API endpoint `/api/execute-prompt` which
 * actually executes the prompt workflow by calling multiple tools internally.
 *
 * This is a convenience function for the UI/testing, not part of the standard MCP protocol.
 */
export async function executePrompt(
	name: string,
	arguments_: Record<string, any> = {},
	enableMetrics = false
): Promise<MCPResponse> {
	const startTime = Date.now();

	// Execute prompt via the execute-prompt endpoint
	const response = await fetch('/api/execute-prompt', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			promptName: name,
			parameters: arguments_
		})
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(errorData.error || `HTTP ${response.status}`);
	}

	// Extract response data
	const data = await response.json();

	// Capture diagnostic headers for metrics
	const cacheStatus = response.headers.get('X-Cache-Status');
	const xrayTrace = response.headers.get('X-XRay-Trace');
	const responseTime = response.headers.get('X-Response-Time');
	const traceId = response.headers.get('X-Trace-Id');

	// Parse X-Ray trace if available
	let parsedXrayTrace: any = null;
	if (xrayTrace) {
		try {
			const cleaned = xrayTrace.replace(/\s+/g, '');
			parsedXrayTrace = JSON.parse(atob(cleaned));
		} catch (e) {
			// Ignore parse errors
		}
	}

	// Build MCPResponse format with metadata if metrics enabled
	const mcpResponse: MCPResponse = {
		content: [
			{
				type: 'text',
				text: JSON.stringify(data)
			}
		]
	};

	// Attach metadata if metrics are enabled
	if (enableMetrics) {
		mcpResponse.metadata = {
			responseTime: responseTime
				? parseInt(responseTime.replace(/[^0-9]/g, ''), 10)
				: Date.now() - startTime,
			cacheStatus: cacheStatus?.toLowerCase(),
			traceId,
			xrayTrace: parsedXrayTrace,
			statusCode: response.status
		};
	}

	return mcpResponse;
}

/**
 * Reset the client instance (useful for testing or reconnection)
 */
export function resetClient(): void {
	clientInstance = null;
}
