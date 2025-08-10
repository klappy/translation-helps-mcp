export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Store reasoning sessions temporarily (in production, use KV or Durable Objects)
const reasoningSessions = new Map<string, any>();

export const POST: RequestHandler = async ({ request, url, platform, fetch }) => {
	const { message, history = [], sessionId } = await request.json();

	if (!message) {
		return json({ error: 'No message provided' });
	}

	// Create a new session
	const session = {
		id: sessionId || crypto.randomUUID(),
		steps: [],
		startTime: Date.now(),
		status: 'thinking'
	};

	reasoningSessions.set(session.id, session);

	// Start processing asynchronously
	processRequest(session, message, history, platform, url, fetch);

	// Return session ID immediately
	return json({
		sessionId: session.id,
		status: 'started'
	});
};

// Get session status
export const GET: RequestHandler = async ({ url }) => {
	const sessionId = url.searchParams.get('sessionId');

	if (!sessionId) {
		return json({ error: 'No sessionId provided' });
	}

	const session = reasoningSessions.get(sessionId);

	if (!session) {
		return json({ error: 'Session not found' });
	}

	// Clean up completed sessions after 5 minutes
	if (session.status === 'complete' && Date.now() - session.startTime > 300000) {
		reasoningSessions.delete(sessionId);
	}

	return json({
		sessionId: session.id,
		status: session.status,
		steps: session.steps,
		response: session.response,
		error: session.error
	});
};

async function processRequest(
	session: any,
	message: string,
	history: any[],
	platform: any,
	url: URL,
	fetch: typeof globalThis.fetch
) {
	try {
		// Add initial thinking step
		session.steps.push({
			type: 'thinking',
			content: 'Understanding your request...',
			timestamp: Date.now() - session.startTime
		});

		// Get OpenAI API key
		const env = platform?.env || {};
		const apiKey = env.OPENAI_API_KEY;

		if (!apiKey) {
			session.status = 'error';
			session.error = 'OpenAI API key not configured';
			return;
		}

		// Discover tools
		session.steps.push({
			type: 'thinking',
			content: 'Discovering available MCP tools...',
			timestamp: Date.now() - session.startTime
		});

		const tools = await discoverMCPTools(url, fetch);

		session.steps.push({
			type: 'thinking',
			content: `Found ${tools.length} tools available`,
			timestamp: Date.now() - session.startTime
		});

		// Build messages
		const messages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...history.map((msg) => ({ role: msg.role, content: msg.content })),
			{ role: 'user', content: message }
		];

		// Call OpenAI
		session.steps.push({
			type: 'thinking',
			content: 'Analyzing which tools to use...',
			timestamp: Date.now() - session.startTime
		});

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			const openAIResponse = await fetch(OPENAI_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages,
					tools: tools.map((tool) => ({
						type: 'function',
						function: {
							name: tool.name,
							description: tool.description,
							parameters: tool.inputSchema || {}
						}
					})),
					tool_choice: 'auto'
				}),
				signal: controller.signal
			});

			clearTimeout(timeout);

			if (!openAIResponse.ok) {
				const errorText = await openAIResponse.text();
				session.status = 'error';
				session.error = `OpenAI API error: ${errorText}`;
				return;
			}

			const aiResponse = await openAIResponse.json();
			const assistantMessage = aiResponse.choices[0].message;

			// Process tool calls if any
			if (assistantMessage.tool_calls) {
				const toolNames = assistantMessage.tool_calls.map((tc) => tc.function.name);
				session.steps.push({
					type: 'tools_selected',
					content: `I'll fetch: ${toolNames.join(', ')}`,
					tools: toolNames,
					timestamp: Date.now() - session.startTime
				});

				// Execute tools
				const toolResults = [];
				for (const toolCall of assistantMessage.tool_calls) {
					const { name, arguments: args } = toolCall.function;

					session.steps.push({
						type: 'tool_executing',
						content: `Fetching ${name}...`,
						tool: name,
						timestamp: Date.now() - session.startTime
					});

					try {
						const mcpUrl = new URL('/api/mcp', url);
						const toolController = new AbortController();
						const toolTimeout = setTimeout(() => toolController.abort(), 5000); // 5 second timeout per tool

						const response = await fetch(mcpUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								method: 'tools/call',
								params: {
									name,
									arguments: typeof args === 'string' ? JSON.parse(args) : args
								}
							}),
							signal: toolController.signal
						});

						clearTimeout(toolTimeout);

						if (!response.ok) {
							throw new Error(`Tool returned ${response.status}`);
						}

						const result = await response.json();
						const content = result.content?.[0]?.text || JSON.stringify(result);

						toolResults.push({
							tool_call_id: toolCall.id,
							content
						});

						session.steps.push({
							type: 'tool_completed',
							content: `Retrieved ${name} data`,
							tool: name,
							timestamp: Date.now() - session.startTime
						});
					} catch (error) {
						session.steps.push({
							type: 'tool_error',
							content: `Error with ${name}: ${error.message || error}`,
							tool: name,
							timestamp: Date.now() - session.startTime
						});

						// Continue with other tools even if one fails
						toolResults.push({
							tool_call_id: toolCall.id,
							content: `Error: ${error.message || error}`
						});
					}
				}

				// Generate final response
				session.steps.push({
					type: 'thinking',
					content: 'Formatting response...',
					timestamp: Date.now() - session.startTime
				});

				const finalController = new AbortController();
				const finalTimeout = setTimeout(() => finalController.abort(), 10000); // 10 second timeout

				const finalResponse = await fetch(OPENAI_API_URL, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: 'gpt-4o-mini',
						messages: [
							...messages,
							assistantMessage,
							...toolResults.map((result) => ({
								role: 'tool',
								tool_call_id: result.tool_call_id,
								content: JSON.stringify(result.content)
							}))
						]
					}),
					signal: finalController.signal
				});

				clearTimeout(finalTimeout);

				if (!finalResponse.ok) {
					throw new Error(`Final response failed: ${finalResponse.status}`);
				}

				const finalAIResponse = await finalResponse.json();
				const finalContent = finalAIResponse.choices[0].message.content;

				session.response = makeRCLinksClickable(finalContent);
				session.xrayData = {
					tools: assistantMessage.tool_calls.map((tc) => ({
						name: tc.function.name,
						params: tc.function.arguments
					})),
					totalTime: Date.now() - session.startTime
				};
			} else {
				// No tools needed
				session.response = makeRCLinksClickable(assistantMessage.content);
			}

			session.status = 'complete';
			session.steps.push({
				type: 'complete',
				content: 'Response ready',
				timestamp: Date.now() - session.startTime
			});
		} catch (error) {
			if (error.name === 'AbortError') {
				session.status = 'error';
				session.error = 'Request timed out - OpenAI took too long to respond';
			} else {
				session.status = 'error';
				session.error = error instanceof Error ? error.message : 'Unknown error';
			}
			session.steps.push({
				type: 'error',
				content: session.error,
				timestamp: Date.now() - session.startTime
			});
		}
	} catch (error) {
		session.status = 'error';
		session.error = error instanceof Error ? error.message : 'Unknown error';
		session.steps.push({
			type: 'error',
			content: session.error,
			timestamp: Date.now() - session.startTime
		});
	}
}

