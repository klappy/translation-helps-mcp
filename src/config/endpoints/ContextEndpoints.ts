/**
 * Context Endpoint Configurations (Extended Tier)
 *
 * These endpoints intelligently aggregate and curate multiple core resources
 * to provide LLM-optimized context and reduce API round-trips.
 *
 * Extended tier focuses on value-added combinations of core data.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import { CONTEXT_SHAPE, REFERENCES_SHAPE } from "../ResponseShapes.js";

/**
 * Common parameters for context endpoints
 */
const CONTEXT_PARAMS = {
  reference: {
    type: "string" as const,
    required: true,
    description:
      'Scripture reference (e.g., "John 3:16", "Genesis 1", "Psalm 23")',
    example: "John 3:16",
    pattern: "^[1-3]?\\s?[A-Za-z]+\\s+\\d+(?::\\d+(?:-\\d+)?)?$",
    min: 3,
    max: 50,
  },
  language: {
    type: "string" as const,
    required: false,
    default: "en",
    description: "Language code for the context resources",
    example: "en",
    options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
  },
  organization: {
    type: "string" as const,
    required: false,
    default: "unfoldingWord",
    description: "Organization providing the resources",
    example: "unfoldingWord",
    options: ["unfoldingWord", "Door43-Catalog"],
  },
};

/**
 * Get Context - Intelligently curated context for LLM consumption
 */
