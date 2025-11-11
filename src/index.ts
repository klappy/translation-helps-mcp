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
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
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
    description:
      "Fetch translation word links (TWL) for a specific Bible reference",
    inputSchema: FetchTranslationWordLinksArgs.omit({ reference: true }).extend(
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

// Prompt definitions
const prompts = [
  {
    name: "translation-helps-for-passage",
    description:
      "Get comprehensive translation help for a Bible passage: scripture text, questions, word definitions (with titles), notes, and related academy articles",
    arguments: [
      {
        name: "reference",
        description: 'Bible reference (e.g., "John 3:16", "Genesis 1:1-3")',
        required: true,
      },
      {
        name: "language",
        description: 'Language code (default: "en")',
        required: false,
      },
    ],
  },
  {
    name: "get-translation-words-for-passage",
    description:
      "Get all translation word definitions for a passage, showing dictionary entry titles (not technical term IDs)",
    arguments: [
      {
        name: "reference",
        description: 'Bible reference (e.g., "John 3:16")',
        required: true,
      },
      {
        name: "language",
        description: 'Language code (default: "en")',
        required: false,
      },
    ],
  },
  {
    name: "get-translation-academy-for-passage",
    description:
      "Get Translation Academy training articles referenced in the translation notes for a passage",
    arguments: [
      {
        name: "reference",
        description: 'Bible reference (e.g., "John 3:16")',
        required: true,
      },
      {
        name: "language",
        description: 'Language code (default: "en")',
        required: false,
      },
    ],
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
      prompts: {},
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

// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    })),
  };
});

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const prompt = prompts.find((p) => p.name === name);
  if (!prompt) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  }

  const language = (args?.language as string) || "en";
  const reference = (args?.reference as string) || "";

  switch (name) {
    case "translation-helps-for-passage":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
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

The goal is to provide EVERYTHING a translator needs for this passage in one comprehensive response.`,
            },
          },
        ],
      };

    case "get-translation-words-for-passage":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
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

Focus on making the translation words accessible by showing their proper titles.`,
            },
          },
        ],
      };

    case "get-translation-academy-for-passage":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
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
   
The goal is to show what translation concepts and training materials are relevant to understanding this passage.`,
            },
          },
        ],
      };

    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
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
