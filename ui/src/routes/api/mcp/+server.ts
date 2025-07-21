import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Import our existing tool handlers
import { handleFetchScripture } from '../../../../../src/tools/fetchScripture.js';
import { handleFetchTranslationNotes } from '../../../../../src/tools/fetchTranslationNotes.js';
import { handleFetchTranslationQuestions } from '../../../../../src/tools/fetchTranslationQuestions.js';
import { handleGetTranslationWord } from '../../../../../src/tools/getTranslationWord.js';
import { handleGetContext } from '../../../../../src/tools/getContext.js';
import { handleGetLanguages } from '../../../../../src/tools/getLanguages.js';
import { handleBrowseTranslationWords } from '../../../../../src/tools/browseTranslationWords.js';
import { handleExtractReferences } from '../../../../../src/tools/extractReferences.js';
import { handleFetchResources } from '../../../../../src/tools/fetchResources.js';
import { handleGetWordsForReference } from '../../../../../src/tools/getWordsForReference.js';
import { handleSearchResources } from '../../../../../src/tools/searchResources.js';

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
						version: '4.1.0'
					}
				});

			case 'tools/list':
				return json({
					tools: [
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

			case 'tools/call':
				const { name, arguments: args } = body.params || body;

				// Route to appropriate handler
				switch (name) {
					case 'fetch_scripture':
						const scriptureResult = await handleFetchScripture(args);
						return json(scriptureResult);

					case 'fetch_translation_notes':
						const notesResult = await handleFetchTranslationNotes(args);
						return json(notesResult);

					case 'get_languages':
						const langResult = await handleGetLanguages(args || {});
						return json(langResult);

					case 'fetch_translation_questions':
						const questionsResult = await handleFetchTranslationQuestions(args);
						return json(questionsResult);

					case 'browse_translation_words':
						const browseResult = await handleBrowseTranslationWords(args);
						return json(browseResult);

					case 'get_context':
						const contextResult = await handleGetContext(args);
						return json(contextResult);

					case 'extract_references':
						const refsResult = await handleExtractReferences(args);
						return json(refsResult);

					case 'fetch_resources':
						const resourcesResult = await handleFetchResources(args);
						return json(resourcesResult);

					case 'get_words_for_reference':
						const wordsForRefResult = await handleGetWordsForReference(args);
						return json(wordsForRefResult);

					case 'get_translation_word':
						const translationWordResult = await handleGetTranslationWord(args);
						return json(translationWordResult);

					case 'search_resources':
						const searchResult = await handleSearchResources(args);
						return json(searchResult);

					default:
						throw new Error(`Unknown tool: ${name}`);
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
