export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Natural Conversational Chat
 * Uses context and natural language to intelligently select and use tools
 */

interface ChatContext {
	lastTool?: string;
	lastReference?: string;
	topic?: string;
}

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { message, history = [] } = await request.json();
		
		if (!message) {
			return json({ error: 'No message provided' });
		}

		// Build context from conversation history
		const context = buildContext(history);
		
		// Natural language understanding
		const intent = understandIntent(message, context);
		
		// If no clear intent, just have a conversation
		if (!intent.tool) {
			return json({
				content: generateConversationalResponse(message, context),
				conversational: true
			});
		}

		// Build the API URL
		const apiUrl = new URL(intent.endpoint, url.origin);
		Object.entries(intent.params).forEach(([key, value]) => {
			if (value) apiUrl.searchParams.set(key, String(value));
		});

		console.log('[CHAT] Natural intent:', intent);
		console.log('[CHAT] Calling:', apiUrl.toString());

		// Fetch the data
		const response = await fetch(apiUrl.toString());
		const data = await response.json();
		
		// Extract and format content naturally
		const rawContent = extractAllText(data);
		
		if (!rawContent || rawContent.trim().length === 0) {
			return json({
				content: generateNoDataResponse(intent, context),
				debug: { url: apiUrl.toString(), response: data }
			});
		}

		// Format content conversationally
		const formattedContent = formatNaturally(rawContent, intent, context);

		return json({
			content: formattedContent,
			tool: intent.tool,
			reference: intent.params.reference,
			natural: true
		});

	} catch (error) {
		console.error('Chat error:', error);
		return json({
			content: "I'm having trouble understanding that. Could you rephrase your question? I can help with Bible passages, translation notes, word meanings, and more.",
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};

/**
 * Build context from conversation history
 */
function buildContext(history: any[]): ChatContext {
	const context: ChatContext = {};
	
	// Look at recent messages to understand context
	for (let i = history.length - 1; i >= Math.max(0, history.length - 5); i--) {
		const msg = history[i];
		if (msg.reference) context.lastReference = msg.reference;
		if (msg.tool) context.lastTool = msg.tool;
		
		// Extract topic from content
		const refMatch = msg.content?.match(/(\w+\s+\d+(?::\d+)?)/);
		if (refMatch) context.lastReference = refMatch[1];
	}
	
	return context;
}

/**
 * Understand user intent from natural language
 */
function understandIntent(message: string, context: ChatContext) {
	const lower = message.toLowerCase();
	
	// Extract any reference from the message
	let reference = extractReference(message) || context.lastReference;
	
	// Natural patterns for different intents
	const patterns = [
		{
			// Notes: "tell me about", "explain", "notes on", "what do the notes say"
			match: /(tell me about|explain|notes|commentary|help me understand|what do.*say about)/i,
			tool: 'fetch_translation_notes',
			endpoint: '/api/fetch-translation-notes'
		},
		{
			// Scripture: "show me", "read", "what does X say", "verse"
			match: /(show me|read|what does.*say|verse|passage|scripture|quote)/i,
			tool: 'fetch_scripture',
			endpoint: '/api/fetch-scripture'
		},
		{
			// Questions: "questions", "study questions", "discussion"
			match: /(questions|study questions|discussion|what questions)/i,
			tool: 'fetch_translation_questions',
			endpoint: '/api/fetch-translation-questions'
		},
		{
			// Words: "what does X mean", "define", "meaning of"
			match: /(what does.*mean|define|meaning of|definition|what is\s+\w+)/i,
			tool: 'get_translation_word',
			endpoint: '/api/get-translation-word'
		},
		{
			// Academy: "article", "teach me about", "translation principle"
			match: /(article|teach.*about|translation.*principle|academy|how to translate)/i,
			tool: 'fetch_translation_academy',
			endpoint: '/api/fetch-translation-academy'
		}
	];

	// Check each pattern
	for (const pattern of patterns) {
		if (pattern.match.test(message)) {
			const params: any = {
				language: 'en',
				organization: 'unfoldingWord'
			};
			
			if (reference && pattern.tool !== 'get_translation_word') {
				params.reference = reference;
			}
			
			// Special handling for words
			if (pattern.tool === 'get_translation_word') {
				const wordMatch = message.match(/(?:mean|define|meaning of|what is)\s+["']?(\w+)["']?/i);
				if (wordMatch) {
					params.wordId = wordMatch[1].toLowerCase();
				}
			}
			
			// Special handling for articles
			if (pattern.tool === 'fetch_translation_academy') {
				const articleMatch = message.match(/(?:article|about|rc:)\s*([^\s\)]+)/i);
				if (articleMatch) {
					params.articleId = articleMatch[1];
				}
			}
			
			return { tool: pattern.tool, endpoint: pattern.endpoint, params };
		}
	}

	// Context-based inference
	if (reference && !patterns.some(p => p.match.test(message))) {
		// Default to showing scripture if they just mention a reference
		return {
			tool: 'fetch_scripture',
			endpoint: '/api/fetch-scripture',
			params: { reference, language: 'en', organization: 'unfoldingWord' }
		};
	}

	// No clear intent
	return { tool: null, endpoint: null, params: {} };
}

/**
 * Generate a natural conversational response
 */
function generateConversationalResponse(message: string, context: ChatContext): string {
	const responses = [
		"I'd be happy to help you explore the Bible! You can ask me to show you verses, explain translation notes, define words, or answer study questions. What would you like to know?",
		"I can help with scripture, translation notes, word meanings, and study materials. Just ask naturally - for example, 'Show me John 3:16' or 'What does agape mean?'",
		"Feel free to ask about any Bible passage or translation topic. I'm here to help you understand God's Word better.",
		`I'm here to assist with Bible study and translation. ${context.lastReference ? `Would you like to know more about ${context.lastReference}?` : 'What passage or topic interests you?'}`
	];
	
	// Pick a response based on message characteristics
	if (message.includes('?')) {
		return responses[0];
	} else if (message.length < 20) {
		return responses[1];
	} else {
		return responses[Math.floor(Math.random() * responses.length)];
	}
}

/**
 * Generate a natural "no data" response
 */
function generateNoDataResponse(intent: any, context: ChatContext): string {
	const { tool, params } = intent;
	
	if (tool === 'fetch_translation_notes') {
		return `I couldn't find translation notes for ${params.reference || 'that passage'}. This might be because notes haven't been created for this specific verse yet. Would you like me to show you the scripture text instead?`;
	} else if (tool === 'get_translation_word') {
		return `I don't have a definition for "${params.wordId}" in my translation words database. This might be a less common term. Would you like me to search for related words or show you where this word appears in scripture?`;
	} else {
		return `I couldn't find the information you're looking for. Could you try rephrasing your question, or would you like to explore something else?`;
	}
}

/**
 * Format content naturally based on intent and context
 */
function formatNaturally(content: string, intent: any, context: ChatContext): string {
	// Process RC links first
	let formatted = processRCLinks(content);
	
	const { tool, params } = intent;
	
	// Natural introductions based on tool
	if (tool === 'fetch_scripture') {
		const intro = [
			`Here's ${params.reference}:`,
			`Let me show you ${params.reference}:`,
			`${params.reference} says:`,
			`The passage reads:`
		][Math.floor(Math.random() * 4)];
		
		formatted = `${intro}\n\n${formatted}`;
		
		if (formatted.includes('](rc://')) {
			formatted += '\n\n*I notice there are some key terms here. Click any 📚 link to explore their meanings.*';
		}
	} else if (tool === 'fetch_translation_notes') {
		const intro = [
			`Here are the translation notes for ${params.reference}:`,
			`Let me share what the translators noted about ${params.reference}:`,
			`The translation team provides these insights on ${params.reference}:`,
			`Here's what might help in understanding ${params.reference}:`
		][Math.floor(Math.random() * 4)];
		
		formatted = `${intro}\n\n${formatted}`;
	} else if (tool === 'get_translation_word') {
		if (!formatted.includes(params.wordId)) {
			formatted = `**${params.wordId}**\n\n${formatted}`;
		}
		formatted += '\n\n*Click any 📚 links to explore related concepts.*';
	} else if (tool === 'fetch_translation_questions') {
		const intro = `Here are some study questions for ${params.reference}:`;
		formatted = `${intro}\n\n${formatted}\n\n*These questions can help guide your study or discussion of this passage.*`;
	}
	
	return formatted;
}

/**
 * Extract reference from natural language
 */
function extractReference(message: string): string | null {
	// Multiple patterns for natural reference extraction
	const patterns = [
		/(\w+\s+\d+:\d+(?:-\d+)?)/i,  // Book Chapter:Verse
		/(\w+\s+\d+)(?!:)\b/i,         // Book Chapter
		/(\w+\s+chapter\s+\d+)/i,      // Book chapter X
		/((?:1|2|3|I|II|III)\s*\w+\s+\d+(?::\d+)?)/i, // Numbered books
	];
	
	for (const pattern of patterns) {
		const match = message.match(pattern);
		if (match) {
			let ref = match[1];
			// Normalize "chapter" usage
			ref = ref.replace(/\s+chapter\s+/i, ' ');
			// Add :1 if only chapter
			if (!ref.includes(':') && /\d+$/.test(ref)) {
				ref += ':1';
			}
			return ref;
		}
	}
	
	return null;
}

/**
 * Process RC links - kept from before but simplified
 */
function processRCLinks(text: string): string {
	let processed = text;
	
	// Convert all RC link formats to clickable
	processed = processed.replace(/\[\[rc:\/\/\*?\/([^\]]+)\]\]/g, (match, path) => {
		const id = path.split('/').pop();
		const name = id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
		return `📚 [${name}](rc://${path})`;
	});
	
	processed = processed.replace(/(?<!\[)(?<!\()rc:\/\/\*?\/([^\s\)\]]+)/g, (match, path) => {
		const id = path.split('/').pop();
		const name = id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
		return `📚 [${name}](rc://${path})`;
	});
	
	// Add emoji to existing markdown RC links
	processed = processed.replace(/(?<!📚\s)\[([^\]]+)\]\(rc:\/\/([^\)]+)\)/g, '📚 [$1](rc://$2)');
	
	return processed;
}

/**
 * Extract all text recursively - kept from before
 */
function extractAllText(data: any, collected: string[] = [], depth = 0): string {
	if (depth > 10) return collected.join('\n\n');
	
	if (typeof data === 'string') {
		if (data.trim().length > 0 && !data.startsWith('{') && !data.startsWith('[')) {
			collected.push(data);
		}
	} else if (Array.isArray(data)) {
		data.forEach((item, index) => {
			if (typeof item === 'object' && item !== null) {
				const itemText = extractAllText(item, [], depth + 1);
				if (itemText) {
					collected.push(`${index + 1}. ${itemText}`);
				}
			} else {
				extractAllText(item, collected, depth + 1);
			}
		});
	} else if (data && typeof data === 'object') {
		Object.entries(data).forEach(([key, value]) => {
			if (key.startsWith('_') || key === 'success' || key === 'error' || value === null || value === undefined) {
				return;
			}
			
			if (key.toLowerCase().includes('title') && typeof value === 'string') {
				collected.push(`## ${value}`);
			} else if (key.toLowerCase().includes('content') || key.toLowerCase().includes('text') || key.toLowerCase().includes('note')) {
				extractAllText(value, collected, depth + 1);
			} else if (Array.isArray(value) && value.length > 0) {
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