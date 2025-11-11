/**
 * Response Shape Registry
 *
 * Defines consistent response structures for all resource types,
 * ensuring the same resource uses the same shape across all endpoints.
 */

import type { ResponseShape } from "./EndpointConfig.js";

// Core Metadata Shape (used by all responses)
const CORE_METADATA_SHAPE: ResponseShape = {
  dataType: "context",
  structure: {
    required: ["responseTime", "cached", "timestamp"],
    optional: ["cacheExpiresAt", "cacheTtlSeconds", "version", "xrayTrace"],
  },
  performance: {
    maxResponseTime: 50,
    cacheable: false,
    expectedCacheHitRate: 0.8,
  },
};

// Citation Shape (used by resource responses)
const CITATION_SHAPE: ResponseShape = {
  dataType: "context",
  structure: {
    required: ["resource", "organization", "language", "url", "version"],
    optional: ["title", "license", "contributors"],
  },
  performance: {
    maxResponseTime: 10,
    cacheable: false,
    expectedCacheHitRate: 0.95,
  },
};

// Scripture Response Shape
export const SCRIPTURE_SHAPE: ResponseShape = {
  dataType: "scripture",
  structure: {
    required: ["scripture", "language", "organization", "metadata"],
    optional: ["_metadata"],
    nested: {
      scripture: {
        dataType: "scripture",
        structure: {
          required: ["text", "translation", "citation"],
          optional: ["alignment", "usfm"],
          fieldDescriptions: [
            {
              name: "text",
              type: "string",
              description:
                "The scripture text for the requested reference in the specified translation",
              example: "For God so loved the world...",
            },
            {
              name: "translation",
              type: "string",
              description: "Which translation the scripture text comes from",
              example: "ULT v86",
              semantics: { options: ["ULT", "UST", "T4T", "UEB"] },
            },
            {
              name: "usfm",
              type: "string",
              description:
                "USFM formatted version of the scripture text (raw markup)",
              example: "\\c 3\\v 16 For God so loved...",
            },
            {
              name: "alignment",
              type: "object",
              description:
                "Alignment data derived from USFM (\\zaln-s/\\zaln-e groups and \\w word markers). Includes an array of alignment entries and summary metadata.",
              example: {
                words: 3,
                metadata: { totalAlignments: 3, averageConfidence: 0.9 },
              },
            },
          ],
          nested: {
            citation: CITATION_SHAPE,
            alignment: {
              dataType: "scripture",
              structure: {
                required: ["words", "metadata"],
                fieldDescriptions: [
                  {
                    name: "words",
                    type: "array",
                    description:
                      "Array of alignment entries parsed from USFM (\\zaln-s groups with \\w words). Each entry contains targetWord (translated), sourceWord (original, from x-content), attributes (x-strong, x-lemma, x-morph, x-occurrence, x-occurrences, x-content, x-tw, x-note), position (start, end, chapter, verse), type (alignment type), and optionally a derived confidence score.",
                    example: [
                      {
                        targetWord: "loved",
                        sourceWord: "ἠγάπησεν",
                        attributes: {
                          "x-strong": "G25",
                          "x-lemma": "ἀγαπάω",
                          "x-morph": "Gr,VT,,,,VAAI3S,",
                          "x-occurrence": "1",
                          "x-occurrences": "1",
                          "x-content": "ἠγάπησεν",
                        },
                        position: {
                          start: 123,
                          end: 140,
                          chapter: 3,
                          verse: 16,
                        },
                        type: "WORD_LEVEL",
                      },
                    ],
                  },
                  {
                    name: "metadata",
                    type: "object",
                    description:
                      "Summary statistics computed during parsing (not part of USFM markers).",
                    example: {
                      totalAlignments: 110,
                      averageConfidence: 0.92,
                      hasCompleteAlignment: true,
                      parseTime: 12,
                    },
                  },
                ],
                nested: {
                  metadata: {
                    dataType: "context",
                    structure: {
                      required: ["totalAlignments", "averageConfidence"],
                      optional: ["hasCompleteAlignment", "parseTime"],
                    },
                    performance: {
                      maxResponseTime: 5,
                      cacheable: false,
                    },
                  },
                },
              },
              performance: {
                maxResponseTime: 100,
                cacheable: false,
              },
            },
          },
        },
        performance: {
          maxResponseTime: 200,
          cacheable: false,
        },
      },
      metadata: CORE_METADATA_SHAPE,
    },
  },
  performance: {
    maxResponseTime: 300,
    cacheable: false,
    expectedCacheHitRate: 0.85,
  },
};

