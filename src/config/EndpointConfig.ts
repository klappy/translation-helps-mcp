/**
 * Endpoint Configuration System
 *
 * This configuration-driven system prevents copy-paste errors and ensures
 * consistency across all endpoints (API, UI, MCP).
 */

export type ResourceType =
  | "scripture"
  | "translation-notes"
  | "translation-words"
  | "translation-words-links"
  | "translation-questions"
  | "translation-academy"
  | "discovery"
  | "context";

export type TransformationType =
  | "usfm-to-text"
  | "tsv-parse"
  | "markdown-assemble"
  | "json-parse"
  | "none";

export type ParamType = "string" | "reference" | "language" | "resource" | "boolean" | "number";

export interface ParamConfig {
  name: string;
  type: ParamType;
  required: boolean;
  default?: any;
  description: string;
  examples: string[];
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

export interface DataSourceConfig {
  type: "dcs" | "computed" | "aggregated";
  transformation?: TransformationType;
  endpoint?: string; // DCS endpoint pattern
  dependencies?: string[]; // Other endpoints this depends on
}

export interface ResponseField {
  name: string;
  type: string;
  description: string;
  example?: any;
}

export interface ResourceShape {
  type: ResourceType;
  fields: ResponseField[];
  example: any;
}

export interface RealDataExample {
  params: Record<string, any>;
  response: any;
  description: string;
  cacheHit?: boolean;
  responseTime?: number;
}

export interface EndpointConfig {
  // Basic metadata
  name: string;
  path: string;
  category: "core" | "experimental";
  description: string;

  // Parameters
  params: Record<string, ParamConfig>;

  // Data source and transformation
  dataSource: DataSourceConfig;

  // Response shape
  responseShape: ResourceShape;

  // Real examples
  examples: RealDataExample[];

  // Performance expectations
  performance?: {
    targetMs: number;
    cacheable: boolean;
    cacheKey?: string;
  };

  // MCP tool metadata
  mcp?: {
    toolName: string;
    description: string;
  };
}

// Common parameter definitions for reuse
export const CommonParams = {
  reference: {
    name: "reference",
    type: "reference" as ParamType,
    required: true,
    description: "Scripture reference (book chapter:verse format)",
    examples: ["Genesis 1:1", "John 3:16", "Titus 1:1-5", "Matthew 5"],
    validation: {
      pattern: /^[A-Za-z0-9\s]+\s+\d+(:\d+(-\d+)?)?$/,
    },
  },

  language: {
    name: "language",
    type: "language" as ParamType,
    required: false,
    default: "en",
    description: "Language code (ISO 639-1)",
    examples: ["en", "es", "fr", "hi"],
    validation: {
      pattern: /^[a-z]{2,3}$/,
    },
  },

  resource: {
    name: "resource",
    type: "resource" as ParamType,
    required: true,
    description: "Resource type identifier",
    examples: ["tn", "tw", "twl", "tq", "ta", "ult", "ust"],
    validation: {
      enum: ["tn", "tw", "twl", "tq", "ta", "ult", "ust"],
    },
  },
} as const;

// Common response shapes for reuse
export const CommonShapes = {
  scripture: {
    type: "scripture" as ResourceType,
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
    type: "translation-notes" as ResourceType,
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
    type: "translation-words" as ResourceType,
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
} as const;