export const GET_CONTEXT_CONFIG: EndpointConfig = {
  name: "get-context",
  path: "/get-context",
  title: "Get Context",
  description:
    "Get intelligently curated context combining scripture, translation notes, and linked resources optimized for LLM consumption",
  category: "extended",
  responseShape: CONTEXT_SHAPE,

  params: {
    ...CONTEXT_PARAMS,
    includeScripture: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include scripture text from multiple translations",
      example: true,
    },
    includeBookIntro: {
      type: "boolean" as const,
      required: false,
      default: true,
      description:
        "Include book-level introduction and context from translation notes",
      example: true,
    },
    includeChapterIntro: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include chapter-level introduction and context",
      example: true,
    },
    includeParsedLinks: {
      type: "boolean" as const,
      required: false,
      default: true,
      description:
        "Parse and surface linked translation words and academy articles for follow-up",
      example: true,
    },
    scriptureContext: {
      type: "string" as const,
      required: false,
      default: "verse",
      description: "Amount of scripture context to include",
      example: "verse",
      options: ["verse", "passage", "chapter"],
    },
    translations: {
      type: "string" as const,
      required: false,
      default: "ult,ust",
      description:
        "Comma-separated list of translations to include (ult, ust, etc.)",
      example: "ult,ust",
    },
  },

  dataSource: {
    type: "computed",
    cacheTtl: 7200, // 2 hours (same as translation notes)
  },

  enabled: true,
  tags: ["context", "aggregation", "llm-optimized", "extended"],

  examples: [
    {
      name: "Verse Context",
      description:
        "Get rich context for a specific verse with multiple translations and curated notes",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        includeScripture: true,
        includeBookIntro: true,
        includeChapterIntro: true,
        includeParsedLinks: true,
        scriptureContext: "verse",
        translations: "ult,ust",
      },
      expectedContent: {
        contains: [
          "context",
          "scripture",
          "translations",
          "notes",
          "linkedResources",
        ],
        minLength: 800,
        fields: {
          context: "object",
          scripture: "object",
          notes: "object",
          linkedResources: "array",
          metadata: "object",
        },
      },
    },
    {
      name: "Chapter Context",
      description: "Get comprehensive context for an entire chapter",
      params: {
        reference: "Romans 8",
        language: "en",
        organization: "unfoldingWord",
        includeScripture: true,
        includeBookIntro: true,
        includeChapterIntro: true,
        includeParsedLinks: true,
        scriptureContext: "chapter",
        translations: "ult,ust",
      },
      expectedContent: {
        contains: ["context", "chapter", "introduction", "overview"],
        minLength: 2000,
        fields: {
          context: "object",
          chapterIntroduction: "string",
          linkedResources: "array",
        },
      },
    },
    {
      name: "Minimal Context",
      description: "Get focused context without extra introductions",
      params: {
        reference: "Psalm 23:1",
        language: "en",
        organization: "unfoldingWord",
        includeScripture: true,
        includeBookIntro: false,
        includeChapterIntro: false,
        includeParsedLinks: false,
        scriptureContext: "verse",
        translations: "ult",
      },
      expectedContent: {
        contains: ["context", "scripture", "notes"],
        minLength: 200,
        fields: {
          context: "object",
          scripture: "object",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Get Words for Reference - Translation words linked to a specific reference
 */
export const GET_WORDS_FOR_REFERENCE_CONFIG: EndpointConfig = {
  name: "get-words-for-reference",
  path: "/get-words-for-reference",
  title: "Get Words for Reference",
  description:
    "Get all translation word articles linked to a specific scripture reference, using translation word links for intelligent mapping",
  category: "extended",
  responseShape: REFERENCES_SHAPE,

  params: {
    ...CONTEXT_PARAMS,
    includeDefinitions: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include full word definitions and explanations",
      example: true,
    },
    includeOccurrences: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include word occurrence information from the reference",
      example: true,
    },
    includeRelated: {
      type: "boolean" as const,
      required: false,
      default: false,
      description: "Include related translation words and cross-references",
      example: false,
    },
    format: {
      type: "string" as const,
      required: false,
      default: "structured",
      description: "Response format for word data",
      example: "structured",
      options: ["structured", "summary", "definitions-only"],
    },
  },

  dataSource: {
    type: "computed",
    cacheTtl: 10800, // 3 hours (same as word links)
  },

  enabled: true,
  tags: ["words", "links", "aggregation", "extended"],

  examples: [
    {
      name: "Words for Verse",
      description: "Get all translation words linked to John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        includeDefinitions: true,
        includeOccurrences: true,
        includeRelated: false,
        format: "structured",
      },
      expectedContent: {
        contains: ["words", "love", "world", "believe", "eternal", "life"],
        minLength: 500,
        fields: {
          words: "array",
          reference: "John 3:16",
          wordCount: "number",
          metadata: "object",
        },
      },
    },
    {
      name: "Summary Format",
      description: "Get concise summaries of key words in a passage",
      params: {
        reference: "Romans 8:28-30",
        language: "en",
        organization: "unfoldingWord",
        includeDefinitions: true,
        includeOccurrences: false,
        includeRelated: false,
        format: "summary",
      },
      expectedContent: {
        contains: ["words", "summary", "predestined", "called"],
        minLength: 300,
        fields: {
          words: "array",
          format: "summary",
        },
      },
    },
    {
      name: "Definitions Only",
      description: "Get just the core definitions without extra metadata",
      params: {
        reference: "Ephesians 2:8-9",
        language: "en",
        organization: "unfoldingWord",
        includeDefinitions: true,
        includeOccurrences: false,
        includeRelated: false,
        format: "definitions-only",
      },
      expectedContent: {
        contains: ["grace", "faith", "works", "definitions"],
        minLength: 200,
        fields: {
          definitions: "array",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Resolve RC Link - Parse and fetch content from RC (Resource Container) links
 */
export const RESOLVE_RC_LINK_CONFIG: EndpointConfig = {
  name: "resolve-rc-link",
  path: "/resolve-rc-link",
  title: "Resolve RC Link",
  description:
    "Resolve RC (Resource Container) links to their actual content across translation resources",
  category: "extended",
  responseShape: {
    dataType: "context",
    structure: {
      required: [
        "rcLink",
        "language",
        "resource",
        "path",
        "content",
        "metadata",
      ],
      optional: ["_trace"],
      fieldDescriptions: [
        {
          name: "rcLink",
          type: "string",
          description: "The original RC link that was resolved",
          example: "rc://*/tw/dict/bible/kt/love",
        },
        {
          name: "language",
          type: "string",
          description: "Language code extracted from the RC link",
          example: "en",
        },
        {
          name: "resource",
          type: "string",
          description: "Resource type (tw, ta, tn, ult, ust)",
          example: "tw",
        },
        {
          name: "path",
          type: "string",
          description: "Path component from the RC link",
          example: "dict/bible/kt/love",
        },
        {
          name: "content",
          type: "object",
          description: "The resolved content from the resource",
          example: { term: "love", articles: [], totalArticles: 3 },
        },
      ],
    },
    performance: {
      maxResponseTime: 2000,
      cacheable: true,
      expectedCacheHitRate: 0.8,
    },
  },

  params: {
    rcLink: {
      type: "string" as const,
      required: true,
      description: 'RC link to resolve (e.g., "rc://*/tw/dict/bible/kt/love")',
      example: "rc://*/tw/dict/bible/kt/love",
      pattern: "^rc://",
    },
    organization: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization to use for resolving the link",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
  },

  dataSource: {
    type: "zip-cached",
    cacheTtl: 10800, // 3 hours
  },

  enabled: true,
  tags: ["rc-links", "cross-reference", "navigation", "extended"],

  examples: [
    {
      name: "Translation Words Link",
      description: "Resolve a Translation Words RC link",
      params: {
        rcLink: "rc://*/tw/dict/bible/kt/love",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["agape", "love", "God"],
        minLength: 100,
        fields: {
          content: "object",
          language: "string",
          resource: "string",
        },
      },
    },
    {
      name: "Translation Academy Link",
      description: "Resolve a Translation Academy RC link",
      params: {
        rcLink: "rc://*/ta/man/translate/figs-metaphor",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["metaphor", "figure of speech"],
        minLength: 100,
        fields: {
          content: "object",
          language: "string",
          resource: "string",
        },
      },
    },
    {
      name: "Translation Notes Link",
      description: "Resolve a Translation Notes RC link",
      params: {
        rcLink: "rc://*/tn/help/gen/01/02",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["Genesis", "notes"],
        minLength: 50,
        fields: {
          content: "object",
          reference: "string",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * All Context Endpoint Configurations (Extended Tier)
 */
export const CONTEXT_ENDPOINTS = [
  GET_CONTEXT_CONFIG,
  GET_WORDS_FOR_REFERENCE_CONFIG,
  RESOLVE_RC_LINK_CONFIG,
] as const;

export default CONTEXT_ENDPOINTS;
