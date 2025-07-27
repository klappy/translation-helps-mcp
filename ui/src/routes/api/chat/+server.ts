export const config = {
	runtime: 'edge'
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Smart Chat Endpoint
 * Gets data efficiently, formats naturally
 */

export const POST: RequestHandler = async ({ request, url, fetch }) => {
	try {
		const { message, history = [] } = await request.json();
		
		if (!message) {
			return json({ error: 'No message provided' });
		}

		// Parse what the user wants
		const intent = parseUserIntent(message);
		
		// If no data needed, just respond conversationally
		if (!intent.needsData) {
			return json({
				content: generateHelpfulResponse(message),
				conversational: true
			});
		}

		// Get the data
		const apiUrl = new URL(intent.endpoint, url.origin);
		Object.entries(intent.params).forEach(([key, value]) => {
			if (value) apiUrl.searchParams.set(key, String(value));
		});

		console.log('[CHAT] Fetching:', apiUrl.toString());
		const response = await fetch(apiUrl.toString());
		const data = await response.json();
		
		// Now format it naturally based on what we got
		const content = formatResponseNaturally(data, intent, message);
		
		return json({
			content,
			tool: intent.tool,
			reference: intent.params.reference
		});

	} catch (error) {
		console.error('Chat error:', error);
		return json({
			content: "I'm having trouble with that request. Could you try rephrasing it? I can help with Bible passages, translation notes, word meanings, and study questions.",
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};

/**
 * Parse user intent simply
 */
function parseUserIntent(message: string) {
	const lower = message.toLowerCase();
	const refMatch = message.match(/(\w+\s+\d+(?::\d+)?)/i);
	const reference = refMatch ? refMatch[1] : null;
	
	// Notes request
	if (lower.includes('note') || lower.includes('explain') || lower.includes('tell me about')) {
		return {
			needsData: true,
			tool: 'fetch_translation_notes',
			endpoint: '/api/fetch-translation-notes',
			params: { reference, language: 'en', organization: 'unfoldingWord' }
		};
	}
	
	// Questions request
	if (lower.includes('question') || lower.includes('study') || lower.includes('discuss')) {
		return {
			needsData: true,
			tool: 'fetch_translation_questions',
			endpoint: '/api/fetch-translation-questions',
			params: { reference, language: 'en' }
		};
	}
	
	// Word definition
	if (lower.includes('mean') || lower.includes('definition') || lower.includes('what is')) {
		const wordMatch = message.match(/(?:mean|define|what is)\s+["']?(\w+)["']?/i);
		return {
			needsData: true,
			tool: 'get_translation_word',
			endpoint: '/api/get-translation-word',
			params: { wordId: wordMatch?.[1]?.toLowerCase(), language: 'en' }
		};
	}
	
	// Article request
	if (lower.includes('article') || lower.includes('academy')) {
		const articleMatch = message.match(/(?:article|about|rc:)\s*([^\s\)]+)/i);
		return {
			needsData: true,
			tool: 'fetch_translation_academy',
			endpoint: '/api/fetch-translation-academy',
			params: { articleId: articleMatch?.[1], language: 'en' }
		};
	}
	
	// Default to scripture if reference found
	if (reference) {
		return {
			needsData: true,
			tool: 'fetch_scripture',
			endpoint: '/api/fetch-scripture',
			params: { reference, language: 'en' }
		};
	}
	
	return { needsData: false };
}

/**
 * Format responses naturally based on the data
 * THIS is where we use intelligence instead of hardcoding
 */
function formatResponseNaturally(data: any, intent: any, userMessage: string): string {
	const { tool, params } = intent;
	
	// For scripture - preserve exact text
	if (tool === 'fetch_scripture') {
		const text = extractScriptureText(data);
		if (!text) return "I couldn't find that scripture passage. Could you check the reference?";
		
		const intros = [
			`Here's ${params.reference}:`,
			`${params.reference} says:`,
			`Let me share ${params.reference} with you:`
		];
		
		let response = `${intros[Math.floor(Math.random() * intros.length)]}\n\n> ${text}`;
		
		// Process any RC links
		response = makeRCLinksClickable(response);
		
		if (response.includes('](rc://')) {
			response += '\n\n💡 *Click any 📚 link to learn more about key terms.*';
		}
		
		return response;
	}
	
	// For notes - summarize helpfully
	if (tool === 'fetch_translation_notes') {
		const notes = extractNotes(data);
		if (!notes.length) return `I don't have translation notes for ${params.reference} yet. Would you like to see the scripture text instead?`;
		
		let response = `Here are the translation notes for ${params.reference}:\n\n`;
		
		notes.forEach((note, index) => {
			const quote = note.quote || note.Quote || '';
			const content = (note.text || note.note || note.Note || note.content || '').replace(/\\n/g, '\n').trim();
			
			if (quote) {
				response += `**${index + 1}.** **"${quote}"** — ${content}\n\n`;
			} else {
				response += `**${index + 1}.** ${content}\n\n`;
			}
		});
		
		return makeRCLinksClickable(response);
	}
	
	// For words - clear definition
	if (tool === 'get_translation_word') {
		const word = data.word || data.data?.word || params.wordId;
		const def = data.definition || data.content || data.data?.definition || data.data?.content || '';
		
		if (!def) return `I don't have a definition for "${word}" in my database. This might be a less common term.`;
		
		return makeRCLinksClickable(`**${word}**\n\n${def.replace(/\\n/g, '\n').trim()}`);
	}
	
	// For questions - numbered list
	if (tool === 'fetch_translation_questions') {
		const questions = extractQuestions(data);
		if (!questions.length) return `I don't have study questions for ${params.reference} yet.`;
		
		let response = `Here are some study questions for ${params.reference}:\n\n`;
		questions.forEach((q, index) => {
			response += `**${index + 1}.** ${q}\n\n`;
		});
		response += '*💭 Use these for personal study or group discussion.*';
		
		return response;
	}
	
	// For academy - article content
	if (tool === 'fetch_translation_academy') {
		if (data.title && data.content) {
			return makeRCLinksClickable(`# ${data.title}\n\n${data.content}`);
		}
		if (data.data?.title && data.data?.content) {
			return makeRCLinksClickable(`# ${data.data.title}\n\n${data.data.content}`);
		}
		return "I couldn't find that Translation Academy article.";
	}
	
	// Fallback
	return "I found some data but I'm not sure how to present it. Try asking more specifically.";
}

/**
 * Extract scripture text exactly
 */
function extractScriptureText(data: any): string {
	if (typeof data.text === 'string') return data.text;
	if (data.data?.text) return data.data.text;
	if (data.verseObjects || data.data?.verseObjects) {
		const objects = data.verseObjects || data.data.verseObjects;
		return objects
			.filter((obj: any) => obj.type === 'text' || obj.type === 'word')
			.map((obj: any) => obj.text || '')
			.join('');
	}
	return '';
}

/**
 * Extract notes from various formats
 */
function extractNotes(data: any): any[] {
	const notes = [];
	const arrays = [
		data?.verseNotes,
		data?.contextNotes,
		data?.notes,
		data?.data?.verseNotes,
		data?.data?.notes
	].filter(arr => Array.isArray(arr));
	
	return arrays.flat();
}

/**
 * Extract questions
 */
function extractQuestions(data: any): string[] {
	let questions = [];
	if (Array.isArray(data)) questions = data;
	else if (data.questions) questions = data.questions;
	else if (data.data?.questions) questions = data.data.questions;
	
	return questions
		.map((q: any) => q.question || q.text || q)
		.filter((q: any) => typeof q === 'string');
}

/**
 * Make RC links clickable
 */
function makeRCLinksClickable(text: string): string {
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
 * Generate helpful conversational responses
 */
function generateHelpfulResponse(message: string): string {
	const responses = [
		"I'd be happy to help you explore the Bible! You can ask me about any passage, translation notes, word meanings, or study questions.",
		"I'm here to assist with your Bible study. What passage or topic would you like to explore?",
		"Feel free to ask about scripture, translation helps, or biblical terms. What interests you?",
		"I can help with Bible passages, translation notes, word definitions, and study materials. What would you like to know?"
	];
	
	return responses[Math.floor(Math.random() * responses.length)];
}