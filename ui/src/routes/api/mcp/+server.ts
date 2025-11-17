export const config = {
	runtime: 'edge'
};

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getVersion } from '../../../../../src/version.js';

// Import our existing tool handlers
// TEMPORARILY COMMENTED OUT - These imports require dependencies not available in UI build
// import { handleBrowseTranslationWords } from '../../../../../src/tools/browseTranslationWords.js';
// import { handleExtractReferences } from '../../../../../src/tools/extractReferences.js';
// import { handleFetchResources } from '../../../../../src/tools/fetchResources.js';
// import { handleFetchScripture } from '../../../../../src/tools/fetchScripture.js';
// import { handleFetchTranslationNotes } from '../../../../../src/tools/fetchTranslationNotes.js';
// import { handleFetchTranslationQuestions } from '../../../../../src/tools/fetchTranslationQuestions.js';
// import { handleGetContext } from '../../../../../src/tools/getContext.js';
// import { handleGetLanguages } from '../../../../../src/tools/getLanguages.js';
// import { handleGetTranslationWord } from '../../../../../src/tools/getTranslationWord.js';
// import { handleGetWordsForReference } from '../../../../../src/tools/getWordsForReference.js';
// import { handleSearchResources } from '../../../../../src/tools/searchResources.js';

// MCP-over-HTTP Bridge
export const POST: RequestHandler = async ({ request, url, fetch: eventFetch }) => {
	try {
		const body = await request.json();
		const method = body.method || url.searchParams.get('method');

		// Handle different MCP methods
		switch (method) {
			case 'initialize':
				return json({
					protocolVersion: '1.0',
					capabilities: {
						tools: {},
						prompts: {}
					},
					serverInfo: {
						name: 'translation-helps-mcp',
						version: getVersion()
					}
				});

			case 'tools/list':
				return json({
					tools: [
						{
							name: 'get_system_prompt',
							description:
								'Get the complete system prompt and constraints for full transparency about AI behavior',
							inputSchema: {
								type: 'object',
								properties: {
									includeImplementationDetails: {
										type: 'boolean',
										description: 'Include implementation details and validation functions'
									}
								},
								required: []
							}
						},
						{
							name: 'fetch_scripture',
							description: 'Fetch Bible scripture text for a specific reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: "Bible reference (e.g., 'John 3:16')" },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' }
								},
								required: ['reference']
							}
						},
						{
							name: 'fetch_translation_notes',
							description: 'Fetch translation notes for a specific Bible reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: 'Bible reference' },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' }
								},
								required: ['reference']
							}
						},
						{
							name: 'get_languages',
							description: 'Get available languages for translation resources',
							inputSchema: {
								type: 'object',
								properties: {}
							}
						},
						{
							name: 'fetch_translation_questions',
							description: 'Fetch translation questions for a specific Bible reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: 'Bible reference' },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' }
								},
								required: ['reference']
							}
						},
						{
							name: 'browse_translation_words',
							description: 'Browse and search translation words by category or term',
							inputSchema: {
								type: 'object',
								properties: {
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' },
									category: {
										type: 'string',
										description: 'Filter by category (kt, names, other)'
									},
									search: { type: 'string', description: 'Search term to filter words' },
									limit: { type: 'number', default: 50, description: 'Maximum number of results' }
								}
							}
						},
						{
							name: 'get_context',
							description: 'Get contextual information for a Bible reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: 'Bible reference' },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' }
								},
								required: ['reference']
							}
						},
						{
							name: 'extract_references',
							description: 'Extract and parse Bible references from text',
							inputSchema: {
								type: 'object',
								properties: {
									text: { type: 'string', description: 'Text containing Bible references' },
									includeContext: {
										type: 'boolean',
										default: false,
										description: 'Include context around references'
									}
								},
								required: ['text']
							}
						},
						{
							name: 'fetch_resources',
							description: 'Fetch multiple types of translation resources for a reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: 'Bible reference' },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' },
									resources: {
										type: 'array',
										items: { type: 'string' },
										default: ['scripture', 'notes', 'questions', 'words']
									}
								},
								required: ['reference']
							}
						},
						{
							name: 'get_words_for_reference',
							description: 'Get translation words specifically linked to a Bible reference',
							inputSchema: {
								type: 'object',
								properties: {
									reference: { type: 'string', description: 'Bible reference' },
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' }
								},
								required: ['reference']
							}
						},
						{
							name: 'search_resources',
							description: 'Search across multiple resource types for content',
							inputSchema: {
								type: 'object',
								properties: {
									query: { type: 'string', description: 'Search query' },
									resourceTypes: {
										type: 'array',
										items: { type: 'string' },
										default: ['notes', 'questions', 'words']
									},
									language: { type: 'string', default: 'en' },
									organization: { type: 'string', default: 'unfoldingWord' },
									limit: { type: 'number', default: 50, description: 'Maximum number of results' }
								},
								required: ['query']
							}
						}
					]
				});

			case 'tools/call': {
				const toolName = body.params?.name;
				const args = body.params?.arguments || {};

				// Import the unified handler with proper base URL
				// FORCE REBUILD: All tools now use UnifiedMCPHandler (no duplicate formatting)
				console.log('[MCP ENDPOINT] Tool call:', toolName, 'Args:', JSON.stringify(args));

				const { UnifiedMCPHandler } = await import('$lib/mcp/UnifiedMCPHandler');
				// Use event.fetch for SvelteKit compatibility (allows relative URLs)
				// eventFetch is the fetch function from the RequestEvent that supports relative URLs
				const handler = new UnifiedMCPHandler('', eventFetch);

				try {
					console.log('[MCP ENDPOINT] Using UnifiedMCPHandler for:', toolName);
					const result = await handler.handleToolCall(toolName, args);
					console.log('[MCP ENDPOINT] Result preview:', JSON.stringify(result).substring(0, 300));

					// Extract metadata from result if present
					const metadata = (result as any).metadata;
					console.log('[MCP ENDPOINT] Result metadata:', metadata);

					// Create response with headers if metadata is available
					const response = json(result);

					// Forward diagnostic headers from internal endpoint if available
					if (metadata) {
						if (metadata.cacheStatus) {
							response.headers.set('X-Cache-Status', metadata.cacheStatus);
						}
						if (metadata.responseTime) {
							response.headers.set('X-Response-Time', `${metadata.responseTime}ms`);
						}
						if (metadata.traceId) {
							response.headers.set('X-Trace-Id', metadata.traceId);
						}
						if (metadata.xrayTrace) {
							response.headers.set('X-XRay-Trace', btoa(JSON.stringify(metadata.xrayTrace)));
						}
						console.log('[MCP ENDPOINT] Forwarded headers:', {
							cacheStatus: metadata.cacheStatus,
							responseTime: metadata.responseTime,
							traceId: metadata.traceId,
							hasXrayTrace: !!metadata.xrayTrace
						});
					}

					return response;
				} catch (error) {
					console.error(`[MCP ENDPOINT] Tool error for ${toolName}:`, error);
					// Special logging for translation notes
					if (toolName === 'fetch_translation_notes') {
						console.error('[MCP ENDPOINT] Translation notes error details:', {
							errorMessage: error instanceof Error ? error.message : 'Unknown error',
							errorStack: error instanceof Error ? error.stack : 'No stack',
							args: args
						});
					}
					return json({
						content: [
							{
								type: 'text',
								text: error instanceof Error ? error.message : 'Tool execution failed'
							}
						]
					});
				}

				// The code below is unreachable - all tools are handled by UnifiedMCPHandler above
				/*
				if (toolName === 'fetch_scripture') {
					const params = new URLSearchParams({
						reference: args.reference,
						language: args.language || 'en',
						organization: args.organization || 'unfoldingWord',
						includeVerseNumbers: 'true',
						format: 'text'
					});
					
					try {
						// Call the underlying endpoint handler directly
						const endpoint = await import('../fetch-scripture/+server.js');
						const mockRequest = new Request(`http://localhost/api/fetch-scripture?${params}`);
						const response = await endpoint.GET({ url: new URL(mockRequest.url), request: mockRequest });
						
						if (response.ok) {
							const data = await response.json();
							
							// Extract scripture text from the response
							let scriptureText = 'Scripture not found';
							
							if (data.scriptures && data.scriptures.length > 0) {
								// Find ULT or UST translation
								const ult = data.scriptures.find(s => s.translation === "unfoldingWord® Literal Text");
								const ust = data.scriptures.find(s => s.translation === "unfoldingWord® Simplified Text");
								
								scriptureText = (ult?.text || ust?.text || data.scriptures[0]?.text || 'Scripture not found');
							}
							
							return json({
								content: [{
									type: 'text',
									text: scriptureText
								}]
							});
						} else {
							throw new Error('Failed to fetch scripture');
						}
					} catch (error) {
						console.error('Scripture fetch error:', error);
						return json({
							content: [{
								type: 'text',
								text: 'Error fetching scripture. Please try again.'
							}]
						});
					}
				}
				else if (toolName === 'fetch_translation_notes') {
					console.log('[MCP] fetch_translation_notes called with args:', args);
					
					// Ensure all parameters are strings
					const reference = String(args.reference || '');
					const language = String(args.language || 'en');
					const organization = String(args.organization || 'unfoldingWord');
					
					if (!reference) {
						return json({
							content: [{
								type: 'text',
								text: 'Error: Bible reference is required for translation notes.'
							}]
						});
					}
					
					const params = new URLSearchParams({
						reference,
						language,
						organization
					});
					
					console.log('[MCP] Translation notes params:', params.toString());
					
					try {
						// Call the underlying endpoint handler directly
						const endpoint = await import('../fetch-translation-notes/+server.js');
						const mockUrl = new URL(`http://localhost/api/fetch-translation-notes?${params}`);
						const mockRequest = new Request(mockUrl.toString());
						
						// Create proper context for the endpoint
						const context = {
							url: mockUrl,
							request: mockRequest,
							params: {},
							route: { id: '' },
							platform: undefined
						};
						
						const response = await endpoint.GET(context);
						
						console.log('[MCP] Translation notes response status:', response.status);
						
						if (response.ok) {
							const data = await response.json();
							
							// Format translation notes
							let notesText = '';
							// Check for both 'notes' and 'verseNotes' fields (API response structure varies)
							const notes = data.notes || data.verseNotes || [];
							
							if (notes.length > 0) {
								notesText = `Translation Notes for ${args.reference}:\n\n`;
								notes.forEach((note, index) => {
									const noteContent = note.Note || note.note || note.text || note.content || '';
									notesText += `${index + 1}. ${noteContent}\n\n`;
								});
							} else {
								notesText = 'No translation notes found for this reference.';
							}
							
							return json({
								content: [{
									type: 'text',
									text: notesText
								}]
							});
						} else {
							const errorData = await response.json();
							console.error('[MCP] Translation notes error response:', errorData);
							throw new Error(`Failed to fetch translation notes: ${response.status} - ${errorData.error || 'Unknown error'}`);
						}
					} catch (error) {
						console.error('Translation notes fetch error:', error);
						return json({
							content: [{
								type: 'text',
								text: `Error fetching translation notes: ${error.message || 'Unknown error'}`
							}]
						});
					}
				}
				else if (toolName === 'fetch_translation_questions') {
					const params = new URLSearchParams({
						reference: args.reference,
						language: args.language || 'en',
						organization: args.organization || 'unfoldingWord'
					});
					
					try {
						const endpoint = await import('../fetch-translation-questions/+server.js');
						const mockRequest = new Request(`http://localhost/api/fetch-translation-questions?${params}`);
						const response = await endpoint.GET({ url: new URL(mockRequest.url), request: mockRequest });
						
						if (response.ok) {
							const data = await response.json();
							let questionsText = '';
							if (data.questions && data.questions.length > 0) {
								data.questions.forEach((q, index) => {
									questionsText += `Q${index + 1}: ${q.question}\nA: ${q.answer}\n\n`;
								});
							} else {
								questionsText = 'No translation questions found for this reference.';
							}
							
							return json({
								content: [{
									type: 'text',
									text: questionsText
								}]
							});
						}
					} catch (error) {
						console.error('Translation questions fetch error:', error);
						return json({
							content: [{
								type: 'text',
								text: 'Error fetching translation questions.'
							}]
						});
					}
				}
				else if (toolName === 'fetch_translation_word') {
					const params = new URLSearchParams({
						term: args.term || args.reference || '',
						language: args.language || 'en',
						organization: args.organization || 'unfoldingWord'
					});
					
					try {
						const endpoint = await import('../fetch-translation-word/+server.js');
						const mockRequest = new Request(`http://localhost/api/fetch-translation-word?${params}`);
						const response = await endpoint.GET({ url: new URL(mockRequest.url), request: mockRequest });
						
						if (response.ok) {
							const data = await response.json();
							let wordsText = '';
							if (data.words && data.words.length > 0) {
								data.words.forEach(word => {
									wordsText += `**${word.term}**\n${word.definition}\n\n`;
								});
							} else if (data.term) {
								wordsText = `**${data.term}**\n${data.definition}`;
							} else {
								wordsText = 'No translation words found.';
							}
							
							return json({
								content: [{
									type: 'text',
									text: wordsText
								}]
							});
						}
					} catch (error) {
						console.error('Translation words fetch error:', error);
						return json({
							content: [{
								type: 'text',
								text: 'Error fetching translation words.'
							}]
						});
					}
				}
				else if (toolName === 'get_system_prompt') {
					const response = {
						systemPrompt: SACRED_TEXT_SYSTEM_PROMPT,
						constraints: {
							scriptureHandling: 'VERBATIM - Quote scripture character for character',
							interpretation: 'FORBIDDEN - No theological interpretation allowed',
							citations: 'REQUIRED - All resources must be cited',
							transparency: 'FULL - All decisions and sources visible'
						},
						version: '1.0.0',
						lastUpdated: '2025-07-25'
					};
					
					if (args.includeImplementationDetails) {
						response.implementationDetails = {
							validationFunctions: [
								'validateScriptureQuote - Ensures quotes are verbatim',
								'extractCitations - Extracts all resource citations',
								'checkForInterpretation - Flags interpretation attempts'
							],
							enforcementMechanisms: [
								'Pre-response validation',
								'Citation extraction and display',
								'Interpretation detection and blocking'
							]
						};
					}
					
					return json({
						content: [{
							type: 'text',
							text: JSON.stringify(response, null, 2)
						}]
					});
				}

				// Temporary response for other tools
				return json({
					content: [{
						type: 'text',
						text: 'Tool temporarily unavailable during refactoring. Please check back soon!'
					}]
				});
				*/
			}

			case 'prompts/list':
				return json({
					prompts: [
						{
							name: 'translation-helps-for-passage',
							description:
								'Get comprehensive translation help for a Bible passage: scripture text, questions, word definitions (with titles), notes, and related academy articles',
							arguments: [
								{
									name: 'reference',
									description: 'Bible reference (e.g., "John 3:16", "Genesis 1:1-3")',
									required: true
								},
								{
									name: 'language',
									description: 'Language code (default: "en")',
									required: false
								}
							]
						},
						{
							name: 'get-translation-words-for-passage',
							description:
								'Get all translation word definitions for a passage, showing dictionary entry titles (not technical term IDs)',
							arguments: [
								{
									name: 'reference',
									description: 'Bible reference (e.g., "John 3:16")',
									required: true
								},
								{
									name: 'language',
									description: 'Language code (default: "en")',
									required: false
								}
							]
						},
						{
							name: 'get-translation-academy-for-passage',
							description:
								'Get Translation Academy training articles referenced in the translation notes for a passage',
							arguments: [
								{
									name: 'reference',
									description: 'Bible reference (e.g., "John 3:16")',
									required: true
								},
								{
									name: 'language',
									description: 'Language code (default: "en")',
									required: false
								}
							]
						}
					]
				});

			case 'prompts/get': {
				const { name, arguments: args } = body.params || {};

				if (!name) {
					return json(
						{
							error: {
								code: ErrorCode.InvalidParams,
								message: 'Prompt name is required'
							}
						},
						{ status: 400 }
					);
				}

				const language = (args?.language as string) || 'en';
				const reference = (args?.reference as string) || '';

				switch (name) {
					case 'translation-helps-for-passage':
						return json({
							messages: [
								{
									role: 'user',
									content: {
										type: 'text',
										text: `Please provide comprehensive translation help for ${reference} in ${language}.

Follow these steps to gather all relevant information:

1. **Get the Scripture Text:**
   - Use fetch_scripture tool with reference="${reference}" and language="${language}"
   - This provides the actual Bible text to work with

2. **Get Translation Questions:**
   - Use fetch_translation_questions with reference="${reference}" and language="${language}"
   - These help check comprehension and guide translation decisions

3. **Get Translation Word Links and Fetch Titles:**
   - Use fetch_translation_word_links with reference="${reference}" and language="${language}"
   - This returns a list of terms (e.g., [{term: "love", category: "kt", path: "..."}])
   - For EACH term in the response, use fetch_translation_word tool with term=<term_value> to get the full article
   - Extract the TITLE from each article (found in the first H1 heading or title field)
   - Show the user these dictionary entry TITLES, not the technical term IDs
   - Example: Show "Love, Beloved" not "love"; show "Son of God, Son" not "sonofgod"

4. **Get Translation Notes:**
   - Use fetch_translation_notes with reference="${reference}" and language="${language}"
   - Notes contain supportReference fields that link to Translation Academy articles

5. **Get Related Translation Academy Articles:**
   - From the translation notes response, extract all supportReference values
   - These are RC links like "rc://*/ta/man/translate/figs-metaphor"
   - For each supportReference, use fetch_translation_academy tool with rcLink=<supportReference_value>
   - Extract the TITLE from each academy article
   - Show these training article titles to help the user understand translation concepts

6. **Organize the Response:**
   Present everything in a clear, structured way:
   - Scripture text at the top
   - List of translation word titles (dictionary entries)
   - Translation questions for comprehension
   - Translation notes with guidance
   - Related academy article titles for deeper learning

The goal is to provide EVERYTHING a translator needs for this passage in one comprehensive response.`
									}
								}
							]
						});

					case 'get-translation-words-for-passage':
						return json({
							messages: [
								{
									role: 'user',
									content: {
										type: 'text',
										text: `Please show me all the translation word definitions for ${reference} in ${language}.

Follow these steps:

1. **Get Translation Word Links:**
   - Use fetch_translation_word_links with reference="${reference}" and language="${language}"
   - This returns links like: [{term: "love", category: "kt", ...}, {term: "god", ...}]

2. **Fetch Full Articles and Extract Titles:**
   - For EACH term in the links result, call fetch_translation_word with term=<term_value>
   - From each article response, extract the TITLE (not the term ID)
   - The title is usually in the first H1 heading or a dedicated title field
   - Example: The term "love" might have title "Love, Beloved"
   - Example: The term "sonofgod" might have title "Son of God, Son"

3. **Present to User:**
   - Show the dictionary entry TITLES in a clear list
   - These are human-readable names, not technical IDs
   - Optionally group by category (Key Terms, Names, Other Terms)
   - Let the user know they can ask for the full definition of any term

Focus on making the translation words accessible by showing their proper titles.`
									}
								}
							]
						});

					case 'get-translation-academy-for-passage':
						return json({
							messages: [
								{
									role: 'user',
									content: {
										type: 'text',
										text: `Please find all the Translation Academy training articles related to ${reference} in ${language}.

Follow these steps:

1. **Get Translation Notes:**
   - Use fetch_translation_notes with reference="${reference}" and language="${language}"
   - Translation notes contain supportReference fields that link to academy articles

2. **Extract Support References:**
   - From the notes response, find all supportReference values
   - These are RC links in format: "rc://*/ta/man/translate/figs-metaphor"
   - Or they might be moduleIds like: "figs-metaphor", "translate-names"
   - Collect all unique support references

3. **Fetch Academy Articles:**
   - For each supportReference, use fetch_translation_academy tool
   - If it's an RC link: use rcLink=<supportReference_value>
   - If it's a moduleId: use moduleId=<supportReference_value>
   - Each call returns an academy article with training content

4. **Extract Titles:**
   - From each academy article response, extract the TITLE
   - The title is in the first H1 heading or dedicated title field

5. **Present to User:**
   - Show the academy article titles
   - Brief description of what each article teaches
   - Let the user know they can request the full content of any article
   
The goal is to show what translation concepts and training materials are relevant to understanding this passage.`
									}
								}
							]
						});

					default:
						return json(
							{
								error: {
									code: ErrorCode.InvalidRequest,
									message: `Unknown prompt: ${name}`
								}
							},
							{ status: 400 }
						);
				}
			}

			case 'ping':
				return json({});

			default:
				throw new Error(`Unknown method: ${method}`);
		}
	} catch (error) {
		console.error('MCP Bridge Error:', error);
		return json(
			{
				error: {
					code: error instanceof McpError ? error.code : ErrorCode.InternalError,
					message: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		);
	}
};

// Also support GET for simple queries
export const GET: RequestHandler = async ({ url }) => {
	const method = url.searchParams.get('method');

	// Handle prompts/list directly
	if (method === 'prompts/list') {
		return json({
			prompts: [
				{
					name: 'translation-helps-for-passage',
					description:
						'Get comprehensive translation help for a Bible passage: scripture text, questions, word definitions (with titles), notes, and related academy articles',
					arguments: [
						{
							name: 'reference',
							description: 'Bible reference (e.g., "John 3:16", "Genesis 1:1-3")',
							required: true
						},
						{
							name: 'language',
							description: 'Language code (default: "en")',
							required: false
						}
					]
				},
				{
					name: 'get-translation-words-for-passage',
					description:
						'Get all translation word definitions for a passage, showing dictionary entry titles (not technical term IDs)',
					arguments: [
						{
							name: 'reference',
							description: 'Bible reference (e.g., "John 3:16")',
							required: true
						},
						{
							name: 'language',
							description: 'Language code (default: "en")',
							required: false
						}
					]
				},
				{
					name: 'get-translation-academy-for-passage',
					description:
						'Get Translation Academy training articles referenced in the translation notes for a passage',
					arguments: [
						{
							name: 'reference',
							description: 'Bible reference (e.g., "John 3:16")',
							required: true
						},
						{
							name: 'language',
							description: 'Language code (default: "en")',
							required: false
						}
					]
				}
			]
		});
	}

	// For tools/list, delegate to POST handler
	if (method === 'tools/list') {
		const mockRequest = new Request(url, {
			method: 'POST',
			body: JSON.stringify({ method })
		});
		return POST({
			request: mockRequest,
			url,
			cookies: {} as any,
			fetch,
			getClientAddress: () => '',
			locals: {} as any,
			params: {},
			platform: undefined,
			route: { id: '/api/mcp' },
			setHeaders: () => {},
			isDataRequest: false,
			isSubRequest: false,
			tracing: { enabled: false, root: {} as any, current: {} as any },
			isRemoteRequest: false
		} as any);
	}

	return json({
		name: 'translation-helps-mcp',
		version: getVersion(),
		methods: ['initialize', 'tools/list', 'tools/call', 'prompts/list', 'prompts/get', 'ping']
	});
};
