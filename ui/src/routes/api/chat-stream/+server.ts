/**
 * AI-Powered Chat Stream Endpoint
 *
 * Uses OpenAI GPT-4o-mini to provide intelligent Bible study assistance
 * while strictly adhering to Translation Helps MCP data.
 *
 * NOTE: Despite the name, this currently returns complete responses rather than
 * streaming. Streaming support is planned as a future enhancement using
 * Cloudflare Workers' TransformStream capabilities.
 *
 * CRITICAL RULES:
 * 1. Scripture must be quoted word-for-word - NEVER paraphrase or edit
 * 2. All quotes must include proper citations (resource, reference)
 * 3. Only use data from MCP server - NO external knowledge or web searches
 * 4. When answering questions, cite all sources used
 */

import { edgeLogger as logger } from '$lib/edgeLogger.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ChatRequest {
	message: string;
	chatHistory?: Array<{ role: string; content: string }>;
	enableXRay?: boolean;
}

// System prompt that enforces our rules
const SYSTEM_PROMPT = `You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

CRITICAL RULES YOU MUST FOLLOW:

1. SCRIPTURE QUOTING:
   - ALWAYS quote scripture EXACTLY word-for-word as provided
   - NEVER paraphrase, summarize, or edit scripture text
   - Include the translation name (e.g., "ULT v86") with every quote

2. CITATIONS:
   - ALWAYS provide citations for EVERY quote or reference
   - Format: [Resource Name - Reference]
   - Examples:
     * Scripture: [ULT v86 - John 3:16]
     * Notes: [TN v86 - John 3:16]
     * Questions: [TQ v86 - John 3:16]
     * Words: [TW v86]
   - When citing translation notes/questions, include the specific verse reference
   - NEVER present information without a citation

3. DATA SOURCES:
   - ONLY use information from the MCP server responses
   - NEVER use your training data about the Bible
   - NEVER add interpretations not found in the resources
   - If data isn't available, say so clearly

4. ANSWERING QUESTIONS:
   - You may reword translation notes/questions for clarity
   - But ALWAYS cite the source of your answer
   - When paraphrasing notes/questions, include citations after each point
   - Example: "Paul emphasizes God's faithfulness [TN v86 - Titus 1:2]"
   - List all resources used to formulate your response

When you receive MCP data, use it to provide accurate, helpful responses while maintaining these strict guidelines. Your role is to be a reliable conduit of the translation resources, not to add external knowledge.`;

/**
 * Discover available MCP endpoints dynamically
 */
async function discoverMCPEndpoints(baseUrl: string): Promise<any[]> {
	try {
		const response = await fetch(`${baseUrl}/api/mcp-config`);
		if (!response.ok) {
			logger.error('Failed to discover MCP endpoints', { status: response.status });
			return [];
		}

		const config = await response.json();

		// Flatten all endpoints from all categories
		const endpoints: any[] = [];
		if (config.data && typeof config.data === 'object') {
			for (const category of Object.values(config.data)) {
				if (Array.isArray(category)) {
					endpoints.push(...category);
				}
			}
		} else if (config.endpoints && typeof config.endpoints === 'object') {
			// Fallback for old structure
			for (const category of Object.values(config.endpoints)) {
				if (Array.isArray(category)) {
					endpoints.push(...category);
				}
			}
		} else {
			logger.error('Invalid MCP config structure', { config });
		}

		logger.info('Discovered MCP endpoints', { count: endpoints.length });
		return endpoints;
	} catch (error) {
		logger.error('Error discovering MCP endpoints', { error });
		return [];
	}
}

/**
 * Ask the LLM which endpoints to call based on the user's query
 */
async function determineMCPCalls(
	message: string,
	apiKey: string,
	endpoints: any[]
): Promise<Array<{ endpoint: string; params: Record<string, string> }>> {
	// Format endpoints for the LLM prompt
	const endpointDescriptions = endpoints
		.map((ep) => {
			const params = ep.parameters?.map((p: any) => p.name || p).join(', ') || '';
			const supportsFormats = ep.supportsFormats ? ' (supports format=json|md|text)' : '';
			return `- ${ep.path.replace('/api/', '')}: ${ep.description}${supportsFormats}\n  Parameters: ${params}`;
		})
		.join('\n');

	const prompt = `Based on the user's query, determine which MCP endpoints to call. Return a JSON array of endpoint calls.

Available endpoints:
${endpointDescriptions}

User query: "${message}"

Return ONLY a JSON array like this (no markdown, no explanation):
[
  {
    "endpoint": "fetch-scripture",
    "params": {
      "reference": "John 3:16",
      "language": "en",
      "organization": "unfoldingWord",
      "format": "md"
    }
  }
]

Important:
- The endpoint field should be the path without '/api/' prefix
- All parameters should be strings
- Include all required parameters based on the endpoint description
- For endpoints that support formats, choose the most appropriate:
  - "md" (Markdown) for human-readable content you'll quote
  - "text" for simple plain text needs
  - "json" only if you need structured data processing
- Default to "md" format when available for better readability
- If no endpoints are needed, return an empty array: []`;

	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that determines which API endpoints to call based on user queries. Return only valid JSON.'
					},
					{ role: 'user', content: prompt }
				],
				temperature: 0.1,
				max_tokens: 500
			})
		});

		if (!response.ok) {
			logger.error('Failed to determine MCP calls', { status: response.status });
			return [];
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content || '[]';

		// Parse the JSON response
		try {
			const calls = JSON.parse(content);
			return Array.isArray(calls) ? calls : [];
		} catch (parseError) {
			logger.error('Failed to parse LLM response', { content, parseError });
			return [];
		}
	} catch (error) {
		logger.error('Error calling OpenAI for endpoint determination', { error });
		return [];
	}
}

