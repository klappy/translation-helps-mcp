export const config = {
	runtime: 'edge'
};

import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Returns the static system prompt
 */
function formatSystemPrompt(): string {
	return `You are a Bible study assistant. 

SYSTEM INSTRUCTIONS:
1. Answer questions ONLY using the provided Bible resources that will be included with each user message
2. Quote scripture EXACTLY as it appears in the provided resources
3. At the end of your response, provide a brief citation listing which specific resources you used
4. Each user message will contain MCP response data in markdown format after a "---" separator
5. Parse the JSON data in the markdown code blocks to extract scripture, notes, words, and other resources

RESOURCE CITATION FORMAT:
- For scripture: Look in the JSON data for citation.resource and use that EXACT name (e.g., "unfoldingWord® Literal Text", "unfoldingWord® Dynamic Bible")
- For translation notes: Use "Translation Notes" 
- For translation words: Use "Translation Words"
- For translation questions: Use "Translation Questions"

IMPORTANT: Parse the JSON data in the markdown code blocks to find the exact resource names. Do not make up or guess resource names.

Example citation format:
"Resources used: unfoldingWord® Literal Text, Translation Notes"

The user's question will be followed by the relevant Bible resources fetched from the MCP server.`;
}

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'POST, OPTIONS'
		}
	});
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { message, chatHistory = [] } = await request.json();

		// Get the OpenAI API key
		const apiKey = typeof process !== 'undefined' && process.env?.OPENAI_API_KEY;
		if (!apiKey) {
			console.error('❌ OpenAI API key not configured in environment variables');
			console.log('💡 To fix: Set OPENAI_API_KEY in Cloudflare Pages environment variables');
			throw error(
				500,
				'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable in Cloudflare Pages dashboard under Settings > Environment variables.'
			);
		}

		// Build messages array with system prompt
		const messages = [
			{
				role: 'system',
				content: formatSystemPrompt()
			},
			...chatHistory,
			{
				role: 'user',
				content: message // This already contains the MCP context appended
			}
		];

		console.log(`🚀 Sending streaming request to OpenAI with ${messages.length} messages`);
		console.log(`📝 User message preview: ${message.substring(0, 200)}...`);

		// Make streaming request to OpenAI
		const openaiResponse = await fetch(OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: messages,
				max_tokens: 500,
				temperature: 0.2, // Reduced to 0.2 for more literal responses but have some flexibility
				top_p: 0.2, // 0.2 to minimize creativity but not too much
				frequency_penalty: 0.4,
				presence_penalty: 0.4,
				stream: true // Enable real streaming
			})
		});

		if (!openaiResponse.ok) {
			const errorData = await openaiResponse.text();
			throw error(500, `OpenAI API error: ${openaiResponse.status} - ${errorData}`);
		}

		// Create a readable stream from the response
		const reader = openaiResponse.body?.getReader();
		if (!reader) {
			throw error(500, 'Failed to create response reader');
		}

		const decoder = new TextDecoder();

		// We'll collect all chunks and return them as a special formatted response
		// that the frontend can parse to simulate streaming
		let fullResponse = '';
		const chunks = [];

		let done = false;
		while (!done) {
			const result = await reader.read();
			done = result.done;
			const value = result.value;

			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split('\n');

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);

					if (data === '[DONE]') {
						continue;
					}

					try {
						const parsed = JSON.parse(data);
						if (
							parsed.choices &&
							parsed.choices[0] &&
							parsed.choices[0].delta &&
							parsed.choices[0].delta.content
						) {
							const content = parsed.choices[0].delta.content;
							fullResponse += content;
							chunks.push(content);
						}
					} catch {
						// Skip malformed JSON
						continue;
					}
				}
			}
		}

		// Return the complete response with chunk information
		return json(
			{
				success: true,
				response: fullResponse,
				chunks: chunks, // Send the chunks for the frontend to simulate streaming
				timestamp: new Date().toISOString(),
				metadata: {
					model: 'gpt-4o-mini',
					streaming: true
				}
			},
			{
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (err) {
		console.error('Streaming chat function error:', err);

		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Internal server error'
			},
			{
				status: 500,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json'
				}
			}
		);
	}
};
