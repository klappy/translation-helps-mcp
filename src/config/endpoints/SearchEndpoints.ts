/**
 * Search Endpoint Configurations
 *
 * Defines endpoints for ad-hoc search across resources.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import { SEARCH_SHAPE } from "../ResponseShapes.js";

/**
 * Search Biblical Resources - Ad-hoc search across all resources
 */
export const SEARCH_BIBLICAL_RESOURCES_CONFIG: EndpointConfig = {
  name: "search-biblical-resources",
  path: "/search",
  title: "Search Biblical Resources",
  description:
    "Perform ad-hoc, relevance-ranked searches across scripture, notes, words, and other resources using BM25 ranking.",
  category: "core",
  responseShape: SEARCH_SHAPE,

  params: {
    query: {
      type: "string" as const,
      required: true,
      description: "Search query (natural language, keywords, or phrases)",
      example: "jesus peace",
    },
    language: {
      type: "string" as const,
      required: false,
      default: "en",
      description: "Language code (e.g., 'en', 'es', 'fr')",
      example: "en",
      options: ["en", "es", "fr", "ru", "ar", "hi", "sw", "zh"],
    },
    owner: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization/owner (e.g., 'unfoldingWord', 'Wycliffe')",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    reference: {
      type: "string" as const,
      required: false,
      description:
        "Optional Bible reference to filter results (e.g., 'John 3:16', 'Genesis 1')",
      example: "John 3:16",
    },
    limit: {
      type: "number" as const,
      required: false,
      default: 50,
      description: "Maximum number of results to return",
      example: 50,
    },
    includeHelps: {
      type: "boolean" as const,
      required: false,
      default: true,
      description: "Include translation helps (notes, words, academy)",
      example: true,
    },
  },

  dataSource: {
    type: "computed",
    transformation: "json-passthrough",
    cacheTtl: 0, // Search results are not cached (stateless)
  },

  enabled: true,
  tags: ["search", "core", "discovery", "biblical-content"],

  examples: [
    {
      name: "Basic Search",
      description: "Search for 'grace' in English resources",
      params: {
        query: "grace",
        language: "en",
        owner: "unfoldingWord",
      },
      expectedContent: {
        contains: ["hits", "grace", "score"],
        minLength: 200,
        fields: {
          hits: "array",
          resourceCount: "number",
        },
      },
    },
    {
      name: "Reference Filtered Search",
      description: "Search for 'faith' in Romans 5",
      params: {
        query: "faith",
        reference: "Romans 5",
        language: "en",
      },
      expectedContent: {
        contains: ["hits", "faith", "Romans"],
        fields: {
          hits: "array",
        },
      },
    },
  ],
} as EndpointConfig;

/**
 * All Search Endpoint Configurations
 */
export const SEARCH_ENDPOINTS = [SEARCH_BIBLICAL_RESOURCES_CONFIG] as const;
