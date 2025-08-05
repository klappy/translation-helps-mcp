/**
 * Translation Helps Endpoint Configurations
 *
 * Defines all translation help endpoints: Translation Notes (tN), Translation Academy (tA),
 * Translation Questions (tQ), Translation Word Links (tWL), and Translation Words (tW).
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import {
  TRANSLATION_NOTES_SHAPE,
  TRANSLATION_QUESTIONS_SHAPE,
  TRANSLATION_WORDS_SHAPE,
  TRANSLATION_ACADEMY_SHAPE,
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
};

/**
 * Common parameters for term-based endpoints
 */
const TERM_PARAMS = {
  term: {
    type: "string" as const,
    required: true,
    description:
      'Translation word term to lookup (e.g., "love", "grace", "salvation")',
    example: "love",
    min: 2,
    max: 50,
  },
  language: REFERENCE_PARAMS.language,
  organization: REFERENCE_PARAMS.organization,
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
    type: "dcs-api",
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_tq/contents/{book}/{chapter}.md",
    transformation: "markdown-assemble",
    cacheTtl: 7200,
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
          "eternal life",
        ],
        minLength: 100,
        fields: {
          translationQuestions: "array",
          citation: "object",
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
 * Get Translation Word (tW) - Individual word articles
 */
export const GET_TRANSLATION_WORD_CONFIG: EndpointConfig = {
  name: "get-translation-word",
  path: "/get-translation-word",
  title: "Get Translation Word",
  description:
    "Retrieve detailed explanation of a specific biblical term or concept",
  category: "core",
  responseShape: TRANSLATION_WORDS_SHAPE,

  params: TERM_PARAMS,

  dataSource: {
    type: "dcs-api",
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_tw/contents/bible/kt/{term}.md",
    transformation: "markdown-assemble",
    cacheTtl: 14400, // 4 hours (more stable content)
  },

  enabled: true,
  tags: ["translation", "words", "definitions", "core"],

  examples: [
    {
      name: "Key Term",
      description: "Get definition and usage of the term 'grace'",
      params: {
        term: "grace",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["undeserved", "favor", "gift from God"],
        minLength: 200,
        fields: {
          term: "grace",
          definition: "string",
          facts: "array",
        },
      },
    },
    {
      name: "Biblical Concept",
      description: "Get explanation of the concept 'covenant'",
      params: {
        term: "covenant",
        language: "en",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["agreement", "promise", "binding"],
        minLength: 300,
        fields: {
          term: "covenant",
          definition: "string",
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
    "Retrieve translation training modules and principles organized by category and difficulty",
  category: "core",
  responseShape: TRANSLATION_ACADEMY_SHAPE,

  params: {
    language: REFERENCE_PARAMS.language,
    organization: REFERENCE_PARAMS.organization,
    category: {
      type: "string" as const,
      required: false,
      description: "Module category (process, translate, checking)",
      example: "translate",
      options: ["process", "translate", "checking", "audio", "gateway"],
    },
    difficulty: {
      type: "string" as const,
      required: false,
      description: "Difficulty level for filtering modules",
      example: "beginner",
      options: ["beginner", "intermediate", "advanced"],
    },
    moduleId: {
      type: "string" as const,
      required: false,
      description: "Specific module ID or topic to retrieve",
      example: "figs-metaphor",
      min: 3,
      max: 50,
    },
  },

  dataSource: {
    type: "dcs-api",
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_ta/contents",
    transformation: "json-passthrough",
    cacheTtl: 21600, // 6 hours (very stable content)
  },

  enabled: true,
  tags: ["translation", "academy", "training", "core"],

  examples: [
    {
      name: "All Modules",
      description: "Get all available translation academy modules",
      params: {
        language: "en",
        organization: "unfoldingWord",
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
  category: "core",
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
  },

  dataSource: {
    type: "dcs-api",
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_ta/contents",
    transformation: "json-passthrough",
    cacheTtl: 43200, // 12 hours (very stable TOC data)
  },

  enabled: true,
  tags: ["translation", "academy", "browse", "toc", "core"],

  examples: [
    {
      name: "All Categories",
      description: "Browse all Translation Academy categories and modules",
      params: {
        language: "en",
        organization: "unfoldingWord",
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
      name: "Translation Category",
      description: "Browse modules in the translation category",
      params: {
        language: "en",
        organization: "unfoldingWord",
        category: "translate",
      },
      expectedContent: {
        contains: ["translate", "metaphor", "idiom"],
        fields: {
          categories: "array",
        },
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
    type: "dcs-api",
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_twl/contents/{book}/{chapter}.tsv",
    transformation: "tsv-parse",
    cacheTtl: 10800, // 3 hours
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
        contains: ["love", "world", "believe"],
        minLength: 50,
        fields: {
          links: "array",
          reference: "John 3:16",
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
    "Retrieve detailed translation notes explaining difficult passages and terms",
  category: "core",
  responseShape: TRANSLATION_NOTES_SHAPE,

  params: REFERENCE_PARAMS,

  dataSource: {
    type: "dcs-api",
    dcsEndpoint:
      "/api/v1/repos/{organization}/{language}_tn/contents/{book}/{chapter}.tsv",
    transformation: "tsv-parse",
    cacheTtl: 7200, // 2 hours
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
        contains: ["God so loved", "gave his", "only Son"],
        minLength: 100,
        fields: {
          notes: "array",
          reference: "John 3:16",
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
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * All Translation Helps Endpoint Configurations
 */
export const TRANSLATION_HELPS_ENDPOINTS = [
  FETCH_TRANSLATION_QUESTIONS_CONFIG,
  GET_TRANSLATION_WORD_CONFIG,
  FETCH_TRANSLATION_ACADEMY_CONFIG,
  BROWSE_TRANSLATION_ACADEMY_CONFIG,
  FETCH_TRANSLATION_WORD_LINKS_CONFIG,
  FETCH_TRANSLATION_NOTES_CONFIG,
] as const;

export default TRANSLATION_HELPS_ENDPOINTS;
