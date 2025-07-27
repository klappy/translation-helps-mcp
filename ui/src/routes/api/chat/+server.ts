export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DynamicDataPipeline } from '$lib/core/DynamicDataPipeline';

/**
 * Chat API Endpoint - Now with dynamic data handling
 * Maintains backward compatibility while using the new dynamic pipeline internally
 */

// Tool patterns for determining which MCP tool to use
const TOOL_PATTERNS = [
	{ pattern: /scripture|verse|passage|text|bible/i, tool: 'fetch_scripture' },
	{ pattern: /notes?|translation notes?/i, tool: 'fetch_translation_notes' },
	{ pattern: /questions?|translation questions?/i, tool: 'fetch_translation_questions' },
	{ pattern: /word|definition|term|meaning/i, tool: 'get_translation_word' },
	{ pattern: /academy|article|learn|teaching|ta\s/i, tool: 'fetch_translation_academy' },
];

// Reference extraction with multiple formats
function extractReference(message: string): string | null {
	const patterns = [
		/(\w+\s+\d+:\d+(?:-\d+)?)/i,  // Book Chapter:Verse
		/(\w+\s+\d+)(?!:)/i,           // Book Chapter
	];
	
	for (const pattern of patterns) {
		const match = message.match(pattern);
		if (match) return match[1];
	}
	
	return null;
}

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { message } = await request.json();
		
		if (!message) {
			return json({ error: 'No message provided' });
		}

		// Determine which tool to use based on message content
		let selectedTool = null;
		for (const { pattern, tool } of TOOL_PATTERNS) {
			if (pattern.test(message)) {
				selectedTool = tool;
				break;
			}
		}

		if (!selectedTool) {
			return json({
				content: "I can help with scripture, translation notes, questions, word definitions, and Translation Academy articles. Please specify what you're looking for."
			});
		}

		// Build parameters dynamically
		const params: any = {
			language: 'en',
			organization: 'unfoldingWord'
		};
		
		// Extract reference if present
		const reference = extractReference(message);
		if (reference) {
			params.reference = reference;
		}
		
		// Tool-specific parameter extraction
		if (selectedTool === 'fetch_translation_academy') {
			// Handle RC links in the message
			const rcMatch = message.match(/rc:([^\s\]]+)/);
			if (rcMatch) {
				params.articleId = rcMatch[1];
			} else {
				// Try to extract article name
				const articleMatch = message.match(/about\s+(\S+)|article\s+(?:on\s+)?(\S+)/i);
				if (articleMatch) {
					params.articleId = articleMatch[1] || articleMatch[2];
				}
			}
		} else if (selectedTool === 'get_translation_word') {
			const wordMatch = message.match(/word\s+(\S+)|define\s+(\S+)|what\s+is\s+(\S+)/i);
			if (wordMatch) {
				params.wordId = wordMatch[1] || wordMatch[2] || wordMatch[3];
			}
		}

		// Use the dynamic MCP endpoint for data fetching
		const mcpUrl = new URL('/api/mcp-dynamic', url.origin);
		const mcpResponse = await fetch(mcpUrl.toString(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				method: 'tools/call',
				params: {
					name: selectedTool,
					arguments: params
				}
			})
		});

		if (!mcpResponse.ok) {
			// Fallback to regular MCP endpoint if dynamic fails
			const fallbackUrl = new URL('/api/mcp', url.origin);
			const fallbackResponse = await fetch(fallbackUrl.toString(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					method: 'tools/call',
					params: {
						name: selectedTool,
						arguments: params
					}
				})
			});
			
			const fallbackData = await fallbackResponse.json();
			return json({
				content: fallbackData.content?.[0]?.text || 'No content found',
				tool: selectedTool,
				params
			});
		}

		const mcpData = await mcpResponse.json();
		
		// Format the response for the chat interface
		const content = mcpData.content?.[0]?.text || 'No content found';
		
		return json({
			content,
			tool: selectedTool,
			params,
			_dynamic: true, // Flag to indicate dynamic pipeline was used
			_debug: mcpData._debug
		});

	} catch (error) {
		console.error('Chat error:', error);
		
		// Provide helpful error message
		return json({
			error: 'An error occurred processing your request',
			details: error instanceof Error ? error.message : 'Unknown error',
			suggestion: 'Try refreshing the page or rephrasing your request'
		});
	}
};