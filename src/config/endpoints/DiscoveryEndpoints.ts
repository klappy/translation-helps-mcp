/**
 * Discovery Endpoint Configurations
 */

import { CommonParams, EndpointConfig } from "../EndpointConfig";
import { ResponseShapes } from "../ResponseShapes";

export const GetLanguagesEndpoint: EndpointConfig = {
  name: "get-languages",
  path: "/get-languages",
  category: "core",
  description: "Discover available languages for translation resources",

  params: {
    includeMetadata: {
      name: "includeMetadata",
      type: "boolean",
      required: false,
      default: false,
      description: "Include detailed language metadata",
      examples: ["true", "false"],
    },
  },

  dataSource: {
    type: "dcs",
    transformation: "json-parse",
    endpoint: "/api/v1/catalog/list",
  },

  responseShape: ResponseShapes.discovery,

  examples: [
    {
      params: { includeMetadata: false },
      response: {
        items: [
          { code: "en", name: "English", nativeName: "English" },
          { code: "es", name: "Spanish", nativeName: "Español" },
          { code: "fr", name: "French", nativeName: "Français" },
        ],
        total: 3,
        metadata: {
          source: "dcs",
          lastUpdated: "2025-01-01",
        },
      },
      description: "List of available languages",
    },
  ],

  performance: {
    targetMs: 500,
    cacheable: true,
    cacheKey: "languages:{includeMetadata}",
  },

  mcp: {
    toolName: "getLanguages",
    description: "Get list of languages with available Bible translation resources",
  },
};

export const GetAvailableBooksEndpoint: EndpointConfig = {
  name: "get-available-books",
  path: "/get-available-books",
  category: "core",
  description: "Get list of Bible books available for a specific resource",

  params: {
    language: CommonParams.language,
    resource: CommonParams.resource,
  },

  dataSource: {
    type: "dcs",
    transformation: "json-parse",
    endpoint: "/api/v1/repos/{owner}/{resource}/contents",
  },

  responseShape: ResponseShapes.discovery,

  examples: [
    {
      params: { language: "en", resource: "ult" },
      response: {
        items: [
          { id: "gen", name: "Genesis", testament: "OT" },
          { id: "exo", name: "Exodus", testament: "OT" },
          { id: "mat", name: "Matthew", testament: "NT" },
        ],
        total: 66,
        metadata: {
          resource: "ult",
          language: "en",
          coverage: "complete",
        },
      },
      description: "Books available in ULT",
    },
  ],

  performance: {
    targetMs: 400,
    cacheable: true,
    cacheKey: "{language}:{resource}:books",
  },

  mcp: {
    toolName: "getAvailableBooks",
    description: "Discover which Bible books are available for a resource",
  },
};

export const ListAvailableResourcesEndpoint: EndpointConfig = {
  name: "list-available-resources",
  path: "/list-available-resources",
  category: "core",
  description: "List all available resources for a language",

  params: {
    language: CommonParams.language,
  },

  dataSource: {
    type: "dcs",
    transformation: "json-parse",
    endpoint: "/api/v1/repos/{owner}",
  },

  responseShape: ResponseShapes.discovery,

  examples: [
    {
      params: { language: "en" },
      response: {
        items: [
          { id: "ult", name: "unfoldingWord Literal Text", type: "scripture" },
          { id: "ust", name: "unfoldingWord Simplified Text", type: "scripture" },
          { id: "tn", name: "Translation Notes", type: "helps" },
          { id: "tw", name: "Translation Words", type: "helps" },
          { id: "twl", name: "Translation Word Links", type: "helps" },
          { id: "tq", name: "Translation Questions", type: "helps" },
          { id: "ta", name: "Translation Academy", type: "helps" },
        ],
        total: 7,
        metadata: {
          language: "en",
          organization: "unfoldingword",
        },
      },
      description: "All resources for English",
    },
  ],

  performance: {
    targetMs: 400,
    cacheable: true,
    cacheKey: "{language}:resources",
  },

  mcp: {
    toolName: "listAvailableResources",
    description: "Discover all available translation resources for a language",
  },
};

// Export all discovery endpoints
export const DiscoveryEndpoints = [
  GetLanguagesEndpoint,
  GetAvailableBooksEndpoint,
  ListAvailableResourcesEndpoint,
];
