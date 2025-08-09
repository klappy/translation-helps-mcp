#!/usr/bin/env node

/**
 * Translation Helps MCP Server
 * Model Context Protocol server for Bible translation resources
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import tool handlers with updated names
import { handleBrowseTranslationWords } from "./tools/browseTranslationWords.js";
import { handleExtractReferences } from "./tools/extractReferences.js";
import { handleFetchResources } from "./tools/fetchResources.js";
import { FetchScriptureArgs, handleFetchScripture } from "./tools/fetchScripture.js";
import {
  FetchTranslationNotesArgs,
  handleFetchTranslationNotes,
} from "./tools/fetchTranslationNotes.js";
import {
  FetchTranslationQuestionsArgs,
  handleFetchTranslationQuestions,
} from "./tools/fetchTranslationQuestions.js";
import { GetContextArgs, handleGetContext } from "./tools/getContext.js";
import { GetLanguagesArgs, handleGetLanguages } from "./tools/getLanguages.js";
import { GetTranslationWordArgs, handleGetTranslationWord } from "./tools/getTranslationWord.js";
import { handleGetWordsForReference } from "./tools/getWordsForReference.js";
import { handleSearchResources } from "./tools/searchResources.js";
import { logger } from "./utils/logger.js";
import { getVersion } from "./version.js";

// Tool definitions
const tools = [
  {
    name: "fetch_scripture",
    description: "Fetch Bible scripture text for a specific reference",
    inputSchema: FetchScriptureArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")'),
    }),
  },
  {
    name: "fetch_translation_notes",
    description: "Fetch translation notes for a specific Bible reference",
    inputSchema: FetchTranslationNotesArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")'),
    }),
  },
  {
    name: "fetch_translation_questions",
    description: "Fetch translation questions for a specific Bible reference",
    inputSchema: FetchTranslationQuestionsArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")'),
    }),
  },
  {
    name: "get_translation_word",
    description: "Get translation words linked to a specific Bible reference",
    inputSchema: GetTranslationWordArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")'),
    }),
  },
  {
    name: "get_context",
    description:
      "Get contextual information for a Bible reference including themes, cultural background, and theological concepts",
    inputSchema: GetContextArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe('Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")'),
    }),
  },
  {
    name: "get_languages",
    description: "Get available languages for translation resources",
    inputSchema: GetLanguagesArgs,
  },
  {
    name: "browse_translation_words",
    description: "Browse and search translation words by category or term",
    inputSchema: z.object({
      language: z.string().optional().default("en"),
      organization: z.string().optional().default("unfoldingWord"),
      category: z.string().optional().describe("Filter by category (kt, names, other)"),
      search: z.string().optional().describe("Search term to filter words"),
      limit: z.number().optional().default(50).describe("Maximum number of results"),
    }),
  },
  {
    name: "extract_references",
    description: "Extract and parse Bible references from text",
    inputSchema: z.object({
      text: z.string().describe("Text containing Bible references to extract"),
      includeContext: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include context around each reference"),
    }),
  },
  {
    name: "fetch_resources",
    description: "Fetch multiple types of translation resources for a reference",
    inputSchema: z.object({
      reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
      language: z.string().optional().default("en"),
      organization: z.string().optional().default("unfoldingWord"),
      resources: z
        .array(z.string())
        .optional()
        .default(["scripture", "notes", "questions", "words"]),
    }),
  },
  {
    name: "get_words_for_reference",
    description: "Get translation words specifically linked to a Bible reference",
    inputSchema: z.object({
      reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
      language: z.string().optional().default("en"),
      organization: z.string().optional().default("unfoldingWord"),
    }),
  },
  {
    name: "search_resources",
    description: "Search across multiple resource types for content",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      resourceTypes: z.array(z.string()).optional().default(["notes", "questions", "words"]),
      language: z.string().optional().default("en"),
      organization: z.string().optional().default("unfoldingWord"),
      limit: z.number().optional().default(50),
    }),
  },
];

// Create server
const server = new Server(
  {
    name: "translation-helps-mcp",
    version: getVersion(),
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "fetch_scripture":
        return await handleFetchScripture(args as z.infer<typeof FetchScriptureArgs>);

      case "fetch_translation_notes":
        return await handleFetchTranslationNotes(args as z.infer<typeof FetchTranslationNotesArgs>);

      case "fetch_translation_questions":
        return await handleFetchTranslationQuestions(
          args as z.infer<typeof FetchTranslationQuestionsArgs>
        );

      case "get_translation_word":
        return await handleGetTranslationWord(args as z.infer<typeof GetTranslationWordArgs>);

      case "get_context":
        return await handleGetContext(args as z.infer<typeof GetContextArgs>);

      case "get_languages":
        return await handleGetLanguages(args as z.infer<typeof GetLanguagesArgs>);

      case "browse_translation_words":
        return await handleBrowseTranslationWords(args as any);

      case "extract_references":
        return await handleExtractReferences(args as any);

      case "fetch_resources":
        return await handleFetchResources(args as any);

      case "get_words_for_reference":
        return await handleGetWordsForReference(args as any);

      case "search_resources":
        return await handleSearchResources(args as any);

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Translation Helps MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Fatal error in main()", { error: String(error) });
  process.exit(1);
});
