/**
 * Translation Academy Endpoint Configurations
 * 
 * Defines configurations for Translation Academy articles
 * with table of contents support.
 */

import type { EndpointConfig } from '../EndpointConfig';

/**
 * Fetch Translation Academy article endpoint
 */
export const FetchTranslationAcademyEndpoint: EndpointConfig = {
  name: 'fetch-translation-academy',
  path: '/api/fetch-translation-academy',
  category: 'core',
  description: 'Fetch Translation Academy article content',
  params: {
    articleId: {
      type: 'string',
      required: true,
      description: 'Article identifier (e.g., "translate/figs-metaphor")'
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
    type: 'dcs',
    resource: 'ta',
    transformation: 'markdown-assemble'
  },
  responseShape: {
    type: 'academy',
    fields: {
      articleId: {
        type: 'string',
        description: 'Article identifier'
      },
      title: {
        type: 'string',
        description: 'Article title'
      },
      content: {
        type: 'string',
        description: 'Article content in markdown'
      },
      category: {
        type: 'string',
        description: 'Article category'
      },
      language: {
        type: 'string',
        description: 'Language code'
      }
    }
  },
  examples: [
    {
      params: { articleId: 'translate/figs-metaphor' },
      response: {
        articleId: 'translate/figs-metaphor',
        title: 'Metaphor',
        content: '## Description\n\nA metaphor is a figure of speech...',
        category: 'translate',
        language: 'en'
      }
    }
  ],
  performance: {
    expectedMs: 300,
    cacheStrategy: 'aggressive'
  }
};

/**
 * Browse Translation Academy endpoint
 */
export const BrowseTranslationAcademyEndpoint: EndpointConfig = {
  name: 'browse-translation-academy',
  path: '/api/browse-translation-academy',
  category: 'core',
  description: 'Browse Translation Academy table of contents',
  params: {
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
    category: {
      type: 'string',
      required: false,
      description: 'Filter by category (e.g., "translate", "process", "checking")'
    }
  },
  dataSource: {
    type: 'dcs',
    resource: 'ta',
    transformation: 'json-parse'
  },
  responseShape: {
    type: 'discovery',
    fields: {
      articles: {
        type: 'array',
        description: 'List of available articles with metadata'
      },
      categories: {
        type: 'array',
        description: 'Available categories'
      },
      totalCount: {
        type: 'number',
        description: 'Total number of articles'
      }
    }
  },
  examples: [
    {
      params: { language: 'en' },
      response: {
        articles: [
          {
            id: 'translate/figs-metaphor',
            title: 'Metaphor',
            category: 'translate',
            description: 'Learn about metaphors in translation'
          },
          {
            id: 'checking/intro-checking',
            title: 'Introduction to Checking',
            category: 'checking',
            description: 'Overview of the checking process'
          }
        ],
        categories: ['translate', 'process', 'checking'],
        totalCount: 150
      }
    }
  ],
  performance: {
    expectedMs: 250,
    cacheStrategy: 'aggressive'
  }
};

/**
 * All Translation Academy endpoints
 */
export const TranslationAcademyEndpoints = [
  FetchTranslationAcademyEndpoint,
  BrowseTranslationAcademyEndpoint
];