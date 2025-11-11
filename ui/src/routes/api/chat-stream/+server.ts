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

// Load environment variables from .env file for local development
import { config } from 'dotenv';

// Try to load .env from ui directory (for local dev with Vite)
// In production (Cloudflare), this will be ignored and platform.env is used
try {
	config({ path: '.env' }); // Looks in current working directory (ui/)
} catch (e) {
	// Ignore errors - .env might not exist in production
}

import { initializeKVCache } from '$lib/../../../src/functions/kv-cache.js';
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

5. TRANSLATION NOTES STRUCTURE:
   - Translation notes contain several fields for each entry:
     * Quote: Contains the Greek/Hebrew text being explained (this is the original language phrase)
     * Note: The explanation or commentary about that phrase
     * Reference: The verse reference
     * ID: Unique identifier for the note
     * SupportReference: Additional biblical references if applicable
   - When asked about Greek/Hebrew quotes, the "Quote" field in translation notes contains that original language text
   - Each note explains a specific Greek/Hebrew phrase found in the original biblical text

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
	endpoints: any[],
	chatHistory: Array<{ role: string; content: string }> = []
): Promise<Array<{ endpoint: string; params: Record<string, string> }>> {
	// Format endpoints for the LLM prompt
	const endpointDescriptions = endpoints
		.map((ep) => {
			const rawParams = ep.parameters || ep.params || [];
			const endpointName = (ep.path || '')
				.toString()
				.replace(/^\/api\//, '')
				.replace(/^\//, '');

			// Build detailed param descriptions
			let paramDetails = '';
			if (Array.isArray(rawParams)) {
				paramDetails = rawParams
					.map((p: any) =>
						typeof p === 'string' ? `- ${p}` : `- ${p.name || p.key || p.param || ''}`
					)
					.filter(Boolean)
					.join('\n');
			} else if (rawParams && typeof rawParams === 'object') {
				paramDetails = Object.entries(rawParams)
					.map(([name, def]: [string, any]) => {
						const required = def?.required ? 'required' : 'optional';
						const type = def?.type || 'string';
						const desc = def?.description ? ` - ${def.description}` : '';
						const ex =
							def?.example !== undefined ? `; example: ${JSON.stringify(def.example)}` : '';
						const opts =
							Array.isArray(def?.options) && def.options.length
								? `; options: ${def.options.join('|')}`
								: '';
						const dflt =
							def?.default !== undefined ? `; default: ${JSON.stringify(def.default)}` : '';
						return `- ${name} (${required}, ${type})${desc}${ex}${opts}${dflt}`;
					})
					.join('\n');
			}

			// Include an example params block if provided on endpoint config
			let exampleBlock = '';
			if (Array.isArray(ep.examples) && ep.examples.length && ep.examples[0]?.params) {
				exampleBlock = `\nExample params: ${JSON.stringify(ep.examples[0].params)}`;
			}

			// Special guidance for get-translation-word
			const specialNote =
				endpointName === 'get-translation-word'
					? `\nNotes: Provide either term (preferred) or path ending with .md. Do not include reference. Use format=md for full article output.`
					: '';

			return `- ${endpointName}: ${ep.description || ''}\n  Parameters:\n${paramDetails || '  (none)'}${exampleBlock}${specialNote}`;
		})
		.join('\n');

	// Build context from recent chat history
	const recentContext = chatHistory
		.slice(-4) // Last 4 messages for context
		.map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}...`) // Limit content length
		.join('\n');

	const prompt = `Based on the user's query and conversation context, determine which MCP endpoints to call. Return a JSON array of endpoint calls.

${recentContext ? `Recent conversation:\n${recentContext}\n\n` : ''}Available endpoints:
${endpointDescriptions}

Current user query: "${message}"

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
- If no endpoints are needed (e.g., for greetings, general questions, or non-biblical queries), return an empty array: []
- Return an empty array if the query is asking about capabilities, help, or non-resource questions`;

	// Add timeout
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
			}),
			signal: controller.signal
		});
		clearTimeout(timeout);

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
		clearTimeout(timeout);

		// Log timeout errors specifically
		if (error instanceof Error && error.name === 'AbortError') {
			logger.error('Timeout determining MCP calls after 15 seconds');
		} else {
			logger.error('Error calling OpenAI for endpoint determination', { error });
		}
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
			// Normalize endpoint name: strip leading /api/ and leading /
			const endpointName = (call.endpoint || '')
				.toString()
				.replace(/^\/api\//, '')
				.replace(/^\//, '');
			// Normalize params with sensible defaults to avoid LLM omissions
			const normalizedParams: Record<string, string> = {
				...call.params
			};
			if (!normalizedParams.language) normalizedParams.language = 'en';
			if (!normalizedParams.organization) normalizedParams.organization = 'unfoldingWord';
			// Param aliasing for robustness (LLM may send 'word' instead of 'term')
			if (endpointName === 'get-translation-word') {
				if (!normalizedParams.term && (normalizedParams.word || normalizedParams.termName)) {
					normalizedParams.term = normalizedParams.word || normalizedParams.termName;
					delete normalizedParams.word;
					delete normalizedParams.termName;
				}
				// Reference is not required for this endpoint; ignore if present
				if (normalizedParams.reference) delete normalizedParams.reference;
				// If LLM supplied an invalid path (e.g., "bible"), drop it to avoid 400s
				if (normalizedParams.path && !/\.md$/i.test(normalizedParams.path)) {
					delete normalizedParams.path;
				}
			}
			// Prefer markdown for human-readable resources when format is omitted
			if (
				!normalizedParams.format &&
				[
					'fetch-scripture',
					'translation-notes',
					'translation-questions',
					'fetch-translation-words',
					'fetch-translation-academy',
					'get-translation-word'
				].includes(endpointName)
			) {
				normalizedParams.format = 'md';
			}

			// Build query string
			const queryParams = new URLSearchParams(normalizedParams);

			const url = `${baseUrl}/api/${endpointName}?${queryParams}`;
			logger.info('Executing MCP call', { endpoint: endpointName, params: normalizedParams });

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

				// Extract cache status from headers
				const cacheStatus = response.headers.get('X-Cache-Status') || 'miss';

				data.push({
					type: endpointName,
					params: normalizedParams,
					result
				});
				apiCalls.push({
					endpoint: endpointName,
					params: normalizedParams,
					duration: `${duration}ms`,
					status: response.status,
					cacheStatus
				});
			} else {
				logger.error('MCP call failed', {
					endpoint: endpointName,
					status: response.status,
					statusText: response.statusText
				});
				apiCalls.push({
					endpoint: endpointName,
					params: normalizedParams,
					duration: `${duration}ms`,
					status: response.status,
					error: response.statusText
				});
			}
		} catch (error) {
			logger.error('Failed to execute MCP call', {
				endpoint: (call.endpoint || '').toString(),
				error
			});
			apiCalls.push({
				endpoint: (call.endpoint || '').toString(),
				params: { ...call.params },
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
		} else if (
			item.type === 'get-translation-word' &&
			item.result &&
			typeof item.result === 'object'
		) {
			// Pretty-print a single TW article
			const w = item.result;
			context += `Translation Word Article: ${w.word || w.term || '(unknown)'}\n`;
			if (w.definition) context += `Definition: ${w.definition}\n`;
			if (w.extendedDefinition) context += `Extended: ${w.extendedDefinition}\n`;
			if (Array.isArray(w.facts) && w.facts.length) {
				context += `Facts:\n`;
				for (const f of w.facts) context += `- ${f}\n`;
			}
			if (Array.isArray(w.examples) && w.examples.length) {
				context += `Examples:\n`;
				for (const ex of w.examples) context += `- ${ex.reference}: ${ex.text}\n`;
			}
			if (Array.isArray(w.translationSuggestions) && w.translationSuggestions.length) {
				context += `Translation Suggestions:\n`;
				for (const s of w.translationSuggestions) context += `- ${s}\n`;
			}
			if (Array.isArray(w.relatedWords) && w.relatedWords.length) {
				context += `Related: ${w.relatedWords.join(', ')}\n`;
			}
			if (Array.isArray(w.strongs) && w.strongs.length) {
				context += `Strongs: ${w.strongs.join(', ')}\n`;
			}
			if (Array.isArray(w.aliases) && w.aliases.length) {
				context += `Aliases: ${w.aliases.join(', ')}\n`;
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
	chatHistory: Array<{ role: string; content: string }> = [],
	apiKey: string
): Promise<{ response: string; error?: string }> {
	if (!apiKey) {
		return {
			response: '',
			error: 'OpenAI API key not provided to callOpenAI function.'
		};
	}

	try {
		const messages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'system', content: context },
			...chatHistory.slice(-6), // Keep last 6 messages for context
			{ role: 'user', content: message }
		];

		// Add timeout using AbortController
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		try {
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
				}),
				signal: controller.signal
			});
			clearTimeout(timeout);

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
			clearTimeout(timeout);
			logger.error('Failed to call OpenAI', { error });

			// Handle timeout specifically
			if (error instanceof Error && error.name === 'AbortError') {
				return {
					response: '',
					error: 'Request timed out after 30 seconds. Please try again.'
				};
			}

			return {
				response: '',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	} catch (error) {
		logger.error('Failed to call OpenAI', { error });
		return {
			response: '',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Stream OpenAI responses via SSE-compatible Web Streams API
 */
async function callOpenAIStream(
	message: string,
	context: string,
	chatHistory: Array<{ role: string; content: string }> = [],
	apiKey: string,
	xrayInit?: any,
	preTimings?: Record<string, number>,
	overallStartTime?: number
): Promise<ReadableStream<Uint8Array>> {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream<Uint8Array>({
		start: async (controller) => {
			try {
				const messages = [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'system', content: context },
					...chatHistory.slice(-6),
					{ role: 'user', content: message }
				];

				// Helper to emit SSE data events
				const emit = (event: string, data: unknown) => {
					const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(payload));
				};

				const llmStart = Date.now();
				const response = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`
					},
					body: JSON.stringify({
						model: 'gpt-4o-mini',
						messages,
						temperature: 0.3,
						stream: true,
						max_tokens: 600
					})
				});

				if (!response.ok || !response.body) {
					const msg =
						`event: error\n` +
						`data: ${JSON.stringify({ error: `OpenAI error: ${response.status}` })}\n\n`;
					controller.enqueue(encoder.encode(msg));
					controller.close();
					return;
				}

				const reader = response.body.getReader();
				let buffer = '';

				// Signal start
				emit('llm:start', { started: true });

				// Emit initial X-ray snapshot if provided
				if (xrayInit) {
					emit('xray', xrayInit);
				}

				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });

					const parts = buffer.split('\n\n');
					buffer = parts.pop() || '';

					for (const part of parts) {
						const line = part.trim();
						if (!line.startsWith('data:')) continue;
						const jsonStr = line.replace(/^data:\s*/, '');
						if (jsonStr === '[DONE]') {
							// Final X-ray update with llmResponse timing if possible
							try {
								const finalTimings: Record<string, number> = { ...(preTimings || {}) };
								finalTimings.llmResponse = Date.now() - llmStart;
								const totalDuration = overallStartTime
									? Date.now() - overallStartTime
									: (finalTimings.endpointDiscovery || 0) +
										(finalTimings.llmDecision || 0) +
										(finalTimings.mcpExecution || 0) +
										(finalTimings.contextFormatting || 0) +
										(finalTimings.llmResponse || 0);
								const breakdown = {
									'Endpoint Discovery': `${finalTimings.endpointDiscovery || 0}ms (${totalDuration ? Math.round(((finalTimings.endpointDiscovery || 0) / totalDuration) * 100) : 0}%)`,
									'LLM Decision Making': `${finalTimings.llmDecision || 0}ms (${totalDuration ? Math.round(((finalTimings.llmDecision || 0) / totalDuration) * 100) : 0}%)`,
									'MCP Tool Execution': `${finalTimings.mcpExecution || 0}ms (${totalDuration ? Math.round(((finalTimings.mcpExecution || 0) / totalDuration) * 100) : 0}%)`,
									'Context Formatting': `${finalTimings.contextFormatting || 0}ms (${totalDuration ? Math.round(((finalTimings.contextFormatting || 0) / totalDuration) * 100) : 0}%)`,
									'LLM Response Generation': `${finalTimings.llmResponse || 0}ms (${totalDuration ? Math.round(((finalTimings.llmResponse || 0) / totalDuration) * 100) : 0}%)`
								};
								emit('xray:final', {
									timings: { ...finalTimings, breakdown },
									totalTime: totalDuration,
									totalDuration
								});
							} catch (_e) {
								// ignored: best-effort final xray emission
							}

							emit('llm:done', { done: true });
							controller.close();
							return;
						}
						try {
							const event = JSON.parse(jsonStr);
							const delta = event.choices?.[0]?.delta?.content;
							if (typeof delta === 'string' && delta.length > 0) {
								emit('llm:delta', { text: delta });
							}
						} catch {
							// ignore malformed chunk
						}
					}
				}

				// Flush remainder if any
				if (buffer.length > 0) {
					try {
						const event = JSON.parse(buffer.replace(/^data:\s*/, ''));
						const delta = event.choices?.[0]?.delta?.content;
						if (typeof delta === 'string' && delta.length > 0) {
							emit('llm:delta', { text: delta });
						}
					} catch {
						// ignore
					}
				}

				emit('llm:done', { done: true });
				controller.close();
			} catch (error) {
				const err = error instanceof Error ? error.message : String(error);
				const msg = `event: error\n` + `data: ${JSON.stringify({ error: err })}\n\n`;
				controller.enqueue(encoder.encode(msg));
				controller.close();
			}
		}
	});

	return stream;
}

