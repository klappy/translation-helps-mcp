/**
 * Response Shape Registry
 * 
 * Defines consistent response shapes for each resource type
 * to ensure uniformity across all endpoints.
 */

import type { ResourceShape } from './EndpointConfig';

/**
 * Scripture response shape
 */
export const ScriptureShape: ResourceShape = {
  type: 'scripture',
  fields: {
    text: {
      type: 'string',
      description: 'The scripture text content'
    },
    reference: {
      type: 'string',
      description: 'The scripture reference (e.g., "John 3:16")'
    },
    version: {
      type: 'string',
      description: 'The translation version (e.g., "ult", "ust")'
    },
    language: {
      type: 'string',
      description: 'Language code (e.g., "en")'
    },
    rawUsfm: {
      type: 'string',
      description: 'Raw USFM content if requested',
      optional: true
    }
  }
};

/**
 * Translation Notes response shape
 */
export const TranslationNotesShape: ResourceShape = {
  type: 'notes',
  fields: {
    notes: {
      type: 'array',
      description: 'Array of translation notes'
    },
    reference: {
      type: 'string',
      description: 'The reference these notes apply to'
    },
    language: {
      type: 'string',
      description: 'Language code'
    },
    bookIntro: {
      type: 'object',
      description: 'Book introduction content',
      optional: true
    },
    chapterIntro: {
      type: 'object',
      description: 'Chapter introduction content',
      optional: true
    }
  }
};

/**
 * Translation Words response shape
 */
export const TranslationWordsShape: ResourceShape = {
  type: 'words',
  fields: {
    term: {
      type: 'string',
      description: 'The word or term being defined'
    },
    definition: {
      type: 'string',
      description: 'The full definition/article content'
    },
    title: {
      type: 'string',
      description: 'Article title'
    },
    language: {
      type: 'string',
      description: 'Language code'
    },
    relatedTerms: {
      type: 'array',
      description: 'Related translation words',
      optional: true
    }
  }
};

/**
 * Translation Word Links response shape
 */
export const TranslationWordLinksShape: ResourceShape = {
  type: 'links',
  fields: {
    wordLinks: {
      type: 'array',
      description: 'Array of verse-to-word mappings'
    },
    reference: {
      type: 'string',
      description: 'The reference these links apply to'
    },
    language: {
      type: 'string',
      description: 'Language code'
    },
    totalLinks: {
      type: 'number',
      description: 'Total number of word links found'
    }
  }
};

/**
 * Discovery endpoints response shape
 */
export const DiscoveryShape: ResourceShape = {
  type: 'discovery',
  fields: {
    items: {
      type: 'array',
      description: 'Array of discovered items (languages, books, etc.)'
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata about the discovery results'
    },
    totalCount: {
      type: 'number',
      description: 'Total number of items found'
    },
    filter: {
      type: 'object',
      description: 'Applied filters',
      optional: true
    }
  }
};

/**
 * Registry of all response shapes
 */
export const ResponseShapeRegistry = {
  scripture: ScriptureShape,
  notes: TranslationNotesShape,
  words: TranslationWordsShape,
  links: TranslationWordLinksShape,
  discovery: DiscoveryShape,
  // Additional shapes can be added here
} as const;

/**
 * Get response shape by type
 */
export function getResponseShape(type: string): ResourceShape | undefined {
  return ResponseShapeRegistry[type as keyof typeof ResponseShapeRegistry];
}