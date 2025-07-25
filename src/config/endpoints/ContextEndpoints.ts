/**
 * Context Endpoint Configurations
 */

import { CommonParams, EndpointConfig } from "../EndpointConfig";
import { ResponseShapes } from "../ResponseShapes";

export const GetContextEndpoint: EndpointConfig = {
  name: "get-context",
  path: "/get-context",
  category: "core",
  description: "Get comprehensive translation context for a scripture reference",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
    includeScripture: {
      name: "includeScripture",
      type: "boolean",
      required: false,
      default: true,
      description: "Include scripture text in response",
      examples: ["true", "false"],
    },
    includeNotes: {
      name: "includeNotes",
      type: "boolean",
      required: false,
      default: true,
      description: "Include translation notes",
      examples: ["true", "false"],
    },
    includeWords: {
      name: "includeWords",
      type: "boolean",
      required: false,
      default: true,
      description: "Include translation words",
      examples: ["true", "false"],
    },
    includeQuestions: {
      name: "includeQuestions",
      type: "boolean",
      required: false,
      default: false,
      description: "Include translation questions",
      examples: ["true", "false"],
    },
  },

  dataSource: {
    type: "aggregated",
    dependencies: [
      "fetch-scripture",
      "fetch-translation-notes",
      "fetch-translation-word-links",
      "fetch-translation-words",
      "fetch-translation-questions",
    ],
  },

  responseShape: ResponseShapes.context,

  examples: [
    {
      params: {
        reference: "John 3:16",
        language: "en",
        includeScripture: true,
        includeNotes: true,
        includeWords: true,
        includeQuestions: false,
      },
      response: {
        scripture: {
          text: "For God so loved the world...",
          version: "ult",
        },
        notes: [
          {
            title: "For God so loved the world",
            content: "This could also be translated as...",
          },
        ],
        words: [
          { word: "God", definition: "..." },
          { word: "love", definition: "..." },
          { word: "world", definition: "..." },
        ],
        questions: [],
        reference: "John 3:16",
        language: "en",
      },
      description: "Full context for John 3:16",
    },
  ],

  performance: {
    targetMs: 800,
    cacheable: true,
    cacheKey: "{language}:context:{reference}:{options}",
  },

  mcp: {
    toolName: "getContext",
    description:
      "Get comprehensive Bible study context including scripture, notes, and word definitions",
  },
};

export const GetWordsForReferenceEndpoint: EndpointConfig = {
  name: "get-words-for-reference",
  path: "/get-words-for-reference",
  category: "core",
  description: "Get all translation words linked to a specific reference",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "aggregated",
    dependencies: ["fetch-translation-word-links", "fetch-translation-words"],
  },

  responseShape: {
    type: "context",
    fields: [
      { name: "words", type: "array", description: "Array of translation words with definitions" },
      { name: "reference", type: "string", description: "Scripture reference" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      words: [
        { word: "faith", definition: "..." },
        { word: "love", definition: "..." },
      ],
      reference: "John 3:16",
      language: "en",
    },
  },

  examples: [
    {
      params: { reference: "John 3:16", language: "en" },
      response: {
        words: [
          {
            word: "God",
            definition: '# God\n\n## Definition:\n\nIn the Bible, the term "God" refers to...',
          },
          {
            word: "love",
            definition: "# love, beloved\n\n## Definition:\n\nTo love is to care for...",
          },
        ],
        reference: "John 3:16",
        language: "en",
      },
      description: "All words for John 3:16",
    },
  ],

  performance: {
    targetMs: 600,
    cacheable: true,
    cacheKey: "{language}:words-for-ref:{reference}",
  },

  mcp: {
    toolName: "getWordsForReference",
    description: "Get all translation word definitions for words in a specific verse",
  },
};

// Export all context endpoints
export const ContextEndpoints = [GetContextEndpoint, GetWordsForReferenceEndpoint];
