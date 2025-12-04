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

		// Log received parameters (before defaults are applied)
		console.log(
			`[UNIFIED HANDLER] Received parameters for ${toolName}:`,
			JSON.stringify(args, null, 2)
		);

		// Validate required parameters
		for (const param of tool.requiredParams) {
			if (!args[param]) {
				throw new Error(`Missing required parameter: ${param}`);
			}
		}

		// Build query parameters with defaults
		const params = new URLSearchParams();

		// Apply defaults based on common parameter patterns
		const finalArgs = { ...args };
		if (!finalArgs.language) finalArgs.language = 'en';
		if (!finalArgs.organization) finalArgs.organization = 'unfoldingWord';
		if (!finalArgs.format) finalArgs.format = 'md'; // Default to MARKDOWN - LLM-friendly output!

		// Log final parameters (after defaults)
		console.log(
			`[UNIFIED HANDLER] Final parameters (with defaults) for ${toolName}:`,
			JSON.stringify(finalArgs, null, 2)
		);

		Object.entries(finalArgs).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params.set(key, String(value));
			}
		});

		// Call the endpoint
		// Ensure we don't accidentally produce 'undefined' in the URL
		const base = this.baseUrl || '';
		const response = await this.fetchFn(`${base}${tool.endpoint}?${params}`);

		if (!response.ok) {
			// Try to get more helpful error message from the response
			let errorDetail = '';
			try {
				const errorBody = await response.json();
				errorDetail = errorBody.message || errorBody.error || '';
			} catch {
				// Couldn't parse error body
			}

			// Provide helpful guidance based on the tool and error
			let helpfulMessage = `Tool '${toolName}' failed with status ${response.status}.`;

			if (response.status === 404) {
				if (toolName === 'fetch_translation_word') {
					const term = args.term || args.path || 'unknown';
					helpfulMessage =
						`Term '${term}' not found in Translation Words. ` +
						`This resource uses English terms (like 'love', 'grace', 'faith'), not Greek/Hebrew words. ` +
						`If looking for a Greek term like 'agape' or 'phileo', try searching for 'love' instead. ` +
						`You can also use search_biblical_resources to find related content.`;
				} else if (toolName === 'fetch_translation_academy') {
					helpfulMessage =
						`Module not found in Translation Academy. ` +
						`Try using search_biblical_resources to find the correct module ID.`;
				} else {
					helpfulMessage = `Resource not found. ${errorDetail}`;
				}
			}

			throw new Error(helpfulMessage);
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
		let isMarkdownResponse = false;

		if (contentType.includes('application/json')) {
			data = await response.json();
		} else if (contentType.includes('text/markdown') || contentType.includes('text/plain')) {
			// For markdown or text responses, return the text directly - don't parse or transform it!
			// This is the LLM-friendly output format - no parsing needed
			const text = await response.text();
			isMarkdownResponse = true;
			data = { _rawMarkdown: text };
		} else {
			// For other content types, get as text
			const text = await response.text();
			// Try to parse as JSON first (some endpoints return JSON with text content-type)
			try {
				data = JSON.parse(text);
			} catch {
				// If not JSON, treat as raw text
				data = { _rawMarkdown: text };
				isMarkdownResponse = true;
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
		// Use finalArgs.format which includes defaults
		const format = finalArgs.format || 'json';
		console.log(`[UNIFIED HANDLER] Format determined for ${toolName}:`, format);

		// If we received markdown/text directly from endpoint, return it as-is (LLM-friendly!)
		if (isMarkdownResponse && data._rawMarkdown) {
			console.log(`[UNIFIED HANDLER] Returning raw markdown response for ${toolName}`);
			const result: MCPToolResponse = {
				content: [
					{
						type: 'text',
						text: data._rawMarkdown
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
			}

			return result;
		}

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

		// Format the response consistently for non-JSON formats (fallback to formatter)
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
