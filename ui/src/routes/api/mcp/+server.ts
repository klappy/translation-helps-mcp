export const config = {
	runtime: 'edge'
};

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getVersion } from '../../../../../src/version.js';
import { SACRED_TEXT_SYSTEM_PROMPT } from '../../../../../src/config/SacredTextConstraints.js';

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
export const POST: RequestHandler = async ({ request, url }) => {
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
						resources: {}
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
							description: 'Get the complete system prompt and constraints for full transparency about AI behavior',
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
							name: 'get_translation_word',
							description: 'Get translation words linked to a specific Bible reference',
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
				const handler = new UnifiedMCPHandler(url.origin);
				
				try {
					console.log('[MCP ENDPOINT] Using UnifiedMCPHandler for:', toolName);
					const result = await handler.handleToolCall(toolName, args);
					console.log('[MCP ENDPOINT] Result preview:', JSON.stringify(result).substring(0, 300));
					return json(result);
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
						content: [{
							type: 'text',
							text: error instanceof Error ? error.message : 'Tool execution failed'
						}]
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
				else if (toolName === 'get_translation_word' || toolName === 'fetch_translation_words') {
					const params = new URLSearchParams({
						wordId: args.wordId || args.reference || '',
						language: args.language || 'en',
						organization: args.organization || 'unfoldingWord'
					});
					
					try {
						const endpoint = await import('../fetch-translation-words/+server.js');
						const mockRequest = new Request(`http://localhost/api/fetch-translation-words?${params}`);
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

	if (method === 'tools/list') {
		return POST({
			request: new Request(url, {
				method: 'POST',
				body: JSON.stringify({ method })
			}),
			url
		});
	}

	return json({
		name: 'translation-helps-mcp',
		version: '3.6.0',
		methods: ['initialize', 'tools/list', 'tools/call', 'ping']
	});
};
