#!/usr/bin/env node
/**
 * Translation Helps MCP Server
 * Main entry point for the Model Context Protocol server
 * that provides Bible translation resources to AI assistants
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { logger } from "./utils/logger.js";
import { handleFetchResources } from "./tools/fetchResources.js";
import { handleSearchResources } from "./tools/searchResources.js";
import { handleGetContext } from "./tools/getContext.js";
import { handleGetLanguages } from "./tools/getLanguages.js";
import { handleExtractReferences } from "./tools/extractReferences.js";
import { handleBrowseTranslationWords } from "./tools/browseTranslationWords.js";
import { handleGetTranslationWord } from "./tools/getTranslationWord.js";
import { handleGetWordsForReference } from "./tools/getWordsForReference.js";
// Tool parameter schemas
const FetchResourcesSchema = z.object({
    reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
    language: z.string().optional().default("en").describe('Language code (default: "en")'),
    organization: z
        .string()
        .optional()
        .default("unfoldingWord")
        .describe('Organization (default: "unfoldingWord")'),
    resources: z
        .array(z.string())
        .optional()
        .default(["scripture", "notes", "questions", "words", "links"])
        .describe("Resource types to fetch"),
});
const SearchResourcesSchema = z.object({
    language: z.string().optional().describe("Filter by language"),
    organization: z.string().optional().describe("Filter by organization"),
    resource: z.string().optional().describe("Filter by resource type"),
    subject: z.string().optional().describe("Filter by subject"),
});
const GetContextSchema = z.object({
    reference: z.string().describe("Bible reference"),
    language: z.string().optional().describe("Language code"),
    organization: z.string().optional().describe("Organization"),
    includeRawData: z.boolean().optional().describe("Include raw USFM data"),
    maxTokens: z.number().optional().describe("Maximum tokens for context"),
});
const GetLanguagesSchema = z.object({
    organization: z.string().optional().describe("Filter by organization"),
});
const ExtractReferencesSchema = z.object({
    text: z.string().describe("Text to extract references from"),
    context: z.string().optional().describe("Previous conversation context"),
});
const BrowseTranslationWordsSchema = z.object({
    language: z.string().optional().default("en").describe("Language code"),
    category: z.string().optional().describe("Filter by category (kt, other, names)"),
    organization: z.string().optional().default("unfoldingWord").describe("Organization"),
});
const GetTranslationWordSchema = z.object({
    term: z.string().optional().describe("Word/term to look up (e.g., 'grace')"),
    path: z.string().optional().describe("Direct path to the article"),
    language: z.string().optional().default("en").describe("Language code"),
    organization: z.string().optional().default("unfoldingWord").describe("Organization"),
});
const GetWordsForReferenceSchema = z.object({
    reference: z.string().describe("Bible reference (e.g., 'John 3:16')"),
    language: z.string().optional().default("en").describe("Language code"),
    organization: z.string().optional().default("unfoldingWord").describe("Organization"),
});
/**
 * Initialize and start the MCP server
 */
async function main() {
    const server = new Server({
        name: "translation-helps-mcp",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        logger.info("Listing available tools");
        return {
            tools: [
                {
                    name: "translation_helps_fetch_resources",
                    description: "Fetch Bible translation resources for a specific reference",
                    inputSchema: FetchResourcesSchema,
                },
                {
                    name: "translation_helps_search_resources",
                    description: "Search for available translation resources",
                    inputSchema: SearchResourcesSchema,
                },
                {
                    name: "translation_helps_get_context",
                    description: "Get AI-optimized context for a Bible reference",
                    inputSchema: GetContextSchema,
                },
                {
                    name: "translation_helps_get_languages",
                    description: "Get list of available languages with resource counts",
                    inputSchema: GetLanguagesSchema,
                },
                {
                    name: "translation_helps_extract_references",
                    description: "Extract Bible references from natural language text",
                    inputSchema: ExtractReferencesSchema,
                },
                {
                    name: "translation_helps_browse_words",
                    description: "Browse available translation word articles by category",
                    inputSchema: BrowseTranslationWordsSchema,
                },
                {
                    name: "translation_helps_get_word",
                    description: "Get a specific translation word article by term or path",
                    inputSchema: GetTranslationWordSchema,
                },
                {
                    name: "translation_helps_words_for_reference",
                    description: "Get translation words linked to a specific Bible reference",
                    inputSchema: GetWordsForReferenceSchema,
                },
            ],
        };
    });
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        logger.info("Tool called", { name, args });
        try {
            switch (name) {
                case "translation_helps_fetch_resources": {
                    const validatedArgs = FetchResourcesSchema.parse(args);
                    return await handleFetchResources(validatedArgs);
                }
                case "translation_helps_search_resources": {
                    const validatedArgs = SearchResourcesSchema.parse(args);
                    return await handleSearchResources(validatedArgs);
                }
                case "translation_helps_get_context": {
                    const validatedArgs = GetContextSchema.parse(args);
                    return await handleGetContext(validatedArgs);
                }
                case "translation_helps_get_languages": {
                    const validatedArgs = GetLanguagesSchema.parse(args);
                    return await handleGetLanguages(validatedArgs);
                }
                case "translation_helps_extract_references": {
                    const validatedArgs = ExtractReferencesSchema.parse(args);
                    return await handleExtractReferences(validatedArgs);
                }
                case "translation_helps_browse_words": {
                    const validatedArgs = BrowseTranslationWordsSchema.parse(args);
                    return await handleBrowseTranslationWords(validatedArgs);
                }
                case "translation_helps_get_word": {
                    const validatedArgs = GetTranslationWordSchema.parse(args);
                    return await handleGetTranslationWord(validatedArgs);
                }
                case "translation_helps_words_for_reference": {
                    const validatedArgs = GetWordsForReferenceSchema.parse(args);
                    return await handleGetWordsForReference(validatedArgs);
                }
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("Tool execution failed", { name, error: errorMessage });
            if (error instanceof z.ZodError) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
            }
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
        }
    });
    // Start the server
    const transport = new StdioServerTransport();
    logger.info("Starting Translation Helps MCP Server v1.0.0");
    logger.info("Listening on stdio transport...");
    await server.connect(transport);
    logger.info("Ready to handle requests");
}
// Error handling
process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", { reason, promise });
    process.exit(1);
});
// Graceful shutdown
process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down gracefully");
    process.exit(0);
});
process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down gracefully");
    process.exit(0);
});
// Start the server
main().catch((error) => {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
});
