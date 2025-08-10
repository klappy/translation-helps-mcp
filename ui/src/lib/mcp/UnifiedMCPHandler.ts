/**
 * Unified MCP Handler
 * Single source of truth for all MCP tool calls
 */

import {
	ToolRegistry,
	ToolFormatters,
	type MCPToolResponse
} from '../../../../src/contracts/ToolContracts';

export class UnifiedMCPHandler {
	private baseUrl: string;

	constructor(baseUrl: string = '') {
		this.baseUrl = baseUrl;
	}

	/**
	 * Handle any MCP tool call consistently
	 */
	async handleToolCall(toolName: string, args: any): Promise<MCPToolResponse> {
		const tool = ToolRegistry[toolName as keyof typeof ToolRegistry];

		if (!tool) {
			throw new Error(`Unknown tool: ${toolName}`);
		}

		// Validate required parameters
		for (const param of tool.requiredParams) {
			if (!args[param]) {
				throw new Error(`Missing required parameter: ${param}`);
			}
		}

		// Build query parameters
		const params = new URLSearchParams();
		Object.entries(args).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params.set(key, String(value));
			}
		});

		// Call the endpoint
		const response = await fetch(`${this.baseUrl}${tool.endpoint}?${params}`);

		if (!response.ok) {
			throw new Error(`Tool endpoint failed: ${response.status}`);
		}

		const data = await response.json();

		// Format the response consistently
		const formattedText = tool.formatter(data);

		return {
			content: [
				{
					type: 'text',
					text: formattedText
				}
			]
		};
	}

	/**
	 * Get tool metadata
	 */
	getToolList() {
		return Object.entries(ToolRegistry).map(([name, config]) => ({
			name,
			endpoint: config.endpoint,
			requiredParams: config.requiredParams
		}));
	}
}

// Export singleton instance
export const mcpHandler = new UnifiedMCPHandler();
