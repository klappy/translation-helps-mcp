/**
 * Endpoint Configuration System
 * 
 * A unified configuration-driven system to prevent copy-paste errors
 * and ensure consistency across all endpoints.
 */

/**
 * Parameter configuration for endpoint inputs
 */
export interface ParamConfig {
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  default?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

/**
 * Real data example for documentation and testing
 */
export interface RealDataExample {
  params: Record<string, any>;
  response: any;
  description?: string;
}

/**
 * Resource shape definition for consistent responses
 */
export interface ResourceShape {
  type: 'scripture' | 'notes' | 'words' | 'links' | 'questions' | 'academy' | 'discovery' | 'context';
  fields: Record<string, {
    type: string;
    description: string;
    optional?: boolean;
  }>;
}

/**
 * Main endpoint configuration interface
 */
export interface EndpointConfig {
  name: string;
  path: string;
  category: 'core' | 'experimental';
  description: string;
  params: {
    reference?: ParamConfig;
    language?: ParamConfig;
    resource?: ParamConfig;
    [key: string]: ParamConfig | undefined;
  };
  dataSource: {
    type: 'dcs' | 'computed';
    resource?: string; // DCS resource identifier
    transformation?: 'usfm-to-text' | 'tsv-parse' | 'markdown-assemble' | 'json-parse';
  };
  responseShape: ResourceShape;
  examples: RealDataExample[];
  performance?: {
    expectedMs: number;
    cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  };
  errorHandling?: {
    invalidReference?: string;
    resourceNotFound?: string;
    languageNotSupported?: string;
  };
}