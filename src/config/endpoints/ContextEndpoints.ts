/**
 * Context Endpoint Configurations
 * 
 * Defines configurations for combined resource fetching endpoints.
 */

import type { EndpointConfig } from '../EndpointConfig';

/**
 * Get Context endpoint
 */
export const GetContextEndpoint: EndpointConfig = {
  name: 'get-context',
  path: '/api/get-context',
  category: 'core',
  description: 'Get comprehensive context for a Bible reference including notes, words, and scripture',
  params: {
    reference: {
      type: 'string',
      required: true,
      description: 'Bible reference',
      validation: {
        pattern: '^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$'
      }
    },
    language: {
      type: 'string',
      required: false,
      default: 'en',
      description: 'Language code'
    },
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    },
    includeRawData: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Include raw USFM and TSV data'
    },
    maxTokens: {
      type: 'number',
      required: false,
      description: 'Maximum tokens for context (for AI applications)'
    },
    deepAnalysis: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Perform deep analysis of surrounding context'
    }
  },
  dataSource: {
    type: 'computed'
  },
  responseShape: {
    type: 'context',
    fields: {
      reference: {
        type: 'string',
        description: 'The reference being analyzed'
      },
      scripture: {
        type: 'object',
        description: 'Scripture text for the reference'
      },
      notes: {
        type: 'array',
        description: 'Translation notes for the reference'
      },
      words: {
        type: 'array',
        description: 'Translation words linked to the reference'
      },
      questions: {
        type: 'array',
        description: 'Comprehension questions',
        optional: true
      },
      bookIntro: {
        type: 'object',
        description: 'Book introduction',
        optional: true
      },
      chapterIntro: {
        type: 'object',
        description: 'Chapter introduction',
        optional: true
      },
      metadata: {
        type: 'object',
        description: 'Analysis metadata'
      }
    }
  },
  examples: [
    {
      params: { reference: 'John 3:16' },
      response: {
        reference: 'John 3:16',
        scripture: {
          ult: 'For God so loved the world...',
          ust: 'God loved the people of the world so much...'
        },
        notes: [
          {
            quote: 'For God so loved',
            note: 'This emphasizes the great love of God...'
          }
        ],
        words: [
          {
            term: 'love',
            definition: 'To love is to act consistently...'
          },
          {
            term: 'believe',
            definition: 'To believe is to trust...'
          }
        ],
        metadata: {
          notesFound: 1,
          wordsFound: 2,
          tokenEstimate: 1500
        }
      }
    }
  ],
  performance: {
    expectedMs: 800,
    cacheStrategy: 'moderate'
  }
};

/**
 * Get Words for Reference endpoint
 */
export const GetWordsForReferenceEndpoint: EndpointConfig = {
  name: 'get-words-for-reference',
  path: '/api/get-words-for-reference',
  category: 'core',
  description: 'Get all translation word articles for words in a verse',
  params: {
    reference: {
      type: 'string',
      required: true,
      description: 'Bible reference',
      validation: {
        pattern: '^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$'
      }
    },
    language: {
      type: 'string',
      required: false,
      default: 'en',
      description: 'Language code'
    },
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    }
  },
  dataSource: {
    type: 'computed'
  },
  responseShape: {
    type: 'words',
    fields: {
      words: {
        type: 'array',
        description: 'Array of translation word articles'
      },
      reference: {
        type: 'string',
        description: 'The reference'
      },
      language: {
        type: 'string',
        description: 'Language code'
      },
      totalWords: {
        type: 'number',
        description: 'Total number of words found'
      }
    }
  },
  examples: [
    {
      params: { reference: 'John 3:16' },
      response: {
        words: [
          {
            term: 'love',
            title: 'Love',
            definition: 'To love is to act consistently...',
            occurrence: 1
          },
          {
            term: 'believe',
            title: 'Believe',
            definition: 'To believe is to trust...',
            occurrence: 1
          }
        ],
        reference: 'John 3:16',
        language: 'en',
        totalWords: 2
      }
    }
  ],
  performance: {
    expectedMs: 600,
    cacheStrategy: 'moderate'
  }
};

/**
 * Fetch Resources endpoint (combined fetching)
 */
export const FetchResourcesEndpoint: EndpointConfig = {
  name: 'fetch-resources',
  path: '/api/fetch-resources',
  category: 'core',
  description: 'Fetch multiple resource types in a single request',
  params: {
    reference: {
      type: 'string',
      required: true,
      description: 'Bible reference'
    },
    language: {
      type: 'string',
      required: false,
      default: 'en',
      description: 'Language code'
    },
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    },
    resources: {
      type: 'array',
      required: false,
      default: ['scripture', 'notes', 'questions', 'words'],
      description: 'Resource types to fetch'
    }
  },
  dataSource: {
    type: 'computed'
  },
  responseShape: {
    type: 'context',
    fields: {
      reference: {
        type: 'string',
        description: 'The reference'
      },
      scripture: {
        type: 'object',
        description: 'Scripture text',
        optional: true
      },
      translationNotes: {
        type: 'array',
        description: 'Translation notes',
        optional: true
      },
      translationQuestions: {
        type: 'array',
        description: 'Comprehension questions',
        optional: true
      },
      translationWords: {
        type: 'array',
        description: 'Translation words',
        optional: true
      },
      metadata: {
        type: 'object',
        description: 'Request metadata'
      }
    }
  },
  examples: [
    {
      params: { 
        reference: 'John 3:16',
        resources: ['scripture', 'notes', 'words']
      },
      response: {
        reference: 'John 3:16',
        scripture: {
          text: 'For God so loved the world...',
          version: 'ult'
        },
        translationNotes: [
          {
            quote: 'For God so loved',
            note: 'This emphasizes...'
          }
        ],
        translationWords: [
          {
            term: 'love',
            definition: 'To love is...'
          }
        ],
        metadata: {
          resourcesRequested: 3,
          resourcesFound: 3,
          responseTime: 750
        }
      }
    }
  ],
  performance: {
    expectedMs: 1000,
    cacheStrategy: 'moderate'
  }
};

/**
 * All context endpoints
 */
export const ContextEndpoints = [
  GetContextEndpoint,
  GetWordsForReferenceEndpoint,
  FetchResourcesEndpoint
];