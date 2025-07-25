/**
 * Scripture Endpoint Configurations
 * 
 * Defines configurations for all scripture-related endpoints
 * with USFM to text transformation.
 */

import type { EndpointConfig } from '../EndpointConfig';
import { ScriptureShape } from '../ResponseShapes';

/**
 * Base scripture parameter configuration
 */
const scriptureParams = {
  reference: {
    type: 'string' as const,
    required: true,
    description: 'Bible reference (e.g., "John 3:16", "Romans 1:1-5", "Matthew 5")',
    validation: {
      pattern: '^[A-Za-z0-9\\s]+\\s+\\d+(:\\d+(-\\d+)?)?$'
    }
  },
  language: {
    type: 'string' as const,
    required: false,
    default: 'en',
    description: 'Language code (e.g., "en", "es", "fr")'
  },
  organization: {
    type: 'string' as const,
    required: false,
    default: 'unfoldingWord',
    description: 'Organization name'
  },
  includeVerseNumbers: {
    type: 'boolean' as const,
    required: false,
    default: true,
    description: 'Include verse numbers in the text'
  },
  format: {
    type: 'string' as const,
    required: false,
    default: 'text',
    description: 'Output format',
    validation: {
      enum: ['text', 'usfm']
    }
  }
};

/**
 * Fetch Scripture endpoint (general)
 */
export const FetchScriptureEndpoint: EndpointConfig = {
  name: 'fetch-scripture',
  path: '/api/fetch-scripture',
  category: 'core',
  description: 'Fetch Bible scripture text for any reference',
  params: scriptureParams,
  dataSource: {
    type: 'dcs',
    resource: 'ult',
    transformation: 'usfm-to-text'
  },
  responseShape: ScriptureShape,
  examples: [
    {
      params: { reference: 'John 3:16' },
      response: {
        text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
        reference: 'John 3:16',
        version: 'ult',
        language: 'en'
      },
      description: 'Single verse'
    },
    {
      params: { reference: 'Romans 1:1-5' },
      response: {
        text: 'Paul, a servant of Jesus Christ, called to be an apostle...',
        reference: 'Romans 1:1-5',
        version: 'ult',
        language: 'en'
      },
      description: 'Verse range'
    },
    {
      params: { reference: 'Matthew 5' },
      response: {
        text: 'When Jesus saw the crowds, he went up on the mountain...',
        reference: 'Matthew 5',
        version: 'ult',
        language: 'en'
      },
      description: 'Entire chapter'
    }
  ],
  performance: {
    expectedMs: 300,
    cacheStrategy: 'aggressive'
  },
  errorHandling: {
    invalidReference: 'Invalid reference format. Use: "Book Chapter:Verse" (e.g., "John 3:16")',
    resourceNotFound: 'Scripture resource not available for this language',
    languageNotSupported: 'Language not supported for scripture resources'
  }
};

/**
 * Fetch ULT Scripture endpoint
 */
export const FetchULTScriptureEndpoint: EndpointConfig = {
  name: 'fetch-ult-scripture',
  path: '/api/fetch-ult-scripture',
  category: 'core',
  description: 'Fetch unfoldingWord Literal Translation (ULT) scripture',
  params: scriptureParams,
  dataSource: {
    type: 'dcs',
    resource: 'ult',
    transformation: 'usfm-to-text'
  },
  responseShape: ScriptureShape,
  examples: [
    {
      params: { reference: 'Genesis 1:1' },
      response: {
        text: 'In the beginning, God created the heavens and the earth.',
        reference: 'Genesis 1:1',
        version: 'ult',
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
 * Fetch UST Scripture endpoint
 */
export const FetchUSTScriptureEndpoint: EndpointConfig = {
  name: 'fetch-ust-scripture',
  path: '/api/fetch-ust-scripture',
  category: 'core',
  description: 'Fetch unfoldingWord Simplified Translation (UST) scripture',
  params: scriptureParams,
  dataSource: {
    type: 'dcs',
    resource: 'ust',
    transformation: 'usfm-to-text'
  },
  responseShape: ScriptureShape,
  examples: [
    {
      params: { reference: 'Genesis 1:1' },
      response: {
        text: 'Long, long ago, God created the heavens and the earth.',
        reference: 'Genesis 1:1',
        version: 'ust',
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
 * All scripture endpoints
 */
export const ScriptureEndpoints = [
  FetchScriptureEndpoint,
  FetchULTScriptureEndpoint,
  FetchUSTScriptureEndpoint
];