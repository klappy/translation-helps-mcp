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
    cacheable: true,
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
    cacheable: true,
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
          nested: {
            citation: CITATION_SHAPE,
            alignment: {
              dataType: "scripture",
              structure: {
                required: ["words", "metadata"],
                nested: {
                  metadata: {
                    dataType: "context",
                    structure: {
                      required: ["totalAlignments", "averageConfidence"],
                      optional: ["coverage"],
                    },
                    performance: {
                      maxResponseTime: 5,
                      cacheable: true,
                    },
                  },
                },
              },
              performance: {
                maxResponseTime: 100,
                cacheable: true,
              },
            },
          },
        },
        performance: {
          maxResponseTime: 200,
          cacheable: true,
        },
      },
      metadata: CORE_METADATA_SHAPE,
    },
  },
  performance: {
    maxResponseTime: 300,
    cacheable: true,
    expectedCacheHitRate: 0.85,
  },
};

// Translation Notes Response Shape
export const TRANSLATION_NOTES_SHAPE: ResponseShape = {
  dataType: "translation-notes",
  structure: {
    required: ["verseNotes", "citation", "metadata"],
    optional: ["contextNotes", "_metadata"],
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
          cacheable: true,
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
      },
      performance: {
        maxResponseTime: 5,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 250,
    cacheable: true,
    expectedCacheHitRate: 0.8,
  },
};

// Translation Words Response Shape
export const TRANSLATION_WORDS_SHAPE: ResponseShape = {
  dataType: "translation-words",
  structure: {
    required: ["translationWords", "citation", "metadata"],
    optional: ["_metadata"],
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
          cacheable: true,
        },
      },
    },
    arrayItems: {
      dataType: "translation-words",
      structure: {
        required: ["id", "word", "definition"],
        optional: ["translationHelps", "examples", "related"],
      },
      performance: {
        maxResponseTime: 20,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: true,
    expectedCacheHitRate: 0.85,
  },
};

// Translation Questions Response Shape
export const TRANSLATION_QUESTIONS_SHAPE: ResponseShape = {
  dataType: "translation-questions",
  structure: {
    required: ["questions", "citation", "metadata"],
    optional: ["_metadata"],
    nested: {
      citation: CITATION_SHAPE,
      metadata: CORE_METADATA_SHAPE,
    },
    arrayItems: {
      dataType: "translation-questions",
      structure: {
        required: ["id", "reference", "question"],
        optional: ["answer", "difficulty", "category"],
      },
      performance: {
        maxResponseTime: 10,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: true,
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
          cacheable: true,
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
      },
      performance: {
        maxResponseTime: 50,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 400,
    cacheable: true,
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
        required: ["word", "reference", "strong"],
        optional: ["originalWord", "occurrence", "occurrences"],
      },
      performance: {
        maxResponseTime: 5,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 150,
    cacheable: true,
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
          cacheable: true,
        },
      },
    },
    arrayItems: {
      dataType: "languages",
      structure: {
        required: ["code", "name", "direction"],
        optional: ["alternateNames", "region", "nativeName"],
      },
      performance: {
        maxResponseTime: 2,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 100,
    cacheable: true,
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
          cacheable: true,
        },
      },
    },
    arrayItems: {
      dataType: "resources",
      structure: {
        required: ["name", "type", "language", "organization"],
        optional: ["description", "version", "lastUpdated", "size"],
      },
      performance: {
        maxResponseTime: 5,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 200,
    cacheable: true,
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
      },
      performance: {
        maxResponseTime: 2,
        cacheable: true,
      },
    },
  },
  performance: {
    maxResponseTime: 50,
    cacheable: true,
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
          cacheable: true,
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
          cacheable: true,
        },
      },
    },
  },
  performance: {
    maxResponseTime: 600,
    cacheable: true,
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
