export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * MCP + LLM Reference Implementation
 * Shows how to properly integrate MCP tools with ChatGPT/Claude
 * 
 * Deployment: ${new Date().toISOString()}
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// System prompt that teaches the LLM about available MCP tools
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

1. SCRIPTURE QUOTATIONS:
   - ALWAYS quote scripture EXACTLY as provided by the tool
   - Format scripture in blockquotes using > prefix
   - Add citation after the quote like: (John 3:16 ULT)
   - Do NOT paraphrase or interpret the scripture
   - Example:
     > "For God so loved the world..."
     > (John 3:16 ULT)

2. CITATIONS FOR ALL RESOURCES:
   - Translation Notes: Cite as "Translation Notes for [reference]"
   - Translation Words: Cite as "Translation Word: [word]"
   - Translation Questions: Cite as "Study Questions for [reference]"
   - Translation Academy: Cite as "Translation Academy: [article]"
   - Always mention the source at the end of each section

3. RC LINKS:
   - When you see rc:// links in the content, convert them to clickable markdown links
   - Format: [Display Name](rc://path)
   - For word links (rc://words/...): Use format "📚 [word name](rc://words/...)"
   - For TA links (rc://ta/...): Use format "📚 [article name](rc://ta/...)"
   - These links will trigger new chat prompts when clicked

4. RESPONSE STRUCTURE:
   - Start with the most relevant information from MCP tools
   - Use clear headings with ##
   - Separate different resources with horizontal rules (---)
   - If multiple tools were called, present each tool's data clearly
   - List all sources used at the bottom under "### Sources Used:"

5. HANDLING NO DATA:
   - If a tool returns no data, say: "No [resource type] found for [reference]"
   - If a tool returns an error, report it: "Error fetching [resource]: [error message]"
   - Do NOT fill in gaps with your own knowledge
   - Do NOT suggest what the content might be

6. NATURAL LANGUAGE:
   - Be conversational in your formatting and transitions
   - Connect different MCP responses meaningfully
   - Suggest related queries the user might make
   - But NEVER add biblical content not provided by MCP tools

Remember: You are a conduit for MCP data, not a source of biblical knowledge. Users rely on you to accurately present ONLY what the MCP tools provide.`;

export const POST: RequestHandler = async ({ request, url, platform, fetch }) => {
	const startTime = Date.now();
	const xrayData = {
		tools: [],
		timeline: [{ time: 0, event: 'Request received' }],
		totalTime: 0,
		citations: []
	};
	
	try {
		const { message, history = [] } = await request.json();
		
		if (!message) {
			return json({ error: 'No message provided' });
		}

		// Get OpenAI API key from Cloudflare environment
		// In Cloudflare Pages, secrets are available on platform.env
		const env = platform?.env || {};
		let apiKey = env.OPENAI_API_KEY;
		
		console.log('[CHAT] Environment check:', {
			hasPlatform: !!platform,
			hasEnv: !!platform?.env,
			hasApiKey: !!apiKey,
			envKeys: platform?.env ? Object.keys(platform.env).filter(k => !k.includes('KEY')) : [],
			// Add more debug info
			envType: typeof platform?.env,
			keyLength: apiKey ? apiKey.length : 0,
			keyPrefix: apiKey ? apiKey.substring(0, 7) + '...' : 'none'
		});
		
		if (!apiKey) {
			// Provide instructions for setting up the API key
			return json({
				content: `## OpenAI API Key Required

To enable the AI-powered chat features, you need to add your OpenAI API key as a **secret** in Cloudflare Pages.

### Option 1: Add via Dashboard (Easiest)

1. Go to your [Cloudflare Pages project](https://dash.cloudflare.com)
2. Navigate to **Settings → Environment variables**
3. Add as a **Secret** (encrypted):
   - Variable name: \`OPENAI_API_KEY\`
   - Value: Your OpenAI API key
   - Environment: Production ✓ Preview ✓
   - Click "Encrypt" and "Save"

### Option 2: Add via Wrangler CLI

Run this command in your project directory:
\`\`\`bash
npx wrangler pages secret put OPENAI_API_KEY
\`\`\`

Then paste your API key when prompted (it will be hidden).

### Why Secrets?
- Regular env vars go in \`wrangler.toml\` (visible in code)
- Secrets are encrypted and perfect for API keys
- Cloudflare Pages supports both, but API keys must be secrets

Once added, the chat will use GPT-4o-mini to provide natural, conversational Bible study assistance!`,
				isSetupGuide: true
			});
		}

		// First, discover available MCP tools
		xrayData.timeline.push({ time: Date.now() - startTime, event: 'Discovering MCP tools' });
		const tools = await discoverMCPTools(url, fetch);
		xrayData.timeline.push({ time: Date.now() - startTime, event: `Found ${tools.length} tools` });
		
		// Build messages for OpenAI including tool definitions
		const messages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...history.map(msg => ({
				role: msg.role,
				content: msg.content
			})),
			{ role: 'user', content: message }
		];

		// Call OpenAI with function calling
		xrayData.timeline.push({ time: Date.now() - startTime, event: 'Calling OpenAI API' });
		const openAIResponse = await fetch(OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages,
				tools: tools.map(tool => ({
					type: 'function',
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.inputSchema || {
							type: 'object',
							properties: {
								reference: { type: 'string', description: 'Bible reference (e.g. John 3:16)' },
								language: { type: 'string', description: 'Language code', default: 'en' },
								wordId: { type: 'string', description: 'Word to define' },
								articleId: { type: 'string', description: 'Article ID' }
							}
						}
					}
				})),
				tool_choice: 'auto'
			})
		});
		
		if (!openAIResponse.ok) {
			const errorText = await openAIResponse.text();
			console.error('[CHAT] OpenAI API error:', openAIResponse.status, errorText);
			throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
		}

		const aiResponse = await openAIResponse.json();
		const assistantMessage = aiResponse.choices[0].message;
		xrayData.timeline.push({ time: Date.now() - startTime, event: 'OpenAI response received' });

		console.log('[CHAT] OpenAI response:', {
			hasToolCalls: !!assistantMessage.tool_calls,
			toolCallCount: assistantMessage.tool_calls?.length || 0
		});

		// If the LLM wants to use tools
		if (assistantMessage.tool_calls) {
			xrayData.timeline.push({ time: Date.now() - startTime, event: `Executing ${assistantMessage.tool_calls.length} tool calls` });
			const toolResults = await executeToolCalls(assistantMessage.tool_calls, url, fetch, xrayData, startTime);
			
			console.log('[CHAT] Tool results:', toolResults.length);

			// Send tool results back to OpenAI for final response
			xrayData.timeline.push({ time: Date.now() - startTime, event: 'Getting final response from OpenAI' });
			const finalResponse = await fetch(OPENAI_API_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						...messages,
						assistantMessage,
						...toolResults.map(result => ({
							role: 'tool',
							tool_call_id: result.tool_call_id,
							content: JSON.stringify(result.content)
						}))
					]
				})
			});

			const finalAIResponse = await finalResponse.json();
			const finalContent = finalAIResponse.choices[0].message.content;

			// Process RC links to make them clickable
			const processedContent = makeRCLinksClickable(finalContent);

			xrayData.totalTime = Date.now() - startTime;
			xrayData.timeline.push({ time: xrayData.totalTime, event: 'Response ready' });

			return json({
				content: processedContent,
				tool_calls: assistantMessage.tool_calls.map(tc => tc.function.name),
				xrayData
			});
		}

		// No tools needed, just return the response
		xrayData.totalTime = Date.now() - startTime;
		return json({
			content: makeRCLinksClickable(assistantMessage.content),
			xrayData
		});

	} catch (error) {
		console.error('Chat error:', error);
		xrayData.totalTime = Date.now() - startTime;
		xrayData.timeline.push({ time: xrayData.totalTime, event: `Error: ${error.message}` });
		
		return json({
			error: 'An error occurred',
			details: error instanceof Error ? error.message : 'Unknown error',
			xrayData
		});
	}
};

