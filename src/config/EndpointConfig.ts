/**
 * Endpoint Configuration System
 *
 * Provides a unified configuration interface for all API endpoints,
 * enabling consistent parameter handling, response shapes, and UI generation.
 */

// Parameter Configuration Types
export interface ParamConfig {
  /** Parameter data type */
  type: "string" | "boolean" | "number" | "array";

  /** Whether this parameter is required */
  required: boolean;

  /** Default value if not provided */
  default?: string | boolean | number;

  /** Human-readable description for UI/documentation */
  description: string;

  /** Example value for testing and UI examples */
  example?: string | boolean | number;

  /** Valid options for enum-like parameters */
  options?: readonly string[];

  /** For array types, how to split the input */
  arrayDelimiter?: string;

  /** Validation pattern (regex) for string types */
  pattern?: string;

  /** Minimum/maximum values for numbers or string length */
  min?: number;
  max?: number;
}

// Data Source and Transformation Types
export interface DataSourceConfig {
  /** Where the data comes from */
  type: "dcs-api" | "computed" | "hybrid";

  /** DCS API endpoint pattern (if applicable) */
  dcsEndpoint?: string;

  /** How to transform the raw data */
  transformation?: TransformationType;

  /** Dependencies on other endpoints */
  dependencies?: string[];

  /** Cache TTL in seconds */
  cacheTtl?: number;
}

export type TransformationType =
  | "usfm-to-text"
  | "tsv-parse"
  | "markdown-assemble"
  | "json-passthrough"
  | "array-flatten"
  | "reference-parse";

// Response Shape Types
export interface ResponseShape {
  /** Primary data field type */
  dataType:
    | "scripture"
    | "translation-notes"
    | "translation-words"
    | "translation-questions"
    | "translation-academy"
    | "translation-word-links"
    | "languages"
    | "resources"
    | "references"
    | "context"
    | "health";

  /** Expected response structure */
  structure: {
    /** Root fields that should always be present */
    required: string[];

    /** Optional fields */
    optional?: string[];

    /** Nested object shapes */
    nested?: Record<string, ResponseShape>;

    /** Array item shapes */
    arrayItems?: ResponseShape;
  };

  /** Performance expectations */
  performance: {
    /** Maximum expected response time in milliseconds */
    maxResponseTime: number;

    /** Whether this endpoint should be cached */
    cacheable: boolean;

    /** Expected cache hit rate */
    expectedCacheHitRate?: number;
  };
}

// Real Data Examples
export interface RealDataExample {
  /** Name of this example scenario */
  name: string;

  /** Input parameters for this example */
  params: Record<string, string | boolean | number>;

  /** Expected content validation */
  expectedContent: {
    /** Text patterns that should be present */
    contains?: string[];

    /** Text patterns that should NOT be present */
    excludes?: string[];

    /** Minimum content length */
    minLength?: number;

    /** Specific field validations */
    fields?: Record<string, unknown>;
  };

  /** Human description of what this example demonstrates */
  description: string;
}

// Main Endpoint Configuration Interface
export interface EndpointConfig {
  /** Unique identifier for this endpoint */
  name: string;

  /** API path (without /api prefix) */
  path: string;

  /** Category for organization */
  category: "core" | "extended" | "experimental";

  /** Human-readable title for UI */
  title: string;

  /** Description of what this endpoint does */
  description: string;

  /** Parameter definitions */
  params: Record<string, ParamConfig>;

  /** Data source and transformation configuration */
  dataSource: DataSourceConfig;

  /** Expected response shape and performance */
  responseShape: ResponseShape;

  /** Real data examples for testing and UI */
  examples: RealDataExample[];

  /** Whether this endpoint is currently active */
  enabled: boolean;

  /** Tags for filtering and organization */
  tags?: string[];

  /** Related endpoints or resources */
  related?: string[];
}

// Configuration Registry Types
export interface EndpointRegistry {
  /** All registered endpoint configurations */
  endpoints: Record<string, EndpointConfig>;

  /** Version of the configuration schema */
  version: string;

  /** Last updated timestamp */
  lastUpdated: string;

  /** Global defaults */
  defaults: {
    organization: string;
    language: string;
    cacheTtl: number;
  };
}

// Validation and Error Types
export interface ConfigValidationError {
  endpoint: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
}

// UI Generation Types
export interface UIComponentConfig {
  /** Component type to render */
  type: "input" | "select" | "checkbox" | "textarea";

  /** Label for the component */
  label: string;

  /** Placeholder text */
  placeholder?: string;

  /** Additional CSS classes */
  className?: string;

  /** Validation rules for frontend */
  validation?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

// Export utility type for creating configs
export type EndpointConfigBuilder = Omit<EndpointConfig, "name"> & {
  name?: string;
};
