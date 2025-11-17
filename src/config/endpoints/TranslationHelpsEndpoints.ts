/**
 * Translation Helps Endpoint Configurations
 *
 * Defines all translation help endpoints: Translation Notes (tN), Translation Academy (tA),
 * Translation Questions (tQ), Translation Word Links (tWL), and Translation Words (tW).
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import {
  TRANSLATION_ACADEMY_SHAPE,
  TRANSLATION_NOTES_SHAPE,
  TRANSLATION_QUESTIONS_SHAPE,
  TRANSLATION_WORDS_SHAPE,
  TRANSLATION_WORD_LINKS_SHAPE,
} from "../ResponseShapes.js";

/**
 * Common parameters for reference-based endpoints
 */
const REFERENCE_PARAMS = {
  reference: {
    type: "string" as const,
    required: true,
    description:
      'Scripture reference (e.g., "John 3:16", "Genesis 1:1-5", "Psalm 23")',
    example: "John 3:16",
    pattern: "^[1-3]?\\s?[A-Za-z]+\\s+\\d+(?::\\d+(?:-\\d+)?)?$",
    min: 3,
    max: 50,
  },
  language: {
    type: "string" as const,
    required: false,
    default: "en",
    description: "Language code for the translation helps",
    example: "en",
    options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
  },
  organization: {
    type: "string" as const,
    required: false,
    default: "unfoldingWord",
    description: "Organization providing the translation helps",
    example: "unfoldingWord",
    options: ["unfoldingWord", "Door43-Catalog"],
  },
  format: {
    type: "string" as const,
    required: false,
    default: "json",
    description: "Response format",
    example: "json",
    options: ["json", "md", "text"],
  },
};

/**
 * Common parameters for term-based endpoints
 */
const TERM_PARAMS = {
  term: {
    type: "string" as const,
    required: false,
    description:
      'Translation word term to lookup (e.g., "love", "grace", "salvation")',
    example: "love",
    min: 2,
    max: 50,
  },
  path: {
    type: "string" as const,
    required: false,
    description:
      "Explicit path to the translation word markdown inside the repo (e.g., bible/kt/love.md)",
    example: "bible/kt/love.md",
    min: 5,
    max: 200,
  },
  rcLink: {
    type: "string" as const,
    required: false,
    description:
      'RC link to the translation word (e.g., "rc://*/tw/dict/bible/kt/love")',
    example: "rc://*/tw/dict/bible/kt/love",
    pattern: "^rc://.*",
    min: 10,
    max: 200,
  },
  language: REFERENCE_PARAMS.language,
  organization: REFERENCE_PARAMS.organization,
  format: REFERENCE_PARAMS.format,
};

/**
 * Fetch Translation Questions (tQ) - Questions for checking translation
 */
