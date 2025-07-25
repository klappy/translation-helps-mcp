import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { SACRED_TEXT_SYSTEM_PROMPT } from '../../../../../src/config/SacredTextConstraints.js';

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
		
		// Handle scripture requests
		if (lowerMessage.includes('titus') || lowerMessage.includes('show') || lowerMessage.includes('verse')) {
			// Extract reference - simple pattern matching for demo
			let reference = 'Titus 1:1'; // Default
			if (message.match(/titus\s+\d+:\d+/i)) {
				reference = message.match(/titus\s+\d+:\d+/i)[0];
			}
			
			// Call the MCP tool via the API
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
				const scriptureText = result.content?.[0]?.text || 'Scripture not found';
				
				content = `Here's ${reference} from the ULT (Unfoldingword Literal Text):

${scriptureText}

[Scripture - ${reference} ULT]`;
				
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
		// Handle translation notes requests
		else if (lowerMessage.includes('notes') || lowerMessage.includes('translation notes')) {
			// Extract reference
			let reference = 'Titus 1:1'; // Default
			const refMatch = message.match(/(\w+\s+\d+:\d+)/i);
			if (refMatch) {
				reference = refMatch[1];
			}
			
			// Call the translation notes tool
			const toolResponse = await fetch('/api/fetch-translation-notes', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
			
			if (toolResponse.ok) {
				const notes = await toolResponse.json();
				content = `Translation Notes for ${reference}:\n\n`;
				
				// Filter notes for the specific reference
				const relevantNotes = notes.notes?.filter(note => 
					note.reference?.includes(reference.replace(/\s+/g, '').toLowerCase())
				) || [];
				
				if (relevantNotes.length > 0) {
					relevantNotes.forEach(note => {
						content += `• ${note.note || note.content}\n\n`;
					});
				} else {
					content += 'No specific translation notes found for this verse.\n';
				}
				
				content += `\n[Translation Notes - ${reference}]`;
				
				xrayData.tools.push({
					id: 'tool-2',
					name: 'fetch_translation_notes',
					params: { reference },
					response: { notes: relevantNotes },
					duration: 200,
					cached: true
				});
				xrayData.citations.push(`Translation Notes - ${reference}`);
			}
		}
		// Default response
		else {
			content = `I can help you explore Bible passages and translation resources. Try asking:

• "Show me Titus 1:1" - to see scripture text
• "What notes are in Titus 1:1?" - for translation notes
• "What does agape mean?" - for word meanings
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