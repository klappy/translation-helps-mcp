export const config = {
	runtime: 'edge'
};

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { SACRED_TEXT_SYSTEM_PROMPT } from '../../../../../src/config/SacredTextConstraints.js';
import { mcpHandler } from '$lib/mcp/UnifiedMCPHandler';
import { MCPResponseAdapter } from '$lib/adapters/MCPResponseAdapter';

// Real chat handler that uses MCP tools
export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const { message, history, enableXRay } = await request.json();
		
		// Start timing
		const startTime = Date.now();
		const xrayData = {
			tools: [],
			totalTime: 0,
			citations: [],
			timeline: [
				{ time: 0, event: 'Request received' }
			]
		};
		
		// Detect what the user is asking for
		const lowerMessage = message.toLowerCase();
		let content = '';
		
		// Check for specific tool requests BEFORE general scripture requests
		// Handle translation questions FIRST
		if (lowerMessage.includes('question') || lowerMessage.includes('tq')) {
			// Extract reference
			let reference = 'Titus 1:1'; // Default
			const refMatch = message.match(/(\w+\s+\d+:\d+)/i);
			if (refMatch) {
				reference = refMatch[1];
			}
			
			// Call the MCP tool for translation questions
			const toolResponse = await fetch('/api/mcp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					method: 'tools/call',
					params: {
						name: 'fetch_translation_questions',
						arguments: {
							reference,
							language: 'en'
						}
					}
				})
			});
			
			const toolStartTime = Date.now() - startTime;
			
			if (toolResponse.ok) {
				const result = await toolResponse.json();
				const questionsText = MCPResponseAdapter.formatTranslationQuestions(result, reference);
				
				content = `Translation Questions for ${reference}:\n\n${questionsText}\n\n[Translation Questions - ${reference}]`;
				
				// Record tool usage
				xrayData.tools.push({
					id: 'tool-4',
					name: 'fetch_translation_questions',
					params: { reference, language: 'en' },
					response: { text: questionsText },
					duration: Date.now() - startTime - toolStartTime,
					cached: false
				});
				xrayData.citations.push(`Translation Questions - ${reference}`);
				xrayData.timeline.push({ time: toolStartTime, event: 'Tool: fetch_translation_questions' });
			} else {
				content = 'Sorry, I encountered an error fetching the translation questions. Please try again.';
			}
		}
		// Handle translation notes requests
		else if (lowerMessage.includes('notes') || lowerMessage.includes('translation notes')) {
			// Extract reference
			let reference = 'Titus 1:1'; // Default
			const refMatch = message.match(/(\w+\s+\d+:\d+)/i);
			if (refMatch) {
				reference = refMatch[1];
			}
			
			// Call the MCP tool for translation notes
			const toolResponse = await fetch('/api/mcp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					method: 'tools/call',
					params: {
						name: 'fetch_translation_notes',
						arguments: {
							reference,
							language: 'en',
							organization: 'unfoldingWord'
						}
					}
				})
			});
			
			const toolStartTime = Date.now() - startTime;
			
			if (toolResponse.ok) {
				const result = await toolResponse.json();
				const notesText = MCPResponseAdapter.formatTranslationNotes(result, reference);
				
				content = `Translation Notes for ${reference}:\n\n${notesText}\n\n[Translation Notes - ${reference}]`;
				
				// Record tool usage
				xrayData.tools.push({
					id: 'tool-2',
					name: 'fetch_translation_notes',
					params: { reference, language: 'en', organization: 'unfoldingWord' },
					response: { text: notesText },
					duration: Date.now() - startTime - toolStartTime,
					cached: false
				});
				xrayData.citations.push(`Translation Notes - ${reference}`);
				xrayData.timeline.push({ time: toolStartTime, event: 'Tool: fetch_translation_notes' });
			} else {
				content = 'Sorry, I encountered an error fetching the translation notes. Please try again.';
			}
		}
		// Handle Translation Academy requests
		else if (lowerMessage.includes('translation academy') || lowerMessage.includes('article:')) {
			// Extract article ID from parentheses or after colon
			let articleId = '';
			const parenMatch = message.match(/\(([^)]+)\)/);
			const colonMatch = message.match(/article:\s*(\S+)/i);
			
			if (parenMatch) {
				articleId = parenMatch[1];
			} else if (colonMatch) {
				articleId = colonMatch[1];
			}
			
			if (articleId) {
				// Call the Translation Academy endpoint directly
				const taResponse = await fetch(`/api/fetch-translation-academy?articleId=${encodeURIComponent(articleId)}&language=en`);
				
				const toolStartTime = Date.now() - startTime;
				
				if (taResponse.ok) {
					const taData = await taResponse.json();
					
					content = `# ${taData.title}\n\n${taData.content}\n\n[Translation Academy - ${articleId}]`;
					
					// Record tool usage
					xrayData.tools.push({
						id: 'tool-ta',
						name: 'fetch_translation_academy',
						params: { articleId, language: 'en' },
						response: { title: taData.title },
						duration: Date.now() - startTime - toolStartTime,
						cached: false
					});
					xrayData.citations.push(`Translation Academy - ${articleId}`);
					xrayData.timeline.push({ time: toolStartTime, event: 'Tool: fetch_translation_academy' });
				} else {
					content = `Could not find the Translation Academy article: ${articleId}`;
				}
			} else {
				content = 'Please specify which Translation Academy article you\'d like to read.';
			}
		}
		// Handle translation words requests
		else if (lowerMessage.includes('mean') || lowerMessage.includes('word') || lowerMessage.includes('definition')) {
			// Extract word - look for quoted words or specific biblical terms
			let wordId = '';
			const quotedMatch = message.match(/["']([^"']+)["']/);
			const wordMatch = message.match(/\b(agape|love|faith|grace|mercy|salvation|righteousness|holy|spirit)\b/i);
			
			if (quotedMatch) {
				wordId = quotedMatch[1];
			} else if (wordMatch) {
				wordId = wordMatch[1];
			}
			
			if (wordId) {
				// Call the MCP tool for translation words
				const toolResponse = await fetch('/api/mcp', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						method: 'tools/call',
						params: {
							name: 'get_translation_word',
							arguments: {
								wordId: wordId.toLowerCase(),
								language: 'en'
							}
						}
					})
				});
				
				const toolStartTime = Date.now() - startTime;
				
				if (toolResponse.ok) {
					const result = await toolResponse.json();
					const wordText = MCPResponseAdapter.formatTranslationWord(result, wordId);
					
					content = `${wordText}\n\n[Translation Words - ${wordId}]`;
					
					// Record tool usage
					xrayData.tools.push({
						id: 'tool-3',
						name: 'get_translation_word',
						params: { wordId, language: 'en' },
						response: { text: wordText },
						duration: Date.now() - startTime - toolStartTime,
						cached: false
					});
					xrayData.citations.push(`Translation Words - ${wordId}`);
					xrayData.timeline.push({ time: toolStartTime, event: 'Tool: get_translation_word' });
				}
			} else {
				content = 'Please specify which word you\'d like to know about. For example: "What does \'agape\' mean?"';
			}
		}
		// Handle scripture requests LAST (catch-all for verse references)
		else if (lowerMessage.includes('show') || lowerMessage.includes('verse') || message.match(/\w+\s+\d+:\d+/i)) {
			// Extract reference
			let reference = 'John 3:16'; // Default
			const refMatch = message.match(/(\w+\s+\d+:\d+)/i);
			if (refMatch) {
				reference = refMatch[0];
			}
			
			// Call the MCP tool for scripture
			const toolResponse = await fetch('/api/mcp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					method: 'tools/call',
					params: {
						name: 'fetch_scripture',
						arguments: {
							reference,
							language: 'en',
							version: 'ult'
						}
					}
				})
			});
			
			const toolStartTime = Date.now() - startTime;
			
			if (toolResponse.ok) {
				const result = await toolResponse.json();
				const scriptureText = MCPResponseAdapter.formatScripture(result, reference);
				
				content = `Here's ${reference} from the ULT (Unfoldingword Literal Text):\n\n${scriptureText}\n\n[Scripture - ${reference} ULT]`;
				
				// Record tool usage
				xrayData.tools.push({
					id: 'tool-1',
					name: 'fetch_scripture',
					params: { reference, version: 'ult', language: 'en' },
					response: { text: scriptureText },
					duration: Date.now() - startTime - toolStartTime,
					cached: false
				});
				xrayData.citations.push(`Scripture - ${reference} ULT`);
				xrayData.timeline.push({ time: toolStartTime, event: 'Tool: fetch_scripture' });
			} else {
				content = 'Sorry, I encountered an error fetching the scripture. Please try again.';
			}
		}
		// Default response
		else {
			content = `I can help you explore Bible passages and translation resources. Try asking:

• "Show me Titus 1:1" - to see scripture text
• "What notes are in Titus 1:1?" - for translation notes
• "What questions are in John 3:16?" - for translation questions
• "What does 'agape' mean?" - for word meanings
• "What languages are available?" - for available resources

I follow sacred text constraints, providing verbatim scripture and cited resources.`;
		}
		
		// Calculate total time
		const endTime = Date.now();
		xrayData.totalTime = endTime - startTime;
		xrayData.timeline.push({ time: xrayData.totalTime, event: 'Response sent' });
		
		return json({
			content,
			xrayData: enableXRay ? xrayData : null
		});
		
	} catch (error) {
		console.error('Chat error:', error);
		return json(
			{ 
				error: 'Failed to process chat request',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};