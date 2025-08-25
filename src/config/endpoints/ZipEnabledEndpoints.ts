/**
 * Example ZIP-Enabled Endpoint Configurations
 *
 * Shows how to update existing endpoints to use ZIP caching
 * while maintaining backward compatibility.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import {
  SCRIPTURE_SHAPE,
  TRANSLATION_NOTES_SHAPE,
  TRANSLATION_QUESTIONS_SHAPE,
  TRANSLATION_WORDS_SHAPE,
} from "../ResponseShapes.js";

/**
 * Example: Scripture endpoint using ZIP caching
 */
export const FETCH_SCRIPTURE_ZIP_CONFIG: EndpointConfig = {
  name: "fetch-scripture",
  path: "/fetch-scripture",
  title: "Fetch Scripture (ZIP Cached)",
  description:
    "Retrieve scripture text using ZIP-based caching for 90% faster responses",
  category: "core",
  responseShape: SCRIPTURE_SHAPE,

  params: {
    reference: {
      type: "string",
      required: true,
      description: 'Scripture reference (e.g., "John 3:16")',
      example: "John 3:16",
      pattern: "^[1-3]?\\s?[A-Za-z]+\\s+\\d+(?::\\d+(?:-\\d+)?)?$",
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
      options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization providing the scripture",
    },
    resource: {
      type: "string",
      required: false,
      default: "ult",
      description: "Translation resource (ult, ust, or all)",
      options: ["ult", "ust", "all"],
    },
  },

  dataSource: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: "zip-cached" as any, // Using 'any' until types are updated
    cacheTtl: 0, // Response caching disabled per CRITICAL_NEVER_CACHE_RESPONSES.md
    zipConfig: {
      fetchMethod: "getScripture",
      resourceType: "ult", // Default, overridden by params.resource
      warmCache: true, // Pre-download popular books
      zipCacheTtl: 86400, // 24 hour ZIP cache
    },
  },

  enabled: true,
  tags: ["scripture", "bible", "text", "core", "zip-cached"],

  examples: [
    {
      name: "John 3:16 (ZIP Cached)",
      description: "Fetch the most famous verse using ZIP cache",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
      },
      expectedContent: {
        contains: ["God so loved the world"],
        minLength: 50,
      },
    },
  ],
};

/**
 * Example: Translation Questions using ZIP-cached TSV data
 */
export const FETCH_TRANSLATION_QUESTIONS_ZIP_CONFIG: EndpointConfig = {
  name: "translation-questions",
  path: "/translation-questions",
  title: "Fetch Translation Questions (ZIP Cached)",
  description: "Retrieve comprehension questions from cached ZIP files",
  category: "core",
  responseShape: TRANSLATION_QUESTIONS_SHAPE,

  params: {
    reference: {
      type: "string",
      required: true,
      description: "Scripture reference",
      example: "John 3:16",
    },
    language: {
      type: "string",
      required: false,
      default: "en",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
    },
  },

  dataSource: {
    type: "zip-cached" as any,
    cacheTtl: 0, // Response caching disabled per CRITICAL_NEVER_CACHE_RESPONSES.md
    zipConfig: {
      fetchMethod: "getTSVData",
      resourceType: "tq",
      useIngredients: true, // Use manifest to find TSV files
      zipCacheTtl: 86400, // 24 hour ZIP cache
    },
    transformation: "tsv-parse", // Still applies after ZIP fetch
  },

  enabled: true,
  tags: ["translation", "questions", "checking", "core", "zip-cached"],
};

/**
 * Example: Translation Notes using ZIP-cached TSV data
 */
export const FETCH_TRANSLATION_NOTES_ZIP_CONFIG: EndpointConfig = {
  name: "fetch-translation-notes",
  path: "/translation-notes",
  title: "Fetch Translation Notes (ZIP Cached)",
  description: "Retrieve translation notes from cached ZIP files",
  category: "core",
  responseShape: TRANSLATION_NOTES_SHAPE,

  params: {
    reference: {
      type: "string",
      required: true,
      description: "Scripture reference",
      example: "John 3:16",
    },
    language: {
      type: "string",
      required: false,
      default: "en",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
    },
  },

  dataSource: {
    type: "zip-cached" as any,
    cacheTtl: 0, // Response caching disabled per CRITICAL_NEVER_CACHE_RESPONSES.md
    zipConfig: {
      fetchMethod: "getTSVData",
      resourceType: "tn",
      useIngredients: true,
      zipCacheTtl: 86400,
    },
    transformation: "tsv-parse",
  },

  enabled: true,
  tags: ["translation", "notes", "commentary", "core", "zip-cached"],
};

