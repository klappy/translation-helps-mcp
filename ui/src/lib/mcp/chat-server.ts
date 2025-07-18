import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Tool parameter schemas for self-discovery
const ChatQuerySchema = z.object({
	message: z.string().describe("The user's message or question"),
	context: z.string().optional().describe('Additional context or Bible references to include'),
	language: z
		.string()
		.optional()
		.default('en')
		.describe('Language code for responses (default: "en")'),
	style: z
		.enum(['detailed', 'concise', 'technical'])
		.optional()
		.default('detailed')
		.describe('Response style preference')
});

const BibleLookupSchema = z.object({
	reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
	language: z.string().optional().default('en').describe('Language code (default: "en")'),
	organization: z
		.string()
		.optional()
		.default('unfoldingWord')
		.describe('Organization (default: "unfoldingWord")'),
	resources: z
		.array(z.string())
		.optional()
		.default(['scripture', 'notes', 'questions', 'words'])
		.describe('Resource types to fetch')
});

const WordStudySchema = z.object({
	term: z.string().describe('The word or term to study'),
	language: z.string().optional().default('en').describe('Language code (default: "en")'),
	context: z.string().optional().describe('Biblical context or reference for the word study')
});

export class ChatMCPServer {
	private server: Server;

	constructor() {
		this.server = new Server({
			name: 'chat-assistant',
			version: '1.0.0'
		});
		this.setupHandlers();
	}

	private setupHandlers() {
		// List available tools for self-discovery
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: 'chat_query',
						description: 'Send a message to the AI Bible assistant and get a contextual response',
						inputSchema: ChatQuerySchema
					},
					{
						name: 'bible_lookup',
						description:
							'Look up Bible references and get scripture text, translation notes, and insights',
						inputSchema: BibleLookupSchema
					},
					{
						name: 'word_study',
						description:
							'Perform a word study on a specific term with definitions and usage examples',
						inputSchema: WordStudySchema
					}
				]
			};
		});

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				switch (name) {
					case 'chat_query': {
						const validatedArgs = ChatQuerySchema.parse(args);
						return await this.handleChatQuery(validatedArgs);
					}

					case 'bible_lookup': {
						const validatedArgs = BibleLookupSchema.parse(args);
						return await this.handleBibleLookup(validatedArgs);
					}

					case 'word_study': {
						const validatedArgs = WordStudySchema.parse(args);
						return await this.handleWordStudy(validatedArgs);
					}

					default:
						throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				if (error instanceof z.ZodError) {
					throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
				}

				if (error instanceof McpError) {
					throw error;
				}

				throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
			}
		});
	}

	private async handleChatQuery(args: z.infer<typeof ChatQuerySchema>) {
		// This would integrate with the browser LLM service
		const response = {
			message: args.message,
			response: `I can help you with "${args.message}". This is a placeholder response from the MCP server.`,
			language: args.language,
			style: args.style,
			timestamp: new Date().toISOString()
		};

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(response, null, 2)
				}
			]
		};
	}

	private async handleBibleLookup(args: z.infer<typeof BibleLookupSchema>) {
		// This would integrate with the Bible API functions
		const response = {
			reference: args.reference,
			language: args.language,
			organization: args.organization,
			resources: args.resources,
			data: {
				scripture: `Placeholder scripture text for ${args.reference}`,
				notes: `Placeholder translation notes for ${args.reference}`,
				questions: `Placeholder questions for ${args.reference}`,
				words: `Placeholder word definitions for ${args.reference}`
			},
			timestamp: new Date().toISOString()
		};

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(response, null, 2)
				}
			]
		};
	}

	private async handleWordStudy(args: z.infer<typeof WordStudySchema>) {
		// This would integrate with the translation words API
		const response = {
			term: args.term,
			language: args.language,
			context: args.context,
			definition: `Placeholder definition for "${args.term}"`,
			usage: `Placeholder usage examples for "${args.term}"`,
			relatedTerms: [`related1`, `related2`],
			timestamp: new Date().toISOString()
		};

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(response, null, 2)
				}
			]
		};
	}

	async start() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.log('Chat MCP Server started');
	}
}