export const POST: RequestHandler = async ({ request, url, platform }) => {
	const startTime = Date.now();
	const timings: Record<string, number> = {};

	// Initialize KV cache if available
	try {
		// @ts-expect-error platform typing differs by adapter
		const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
		if (kv) {
			initializeKVCache(kv);
			logger.debug('KV cache initialized for chat-stream endpoint');
		}
	} catch (error) {
		logger.warn('Failed to initialize KV cache', { error });
	}

	try {
		const { message, chatHistory = [], enableXRay = false }: ChatRequest = await request.json();
		const baseUrl = `${url.protocol}//${url.host}`;

		logger.info('Chat stream request', { message, historyLength: chatHistory.length });

		// Check for API key - try multiple sources
		const apiKey =
			// Cloudflare Workers env binding (properly typed now)
			platform?.env?.OPENAI_API_KEY ||
			// Local development
			process.env.OPENAI_API_KEY ||
			// Vite client env (shouldn't be used but as fallback)
			import.meta.env.VITE_OPENAI_API_KEY;

		if (!apiKey) {
			logger.error('OpenAI API key not found in any environment source', {
				platformExists: !!platform,
				platformEnvExists: !!platform?.env,
				platformEnvKeys: platform?.env ? Object.keys(platform.env) : [],
				hasProcessEnv: typeof process !== 'undefined' && !!process.env,
				importMetaEnvKeys: Object.keys(import.meta.env || {})
			});
			return json(
				{
					success: false,
					error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
					timestamp: new Date().toISOString(),
					debug: {
						platformExists: !!platform,
						platformEnvExists: !!platform?.env,
						// Don't expose actual env var names in production error responses
						hint: 'Check Cloudflare Pages secret configuration'
					}
				},
				{ status: 500 }
			);
		}

		// Step 1: Discover available endpoints dynamically
		const discoveryStart = Date.now();
		const endpoints = await discoverMCPEndpoints(baseUrl);
		timings.endpointDiscovery = Date.now() - discoveryStart;

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
		const llmDecisionStart = Date.now();
		const endpointCalls = await determineMCPCalls(message, apiKey, endpoints, chatHistory);
		timings.llmDecision = Date.now() - llmDecisionStart;

		// Log if no endpoints were selected
		if (endpointCalls.length === 0) {
			logger.info('LLM decided no MCP endpoints needed for this query', { message });
		}

		// Step 3: Execute the MCP calls
		const mcpExecutionStart = Date.now();
		const { data, apiCalls } = await executeMCPCalls(endpointCalls, baseUrl);
		timings.mcpExecution = Date.now() - mcpExecutionStart;

		// Step 4: Format data for OpenAI context, including any tool errors so the LLM can respond gracefully
		const contextFormattingStart = Date.now();
		const toolErrors = apiCalls.filter(
			(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
		);
		const hasErrors = toolErrors.length > 0;
		let errorContext = '';
		if (hasErrors) {
			errorContext +=
				'Tool errors were encountered while gathering context. Provide a clear, user-friendly explanation and suggest alternate ways to proceed.\n';
			errorContext += 'Errors (do not expose internal URLs):\n';
			for (const err of toolErrors) {
				errorContext += `- endpoint: ${err.endpoint}, status: ${err.status || 'n/a'}, message: ${err.error || 'Unknown error'}, params: ${JSON.stringify(err.params)}\n`;
			}
			errorContext +=
				'\nIf a requested resource was not found, explain what is available instead (e.g., try a different verse, or use notes/questions/scripture).\n\n';
		}
		const context = `${errorContext}${formatDataForContext(data)}`;
		timings.contextFormatting = Date.now() - contextFormattingStart;

		// Step 5: Call OpenAI with the data (support streaming)
		const streamMode =
			url.searchParams.get('stream') === '1' ||
			(request.headers.get('accept') || '').includes('text/event-stream');

		if (streamMode) {
			// Build initial X-ray snapshot (always emit so client can show tools during streaming)
			const totalDurationSoFar = Date.now() - startTime;
			const xrayInit: any = {
				queryType: 'ai-assisted',
				apiCallsCount: apiCalls.length,
				totalDuration: totalDurationSoFar,
				totalTime: totalDurationSoFar,
				hasErrors: apiCalls.some(
					(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
				),
				apiCalls,
				tools: apiCalls.map((call, index) => ({
					id: `tool-${index}`,
					name: call.endpoint,
					duration: parseInt(call.duration.replace('ms', '')) || 0,
					cached: call.cacheStatus === 'hit',
					cacheStatus: call.cacheStatus || 'miss',
					params: call.params,
					status: call.status,
					error: call.error
				})),
				timings: {
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0
				}
			};

			const sseStream = await callOpenAIStream(
				message,
				context,
				chatHistory,
				apiKey,
				xrayInit,
				{
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0
				},
				startTime
			);
			const totalDuration = Date.now() - startTime;
			return new Response(sseStream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-store',
					'X-Chat-Model': 'gpt-4o-mini',
					'X-Chat-Duration': `${totalDuration}ms`
				}
			});
		}

		const llmResponseStart = Date.now();
		const { response, error } = await callOpenAI(message, context, chatHistory, apiKey);
		timings.llmResponse = Date.now() - llmResponseStart;

		// Log the response for debugging
		logger.info('LLM response', {
			hasResponse: !!response,
			responseLength: response?.length || 0,
			hasError: !!error,
			contextLength: context.length
		});

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

		// Check for empty response
		if (!response || response.trim() === '') {
			logger.error('Empty response from LLM', { message, contextLength: context.length });
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
				hasErrors: apiCalls.some(
					(c) => (typeof c.status === 'number' && c.status >= 400) || c.error
				),
				apiCalls,
				// Transform apiCalls to tools format for XRayPanel
				tools: apiCalls.map((call, index) => ({
					id: `tool-${index}`,
					name: call.endpoint,
					duration: parseInt(call.duration.replace('ms', '')) || 0,
					cached: call.cacheStatus === 'hit',
					cacheStatus: call.cacheStatus || 'miss',
					params: call.params,
					status: call.status,
					error: call.error
				})),
				// Add detailed timing breakdown
				timings: {
					endpointDiscovery: timings.endpointDiscovery || 0,
					llmDecision: timings.llmDecision || 0,
					mcpExecution: timings.mcpExecution || 0,
					contextFormatting: timings.contextFormatting || 0,
					llmResponse: timings.llmResponse || 0,
					// Add percentages for easy visualization
					breakdown: {
						'Endpoint Discovery': `${timings.endpointDiscovery || 0}ms (${Math.round(((timings.endpointDiscovery || 0) / totalDuration) * 100)}%)`,
						'LLM Decision Making': `${timings.llmDecision || 0}ms (${Math.round(((timings.llmDecision || 0) / totalDuration) * 100)}%)`,
						'MCP Tool Execution': `${timings.mcpExecution || 0}ms (${Math.round(((timings.mcpExecution || 0) / totalDuration) * 100)}%)`,
						'Context Formatting': `${timings.contextFormatting || 0}ms (${Math.round(((timings.contextFormatting || 0) / totalDuration) * 100)}%)`,
						'LLM Response Generation': `${timings.llmResponse || 0}ms (${Math.round(((timings.llmResponse || 0) / totalDuration) * 100)}%)`
					}
				}
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