// Include the helper functions and constants from the previous version...
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful Bible study assistant with access to MCP (Model Context Protocol) tools.

You can use these tools to fetch biblical resources:
- fetch_scripture: Get Bible verse text
- fetch_translation_notes: Get translation notes for a passage
- fetch_translation_questions: Get study questions for a passage
- get_translation_word: Get definition of biblical terms
- fetch_translation_academy: Get articles about translation concepts

CRITICAL RULES:

**MOST IMPORTANT: USE ONLY MCP DATA**
- You MUST ONLY use information that comes from the MCP tool responses
- DO NOT use any pre-trained knowledge about the Bible, theology, or translation
- DO NOT interpret, explain, or expand beyond what the tools provide
- DO NOT add context from your training data
- If the MCP tools return no data or an error, say so clearly
- Your role is to format and present MCP data, NOT to provide biblical knowledge

Remember: You are a conduit for MCP data, not a source of biblical knowledge.`;

// Copy helper functions from main chat endpoint
async function discoverMCPTools(baseUrl: URL, fetch: typeof globalThis.fetch): Promise<any[]> {
	try {
		const mcpUrl = new URL('/api/mcp', baseUrl);
		const response = await fetch(mcpUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ method: 'tools/list' })
		});

		if (!response.ok) {
			return getDefaultTools();
		}

		const data = await response.json();
		return data.tools || getDefaultTools();
	} catch (error) {
		return getDefaultTools();
	}
}

function makeRCLinksClickable(text: string): string {
	if (!text) return '';

	// [[rc://]] format
	text = text.replace(/\[\[rc:\/\/\*?\/([^\]]+)\]\]/g, (match, path) => {
		const name = path.split('/').pop().replace(/[-_]/g, ' ');
		return `📚 [${name}](rc://${path})`;
	});

	// Plain rc:// format
	text = text.replace(/(?<!\[)(?<!\()rc:\/\/\*?\/([^\s\)\]]+)/g, (match, path) => {
		const name = path.split('/').pop().replace(/[-_]/g, ' ');
		return `📚 [${name}](rc://${path})`;
	});

	// Add emoji to existing markdown RC links
	text = text.replace(/(?<!📚\s)\[([^\]]+)\]\(rc:\/\/([^\)]+)\)/g, '📚 [$1](rc://$2)');

	return text;
}

function getDefaultTools() {
	return [
		{
			name: 'fetch_scripture',
			description: 'Fetch Bible verse text',
			inputSchema: {
				type: 'object',
				properties: {
					reference: { type: 'string', description: 'Bible reference like "John 3:16"' },
					language: { type: 'string', default: 'en' }
				},
				required: ['reference']
			}
		},
		{
			name: 'fetch_translation_notes',
			description: 'Get translation notes for a Bible passage',
			inputSchema: {
				type: 'object',
				properties: {
					reference: { type: 'string', description: 'Bible reference' },
					language: { type: 'string', default: 'en' }
				},
				required: ['reference']
			}
		}
		// Add other tools as needed...
	];
}
