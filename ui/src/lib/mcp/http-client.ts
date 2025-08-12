/**
 * HTTP-based MCP Client for Cloudflare Workers
 * This client translates MCP protocol to HTTP requests
 */

import { fetchWithUserAgent } from '../utils/httpClient';

export interface MCPTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface MCPResponse {
	content?: Array<{
		type: string;
		text?: string;
		data?: unknown;
	}>;
	error?: {
		code: string;
		message: string;
	};
	[key: string]: unknown;
}

export class HTTPMCPClient {
	private baseUrl: string;
	private tools: MCPTool[] = [];
	private initialized = false;

	constructor(baseUrl: string = '/api/mcp') {
		this.baseUrl = baseUrl;
	}

	async initialize(): Promise<void> {
		const response = await fetchWithUserAgent(this.baseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ method: 'initialize' })
		});

		if (!response.ok) {
			throw new Error(`Failed to initialize: ${response.statusText}`);
		}

		const data = await response.json();
		console.log('MCP initialized:', data);

		// Load available tools
		await this.loadTools();
		this.initialized = true;
	}

	private async loadTools(): Promise<void> {
		const response = await fetchWithUserAgent(this.baseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ method: 'tools/list' })
		});

		if (!response.ok) {
			throw new Error(`Failed to load tools: ${response.statusText}`);
		}

		const data = await response.json();
		this.tools = data.tools || [];
	}

	async callTool(name: string, args: unknown): Promise<MCPResponse> {
		if (!this.initialized) {
			await this.initialize();
		}

		const response = await fetchWithUserAgent(this.baseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				method: 'tools/call',
				params: {
					name,
					arguments: args
				}
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || `Tool call failed: ${response.statusText}`);
		}

		return response.json();
	}

	async ping(): Promise<boolean> {
		try {
			const response = await fetchWithUserAgent(this.baseUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ method: 'ping' })
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	getTools(): MCPTool[] {
		return this.tools;
	}

	getTool(name: string): MCPTool | undefined {
		return this.tools.find((t) => t.name === name);
	}
}

// Helper function for using the client
export async function createMCPClient(baseUrl?: string): Promise<HTTPMCPClient> {
	const client = new HTTPMCPClient(baseUrl);
	await client.initialize();
	return client;
}
