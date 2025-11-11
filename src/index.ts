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
import { zodToJsonSchema } from "zod-to-json-schema";

// Import tool handlers with updated names
import {
  FetchScriptureArgs,
  handleFetchScripture,
} from "./tools/fetchScripture.js";
import {
  FetchTranslationNotesArgs,
  handleFetchTranslationNotes,
} from "./tools/fetchTranslationNotes.js";
import {
  FetchTranslationQuestionsArgs,
  handleFetchTranslationQuestions,
} from "./tools/fetchTranslationQuestions.js";
import {
  FetchTranslationWordLinksArgs,
  handleFetchTranslationWordLinks,
} from "./tools/fetchTranslationWordLinks.js";
import {
  FetchTranslationAcademyArgs,
  handleFetchTranslationAcademy,
} from "./tools/fetchTranslationAcademy.js";
import {
  GetTranslationWordArgs,
  handleGetTranslationWord,
} from "./tools/getTranslationWord.js";
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
        .describe(
          'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")',
        ),
    }),
  },
  {
    name: "fetch_translation_notes",
    description: "Fetch translation notes for a specific Bible reference",
    inputSchema: FetchTranslationNotesArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe(
          'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")',
        ),
    }),
  },
  {
    name: "fetch_translation_questions",
    description: "Fetch translation questions for a specific Bible reference",
    inputSchema: FetchTranslationQuestionsArgs.omit({ reference: true }).extend(
      {
        reference: z
          .string()
          .describe(
            'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")',
          ),
      },
    ),
  },
  {
    name: "fetch_translation_word_links",
    description: "Fetch translation word links (TWL) for a specific Bible reference",
    inputSchema: FetchTranslationWordLinksArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe(
          'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")',
        ),
    }),
  },
  {
    name: "fetch_translation_word",
    description: "Fetch translation word articles for biblical terms",
    inputSchema: GetTranslationWordArgs.omit({ reference: true }).extend({
      reference: z
        .string()
        .describe(
          'Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Matthew 5")',
        ),
    }),
  },
  {
    name: "fetch_translation_academy",
    description: "Fetch translation academy (tA) modules and training content",
    inputSchema: FetchTranslationAcademyArgs,
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
  },
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema, { $refStrategy: "none" }),
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "fetch_scripture":
        return await handleFetchScripture(
          args as z.infer<typeof FetchScriptureArgs>,
        );

      case "fetch_translation_notes":
        return await handleFetchTranslationNotes(
          args as z.infer<typeof FetchTranslationNotesArgs>,
        );

      case "fetch_translation_questions":
        return await handleFetchTranslationQuestions(
          args as z.infer<typeof FetchTranslationQuestionsArgs>,
        );

      case "fetch_translation_word_links":
        return await handleFetchTranslationWordLinks(
          args as z.infer<typeof FetchTranslationWordLinksArgs>,
        );

      case "fetch_translation_word":
        return await handleGetTranslationWord(
          args as z.infer<typeof GetTranslationWordArgs>,
        );

      case "fetch_translation_academy":
        return await handleFetchTranslationAcademy(
          args as z.infer<typeof FetchTranslationAcademyArgs>,
        );

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
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