/**
 * Discover available MCP tools from the server
 */
async function discoverMCPTools(baseUrl: URL, fetch: typeof globalThis.fetch): Promise<any[]> {
	try {
		const mcpUrl = new URL('/api/mcp', baseUrl);
		const response = await fetch(mcpUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ method: 'tools/list' })
		});

		if (!response.ok) {
			console.error('Failed to discover MCP tools');
			return getDefaultTools();
		}

		const data = await response.json();
		return data.tools || getDefaultTools();
	} catch (error) {
		console.error('Error discovering tools:', error);
		return getDefaultTools();
	}
}

/**
 * Execute tool calls requested by the LLM
 */
async function executeToolCalls(toolCalls: any[], baseUrl: URL, fetch: typeof globalThis.fetch, xrayData: any, startTime: number): Promise<any[]> {
	const results = await Promise.all(
		toolCalls.map(async (toolCall) => {
			const { name, arguments: args } = toolCall.function;
			const toolStartTime = Date.now();
			
			try {
				const mcpUrl = new URL('/api/mcp', baseUrl);
				const response = await fetch(mcpUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						method: 'tools/call',
						params: {
							name,
							arguments: typeof args === 'string' ? JSON.parse(args) : args
						}
					})
				});

				const result = await response.json();
				const toolDuration = Date.now() - toolStartTime;
				
				// Extract the actual content from MCP response
				const content = result.content?.[0]?.text || JSON.stringify(result);
				
				// Add to X-ray data
				xrayData.tools.push({
					id: toolCall.id,
					name,
					params: typeof args === 'string' ? JSON.parse(args) : args,
					response: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
					duration: toolDuration,
					cached: response.headers.get('x-cache-status') === 'HIT'
				});
				
				// Extract citations from the response
				if (name === 'fetch_scripture' && args.reference) {
					xrayData.citations.push(`Scripture: ${args.reference}`);
				} else if (name === 'fetch_translation_notes' && args.reference) {
					xrayData.citations.push(`Translation Notes for ${args.reference}`);
				} else if (name === 'get_translation_word' && args.wordId) {
					xrayData.citations.push(`Translation Word: ${args.wordId}`);
				} else if (name === 'fetch_translation_questions' && args.reference) {
					xrayData.citations.push(`Study Questions for ${args.reference}`);
				} else if (name === 'fetch_translation_academy' && args.articleId) {
					xrayData.citations.push(`Translation Academy: ${args.articleId}`);
				}
				
				return {
					tool_call_id: toolCall.id,
					content
				};
			} catch (error) {
				const toolDuration = Date.now() - toolStartTime;
				xrayData.tools.push({
					id: toolCall.id,
					name,
					params: typeof args === 'string' ? JSON.parse(args) : args,
					response: `Error: ${error}`,
					duration: toolDuration,
					cached: false,
					error: true
				});
				
				return {
					tool_call_id: toolCall.id,
					content: `Error calling ${name}: ${error}`
				};
			}
		})
	);

	return results;
}

