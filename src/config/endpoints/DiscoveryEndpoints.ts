/**
 * Discovery Endpoint Configurations
 *
 * Defines endpoints for discovering available languages, books, and resource coverage.
 * These endpoints help users understand what content is available before fetching it.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import { LANGUAGES_SHAPE, RESOURCES_SHAPE } from "../ResponseShapes.js";

/**
 * Get Languages - Discover available languages with resource metadata
 */
export const GET_LANGUAGES_CONFIG: EndpointConfig = {
  name: "get-languages",
  path: "/get-languages",
  title: "Get Languages",
  description:
    "Discover available languages with metadata about resource coverage and availability",
  category: "core",
  responseShape: LANGUAGES_SHAPE,

  params: {
    organization: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization providing the resources",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    resource: {
      type: "string" as const,
      required: false,
      description:
        "Filter languages by specific resource availability (e.g., ult, ust, tn, tw, tq, ta)",
      example: "ult",
      options: ["ult", "ust", "tn", "tw", "tq", "ta", "twl"],
    },
    includeMetadata: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include detailed metadata about resource coverage",
      example: true,
    },
    includeStats: {
      type: "boolean" as const,
      required: false,
      default: false,
      description: "Include statistics about books and chapters available",
      example: false,
    },
  },

  dataSource: {
    type: "dcs-api",
    dcsEndpoint: "/api/v1/orgs/{organization}/repos",
    transformation: "json-passthrough",
    cacheTtl: 21600, // 6 hours (language availability changes infrequently)
  },

  enabled: true,
  tags: ["discovery", "languages", "metadata", "core"],

  examples: [
    {
      name: "All Languages",
      description: "Get all available languages with basic metadata",
      params: {
        organization: "unfoldingWord",
        includeMetadata: true,
      },
      expectedContent: {
        contains: ["languages", "en", "es", "metadata"],
        minLength: 200,
        fields: {
          languages: "array",
          totalLanguages: "number",
          metadata: "object",
        },
      },
    },
    {
      name: "Languages with Scripture",
      description: "Get only languages that have ULT scripture available",
      params: {
        organization: "unfoldingWord",
        resource: "ult",
        includeMetadata: true,
      },
      expectedContent: {
        contains: ["languages", "ult", "scripture"],
        minLength: 100,
        fields: {
          languages: "array",
        },
      },
    },
    {
      name: "Languages with Stats",
      description: "Get languages with detailed coverage statistics",
      params: {
        organization: "unfoldingWord",
        includeMetadata: true,
        includeStats: true,
      },
      expectedContent: {
        contains: ["languages", "statistics", "coverage"],
        minLength: 300,
        fields: {
          languages: "array",
          statistics: "object",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * Get Available Books - Discover book coverage per resource and language
 */
export const GET_AVAILABLE_BOOKS_CONFIG: EndpointConfig = {
  name: "get-available-books",
  path: "/get-available-books",
  title: "Get Available Books",
  description:
    "Discover which Bible books are available for specific resources and languages, with coverage indicators",
  category: "core",
  responseShape: RESOURCES_SHAPE,

  params: {
    language: {
      type: "string" as const,
      required: false,
      default: "en",
      description: "Language code to check book availability for",
      example: "en",
      options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
    },
    organization: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization providing the resources",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    resource: {
      type: "string" as const,
      required: false,
      description: "Specific resource to check availability for",
      example: "ult",
      options: ["ult", "ust", "tn", "tw", "tq", "ta", "twl"],
    },
    testament: {
      type: "string" as const,
      required: false,
      description: "Filter by Old Testament (ot) or New Testament (nt)",
      example: "nt",
      options: ["ot", "nt"],
    },
    includeChapters: {
      type: "boolean" as const,
      required: false,
      default: false,
      description: "Include chapter-level availability information",
      example: false,
    },
    includeCoverage: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include coverage percentages and completion status",
      example: true,
    },
  },

  dataSource: {
    type: "dcs-api",
    dcsEndpoint: "/api/v1/repos/{organization}/{language}_{resource}/contents",
    transformation: "json-passthrough",
    cacheTtl: 14400, // 4 hours (book availability changes moderately)
  },

  enabled: true,
  tags: ["discovery", "books", "coverage", "availability", "core"],

  examples: [
    {
      name: "English ULT Books",
      description: "Get available books for English ULT scripture",
      params: {
        language: "en",
        organization: "unfoldingWord",
        resource: "ult",
        includeCoverage: true,
      },
      expectedContent: {
        contains: ["books", "Genesis", "Matthew", "coverage"],
        minLength: 500,
        fields: {
          books: "array",
          coverage: "object",
          totalBooks: "number",
        },
      },
    },
    {
      name: "NT Books Only",
      description: "Get only New Testament books for Spanish translation",
      params: {
        language: "es",
        organization: "unfoldingWord",
        resource: "ult",
        testament: "nt",
        includeCoverage: true,
      },
      expectedContent: {
        contains: ["books", "Matthew", "Revelation"],
        fields: {
          books: "array",
          testament: "nt",
        },
      },
    },
    {
      name: "Translation Notes Coverage",
      description: "Check which books have translation notes available",
      params: {
        language: "en",
        organization: "unfoldingWord",
        resource: "tn",
        includeCoverage: true,
        includeChapters: true,
      },
      expectedContent: {
        contains: ["books", "notes", "chapters", "coverage"],
        minLength: 800,
        fields: {
          books: "array",
          coverage: "object",
          chapters: "object",
        },
      },
    },
    {
      name: "Cross-Resource Comparison",
      description: "Check availability across multiple resources",
      params: {
        language: "en",
        organization: "unfoldingWord",
        includeCoverage: true,
      },
      expectedContent: {
        contains: ["resources", "availability", "comparison"],
        fields: {
          resources: "array",
          coverage: "object",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * List Available Resources - Discover what resource types exist
 */
export const LIST_AVAILABLE_RESOURCES_CONFIG: EndpointConfig = {
  name: "list-available-resources",
  path: "/list-available-resources",
  title: "List Available Resources",
  description:
    "Discover what types of translation resources are available (Scripture, Notes, Words, etc.)",
  category: "core",
  responseShape: RESOURCES_SHAPE,

  params: {
    language: {
      type: "string" as const,
      required: false,
      default: "en",
      description: "Language code to check resource availability for",
      example: "en",
      options: ["en", "es", "fr", "sw", "hi", "ar", "zh", "pt"],
    },
    organization: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization providing the resources",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    includeMetadata: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include metadata about each resource type",
      example: true,
    },
    includeStats: {
      type: "boolean" as const,
      required: false,
      default: false,
      description: "Include statistics about content volume",
      example: false,
    },
  },

  dataSource: {
    type: "dcs-api",
    dcsEndpoint: "/api/v1/orgs/{organization}/repos",
    transformation: "json-passthrough",
    cacheTtl: 43200, // 12 hours (resource types change very infrequently)
  },

  enabled: true,
  tags: ["discovery", "resources", "types", "core"],

  examples: [
    {
      name: "All Resource Types",
      description: "Get all available resource types for English",
      params: {
        language: "en",
        organization: "unfoldingWord",
        includeMetadata: true,
      },
      expectedContent: {
        contains: ["resources", "ult", "ust", "tn", "tw", "tq"],
        minLength: 300,
        fields: {
          resources: "array",
          metadata: "object",
        },
      },
    },
    {
      name: "Resource Stats",
      description: "Get resources with detailed statistics",
      params: {
        language: "en",
        organization: "unfoldingWord",
        includeMetadata: true,
        includeStats: true,
      },
      expectedContent: {
        contains: ["resources", "statistics", "volume"],
        fields: {
          resources: "array",
          statistics: "object",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * All Discovery Endpoint Configurations
 */
export const DISCOVERY_ENDPOINTS = [
  GET_LANGUAGES_CONFIG,
  GET_AVAILABLE_BOOKS_CONFIG,
  LIST_AVAILABLE_RESOURCES_CONFIG,
] as const;

export default DISCOVERY_ENDPOINTS;
