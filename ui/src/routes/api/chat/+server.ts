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
			`${params.reference} says:`,
			`The passage reads:`,
			`Let me show you ${params.reference}:`
		][Math.floor(Math.random() * 4)];
		
		// Scripture should be in a clear quote block
		formatted = `${intro}\n\n> ${formatted.trim()}`;
		
		// Add note about word links if present
		if (formatted.includes('](rc://')) {
			formatted += '\n\n*💡 Click any 📚 link to explore the meaning of key terms.*';
		}
	} else if (tool === 'fetch_translation_notes') {
		// Notes are already well-formatted, just add intro
		const intro = [
			`Here's what the translation team noted about ${params.reference}:`,
			`The translators provide these insights on ${params.reference}:`,
			`Translation notes for ${params.reference}:`
		][Math.floor(Math.random() * 3)];
		
		formatted = `${intro}\n\n${formatted}`;
		
		// Add helpful tip if RC links present
		if (formatted.includes('](rc://')) {
			formatted += '\n\n*💡 The 📚 links lead to helpful articles about translation concepts.*';
		}
	} else if (tool === 'get_translation_word') {
		// Word definitions are already clean, just ensure nice presentation
		if (!formatted.toLowerCase().includes(params.wordId?.toLowerCase())) {
			formatted = `**Definition of "${params.wordId}":**\n\n${formatted}`;
		}
	} else if (tool === 'fetch_translation_questions') {
		// Questions are already numbered, just add context
		const intro = `Here are some study questions to consider for ${params.reference}:`;
		formatted = `${intro}\n\n${formatted}\n\n*💭 These questions can help guide personal study or group discussion.*`;
	} else if (tool === 'fetch_translation_academy') {
		// Academy articles are already formatted with headers
		// Just ensure clean presentation
		if (!formatted.startsWith('#')) {
			formatted = `## ${formatted}`;
		}
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
 * Extract and format content intelligently based on data structure
 */
function extractAllText(data: any, depth = 0): string {
	// For scripture, preserve exact text
	if (isScriptureData(data)) {
		return extractScripture(data);
	}
	
	// For translation notes, format them nicely
	if (isTranslationNotes(data)) {
		return formatTranslationNotes(data);
	}
	
	// For translation words, create a clean definition
	if (isTranslationWord(data)) {
		return formatTranslationWord(data);
	}
	
	// For translation questions, format as a numbered list
	if (isTranslationQuestions(data)) {
		return formatTranslationQuestions(data);
	}
	
	// For translation academy, extract article content
	if (isTranslationAcademy(data)) {
		return formatTranslationAcademy(data);
	}
	
	// Fallback to smart extraction
	return smartExtract(data);
}

/**
 * Check if data looks like scripture
 */
function isScriptureData(data: any): boolean {
	return data?.verseObjects || data?.text || (data?.data?.text && data?.data?.verseObjects);
}

/**
 * Extract scripture text exactly as provided
 */
function extractScripture(data: any): string {
	// Direct text field
	if (typeof data.text === 'string') return data.text;
	
	// Nested in data
	if (data.data?.text) return data.data.text;
	
	// From verse objects
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
 * Check if data contains translation notes
 */
function isTranslationNotes(data: any): boolean {
	return data?.verseNotes || data?.contextNotes || data?.notes || 
		   data?.data?.verseNotes || data?.data?.notes;
}

/**
 * Format translation notes beautifully
 */
function formatTranslationNotes(data: any): string {
	const notes = [];
	
	// Collect all note arrays
	const noteArrays = [
		data?.verseNotes,
		data?.contextNotes,
		data?.notes,
		data?.data?.verseNotes,
		data?.data?.notes
	].filter(arr => Array.isArray(arr));
	
	// Flatten and process notes
	const allNotes = noteArrays.flat();
	
	if (allNotes.length === 0) return 'No translation notes available for this passage.';
	
	// Group by type (verse notes vs context notes)
	const verseNotes = allNotes.filter(n => !n.reference?.includes('Chapter') && !n.reference?.includes('Introduction'));
	const contextNotes = allNotes.filter(n => n.reference?.includes('Chapter') || n.reference?.includes('Introduction'));
	
	// Format context notes first if any
	if (contextNotes.length > 0) {
		contextNotes.forEach(note => {
			const title = note.reference || 'Context';
			const content = extractNoteContent(note);
			if (content) {
				notes.push(`## ${title}\n\n${content}`);
			}
		});
	}
	
	// Format verse notes
	if (verseNotes.length > 0) {
		const formattedVerseNotes = verseNotes
			.map((note, index) => {
				const content = extractNoteContent(note);
				if (!content) return null;
				
				// Format with quote if available
				const quote = note.quote || note.Quote;
				if (quote && quote.trim()) {
					return `**${index + 1}.** **"${quote}"** — ${content}`;
				} else {
					return `**${index + 1}.** ${content}`;
				}
			})
			.filter(Boolean);
			
		if (formattedVerseNotes.length > 0) {
			notes.push(formattedVerseNotes.join('\n\n'));
		}
	}
	
	return notes.join('\n\n');
}

/**
 * Extract content from a note object
 */
function extractNoteContent(note: any): string {
	let content = note.text || note.note || note.Note || note.content || '';
	
	// Unescape newlines
	content = content.replace(/\\n/g, '\n');
	
	// Clean up excessive whitespace
	content = content.replace(/\n{3,}/g, '\n\n').trim();
	
	return content;
}

/**
 * Check if data is a translation word
 */
function isTranslationWord(data: any): boolean {
	return data?.word || data?.definition || data?.content ||
		   (data?.data && (data.data.word || data.data.definition));
}

/**
 * Format translation word definition
 */
function formatTranslationWord(data: any): string {
	const word = data.word || data.data?.word || '';
	const definition = data.definition || data.content || data.data?.definition || data.data?.content || '';
	
	let result = '';
	
	if (word) {
		result += `**${word}**\n\n`;
	}
	
	if (definition) {
		// Clean up the definition
		let cleanDef = definition
			.replace(/\\n/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
			
		result += cleanDef;
	}
	
	// Add examples if available
	if (data.examples || data.data?.examples) {
		const examples = data.examples || data.data.examples;
		if (Array.isArray(examples) && examples.length > 0) {
			result += '\n\n**Examples:**\n';
			examples.forEach((ex: any) => {
				if (ex.text) result += `• ${ex.text}\n`;
			});
		}
	}
	
	return result || 'No definition available.';
}

/**
 * Check if data contains translation questions
 */
function isTranslationQuestions(data: any): boolean {
	return data?.questions || data?.data?.questions ||
		   (Array.isArray(data) && data[0]?.question);
}

/**
 * Format translation questions
 */
function formatTranslationQuestions(data: any): string {
	let questions = [];
	
	if (Array.isArray(data)) {
		questions = data;
	} else if (data.questions) {
		questions = data.questions;
	} else if (data.data?.questions) {
		questions = data.data.questions;
	}
	
	if (!questions.length) return 'No study questions available for this passage.';
	
	return questions
		.map((q: any, index: number) => {
			const question = q.question || q.text || q;
			if (typeof question === 'string') {
				return `**${index + 1}.** ${question}`;
			}
			return null;
		})
		.filter(Boolean)
		.join('\n\n');
}

/**
 * Check if data is Translation Academy content
 */
function isTranslationAcademy(data: any): boolean {
	return data?.title || data?.modules || data?.data?.modules ||
		   (data?.success && (data?.data?.title || data?.data?.modules));
}

/**
 * Format Translation Academy content
 */
function formatTranslationAcademy(data: any): string {
	// Direct article
	if (data.title && data.content) {
		return `# ${data.title}\n\n${data.content}`;
	}
	
	// Article in data field
	if (data.data?.title && data.data?.content) {
		return `# ${data.data.title}\n\n${data.data.content}`;
	}
	
	// Module list
	if (data.modules || data.data?.modules) {
		const modules = data.modules || data.data.modules;
		if (Array.isArray(modules) && modules.length > 0) {
			// If only one module, show its content
			if (modules.length === 1) {
				const module = modules[0];
				return `# ${module.title}\n\n${module.description || ''}\n\n${module.content || ''}`.trim();
			}
			
			// Otherwise list available modules
			return '# Available Topics\n\n' + modules
				.map((m: any) => `• **${m.title}**: ${m.description || 'No description'}`)
				.join('\n');
		}
	}
	
	return 'No content available.';
}

/**
 * Smart extraction for unknown data types
 */
function smartExtract(data: any, collected: string[] = [], depth = 0): string {
	if (depth > 5) return collected.join('\n\n');
	
	if (typeof data === 'string') {
		if (data.trim().length > 0 && !data.startsWith('{') && !data.startsWith('[')) {
			collected.push(data);
		}
	} else if (Array.isArray(data)) {
		data.forEach(item => {
			if (typeof item === 'string') {
				collected.push(item);
			} else if (typeof item === 'object' && item !== null) {
				smartExtract(item, collected, depth + 1);
			}
		});
	} else if (data && typeof data === 'object') {
		// Look for content fields first
		const contentFields = ['content', 'text', 'description', 'note', 'definition'];
		for (const field of contentFields) {
			if (data[field] && typeof data[field] === 'string') {
				collected.push(data[field]);
			}
		}
		
		// Then recurse into other fields
		Object.entries(data).forEach(([key, value]) => {
			if (!key.startsWith('_') && !contentFields.includes(key) && value) {
				smartExtract(value, collected, depth + 1);
			}
		});
	}
	
	return collected.join('\n\n').trim();
}