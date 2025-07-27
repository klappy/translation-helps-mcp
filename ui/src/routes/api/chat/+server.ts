export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Truly Dynamic Chat Endpoint
 * Just pass data through - let the LLM figure it out
 */

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { message } = await request.json();
		
		if (!message) {
			return json({ error: 'No message provided' });
		}

		// Simple keyword detection
		const lower = message.toLowerCase();
		let toolName = '';
		let endpoint = '';
		
		if (lower.includes('note')) {
			toolName = 'fetch_translation_notes';
			endpoint = '/api/fetch-translation-notes';
		} else if (lower.includes('question')) {
			toolName = 'fetch_translation_questions';
			endpoint = '/api/fetch-translation-questions';
		} else if (lower.includes('scripture') || lower.includes('verse')) {
			toolName = 'fetch_scripture';
			endpoint = '/api/fetch-scripture';
		} else if (lower.includes('word') || lower.includes('definition')) {
			toolName = 'get_translation_word';
			endpoint = '/api/get-translation-word';
		} else if (lower.includes('academy') || lower.includes('article')) {
			toolName = 'fetch_translation_academy';
			endpoint = '/api/fetch-translation-academy';
		}

		if (!endpoint) {
			return json({
				content: "I can help with scripture, notes, questions, word definitions, and articles. What would you like to know?"
			});
		}

		// Extract reference if present (multiple formats)
		let reference = null;
		const patterns = [
			/(\w+\s+\d+:\d+(?:-\d+)?)/i,  // Book Chapter:Verse
			/(\w+\s+\d+)(?!:)/i,           // Book Chapter
		];
		
		for (const pattern of patterns) {
			const match = message.match(pattern);
			if (match) {
				reference = match[1];
				// Add :1 if only chapter provided
				if (!reference.includes(':')) {
					reference += ':1';
				}
				break;
			}
		}

		// Build URL with parameters
		const apiUrl = new URL(endpoint, url.origin);
		if (reference) apiUrl.searchParams.set('reference', reference);
		apiUrl.searchParams.set('language', 'en');
		apiUrl.searchParams.set('organization', 'unfoldingWord');
		
		// Add tool-specific params
		if (toolName === 'get_translation_word') {
			const wordMatch = message.match(/word\s+(\S+)|define\s+(\S+)|"([^"]+)"/i);
			if (wordMatch) {
				apiUrl.searchParams.set('wordId', wordMatch[1] || wordMatch[2] || wordMatch[3]);
			}
		} else if (toolName === 'fetch_translation_academy') {
			const articleMatch = message.match(/article\s+(\S+)|about\s+(\S+)|rc:([^\s\]]+)/i);
			if (articleMatch) {
				apiUrl.searchParams.set('articleId', articleMatch[1] || articleMatch[2] || articleMatch[3]);
			}
		}

		console.log('[CHAT] Calling:', apiUrl.toString());

		// Just fetch the data directly
		const response = await fetch(apiUrl.toString());
		const data = await response.json();
		
		console.log('[CHAT] Raw response:', JSON.stringify(data).substring(0, 500));

		// Extract ALL text content from the response, no matter the structure
		const textContent = extractAllText(data);
		
		if (!textContent || textContent.trim().length === 0) {
			return json({
				content: `No content found. The API returned: ${JSON.stringify(data).substring(0, 200)}...`,
				debug: { url: apiUrl.toString(), response: data }
			});
		}

		return json({
			content: textContent,
			tool: toolName,
			reference: reference
		});

	} catch (error) {
		console.error('Chat error:', error);
		return json({
			error: 'An error occurred',
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};

/**
 * Recursively extract ALL text from ANY data structure
 * This is truly anti-fragile - it doesn't care about field names
 */
function extractAllText(data: any, collected: string[] = [], depth = 0): string {
	if (depth > 10) return collected.join('\n\n'); // Prevent infinite recursion
	
	if (typeof data === 'string') {
		// It's text! Add it if it's meaningful
		if (data.trim().length > 0 && !data.startsWith('{') && !data.startsWith('[')) {
			collected.push(data);
		}
	} else if (Array.isArray(data)) {
		// Process each array item
		data.forEach((item, index) => {
			if (typeof item === 'object' && item !== null) {
				// For objects in arrays, try to format them nicely
				const itemText = extractAllText(item, [], depth + 1);
				if (itemText) {
					collected.push(`${index + 1}. ${itemText}`);
				}
			} else {
				extractAllText(item, collected, depth + 1);
			}
		});
	} else if (data && typeof data === 'object') {
		// Process object fields
		Object.entries(data).forEach(([key, value]) => {
			// Skip meta fields and empty values
			if (key.startsWith('_') || key === 'success' || key === 'error' || value === null || value === undefined) {
				return;
			}
			
			// Special handling for common patterns
			if (key.toLowerCase().includes('title') && typeof value === 'string') {
				collected.push(`## ${value}`);
			} else if (key.toLowerCase().includes('content') || key.toLowerCase().includes('text') || key.toLowerCase().includes('note')) {
				extractAllText(value, collected, depth + 1);
			} else if (Array.isArray(value) && value.length > 0) {
				// Handle arrays of notes/questions/etc
				if (key.toLowerCase().includes('note') || key.toLowerCase().includes('question')) {
					collected.push(`\n### ${key}:\n`);
				}
				extractAllText(value, collected, depth + 1);
			} else {
				extractAllText(value, collected, depth + 1);
			}
		});
	}
	
	return collected.join('\n\n');
}