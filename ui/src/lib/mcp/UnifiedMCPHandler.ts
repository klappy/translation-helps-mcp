/**
 * Unified MCP Handler
 * Single source of truth for all MCP tool calls
 */

import { ToolRegistry, type MCPToolResponse } from '../../../../src/contracts/ToolContracts';

export class UnifiedMCPHandler {
	private baseUrl: string;
	private fetchFn: typeof fetch;

	constructor(baseUrl: string = '', fetchFn?: typeof fetch) {
		// Default to empty (relative) base; caller may pass absolute when needed
		this.baseUrl = baseUrl;
		// Use provided fetch function (for SvelteKit event.fetch) or fallback to global fetch
		this.fetchFn = fetchFn || fetch;
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
		// Ensure we don't accidentally produce 'undefined' in the URL
		const base = this.baseUrl || '';
		const response = await this.fetchFn(`${base}${tool.endpoint}?${params}`);

		if (!response.ok) {
			throw new Error(`Tool endpoint failed: ${response.status}`);
		}

		// Capture diagnostic headers for metrics/debugging
		const cacheStatus = response.headers.get('X-Cache-Status');
		const xrayTrace = response.headers.get('X-XRay-Trace');
		const responseTime = response.headers.get('X-Response-Time');
		const traceId = response.headers.get('X-Trace-Id');

		console.log(`[UNIFIED HANDLER] Captured headers from ${tool.endpoint}:`, {
			cacheStatus,
			hasXrayTrace: !!xrayTrace,
			responseTime,
			traceId
		});

		// Handle both JSON and text/markdown responses
		const contentType = response.headers.get('content-type') || '';
		let data: any;

		if (contentType.includes('application/json')) {
			data = await response.json();
		} else {
			// For markdown or text responses, get as text
			const text = await response.text();
			// Try to parse as JSON first (some endpoints return JSON with text content-type)
			try {
				data = JSON.parse(text);
			} catch {
				// If not JSON, wrap in a structure that formatters can handle
				data = { text, raw: text };
			}
		}

		// Parse X-Ray trace if available
		let parsedXrayTrace: any = null;
		if (xrayTrace) {
			try {
				const cleaned = xrayTrace.replace(/\s+/g, '');
				parsedXrayTrace = JSON.parse(atob(cleaned));
				console.log(`[UNIFIED HANDLER] Parsed X-Ray trace:`, {
					hasCacheStats: !!parsedXrayTrace.cacheStats,
					apiCalls: parsedXrayTrace.apiCalls?.length || 0
				});
			} catch (e) {
				console.warn(`[UNIFIED HANDLER] Failed to parse X-Ray trace:`, e);
			}
		}

		// Check if format is JSON - if so, return raw structured data instead of formatting
		const format = args.format || 'text';
		if (format === 'json' || format === 'JSON') {
			// Return raw JSON data structure with metadata
			const result: MCPToolResponse = {
				content: [
					{
						type: 'text',
						text: JSON.stringify(data)
					}
				]
			};

			// Attach metadata if available
			if (cacheStatus || parsedXrayTrace || responseTime || traceId) {
				(result as any).metadata = {
					cacheStatus: cacheStatus?.toLowerCase(),
					responseTime: responseTime
						? parseInt(responseTime.replace(/[^0-9]/g, ''), 10)
						: undefined,
					traceId,
					xrayTrace: parsedXrayTrace
				};
				console.log(`[UNIFIED HANDLER] Attached metadata to response:`, (result as any).metadata);
			}

			return result;
		}

		// Format the response consistently for non-JSON formats
		const formattedText = tool.formatter(data);

		const result: MCPToolResponse = {
			content: [
				{
					type: 'text',
					text: formattedText
				}
			]
		};

		// Attach metadata for non-JSON formats too
		if (cacheStatus || parsedXrayTrace || responseTime || traceId) {
			(result as any).metadata = {
				cacheStatus: cacheStatus?.toLowerCase(),
				responseTime: responseTime ? parseInt(responseTime.replace(/[^0-9]/g, ''), 10) : undefined,
				traceId,
				xrayTrace: parsedXrayTrace
			};
			console.log(
				`[UNIFIED HANDLER] Attached metadata to formatted response:`,
				(result as any).metadata
			);
		}

		return result;
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
