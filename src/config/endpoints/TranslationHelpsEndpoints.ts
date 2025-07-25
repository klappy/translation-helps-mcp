/**
 * Translation Helps Endpoint Configurations
 */

import { CommonParams, EndpointConfig } from "../EndpointConfig";
import { ResponseShapes } from "../ResponseShapes";

export const FetchTranslationNotesEndpoint: EndpointConfig = {
  name: "fetch-translation-notes",
  path: "/fetch-translation-notes",
  category: "core",
  description: "Fetch translation notes (tN) for a specific scripture reference",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "tsv-parse",
    endpoint: "/api/v1/repos/{owner}/tn/contents/{path}",
  },

  responseShape: ResponseShapes.translationNotes,

  examples: [
    {
      params: { reference: "Genesis 1:1", language: "en" },
      response: {
        notes: [
          {
            reference: "Genesis 1:1",
            title: "General Information",
            content: "Genesis 1:1-2 together are an introduction to the rest of the chapter...",
            links: ["ta:translate-names"],
          },
        ],
        reference: "Genesis 1:1",
        language: "en",
      },
      description: "Translation notes for a verse",
    },
  ],

  performance: {
    targetMs: 400,
    cacheable: true,
    cacheKey: "{language}:tn:{reference}",
  },

  mcp: {
    toolName: "fetchTranslationNotes",
    description: "Fetch translation notes to help understand difficult passages",
  },
};

export const FetchTranslationWordsEndpoint: EndpointConfig = {
  name: "fetch-translation-words",
  path: "/fetch-translation-words",
  category: "core",
  description: "Fetch translation words (tW) articles for important biblical terms",

  params: {
    word: {
      name: "word",
      type: "string",
      required: true,
      description: "The word to look up",
      examples: ["faith", "god", "love", "covenant"],
    },
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "markdown-assemble",
    endpoint: "/api/v1/repos/{owner}/tw/contents/{path}",
  },

  responseShape: ResponseShapes.translationWords,

  examples: [
    {
      params: { word: "faith", language: "en" },
      response: {
        word: "faith",
        definition:
          "# faith, faithful, faithfulness, faithfully\n\n## Definition:\n\nTo have faith in someone...",
        language: "en",
      },
      description: "Definition of faith",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:tw:{word}",
  },

  mcp: {
    toolName: "getTranslationWord",
    description: "Get detailed definition and usage of biblical terms",
  },
};

export const FetchTranslationWordLinksEndpoint: EndpointConfig = {
  name: "fetch-translation-word-links",
  path: "/fetch-translation-word-links",
  category: "core",
  description: "Fetch translation word links (tWL) that map verses to translation words",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "tsv-parse",
    endpoint: "/api/v1/repos/{owner}/twl/contents/{path}",
  },

  responseShape: ResponseShapes.translationWordsLinks,

  examples: [
    {
      params: { reference: "Genesis 1:1", language: "en" },
      response: {
        links: [
          {
            reference: "Genesis 1:1",
            words: ["god", "create", "heaven", "earth"],
          },
        ],
        reference: "Genesis 1:1",
        language: "en",
      },
      description: "Words linked to Genesis 1:1",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:twl:{reference}",
  },

  mcp: {
    toolName: "fetchTranslationWordLinks",
    description: "Get translation words linked to specific verses",
  },
};

export const FetchTranslationQuestionsEndpoint: EndpointConfig = {
  name: "fetch-translation-questions",
  path: "/fetch-translation-questions",
  category: "core",
  description: "Fetch translation questions (tQ) for comprehension checking",

  params: {
    reference: CommonParams.reference,
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "tsv-parse",
    endpoint: "/api/v1/repos/{owner}/tq/contents/{path}",
  },

  responseShape: ResponseShapes.translationQuestions,

  examples: [
    {
      params: { reference: "Genesis 1:1", language: "en" },
      response: {
        questions: [
          {
            reference: "Genesis 1:1",
            question: "What did God create in the beginning?",
            answer: "God created the heavens and the earth.",
          },
        ],
        reference: "Genesis 1:1",
        language: "en",
      },
      description: "Comprehension questions",
    },
  ],

  performance: {
    targetMs: 300,
    cacheable: true,
    cacheKey: "{language}:tq:{reference}",
  },

  mcp: {
    toolName: "fetchTranslationQuestions",
    description: "Get comprehension questions for checking understanding",
  },
};

// Export all translation helps endpoints
export const TranslationHelpsEndpoints = [
  FetchTranslationNotesEndpoint,
  FetchTranslationWordsEndpoint,
  FetchTranslationWordLinksEndpoint,
  FetchTranslationQuestionsEndpoint,
];
