/**
 * Translation Helps Endpoint Configurations
 *
 * Defines configurations for Translation Notes, Words, and Word Links
 * with proper transformations.
 */

import type { EndpointConfig } from "../EndpointConfig";
import {
  TranslationNotesShape,
  TranslationWordLinksShape,
  TranslationWordsShape,
} from "../ResponseShapes";

/**
 * Fetch Translation Notes endpoint
 */
export const FetchTranslationNotesEndpoint: EndpointConfig = {
  name: "fetch-translation-notes",
  path: "/api/fetch-translation-notes",
  category: "core",
  description: "Fetch translation notes for a Bible reference",
  params: {
    reference: {
      type: "string",
      required: true,
      description: 'Bible reference (e.g., "John 3:16")',
      validation: {
        pattern: "^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$",
      },
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
    includeIntro: {
      type: "boolean",
      required: false,
      default: true,
      description: "Include book and chapter introductions",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "tn",
    transformation: "tsv-parse",
  },
  responseShape: TranslationNotesShape,
  examples: [
    {
      params: { reference: "John 3:16" },
      response: {
        notes: [
          {
            reference: "John 3:16",
            quote: "For God so loved",
            note: "This emphasizes the great love of God...",
          },
        ],
        reference: "John 3:16",
        language: "en",
      },
    },
  ],
  performance: {
    expectedMs: 400,
    cacheStrategy: "moderate",
  },
};

/**
 * Fetch Translation Words endpoint
 */
export const FetchTranslationWordsEndpoint: EndpointConfig = {
  name: "fetch-translation-words",
  path: "/api/fetch-translation-words",
  category: "core",
  description: "Fetch translation word articles",
  params: {
    word: {
      type: "string",
      required: true,
      description: 'Word to look up (e.g., "faith", "love")',
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "tw",
    transformation: "markdown-assemble",
  },
  responseShape: TranslationWordsShape,
  examples: [
    {
      params: { word: "faith" },
      response: {
        term: "faith",
        title: "Faith",
        definition: "Faith is trusting in God and His promises...",
        language: "en",
      },
    },
  ],
  performance: {
    expectedMs: 300,
    cacheStrategy: "aggressive",
  },
};

/**
 * Browse Translation Words endpoint
 */
export const BrowseTranslationWordsEndpoint: EndpointConfig = {
  name: "browse-translation-words",
  path: "/api/browse-translation-words",
  category: "core",
  description: "Browse available translation words (table of contents)",
  params: {
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
    category: {
      type: "string",
      required: false,
      description: "Filter by category",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "tw",
    transformation: "json-parse",
  },
  responseShape: {
    type: "discovery",
    fields: {
      words: {
        type: "array",
        description: "List of available translation words",
      },
      categories: {
        type: "array",
        description: "Available categories",
      },
      totalCount: {
        type: "number",
        description: "Total number of words",
      },
    },
  },
  examples: [
    {
      params: { language: "en" },
      response: {
        words: ["faith", "love", "grace", "mercy"],
        categories: ["kt", "names", "other"],
        totalCount: 500,
      },
    },
  ],
  performance: {
    expectedMs: 200,
    cacheStrategy: "aggressive",
  },
};

/**
 * Fetch Translation Word Links endpoint
 */
export const FetchTranslationWordLinksEndpoint: EndpointConfig = {
  name: "fetch-translation-word-links",
  path: "/api/fetch-translation-word-links",
  category: "core",
  description: "Get translation words linked to a Bible reference",
  params: {
    reference: {
      type: "string",
      required: true,
      description: "Bible reference",
      validation: {
        pattern: "^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$",
      },
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "twl",
    transformation: "tsv-parse",
  },
  responseShape: TranslationWordLinksShape,
  examples: [
    {
      params: { reference: "John 3:16" },
      response: {
        wordLinks: [
          {
            word: "love",
            occurrence: 1,
            quote: "loved",
          },
          {
            word: "believe",
            occurrence: 1,
            quote: "believes",
          },
        ],
        reference: "John 3:16",
        language: "en",
        totalLinks: 2,
      },
    },
  ],
  performance: {
    expectedMs: 250,
    cacheStrategy: "moderate",
  },
};

/**
 * Get Translation Word by ID endpoint
 */
export const GetTranslationWordEndpoint: EndpointConfig = {
  name: "get-translation-word",
  path: "/api/get-translation-word",
  category: "core",
  description: "Get a specific translation word article by ID",
  params: {
    wordId: {
      type: "string",
      required: true,
      description: 'Word identifier (e.g., "kt/faith")',
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "tw",
    transformation: "markdown-assemble",
  },
  responseShape: TranslationWordsShape,
  examples: [
    {
      params: { wordId: "kt/faith" },
      response: {
        term: "faith",
        title: "Faith, Faithful",
        definition: "To have faith in someone means to trust that person...",
        language: "en",
      },
    },
  ],
  performance: {
    expectedMs: 300,
    cacheStrategy: "aggressive",
  },
};

/**
 * Fetch Translation Questions endpoint
 */
export const FetchTranslationQuestionsEndpoint: EndpointConfig = {
  name: "fetch-translation-questions",
  path: "/api/fetch-translation-questions",
  category: "core",
  description: "Fetch comprehension questions for a Bible reference",
  params: {
    reference: {
      type: "string",
      required: true,
      description: "Bible reference",
      validation: {
        pattern: "^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$",
      },
    },
    language: {
      type: "string",
      required: false,
      default: "en",
      description: "Language code",
    },
    organization: {
      type: "string",
      required: false,
      default: "unfoldingWord",
      description: "Organization name",
    },
  },
  dataSource: {
    type: "dcs",
    resource: "tq",
    transformation: "tsv-parse",
  },
  responseShape: {
    type: "questions",
    fields: {
      questions: {
        type: "array",
        description: "Array of comprehension questions",
      },
      reference: {
        type: "string",
        description: "The reference these questions apply to",
      },
      language: {
        type: "string",
        description: "Language code",
      },
    },
  },
  examples: [
    {
      params: { reference: "John 3" },
      response: {
        questions: [
          {
            reference: "John 3:1-2",
            question: "Who was Nicodemus?",
            answer: "A Pharisee and ruler of the Jews",
          },
        ],
        reference: "John 3",
        language: "en",
      },
    },
  ],
  performance: {
    expectedMs: 350,
    cacheStrategy: "moderate",
  },
};

/**
 * All translation helps endpoints
 */
export const TranslationHelpsEndpoints = [
  FetchTranslationNotesEndpoint,
  FetchTranslationWordsEndpoint,
  BrowseTranslationWordsEndpoint,
  FetchTranslationWordLinksEndpoint,
  GetTranslationWordEndpoint,
  FetchTranslationQuestionsEndpoint,
];
