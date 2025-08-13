/**
 * Chat Endpoint - Showcase for Translation Helps MCP
 *
 * This endpoint demonstrates the self-discoverable nature of the API
 * by intelligently routing natural language queries to the appropriate endpoints.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ChatRequest {
	message: string;
}

interface ApiCall {
	url: string;
	duration: number;
	response?: any;
	error?: string;
}

// Simple patterns to detect what the user is asking for
const PATTERNS = {
	scripture: /(?:what is|show me|display|get)\s+(.+\s+\d+:\d+)/i,
	definition:
		/(?:what does|define|meaning of|what is)\s+['""]?(\w+)['""]?\s+(?:mean|in the bible)?/i,
	notes: /(?:notes|translation notes|explain)\s+(?:on|for|about)\s+(.+\s+\d+:\d+)/i,
	questions:
		/(?:questions|study questions|what questions)\s+(?:for|about|should I consider for)\s+(.+)/i,
	discovery: /(?:what can you do|what endpoints|api|help|features|capabilities)/i
};

/**
 * Make an API call and track timing
 */
async function makeApiCall(url: string): Promise<ApiCall> {
	const startTime = Date.now();
	try {
		const response = await fetch(url);
		const duration = Date.now() - startTime;

		if (!response.ok) {
			return {
				url,
				duration,
				error: `HTTP ${response.status}: ${response.statusText}`
			};
		}

		const data = await response.json();
		return {
			url,
			duration,
			response: data
		};
	} catch (error) {
		return {
			url,
			duration: Date.now() - startTime,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Format the response for the chat interface
 */
function formatChatResponse(apiCalls: ApiCall[], userQuery: string): any {
	// Build response sections
	const sections: string[] = [];
	let totalDuration = 0;
	let hasErrors = false;

	// Add discovery response if requested
	if (PATTERNS.discovery.test(userQuery)) {
		sections.push(`## 🚀 Translation Helps API Capabilities

I'm a self-discoverable Bible study API! Here's what I can do:

### 📖 Scripture Fetching
- **Endpoint**: \`/api/fetch-scripture\`
- **Example**: "What is John 3:16?"
- **Formats**: JSON, Markdown, Text
- **Resources**: ULT, UST, T4T, UEB

### 📝 Translation Notes
- **Endpoint**: \`/api/translation-notes\`
- **Example**: "Explain the notes on Ephesians 2:8-9"
- **Provides**: Detailed translator notes with Greek/Hebrew insights

### ❓ Translation Questions
- **Endpoint**: \`/api/translation-questions\`
- **Example**: "What questions should I consider for Genesis 1?"
- **Provides**: Comprehension and study questions

### 📚 Translation Words
- **Endpoint**: \`/api/fetch-translation-words\`
- **Example**: "What does 'love' mean in the Bible?"
- **Provides**: Biblical term definitions with references

### 🔍 Self-Discovery
- **Endpoint**: \`/api/mcp-config\`
- **Provides**: Complete API documentation
- **All endpoints support**: \`?format=json|md|text\`

Try asking me about any Bible verse or term!`);
	}

	// Process API responses
	for (const call of apiCalls) {
		totalDuration += call.duration;

		if (call.error) {
			hasErrors = true;
			sections.push(`### ❌ Error calling ${call.url}
			
${call.error}`);
			continue;
		}

		const data = call.response;

		// Scripture response
		if (call.url.includes('fetch-scripture')) {
			sections.push(`### 📖 ${data.reference || 'Scripture'}\n`);

			if (data.scripture && data.scripture.length > 0) {
				for (const verse of data.scripture) {
					sections.push(`**${verse.translation}**
					
${verse.text}\n`);
				}
			}

			if (data.metadata) {
				sections.push(`
**Citation**: ${data.reference} | ${data.language} | ${data.organization}
**License**: ${data.metadata.license || 'CC BY-SA 4.0'}`);
			}
		}

		// Translation Notes response
		else if (call.url.includes('translation-notes')) {
			sections.push(`### 📝 Translation Notes for ${data.reference}\n`);

			if (data.items && data.items.length > 0) {
				for (const note of data.items.slice(0, 3)) {
					// Limit to 3 notes
					const title = note.Quote || note.ID || 'Note';
					sections.push(`**${title}**

${note.Note || note.content || 'No content available'}

*Support Reference*: ${note.SupportReference || 'N/A'}\n`);
				}

				if (data.items.length > 3) {
					sections.push(`*... and ${data.items.length - 3} more notes*`);
				}
			}
		}

		// Translation Questions response
		else if (call.url.includes('translation-questions')) {
			sections.push(`### ❓ Study Questions for ${data.reference}\n`);

			if (data.items && data.items.length > 0) {
				for (const question of data.items) {
					sections.push(`**Q: ${question.Question || question.question}**

A: ${question.Response || question.answer || 'No answer provided'}\n`);
				}
			}
		}

		// Translation Words response
		else if (call.url.includes('translation-words')) {
			sections.push(`### 📚 Biblical Term Definitions\n`);

			if (data.items && data.items.length > 0) {
				for (const word of data.items.slice(0, 2)) {
					// Limit to 2 words
					sections.push(`**${word.term}**

${word.definition}\n`);

					if (word.references && word.references.length > 0) {
						sections.push(`*See also*: ${word.references.slice(0, 3).join(', ')}`);
					}
				}
			}
		}
	}

	// Build final response - match what ChatInterface expects
	return {
		content: sections.join('\n\n'), // ChatInterface expects 'content', not 'response'
		xrayData: {
			queryType: detectQueryType(userQuery),
			apiCallsCount: apiCalls.length,
			totalDuration,
			hasErrors,
			apiCalls: apiCalls.map((call) => ({
				endpoint: call.url,
				duration: call.duration,
				success: !call.error,
				error: call.error
			}))
		}
	};
}

/**
 * Detect what type of query this is
 */
function detectQueryType(query: string): string {
	if (PATTERNS.scripture.test(query)) return 'scripture';
	if (PATTERNS.definition.test(query)) return 'definition';
	if (PATTERNS.notes.test(query)) return 'notes';
	if (PATTERNS.questions.test(query)) return 'questions';
	if (PATTERNS.discovery.test(query)) return 'discovery';
	return 'unknown';
}

/**
 * Main chat handler
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const { message }: ChatRequest = await request.json();
		const baseUrl = `${url.protocol}//${url.host}`;

		// Track API calls
		const apiCalls: ApiCall[] = [];

		// Check for scripture reference
		const scriptureMatch = message.match(PATTERNS.scripture);
		if (scriptureMatch) {
			const reference = scriptureMatch[1].trim();
			const encodedRef = encodeURIComponent(reference);
			apiCalls.push(
				await makeApiCall(
					`${baseUrl}/api/fetch-scripture?reference=${encodedRef}&language=en&organization=unfoldingWord&format=json`
				)
			);
		}

		// Check for word definition
		const definitionMatch = message.match(PATTERNS.definition);
		if (definitionMatch) {
			// For word definitions, we need a reference context
			// Default to John 3:16 if no reference is found
			const reference = 'John 3:16';
			const encodedRef = encodeURIComponent(reference);
			apiCalls.push(
				await makeApiCall(
					`${baseUrl}/api/fetch-translation-words?reference=${encodedRef}&language=en&organization=unfoldingWord&format=json`
				)
			);
		}

		// Check for translation notes
		const notesMatch = message.match(PATTERNS.notes);
		if (notesMatch) {
			const reference = notesMatch[1].trim();
			const encodedRef = encodeURIComponent(reference);
			apiCalls.push(
				await makeApiCall(
					`${baseUrl}/api/translation-notes?reference=${encodedRef}&language=en&organization=unfoldingWord&format=json`
				)
			);
		}

		// Check for study questions
		const questionsMatch = message.match(PATTERNS.questions);
		if (questionsMatch) {
			const reference = questionsMatch[1].trim();
			// Parse to ensure we have a proper reference
			const verseMatch = reference.match(/(\d?\s*\w+)\s*(\d+)(?::(\d+))?/);
			const fullRef = verseMatch
				? `${verseMatch[1]} ${verseMatch[2]}:${verseMatch[3] || '1'}`
				: `${reference} 1:1`;
			const encodedRef = encodeURIComponent(fullRef);
			apiCalls.push(
				await makeApiCall(
					`${baseUrl}/api/translation-questions?reference=${encodedRef}&language=en&organization=unfoldingWord&format=json`
				)
			);
		}

		// Check for discovery/help request
		if (PATTERNS.discovery.test(message) && apiCalls.length === 0) {
			// No API call needed for discovery, just return help text
		}

		// If no patterns matched, try to be helpful
		if (apiCalls.length === 0 && !PATTERNS.discovery.test(message)) {
			return json({
				content: `I'm not sure what you're asking for. Try one of these:

- "What is John 3:16?" - to see scripture
- "What does 'love' mean in the Bible?" - for word definitions  
- "Explain the notes on Ephesians 2:8-9" - for translation notes
- "What questions should I consider for Genesis 1?" - for study questions
- "What can you do?" - to see all capabilities`,
				xrayData: {
					queryType: 'unknown',
					apiCallsCount: 0,
					totalDuration: 0,
					hasErrors: false,
					apiCalls: []
				}
			});
		}

		// Format and return the response
		const chatResponse = formatChatResponse(apiCalls, message);

		// Add X-ray tracing headers
		return json(chatResponse, {
			headers: {
				'X-Chat-Query-Type': chatResponse.xrayData.queryType,
				'X-Chat-API-Calls': String(chatResponse.xrayData.apiCallsCount),
				'X-Chat-Duration': `${chatResponse.xrayData.totalDuration}ms`
			}
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

/**
 * OPTIONS handler for CORS
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};