// Translation Notes Response Shape
export const TRANSLATION_NOTES_SHAPE: ResponseShape = {
  dataType: "translation-notes",
  structure: {
    required: ["verseNotes", "citation", "metadata"],
    optional: ["contextNotes", "_metadata"],
    fieldDescriptions: [
      {
        name: "verseNotes",
        type: "array",
        description: "Primary notes for the requested verse reference",
        example: [],
      },
      {
        name: "contextNotes",
        type: "array",
        description:
          "Broader context notes (front/chapter intros) when included",
        example: [],
      },
      {
        name: "citation",
        type: "object",
        description:
          "Resource citation metadata (resource, language, organization, version, url)",
        example: {
          resource: "tn",
          language: "en",
          organization: "unfoldingWord",
          version: "v86",
        },
      },
      {
        name: "metadata",
        type: "object",
        description:
          "Standard response metadata (responseTime, cached, timestamp)",
        example: {
          responseTime: 85,
          cached: true,
          timestamp: "2025-01-01T00:00:00Z",
        },
      },
    ],
    nested: {
      citation: CITATION_SHAPE,
      metadata: {
        dataType: "context",
        structure: {
          required: [
            "sourceNotesCount",
            "verseNotesCount",
            "cached",
            "responseTime",
          ],
          optional: ["contextNotesCount", "timestamp"],
        },
        performance: {
          maxResponseTime: 10,
          cacheable: false,
        },
      },
    },
    arrayItems: {
      dataType: "translation-notes",
      structure: {
        required: ["id", "reference", "note"],
        optional: [
          "quote",
          "occurrence",
          "occurrences",
          "markdown",
          "supportReference",
        ],
        // NEW: Field descriptions for self-discovery
        fieldDescriptions: [
          {
            name: "id",
            type: "string",
            description: "Unique identifier for this translation note",
            example: "tn-jhn-3-16-01",
          },
          {
            name: "reference",
            type: "string",
            description: "The Bible verse reference this note applies to",
            example: "John 3:16",
          },
          {
            name: "note",
            type: "string",
            description: "The explanatory text or commentary for this passage",
            example: "This phrase means that God loved the world deeply...",
          },
          {
            name: "quote",
            type: "string",
            description:
              "The Greek or Hebrew text from the original language that this note explains",
            example: "οὕτως γὰρ ἠγάπησεν ὁ Θεὸς",
            semantics: {
              language: "Greek",
              isOriginalText: true,
            },
          },
          {
            name: "occurrence",
            type: "number",
            description:
              "Which occurrence of this phrase in the verse (if it appears multiple times)",
            example: 1,
          },
          {
            name: "occurrences",
            type: "number",
            description:
              "Total number of times this phrase appears in the verse",
            example: 1,
          },
          {
            name: "supportReference",
            type: "string",
            description:
              "Additional biblical references that support or relate to this note",
            example: "Romans 5:8",
          },
          {
            name: "markdown",
            type: "string",
            description: "Original markdown content from the source file",
            example:
              "## Quote\n\nοὕτως γὰρ ἠγάπησεν ὁ Θεὸς\n\n## Note\n\nThis phrase means...",
          },
        ],
      },
      performance: {
        maxResponseTime: 5,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 250,
    cacheable: false,
    expectedCacheHitRate: 0.8,
  },
};

// Translation Words Response Shape
export const TRANSLATION_WORDS_SHAPE: ResponseShape = {
  dataType: "translation-words",
  structure: {
    required: ["translationWords", "citation", "metadata"],
    optional: ["_metadata"],
    fieldDescriptions: [
      {
        name: "translationWords",
        type: "array",
        description:
          "List of translation word articles (structured from markdown)",
        example: [],
      },
      {
        name: "citation",
        type: "object",
        description:
          "Resource citation metadata (resource, language, organization, version, url)",
        example: {
          resource: "tw",
          language: "en",
          organization: "unfoldingWord",
          version: "v14",
        },
      },
      {
        name: "metadata",
        type: "object",
        description:
          "Standard response metadata (responseTime, cached, timestamp)",
        example: {
          responseTime: 120,
          cached: false,
          timestamp: "2025-01-01T00:00:00Z",
        },
      },
    ],
    nested: {
      citation: CITATION_SHAPE,
      metadata: {
        dataType: "context",
        structure: {
          required: ["responseTime", "cached", "timestamp", "wordsFound"],
          optional: ["category"],
        },
        performance: {
          maxResponseTime: 10,
          cacheable: false,
        },
      },
    },
    arrayItems: {
      dataType: "translation-words",
      structure: {
        required: ["id", "word", "definition"],
        optional: ["translationHelps", "examples", "related"],
        // Field descriptions for self-discovery
        fieldDescriptions: [
          {
            name: "id",
            type: "string",
            description: "Unique identifier for this translation word",
            example: "tw-love",
          },
          {
            name: "word",
            type: "string",
            description: "The biblical term or concept being defined",
            example: "love",
          },
          {
            name: "definition",
            type: "string",
            description: "The definition and explanation of this biblical term",
            example: "Love is a deep, selfless care for others...",
          },
          {
            name: "translationHelps",
            type: "string",
            description:
              "Guidance on how to translate this term in different contexts",
            example:
              "Use 'love' for God's love, 'care for' for human relationships...",
          },
          {
            name: "examples",
            type: "array",
            description: "Biblical examples of how this term is used",
            example: ["John 3:16", "1 Corinthians 13:4-7"],
          },
          {
            name: "related",
            type: "array",
            description: "Related terms or concepts",
            example: ["grace", "mercy", "kindness"],
          },
        ],
      },
      performance: {
        maxResponseTime: 20,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: false,
    expectedCacheHitRate: 0.85,
  },
};

// Translation Questions Response Shape
export const TRANSLATION_QUESTIONS_SHAPE: ResponseShape = {
  dataType: "translation-questions",
  structure: {
    required: ["questions", "citation", "metadata"],
    optional: ["_metadata"],
    fieldDescriptions: [
      {
        name: "questions",
        type: "array",
        description:
          "Collection of translation questions for the requested reference",
        example: [],
      },
      {
        name: "citation",
        type: "object",
        description:
          "Resource citation metadata (resource, language, organization, version, url)",
        example: {
          resource: "tq",
          language: "en",
          organization: "unfoldingWord",
          version: "v86",
        },
      },
      {
        name: "metadata",
        type: "object",
        description:
          "Standard response metadata (responseTime, cached, timestamp)",
        example: {
          responseTime: 120,
          cached: false,
          timestamp: "2025-01-01T00:00:00Z",
        },
      },
    ],
    nested: {
      citation: CITATION_SHAPE,
      metadata: CORE_METADATA_SHAPE,
    },
    arrayItems: {
      dataType: "translation-questions",
      structure: {
        required: ["id", "reference", "question"],
        optional: ["answer", "difficulty", "category"],
        // Field descriptions for self-discovery
        fieldDescriptions: [
          {
            name: "id",
            type: "string",
            description: "Unique identifier for this translation question",
            example: "tq-jhn-3-16-01",
          },
          {
            name: "reference",
            type: "string",
            description: "The Bible verse reference this question applies to",
            example: "John 3:16",
          },
          {
            name: "question",
            type: "string",
            description: "The comprehension question about this passage",
            example: "What does it mean that God 'gave' his only Son?",
          },
          {
            name: "answer",
            type: "string",
            description: "The answer or explanation for this question",
            example: "This means that God willingly sacrificed his Son...",
          },
          {
            name: "difficulty",
            type: "string",
            description: "Difficulty level of this question",
            example: "beginner",
            semantics: {
              options: ["beginner", "intermediate", "advanced"],
            },
          },
          {
            name: "category",
            type: "string",
            description: "Category or topic of this question",
            example: "theology",
            semantics: {
              options: ["theology", "grammar", "culture", "translation"],
            },
          },
        ],
      },
      performance: {
        maxResponseTime: 10,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: false,
    expectedCacheHitRate: 0.75,
  },
};

// Translation Academy Response Shape
export const TRANSLATION_ACADEMY_SHAPE: ResponseShape = {
  dataType: "translation-academy",
  structure: {
    required: ["modules", "language", "resourceType", "metadata"],
    optional: ["tableOfContents", "_metadata"],
    nested: {
      metadata: {
        dataType: "context",
        structure: {
          required: ["totalModules", "categories", "responseTime", "cached"],
          optional: ["version", "timestamp"],
        },
        performance: {
          maxResponseTime: 15,
          cacheable: false,
        },
      },
    },
    arrayItems: {
      dataType: "translation-academy",
      structure: {
        required: [
          "id",
          "title",
          "description",
          "category",
          "difficulty",
          "estimatedTime",
          "content",
        ],
        optional: ["prerequisites", "relatedModules", "exercises"],
        fieldDescriptions: [
          {
            name: "id",
            type: "string",
            description: "Unique identifier for the module",
            example: "ta-intro-translation-notes",
          },
          {
            name: "title",
            type: "string",
            description: "Module title",
            example: "How to Use Translation Notes",
          },
          {
            name: "description",
            type: "string",
            description: "Brief summary of the module",
            example:
              "Learn how to effectively use translation notes in your workflow.",
          },
          {
            name: "category",
            type: "string",
            description: "Module category",
            example: "translation-principles",
          },
          {
            name: "difficulty",
            type: "string",
            description: "Skill level required",
            example: "beginner",
            semantics: { options: ["beginner", "intermediate", "advanced"] },
          },
          {
            name: "estimatedTime",
            type: "string",
            description: "Estimated time to complete the module",
            example: "20 minutes",
          },
          {
            name: "content",
            type: "string",
            description: "Module content in Markdown format",
            example: "## Overview\n\nThis module explains...",
          },
          {
            name: "prerequisites",
            type: "array",
            description: "List of modules recommended before this one",
            example: ["ta-intro-translation-words"],
          },
          {
            name: "relatedModules",
            type: "array",
            description: "Other related modules",
            example: ["ta-translation-ambiguity"],
          },
          {
            name: "exercises",
            type: "array",
            description: "Practice exercises included in the module",
            example: ["Identify translation challenges in John 3:16"],
          },
        ],
      },
      performance: {
        maxResponseTime: 50,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 400,
    cacheable: false,
    expectedCacheHitRate: 0.9,
  },
};

// Translation Word Links Response Shape
export const TRANSLATION_WORD_LINKS_SHAPE: ResponseShape = {
  dataType: "translation-word-links",
  structure: {
    required: ["links", "reference", "metadata"],
    optional: ["citation", "_metadata"],
    nested: {
      citation: CITATION_SHAPE,
      metadata: CORE_METADATA_SHAPE,
    },
    arrayItems: {
      dataType: "translation-word-links",
      structure: {
        required: ["term", "category", "path", "rcLink", "reference"],
        optional: ["quote", "occurrence", "strongsId", "position"],
        fieldDescriptions: [
          {
            name: "category",
            type: "string",
            description: "Translation word category (kt, names, or other)",
            example: "kt",
          },
          {
            name: "term",
            type: "string",
            description:
              "Translation word term identifier. Use this with the translation_word tool's term parameter.",
            example: "love",
          },
          {
            name: "path",
            type: "string",
            description:
              "Full repository path to the word article markdown file",
            example: "bible/kt/love.md",
          },
          {
            name: "rcLink",
            type: "string",
            description: "Full RC link to the translation word article",
            example: "rc://*/tw/dict/bible/kt/love",
          },
          {
            name: "reference",
            type: "string",
            description: "The verse reference that contains this word",
            example: "John 3:16",
          },
          {
            name: "quote",
            type: "string",
            description: "The quoted text from the verse",
            example: "loved",
          },
          {
            name: "occurrence",
            type: "number",
            description: "Which occurrence of this word in the verse",
            example: 1,
          },
          {
            name: "strongsId",
            type: "string",
            description: "Strong's concordance number (if available)",
            example: "G25",
          },
          {
            name: "position",
            type: "object|null",
            description: "Position data in the verse (currently null)",
            example: null,
          },
        ],
      },
      performance: {
        maxResponseTime: 5,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 150,
    cacheable: false,
    expectedCacheHitRate: 0.8,
  },
};

// Languages Response Shape (Discovery)
export const LANGUAGES_SHAPE: ResponseShape = {
  dataType: "languages",
  structure: {
    required: ["languages", "metadata"],
    optional: ["_metadata"],
    nested: {
      metadata: {
        dataType: "context",
        structure: {
          required: [
            "responseTime",
            "cached",
            "timestamp",
            "languagesFound",
            "organization",
          ],
          optional: ["alternateNamesIncluded"],
        },
        performance: {
          maxResponseTime: 10,
          cacheable: false,
        },
      },
    },
    arrayItems: {
      dataType: "languages",
      structure: {
        required: ["code", "name", "direction"],
        optional: ["alternateNames", "region", "nativeName"],
        fieldDescriptions: [
          {
            name: "code",
            type: "string",
            description: "ISO language code",
            example: "en",
          },
          {
            name: "name",
            type: "string",
            description: "English name of the language",
            example: "English",
          },
          {
            name: "direction",
            type: "string",
            description: "Text direction for the language",
            example: "ltr",
            semantics: { options: ["ltr", "rtl"] },
          },
          {
            name: "alternateNames",
            type: "array",
            description: "Other names this language is known by",
            example: ["Modern English"],
          },
          {
            name: "region",
            type: "string",
            description: "Primary geographic region for this language",
            example: "Worldwide",
          },
          {
            name: "nativeName",
            type: "string",
            description: "Name of the language written in the language itself",
            example: "English",
          },
        ],
      },
      performance: {
        maxResponseTime: 2,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 100,
    cacheable: false,
    expectedCacheHitRate: 0.95,
  },
};

// Resources Response Shape (Discovery)
export const RESOURCES_SHAPE: ResponseShape = {
  dataType: "resources",
  structure: {
    required: ["resources", "metadata"],
    optional: ["_metadata", "filters"],
    nested: {
      metadata: {
        dataType: "context",
        structure: {
          required: ["responseTime", "cached", "timestamp", "resourcesFound"],
          optional: ["language", "organization", "resourceType"],
        },
        performance: {
          maxResponseTime: 15,
          cacheable: false,
        },
      },
    },
    arrayItems: {
      dataType: "resources",
      structure: {
        required: ["name", "type", "language", "organization"],
        optional: ["description", "version", "lastUpdated", "size"],
        fieldDescriptions: [
          {
            name: "name",
            type: "string",
            description: "Display name of the resource",
            example: "English ULT Bible",
          },
          {
            name: "type",
            type: "string",
            description: "Kind of resource",
            example: "Bible",
            semantics: {
              options: [
                "Bible",
                "TSV Translation Notes",
                "Translation Words",
                "Translation Questions",
                "Translation Academy",
              ],
            },
          },
          {
            name: "language",
            type: "string",
            description: "Language code of the resource",
            example: "en",
          },
          {
            name: "organization",
            type: "string",
            description: "Owning organization for the resource",
            example: "unfoldingWord",
          },
          {
            name: "description",
            type: "string",
            description: "Short description of the resource",
            example: "unfoldingWord Literal Text (ULT) English Bible",
          },
          {
            name: "version",
            type: "string",
            description: "Version tag for the resource",
            example: "v86",
          },
          {
            name: "lastUpdated",
            type: "string",
            description: "ISO timestamp when the resource was last updated",
            example: "2024-07-12T10:15:00Z",
          },
          {
            name: "size",
            type: "number",
            description: "Approximate size of the resource package in bytes",
            example: 1048576,
          },
        ],
      },
      performance: {
        maxResponseTime: 5,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: false,
    expectedCacheHitRate: 0.85,
  },
};

// References Response Shape (Utility)
export const REFERENCES_SHAPE: ResponseShape = {
  dataType: "references",
  structure: {
    required: ["references", "metadata"],
    optional: ["_metadata"],
    nested: {
      metadata: CORE_METADATA_SHAPE,
    },
    arrayItems: {
      dataType: "references",
      structure: {
        required: ["reference", "book", "chapter", "verse"],
        optional: ["startVerse", "endVerse", "context"],
        fieldDescriptions: [
          {
            name: "reference",
            type: "string",
            description: "Normalized reference string",
            example: "John 3:16",
          },
          {
            name: "book",
            type: "string",
            description: "Book code or name",
            example: "John",
          },
          {
            name: "chapter",
            type: "number",
            description: "Chapter number",
            example: 3,
          },
          {
            name: "verse",
            type: "number",
            description: "Verse number",
            example: 16,
          },
          {
            name: "startVerse",
            type: "number",
            description: "Start verse for ranges",
            example: 16,
          },
          {
            name: "endVerse",
            type: "number",
            description: "End verse for ranges",
            example: 18,
          },
          {
            name: "context",
            type: "string",
            description: "Free-form context about how this reference is used",
            example: "Primary study verse",
          },
        ],
      },
      performance: {
        maxResponseTime: 2,
        cacheable: false,
      },
    },
  },
  performance: {
    maxResponseTime: 50,
    cacheable: false,
    expectedCacheHitRate: 0.9,
  },
};

// Context Response Shape (Combined Resources)
export const CONTEXT_SHAPE: ResponseShape = {
  dataType: "context",
  structure: {
    required: ["reference", "resources", "metadata"],
    optional: ["_metadata", "summary"],
    nested: {
      resources: {
        dataType: "context",
        structure: {
          required: [],
          optional: [
            "scripture",
            "translationNotes",
            "translationWords",
            "translationQuestions",
          ],
          nested: {
            scripture: SCRIPTURE_SHAPE,
            translationNotes: TRANSLATION_NOTES_SHAPE,
            translationWords: TRANSLATION_WORDS_SHAPE,
            translationQuestions: TRANSLATION_QUESTIONS_SHAPE,
          },
        },
        performance: {
          maxResponseTime: 500,
          cacheable: false,
        },
      },
      metadata: {
        dataType: "context",
        structure: {
          required: [
            "responseTime",
            "cached",
            "timestamp",
            "resourcesRequested",
            "resourcesFound",
          ],
          optional: ["aggregationTime", "cacheHitRate"],
        },
        performance: {
          maxResponseTime: 20,
          cacheable: false,
        },
      },
    },
  },
  performance: {
    maxResponseTime: 600,
    cacheable: false,
    expectedCacheHitRate: 0.7,
  },
};

// Health Response Shape (System)
export const HEALTH_SHAPE: ResponseShape = {
  dataType: "health",
  structure: {
    required: ["status", "endpoints", "timestamp"],
    optional: ["version", "uptime", "memory", "performance", "_metadata"],
    nested: {
      performance: {
        dataType: "health",
        structure: {
          required: ["averageResponseTime", "cacheHitRate"],
          optional: ["requestsPerMinute", "errorRate"],
        },
        performance: {
          maxResponseTime: 5,
          cacheable: false,
        },
      },
    },
  },
  performance: {
    maxResponseTime: 30,
    cacheable: false,
    expectedCacheHitRate: 0,
  },
};

// Response Shape Registry
export const RESPONSE_SHAPES = {
  scripture: SCRIPTURE_SHAPE,
  "translation-notes": TRANSLATION_NOTES_SHAPE,
  "translation-words": TRANSLATION_WORDS_SHAPE,
  "translation-questions": TRANSLATION_QUESTIONS_SHAPE,
  "translation-academy": TRANSLATION_ACADEMY_SHAPE,
  "translation-word-links": TRANSLATION_WORD_LINKS_SHAPE,
  languages: LANGUAGES_SHAPE,
  resources: RESOURCES_SHAPE,
  references: REFERENCES_SHAPE,
  context: CONTEXT_SHAPE,
  health: HEALTH_SHAPE,
} as const;

// Utility function to get response shape by data type
export function getResponseShape(
  dataType: keyof typeof RESPONSE_SHAPES,
): ResponseShape {
  const shape = RESPONSE_SHAPES[dataType];
  if (!shape) {
    throw new Error(`Unknown response shape: ${dataType}`);
  }
  return shape;
}

// Utility function to validate response against shape
export function validateResponseShape(
  response: unknown,
  shape: ResponseShape,
  path = "root",
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!response || typeof response !== "object") {
    return { valid: false, errors: [`${path}: Response must be an object`] };
  }

  const obj = response as Record<string, unknown>;

  // Check required fields
  for (const field of shape.structure.required) {
    if (!(field in obj)) {
      errors.push(`${path}: Missing required field '${field}'`);
    }
  }

  // Validate nested objects if present
  if (shape.structure.nested) {
    for (const [field, nestedShape] of Object.entries(shape.structure.nested)) {
      if (field in obj && obj[field] !== null && obj[field] !== undefined) {
        const nestedResult = validateResponseShape(
          obj[field],
          nestedShape,
          `${path}.${field}`,
        );
        errors.push(...nestedResult.errors);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export type ResponseShapeType = keyof typeof RESPONSE_SHAPES;
