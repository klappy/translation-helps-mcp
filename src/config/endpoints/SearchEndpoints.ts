/**
 * Search Endpoint Configurations
 *
 * Defines endpoints for AI-powered search across resources.
 * Uses Cloudflare AI Search for semantic understanding.
 */

import type { EndpointConfig } from "../EndpointConfig.js";
import { SEARCH_SHAPE } from "../ResponseShapes.js";

/**
 * Search Biblical Resources - AI-powered semantic search across all resources
 *
 * Features:
 * - Semantic understanding of queries
 * - Filter by language, organization, resource type, reference, article ID
 * - Returns formatted references (e.g., "John 3:16", "Grace (Key Term)")
 * - Contextual previews with matched term highlighting
 */
export const SEARCH_BIBLICAL_RESOURCES_CONFIG: EndpointConfig = {
  name: "search-biblical-resources",
  path: "/search",
  title: "AI Search Biblical Resources",
  description:
    "Semantic search across scripture, notes, words, and other resources using Cloudflare AI Search. Supports filtering by language, organization, resource type, reference, and article ID.",
  category: "core",
  responseShape: SEARCH_SHAPE,

  params: {
    query: {
      type: "string" as const,
      required: true,
      description:
        "Search query - AI Search understands natural language, synonyms, and context",
      example: "what does love mean",
    },
    language: {
      type: "string" as const,
      required: false,
      default: "en",
      description: "Language code for filtering results",
      example: "en",
      options: ["en", "es", "fr", "ru", "ar", "hi", "sw", "zh"],
    },
    organization: {
      type: "string" as const,
      required: false,
      default: "unfoldingWord",
      description: "Organization/owner to filter by",
      example: "unfoldingWord",
      options: ["unfoldingWord", "Door43-Catalog"],
    },
    resource: {
      type: "string" as const,
      required: false,
      description: "Filter by specific resource type: ult, ust, tn, tw, ta, tq",
      example: "tw",
      options: ["ult", "ust", "tn", "tw", "ta", "tq"],
    },
    reference: {
      type: "string" as const,
      required: false,
      description:
        "Filter by Bible reference (e.g., 'John 3:16', 'Genesis 1', 'Romans')",
      example: "John 3:16",
    },
    articleId: {
      type: "string" as const,
      required: false,
      description:
        "Filter by article ID for Translation Words/Academy (e.g., 'grace', 'figs-metaphor')",
      example: "grace",
    },
    limit: {
      type: "number" as const,
      required: false,
      default: 50,
      description: "Maximum number of results to return (1-100)",
      example: 20,
      min: 1,
      max: 100,
    },
    includeHelps: {
      type: "boolean" as const,
      required: false,
      default: true,
      description:
        "Include translation helps (notes, words, academy) in results",
      example: true,
    },
    useAI: {
      type: "boolean" as const,
      required: false,
      default: false,
      description:
        "Use AI/LLM to generate a summary response. Much slower (~15-20s vs ~2-4s) but includes AI-generated insights.",
      example: false,
    },
  },

  dataSource: {
    type: "computed",
    transformation: "json-passthrough",
    cacheTtl: 0, // Search results are not cached (AI Search handles this)
  },

  enabled: true,
  tags: ["search", "core", "ai-search", "semantic", "discovery"],

  examples: [
    {
      name: "Semantic Search",
      description:
        "Search for 'love' - AI understands context and finds related concepts",
      params: {
        query: "what does love mean",
        language: "en",
      },
      expectedContent: {
        contains: ["hits", "reference", "preview"],
        minLength: 200,
        fields: {
          hits: "array",
          resourceCount: "number",
        },
      },
    },
    {
      name: "Filter by Resource Type",
      description: "Search Translation Words only",
      params: {
        query: "grace",
        resource: "tw",
        language: "en",
      },
      expectedContent: {
        contains: ["hits", "grace"],
        fields: {
          hits: "array",
        },
      },
    },
    {
      name: "Scripture Reference Filter",
      description: "Search within John chapter 3",
      params: {
        query: "believe",
        reference: "John 3",
        language: "en",
      },
      expectedContent: {
        contains: ["hits", "John"],
        fields: {
          hits: "array",
        },
      },
    },
    {
      name: "Article ID Search",
      description: "Find content about a specific Translation Word article",
      params: {
        query: "salvation",
        articleId: "save",
        resource: "tw",
        language: "en",
      },
      expectedContent: {
        contains: ["hits"],
        fields: {
          hits: "array",
        },
      },
    },
    {
      name: "Multi-language Search",
      description: "Search Spanish resources",
      params: {
        query: "amor",
        language: "es",
        organization: "unfoldingWord",
      },
      expectedContent: {
        contains: ["hits"],
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