/**
 * Example: Translation Word using ZIP-cached markdown
 */
export const GET_TRANSLATION_WORD_ZIP_CONFIG: EndpointConfig = {
  name: "get-translation-word",
  path: "/get-translation-word",
  title: "Get Translation Word (ZIP Cached)",
  description: "Retrieve translation word articles from cached ZIP files",
  category: "core",
  responseShape: TRANSLATION_WORDS_SHAPE,

  params: {
    term: {
      type: "string",
      required: false,
      description: 'Translation word term (e.g., "love", "grace")',
      example: "love",
    },
    path: {
      type: "string",
      required: false,
      description:
        "Explicit path to the translation word markdown inside the repo (e.g., bible/kt/love.md)",
      example: "bible/kt/love.md",
    },
    language: {
      type: "string",
      required: false,
      default: "en",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
    },
  },

  dataSource: {
    type: "zip-cached" as any,
    cacheTtl: 14400, // 4 hour cache (stable content)
    zipConfig: {
      fetchMethod: "getMarkdownContent",
      resourceType: "tw",
      zipCacheTtl: 172800, // 48 hour ZIP cache for very stable content
    },
    transformation: "markdown-parse", // Parse markdown after fetch
  },

  enabled: true,
  tags: ["translation", "words", "definitions", "core", "zip-cached"],
};

/**
 * Example: Hybrid endpoint that uses both ZIP and API
 * This could fetch main content from ZIP but metadata from API
 */
export const HYBRID_SCRIPTURE_CONFIG: EndpointConfig = {
  name: "scripture-with-metadata",
  path: "/scripture-with-metadata",
  title: "Scripture with Metadata (Hybrid)",
  description: "Fetch scripture from ZIP cache with fresh metadata from API",
  category: "extended",

  params: {
    reference: {
      type: "string",
      required: true,
      example: "John 3:16",
    },
  },

  dataSource: {
    type: "hybrid" as any,
    cacheTtl: 1800, // 30 minute cache

    // ZIP config for main content
    zipConfig: {
      fetchMethod: "getScripture",
      resourceType: "ult",
      zipCacheTtl: 86400,
    },

    // DCS endpoint for fresh metadata
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_{resource}/contents",

    // Custom transformation combines both
    transformation: "combine-scripture-metadata",
  },

  enabled: true,
  tags: ["scripture", "metadata", "hybrid", "extended"],
};

/**
 * Migration Map: Shows which endpoints to migrate first
 *
 * Priority 1 (Easiest):
 * - fetch-scripture → ZIP cached USFM files
 * - get-translation-word → ZIP cached markdown files
 *
 * Priority 2 (TSV-based):
 * - fetch-translation-notes → ZIP cached TSV files
 * - fetch-translation-questions → ZIP cached TSV files
 * - fetch-translation-word-links → ZIP cached TSV files
 *
 * Priority 3 (Complex):
 * - fetch-translation-academy → ZIP cached directory listing
 * - browse-translation-academy → Custom ZIP directory browser
 *
 * Priority 4 (Experimental):
 * - All experimental endpoints can use hybrid approach
 */

export const ZIP_MIGRATION_PRIORITY = {
  immediate: ["fetch-scripture", "get-translation-word"],

  phase2: [
    "fetch-translation-notes",
    "fetch-translation-questions",
    "fetch-translation-word-links",
  ],

  phase3: [
    "fetch-translation-academy",
    "browse-translation-academy",
    "get-languages",
    "get-available-books",
  ],

  future: [
    "ai-translation-assistant",
    "parallel-passage-finder",
    "translation-memory",
  ],
};
