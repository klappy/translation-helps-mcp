/**
 * Discovery Endpoint Configurations
 * 
 * Defines configurations for language and resource discovery endpoints.
 */

import type { EndpointConfig } from '../EndpointConfig';
import { DiscoveryShape } from '../ResponseShapes';

/**
 * Get Languages endpoint
 */
export const GetLanguagesEndpoint: EndpointConfig = {
  name: 'get-languages',
  path: '/api/get-languages',
  category: 'core',
  description: 'Discover available languages with resource metadata',
  params: {
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    },
    includeAlternateNames: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Include alternate language names'
    },
    resource: {
      type: 'string',
      required: false,
      description: 'Filter by resource availability (e.g., "ult", "tn")'
    }
  },
  dataSource: {
    type: 'computed'
  },
  responseShape: DiscoveryShape,
  examples: [
    {
      params: { organization: 'unfoldingWord' },
      response: {
        items: [
          {
            code: 'en',
            name: 'English',
            direction: 'ltr',
            resources: ['ult', 'ust', 'tn', 'tw', 'tq', 'ta']
          },
          {
            code: 'es',
            name: 'Español',
            direction: 'ltr',
            resources: ['ult', 'tn', 'tw']
          }
        ],
        metadata: {
          totalLanguages: 250,
          withScripture: 150,
          withHelps: 100
        },
        totalCount: 250
      }
    }
  ],
  performance: {
    expectedMs: 400,
    cacheStrategy: 'moderate'
  }
};

/**
 * Get Available Books endpoint
 */
export const GetAvailableBooksEndpoint: EndpointConfig = {
  name: 'get-available-books',
  path: '/api/get-available-books',
  category: 'core',
  description: 'Get books available for a specific resource',
  params: {
    language: {
      type: 'string',
      required: true,
      description: 'Language code'
    },
    resource: {
      type: 'string',
      required: true,
      description: 'Resource type (e.g., "ult", "tn")'
    },
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    }
  },
  dataSource: {
    type: 'dcs'
  },
  responseShape: DiscoveryShape,
  examples: [
    {
      params: { language: 'en', resource: 'ult' },
      response: {
        items: [
          { id: 'GEN', name: 'Genesis', testament: 'OT', chapters: 50 },
          { id: 'EXO', name: 'Exodus', testament: 'OT', chapters: 40 },
          { id: 'MAT', name: 'Matthew', testament: 'NT', chapters: 28 },
          { id: 'JHN', name: 'John', testament: 'NT', chapters: 21 }
        ],
        metadata: {
          totalBooks: 66,
          oldTestament: 39,
          newTestament: 27
        },
        totalCount: 66
      }
    }
  ],
  performance: {
    expectedMs: 300,
    cacheStrategy: 'aggressive'
  },
  errorHandling: {
    resourceNotFound: 'Resource not available in this language',
    languageNotSupported: 'Language not supported'
  }
};

/**
 * List Available Resources endpoint
 */
export const ListAvailableResourcesEndpoint: EndpointConfig = {
  name: 'list-available-resources',
  path: '/api/list-available-resources',
  category: 'core',
  description: 'List all available resource types',
  params: {
    language: {
      type: 'string',
      required: false,
      description: 'Filter by language'
    },
    organization: {
      type: 'string',
      required: false,
      default: 'unfoldingWord',
      description: 'Organization name'
    },
    subject: {
      type: 'string',
      required: false,
      description: 'Filter by subject (e.g., "Bible", "Aligned Bible")'
    }
  },
  dataSource: {
    type: 'dcs'
  },
  responseShape: DiscoveryShape,
  examples: [
    {
      params: { language: 'en' },
      response: {
        items: [
          {
            id: 'ult',
            name: 'unfoldingWord Literal Text',
            type: 'scripture',
            format: 'usfm'
          },
          {
            id: 'tn',
            name: 'Translation Notes',
            type: 'helps',
            format: 'tsv'
          },
          {
            id: 'tw',
            name: 'Translation Words',
            type: 'dictionary',
            format: 'markdown'
          }
        ],
        metadata: {
          scriptureResources: 2,
          helpResources: 5,
          totalResources: 7
        },
        totalCount: 7
      }
    }
  ],
  performance: {
    expectedMs: 500,
    cacheStrategy: 'moderate'
  }
};

/**
 * All discovery endpoints
 */
export const DiscoveryEndpoints = [
  GetLanguagesEndpoint,
  GetAvailableBooksEndpoint,
  ListAvailableResourcesEndpoint
];