export const FETCH_TRANSLATION_QUESTIONS_CONFIG: EndpointConfig = {
  name: "fetch-translation-questions",
  path: "/fetch-translation-questions",
  title: "Fetch Translation Questions",
  description:
    "Retrieve comprehension and checking questions for scripture passages",
  category: "core",
  responseShape: TRANSLATION_QUESTIONS_SHAPE,
  params: REFERENCE_PARAMS,
  dataSource: {
    type: "zip-cached",
    cacheTtl: 7200,
    zipConfig: { fetchMethod: "getTSVData", resourceType: "tq" },
  },
  enabled: true,
  tags: ["translation", "questions", "checking", "core"],
  examples: [
    {
      name: "John 3:16 Questions",
      description:
        "Get comprehension questions for the most famous Bible verse",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: [
          "How did God show he loved the world",
          "giving his Only Son",
          "everlasting life",
        ],
        minLength: 100,
        fields: {
          items: "array",
          reference: "string",
          metadata: "object",
        },
      },
    },
    {
      name: "Genesis 1:1 Questions",
      description: "Comprehension questions about the creation account",
      params: {
        reference: "Genesis 1:1",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["created", "beginning", "God"],
        minLength: 50,
        fields: {
          translationQuestions: "array",
        },
      },
    },
    {
      name: "Romans 8:28 Questions",
      description: "Questions about God's sovereignty and providence",
      params: {
        reference: "Romans 8:28",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["work together", "good", "called"],
        fields: {
          translationQuestions: "array",
        },
      },
    },
    {
      name: "Spanish Questions",
      description: "Translation questions in Spanish for Beatitudes",
      params: {
        reference: "Matthew 5:3",
        language: "es",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["bienaventurados", "pobres"],
        fields: {
          language: "es",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch Translation Word (tW) - Individual word articles
 */
export const FETCH_TRANSLATION_WORD_CONFIG: EndpointConfig = {
  name: "fetch-translation-word",
  path: "/fetch-translation-word",
  title: "Fetch Translation Word",
  description:
    "Retrieve biblical terms and definitions from Translation Words (TW) or get a Table of Contents.",
  category: "core",
  responseShape: TRANSLATION_WORDS_SHAPE,

  params: TERM_PARAMS,

  dataSource: {
    type: "zip-cached",
    cacheTtl: 14400,
    zipConfig: { fetchMethod: "getMarkdownContent", resourceType: "tw" },
  },

  enabled: true,
  tags: ["translation", "words", "definitions", "core"],

  examples: [
    {
      name: "Table of Contents",
      description: "Get a structured Table of Contents for all available terms",
      params: {
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["Key Terms", "Names", "Other Terms"],
        minLength: 500,
        fields: {
          tableOfContents: {
            categories: "array",
            usage: "object",
          },
        },
      },
    },
    {
      name: "Term Lookup",
      description: "Fetch a specific biblical term by name",
      params: {
        term: "love",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: [
          "Definition:",
          "Translation Suggestions:",
          "Bible References:",
        ],
        minLength: 1000,
        fields: {
          items: "array",
          "items[0].content": "string",
          "items[0].definition": "string",
        },
      },
    },
    {
      name: "Path Lookup",
      description: "Fetch a term by its exact file path",
      params: {
        path: "bible/kt/love.md",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["Definition:", "love", "God"],
        minLength: 1000,
        fields: {
          items: "array",
          "items[0].content": "string",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch Translation Academy (tA) - Translation principles and training
 */
export const FETCH_TRANSLATION_ACADEMY_CONFIG: EndpointConfig = {
  name: "fetch-translation-academy",
  path: "/fetch-translation-academy",
  title: "Fetch Translation Academy",
  description:
    "Retrieve translation training modules with support for moduleId, directory path, or RC link. Returns all markdown files in directory concatenated.",
  category: "core",
  responseShape: TRANSLATION_ACADEMY_SHAPE,

  params: {
    moduleId: {
      type: "string" as const,
      required: false,
      description:
        "Translation Academy module ID (e.g., 'figs-metaphor'). Searches in order: translate/{moduleId}, process/{moduleId}, checking/{moduleId}, intro/{moduleId}",
      example: "figs-metaphor",
      min: 3,
      max: 50,
    },
    path: {
      type: "string" as const,
      required: false,
      description:
        "Path to TA module. Can be directory (e.g., 'translate/figs-metaphor') for all .md files concatenated, or file path (e.g., 'translate/figs-metaphor/01.md') for single file.",
      example: "translate/figs-metaphor",
      min: 5,
      max: 200,
    },
    rcLink: {
      type: "string" as const,
      required: false,
      description:
        'RC link to TA module (e.g., "rc://*/ta/man/translate/figs-metaphor"). Supports wildcards (*) for any segment.',
      example: "rc://*/ta/man/translate/figs-metaphor",
      pattern: "^rc://.*",
      min: 10,
      max: 200,
    },
    language: REFERENCE_PARAMS.language,
    organization: REFERENCE_PARAMS.organization,
    format: {
      type: "string" as const,
      required: false,
      description: "Response format",
      example: "json",
      options: ["json", "md", "markdown"],
      default: "json",
    },
  },

  dataSource: {
    type: "zip-cached",
    cacheTtl: 21600,
    zipConfig: { fetchMethod: "getMarkdownContent", resourceType: "ta" },
  },

  enabled: true,
  tags: ["translation", "academy", "training", "core"],

  examples: [
    {
      name: "All Modules (Markdown)",
      description: "Get all modules in LLM-friendly markdown format",
      params: {
        language: "en",
        organization: "unfoldingWord",
        // format: "markdown" is default
      },
      expectedContent: {
        contains: ["# Translation Academy", "## Table of Contents", "- ["],
        minLength: 1000,
      },
    },
    {
      name: "All Modules (JSON)",
      description: "Get all modules in structured JSON format",
      params: {
        language: "en",
        organization: "unfoldingWord",
        format: "json",
      },
      expectedContent: {
        contains: ["modules", "categories", "beginner"],
        minLength: 1000,
        fields: {
          modules: "array",
          metadata: "object",
        },
      },
    },
    {
      name: "Specific Category",
      description: "Get modules for translation category",
      params: {
        language: "en",
        organization: "unfoldingWord",
        category: "translate",
      },
      expectedContent: {
        contains: ["translate", "metaphor", "idiom"],
        fields: {
          modules: "array",
        },
      },
    },
    {
      name: "Specific Module",
      description: "Get a specific module about metaphors",
      params: {
        language: "en",
        organization: "unfoldingWord",
        moduleId: "figs-metaphor",
      },
      expectedContent: {
        contains: ["metaphor", "comparison", "like"],
        minLength: 500,
        fields: {
          modules: "array",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Browse Translation Academy (Table of Contents)
 */
export const BROWSE_TRANSLATION_ACADEMY_CONFIG: EndpointConfig = {
  name: "browse-translation-academy",
  path: "/browse-translation-academy",
  title: "Browse Translation Academy",
  description:
    "Browse available Translation Academy modules and categories (Table of Contents)",
  category: "extended",
  responseShape: TRANSLATION_ACADEMY_SHAPE,

  params: {
    language: REFERENCE_PARAMS.language,
    organization: REFERENCE_PARAMS.organization,
    category: {
      type: "string" as const,
      required: false,
      description: "Filter by specific category",
      example: "translate",
      options: ["process", "translate", "checking", "audio", "gateway"],
    },
    format: {
      type: "string" as const,
      required: false,
      description:
        "Response format - markdown (default) for LLM-friendly output, json for structured data",
      example: "markdown",
      options: ["markdown", "json"],
      default: "json",
    },
  },

  dataSource: {
    type: "zip-cached",
    cacheTtl: 43200,
    zipConfig: { fetchMethod: "getMarkdownContent", resourceType: "ta" },
  },

  enabled: true,
  tags: ["translation", "academy", "browse", "toc", "core"],

  examples: [
    {
      name: "All Categories (Markdown)",
      description: "Browse all categories in LLM-friendly markdown format",
      params: {
        language: "en",
        organization: "unfoldingWord",
        // format: "markdown" is default
      },
      expectedContent: {
        contains: ["# Translation Academy", "## Table of Contents", "- ["],
        minLength: 1000,
      },
    },
    {
      name: "All Categories (JSON)",
      description: "Browse all categories in structured JSON format",
      params: {
        language: "en",
        organization: "unfoldingWord",
        format: "json",
      },
      expectedContent: {
        contains: ["categories", "modules", "process", "translate"],
        minLength: 200,
        fields: {
          categories: "array",
          totalModules: "number",
        },
      },
    },
    {
      name: "Specific Category (Markdown)",
      description: "Browse translation category in markdown",
      params: {
        language: "en",
        organization: "unfoldingWord",
        category: "translate",
      },
      expectedContent: {
        contains: ["# Table of Contents", "- [", "translate/"],
        minLength: 500,
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch Translation Word Links (tWL) - Links between verses and translation words
 */
export const FETCH_TRANSLATION_WORD_LINKS_CONFIG: EndpointConfig = {
  name: "fetch-translation-word-links",
  path: "/fetch-translation-word-links",
  title: "Fetch Translation Word Links",
  description:
    "Retrieve links between scripture references and translation word articles",
  category: "core",
  responseShape: TRANSLATION_WORD_LINKS_SHAPE,

  params: REFERENCE_PARAMS,

  dataSource: {
    type: "zip-cached",
    cacheTtl: 10800,
    zipConfig: { fetchMethod: "getTSVData", resourceType: "twl" },
  },

  enabled: true,
  tags: ["translation", "words", "links", "core"],

  examples: [
    {
      name: "Word Links",
      description: "Get translation word links for John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: [
          "rc://*/tw/dict/bible/kt/love",
          "rc://*/tw/dict/bible/kt/world",
        ],
        minLength: 50,
        fields: {
          items: "array",
          reference: "string",
          metadata: "object",
        },
      },
    },
    {
      name: "Multiple Verses",
      description: "Get links for a verse range",
      params: {
        reference: "Romans 8:28-30",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["predestined", "called", "justified"],
        fields: {
          links: "array",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Fetch Translation Notes (tN) - Detailed translation notes
 */
export const FETCH_TRANSLATION_NOTES_CONFIG: EndpointConfig = {
  name: "fetch-translation-notes",
  path: "/fetch-translation-notes",
  title: "Fetch Translation Notes",
  description:
    "Retrieve detailed translation notes explaining difficult passages and terms. Each note includes the original Greek or Hebrew text (in the 'quote' field) along with explanations of what that text means.",
  category: "core",
  responseShape: TRANSLATION_NOTES_SHAPE,

  params: REFERENCE_PARAMS,

  dataSource: {
    type: "zip-cached",
    cacheTtl: 7200,
    zipConfig: { fetchMethod: "getTSVData", resourceType: "tn" },
  },

  enabled: true,
  tags: ["translation", "notes", "commentary", "core"],

  examples: [
    {
      name: "Basic Notes",
      description: "Get translation notes for John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["For", "γὰρ", "grammar-connect-logic-result"],
        minLength: 100,
        fields: {
          items: "array",
          reference: "string",
          metadata: "object",
        },
      },
    },
    {
      name: "Complex Passage",
      description: "Get notes for a theologically rich passage",
      params: {
        reference: "Ephesians 2:8-9",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["grace", "faith", "works"],
        minLength: 200,
        fields: {
          notes: "array",
          reference: "Ephesians 2:8-9",
        },
      },
    },
    {
      name: "Greek Quotes",
      description: "Get notes with Greek text in quote field",
      params: {
        reference: "Titus 1:14",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["μύθοις Ἰουδαϊκοῖς", "Jewish myths"],
        minLength: 100,
        fields: {
          notes: "array",
          quote: "string (Greek text)",
          reference: "Titus 1:14",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * TW Articles Composer - Convenience endpoint: verse -> full TW articles
 */
export const TW_ARTICLES_CONFIG: EndpointConfig = {
  name: "tw-articles",
  path: "/tw-articles",
  title: "Translation Word Articles (by reference)",
  description:
    "Given a scripture reference, fetch Translation Word Links and resolve each link to a full TW article.",
  category: "extended",
  responseShape: TRANSLATION_WORDS_SHAPE,

  params: REFERENCE_PARAMS,

  dataSource: {
    type: "computed",
  },

  enabled: true,
  tags: ["translation", "words", "compose", "extended"],

  examples: [
    {
      name: "John 3:16 Articles",
      description: "All Translation Word articles referenced in John 3:16",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["love, beloved", "# God", "world, worldly"],
        fields: {
          items: "array",
        },
      },
    },
    {
      name: "Titus 1:1 Articles",
      description: "Articles for the key terms in Titus 1:1",
      params: {
        reference: "Titus 1:1",
        language: "en",
        organization: "unfoldingWord",
      },
    },
  ],
} as EndpointConfig;

/**
 * All Translation Helps Endpoint Configurations
 */
export const TRANSLATION_HELPS_ENDPOINTS = [
  FETCH_TRANSLATION_QUESTIONS_CONFIG,
  FETCH_TRANSLATION_WORD_CONFIG,
  FETCH_TRANSLATION_ACADEMY_CONFIG,
  FETCH_TRANSLATION_WORD_LINKS_CONFIG,
  FETCH_TRANSLATION_NOTES_CONFIG,
] as const;

export default TRANSLATION_HELPS_ENDPOINTS;