/**
 * Make RC links clickable in the response
 */
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

/**
 * Default tool definitions if discovery fails
 */
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
		},
		{
			name: 'fetch_translation_questions',
			description: 'Get study questions for a Bible passage',
			inputSchema: {
				type: 'object',
				properties: {
					reference: { type: 'string', description: 'Bible reference' },
					language: { type: 'string', default: 'en' }
				},
				required: ['reference']
			}
		},
		{
			name: 'get_translation_word',
			description: 'Get definition of a biblical term',
			inputSchema: {
				type: 'object',
				properties: {
					wordId: { type: 'string', description: 'Word to define' },
					language: { type: 'string', default: 'en' }
				},
				required: ['wordId']
			}
		},
		{
			name: 'fetch_translation_academy',
			description: 'Get Translation Academy article',
			inputSchema: {
				type: 'object',
				properties: {
					articleId: { type: 'string', description: 'Article ID' },
					language: { type: 'string', default: 'en' }
				},
				required: ['articleId']
			}
		}
	];
}

/**
 * Fallback handler when no LLM API key is available
 */
async function handleWithoutLLM(message: string, baseUrl: URL, fetch: typeof globalThis.fetch): Promise<string> {
	// Simple pattern matching fallback
	const lower = message.toLowerCase();
	
	if (lower.includes('help') || lower.includes('hello')) {
		return `I'm an MCP (Model Context Protocol) Bible study assistant that provides information ONLY from our translation resources database.

I can help you with:
		
• **Scripture** - "Show me John 3:16" (from available translations)
• **Translation Notes** - "Explain the notes for Romans 8:28" (from our database)
• **Word Definitions** - "What does agape mean?" (from Translation Words)
• **Study Questions** - "Questions for Genesis 1" (from our resources)
• **Translation Articles** - "Article about metaphors" (from Translation Academy)

Important: I only provide information that exists in our MCP database. I don't use any other biblical knowledge.

For the full AI experience with natural language understanding, configure your OpenAI API key in the environment.`;
	}
	
	return "I need an OpenAI API key to understand your request and fetch data from our MCP resources. Please configure OPENAI_API_KEY in your environment.";
}