/**
 * Execute the MCP calls determined by the LLM
 */
async function executeMCPCalls(
	calls: Array<{ endpoint: string; params: Record<string, string> }>,
	baseUrl: string
): Promise<{ data: any[]; apiCalls: any[] }> {
	const data: any[] = [];
	const apiCalls: any[] = [];

	for (const call of calls) {
		const startTime = Date.now();
		try {
			// Build query string - let the LLM decide the format
			const queryParams = new URLSearchParams(call.params);

			const url = `${baseUrl}/api/${call.endpoint}?${queryParams}`;
			logger.info('Executing MCP call', { endpoint: call.endpoint, params: call.params });

			const response = await fetch(url);
			const duration = Date.now() - startTime;

			if (response.ok) {
				// Check content type to determine how to parse response
				const contentType = response.headers.get('content-type') || '';
				let result;

				if (contentType.includes('application/json')) {
					result = await response.json();
				} else {
					// For markdown or text responses
					result = await response.text();
				}

				data.push({
					type: call.endpoint,
					params: call.params,
					result
				});
				apiCalls.push({
					endpoint: call.endpoint,
					params: call.params,
					duration: `${duration}ms`,
					status: response.status
				});
			} else {
				logger.error('MCP call failed', {
					endpoint: call.endpoint,
					status: response.status,
					statusText: response.statusText
				});
				apiCalls.push({
					endpoint: call.endpoint,
					params: call.params,
					duration: `${duration}ms`,
					status: response.status,
					error: response.statusText
				});
			}
		} catch (error) {
			logger.error('Failed to execute MCP call', {
				endpoint: call.endpoint,
				error
			});
			apiCalls.push({
				endpoint: call.endpoint,
				params: call.params,
				duration: `${Date.now() - startTime}ms`,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	return { data, apiCalls };
}

/**
 * Format MCP data for OpenAI context
 */
function formatDataForContext(data: any[]): string {
	let context = 'Available MCP Data:\n\n';

	for (const item of data) {
		const format = item.params?.format || 'json';

		// If the response is already in Markdown or Text format, use it directly
		if (format === 'md' || format === 'text') {
			if (typeof item.result === 'string') {
				context += `[${item.type} - ${JSON.stringify(item.params)}]\n${item.result}\n\n`;
				continue;
			}
		}

		// Handle JSON responses with structure
		if (item.type === 'fetch-scripture' && item.result.scripture) {
			context += `Scripture for ${item.params.reference}:\n`;
			for (const verse of item.result.scripture) {
				context += `- ${verse.translation}: "${verse.text}"\n`;
			}
			context += '\n';
		} else if (item.type === 'translation-notes' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TN';
			const version = metadata.version || '';
			context += `Translation Notes for ${item.params.reference} [${source} ${version}]:\n`;
			for (const note of item.result.items) {
				const noteRef = note.Reference || item.params.reference;
				context += `- ${note.Quote || 'General'}: ${note.Note} [${source} ${version} - ${noteRef}]\n`;
			}
			context += '\n';
		} else if (item.type === 'translation-questions' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TQ';
			const version = metadata.version || '';
			context += `Study Questions for ${item.params.reference} [${source} ${version}]:\n`;
			for (const q of item.result.items) {
				const qRef = q.Reference || item.params.reference;
				context += `- Q: ${q.Question}\n  A: ${q.Response} [${source} ${version} - ${qRef}]\n`;
			}
			context += '\n';
		} else if (item.type === 'fetch-translation-words' && item.result.items) {
			const metadata = item.result.metadata || {};
			const source = metadata.source || 'TW';
			const version = metadata.version || '';
			context += `Translation Words [${source} ${version}]:\n`;
			for (const word of item.result.items) {
				context += `- ${word.term}: ${word.definition} [${source} ${version}]\n`;
			}
			context += '\n';
		} else {
			// Fallback for any other data type
			context += `[${item.type}]\n${JSON.stringify(item.result, null, 2)}\n\n`;
		}
	}

	return context;
}

/**
 * Call OpenAI with our data and rules
 */
async function callOpenAI(
	message: string,
	context: string,
	chatHistory: Array<{ role: string; content: string }> = []
): Promise<{ response: string; error?: string }> {
	const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

	if (!apiKey) {
		return {
			response: '',
			error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
		};
	}

	try {
		const messages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'system', content: context },
			...chatHistory.slice(-6), // Keep last 6 messages for context
			{ role: 'user', content: message }
		];

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages,
				temperature: 0.3, // Lower temperature for more factual responses
				max_tokens: 1000
			})
		});

		if (!response.ok) {
			const error = await response.text();
			logger.error('OpenAI API error', { status: response.status, error });
			return {
				response: '',
				error: `OpenAI API error: ${response.status}`
			};
		}

		const data = await response.json();
		return {
			response: data.choices[0]?.message?.content || 'No response generated'
		};
	} catch (error) {
		logger.error('Failed to call OpenAI', { error });
		return {
			response: '',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

export const POST: RequestHandler = async ({ request, url, platform }) => {
	const startTime = Date.now();

	try {
		const { message, chatHistory = [], enableXRay = false }: ChatRequest = await request.json();
		const baseUrl = `${url.protocol}//${url.host}`;

		logger.info('Chat stream request', { message, historyLength: chatHistory.length });

		// Check for API key - try multiple sources
		const apiKey =
			// Cloudflare Workers env binding
			platform?.env?.OPENAI_API_KEY ||
			// Local development
			process.env.OPENAI_API_KEY ||
			// Vite client env (shouldn't be used but as fallback)
			import.meta.env.VITE_OPENAI_API_KEY;

		if (!apiKey) {
			logger.error('OpenAI API key not found in any environment source');
			return json(
				{
					success: false,
					error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Step 1: Discover available endpoints dynamically
		const endpoints = await discoverMCPEndpoints(baseUrl);
		if (endpoints.length === 0) {
			return json(
				{
					success: false,
					error: 'Failed to discover MCP endpoints',
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		// Step 2: Let the LLM decide which endpoints to call
		const endpointCalls = await determineMCPCalls(message, apiKey, endpoints);

		// Step 3: Execute the MCP calls
		const { data, apiCalls } = await executeMCPCalls(endpointCalls, baseUrl);

		// Step 4: Format data for OpenAI context
		const context = formatDataForContext(data);

		// Step 5: Call OpenAI with the data
		const { response, error } = await callOpenAI(message, context, chatHistory);

		if (error) {
			return json(
				{
					success: false,
					error,
					timestamp: new Date().toISOString()
				},
				{ status: 500 }
			);
		}

		const totalDuration = Date.now() - startTime;

		// Build response to match ChatInterface expectations
		const result: any = {
			success: true,
			content: response, // ChatInterface expects 'content', not 'response'
			timestamp: new Date().toISOString(),
			contextUsed: {
				type: 'mcp-data',
				endpoints: apiCalls.map((c) => c.endpoint),
				dataPoints: data.length
			},
			metadata: {
				model: 'gpt-4o-mini',
				streaming: false,
				duration: totalDuration
			}
		};

		// Add X-ray data if requested
		if (enableXRay) {
			result.xrayData = {
				queryType: 'ai-assisted',
				apiCallsCount: apiCalls.length,
				totalDuration,
				totalTime: totalDuration,
				hasErrors: false,
				apiCalls,
				// Transform apiCalls to tools format for XRayPanel
				tools: apiCalls.map((call, index) => ({
					id: `tool-${index}`,
					name: call.endpoint,
					duration: parseInt(call.duration.replace('ms', '')) || 0,
					cached: false, // We don't have cache info from the basic API calls
					params: call.params,
					status: call.status,
					error: call.error
				}))
			};
		}

		return json(result, {
			headers: {
				'X-Chat-Model': 'gpt-4o-mini',
				'X-Chat-Duration': `${totalDuration}ms`,
				'X-Chat-API-Calls': String(apiCalls.length)
			}
		});
	} catch (error) {
		logger.error('Chat stream error', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			type: error?.constructor?.name
		});

		// Return more detailed error in development
		const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
				timestamp: new Date().toISOString(),
				...(isDev && {
					details: {
						message: error instanceof Error ? error.message : 'Unknown error',
						stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
						type: error?.constructor?.name
					}
				})
			},
			{ status: 500 }
		);
	}
};
