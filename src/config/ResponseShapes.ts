/**
 * Response Shapes Registry
 *
 * Defines consistent response shapes for each resource type
 * to ensure the same resource always returns the same structure
 */

import { ResourceShape } from "./EndpointConfig";

export const ResponseShapes: Record<string, ResourceShape> = {
  scripture: {
    type: "scripture",
    fields: [
      {
        name: "text",
        type: "string",
        description: "Scripture text (USFM converted to plain text)",
      },
      { name: "reference", type: "string", description: "Normalized scripture reference" },
      { name: "version", type: "string", description: "Translation version (ult/ust)" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      text: "In the beginning, God created the heavens and the earth.",
      reference: "Genesis 1:1",
      version: "ult",
      language: "en",
    },
  },

  translationNotes: {
    type: "translation-notes",
    fields: [
      { name: "notes", type: "array", description: "Array of translation notes" },
      { name: "reference", type: "string", description: "Scripture reference" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      notes: [
        {
          reference: "Genesis 1:1",
          title: "General Information",
          content: "This verse introduces the entire book of Genesis.",
          links: ["ta:translate-names"],
        },
      ],
      reference: "Genesis 1:1",
      language: "en",
    },
  },

  translationWords: {
    type: "translation-words",
    fields: [
      { name: "word", type: "string", description: "The translation word" },
      {
        name: "definition",
        type: "string",
        description: "Full article content (title + parts assembled)",
      },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      word: "faith",
      definition:
        '# faith, faithful, faithfulness, faithfully\n\n## Definition:\n\nTo have "faith" in someone is to believe...',
      language: "en",
    },
  },

  translationWordsLinks: {
    type: "translation-words-links",
    fields: [
      { name: "links", type: "array", description: "Array of verse-to-word mappings" },
      { name: "reference", type: "string", description: "Scripture reference" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      links: [
        {
          reference: "Genesis 1:1",
          words: ["god", "create", "heaven", "earth"],
        },
      ],
      reference: "Genesis 1:1",
      language: "en",
    },
  },

  translationQuestions: {
    type: "translation-questions",
    fields: [
      { name: "questions", type: "array", description: "Array of comprehension questions" },
      { name: "reference", type: "string", description: "Scripture reference" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
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
  },

  translationAcademy: {
    type: "translation-academy",
    fields: [
      { name: "title", type: "string", description: "Article title" },
      { name: "content", type: "string", description: "Article content in markdown" },
      { name: "slug", type: "string", description: "Article identifier/slug" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      title: "Translate Names",
      content:
        "# Translate Names\n\n## Description\n\nHow to translate names of people and places...",
      slug: "translate-names",
      language: "en",
    },
  },

  discovery: {
    type: "discovery",
    fields: [
      { name: "items", type: "array", description: "List of discovered items" },
      { name: "total", type: "number", description: "Total count of items" },
      { name: "metadata", type: "object", description: "Additional metadata" },
    ],
    example: {
      items: [
        { code: "en", name: "English", nativeName: "English" },
        { code: "es", name: "Spanish", nativeName: "Español" },
      ],
      total: 2,
      metadata: {
        source: "dcs",
        lastUpdated: "2025-01-01",
      },
    },
  },

  context: {
    type: "context",
    fields: [
      { name: "scripture", type: "object", description: "Scripture text" },
      { name: "notes", type: "array", description: "Translation notes" },
      { name: "words", type: "array", description: "Translation words for reference" },
      { name: "questions", type: "array", description: "Translation questions" },
      { name: "reference", type: "string", description: "Scripture reference" },
      { name: "language", type: "string", description: "Language code" },
    ],
    example: {
      scripture: {
        text: "In the beginning, God created the heavens and the earth.",
        version: "ult",
      },
      notes: [
        {
          title: "General Information",
          content: "This verse introduces the entire book of Genesis.",
        },
      ],
      words: [
        { word: "God", definition: "..." },
        { word: "create", definition: "..." },
      ],
      questions: [
        {
          question: "What did God create?",
          answer: "The heavens and the earth.",
        },
      ],
      reference: "Genesis 1:1",
      language: "en",
    },
  },
};
