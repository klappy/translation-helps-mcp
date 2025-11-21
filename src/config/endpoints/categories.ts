/**
 * Endpoint Category Definitions
 *
 * This file defines the three-tier classification system for MCP endpoints.
 * Core = Essential, stable APIs for basic functionality
 * Extended = Advanced features for specialized workflows
 * Experimental = Beta features that may change
 */

export type EndpointStability = "core" | "extended" | "experimental";

export interface EndpointCategory {
  name: string;
  description: string;
  llmGuidance: string;
  stabilityLevel: EndpointStability;
  icon?: string;
  color?: string;
}

export const ENDPOINT_CATEGORIES: Record<EndpointStability, EndpointCategory> =
  {
    core: {
      name: "Core Endpoints",
      description: "Essential endpoints for basic Bible translation tasks",
      llmGuidance:
        "These are stable, production-ready endpoints that should be your first choice for Bible translation tasks. They will not change without proper versioning.",
      stabilityLevel: "core",
      icon: "🏛️",
      color: "green",
    },
    extended: {
      name: "Extended Features",
      description: "Advanced endpoints for specialized translation workflows",
      llmGuidance:
        "These endpoints provide advanced functionality for specific use cases. They are stable but may require more complex parameters or return richer data structures.",
      stabilityLevel: "extended",
      icon: "🔧",
      color: "blue",
    },
    experimental: {
      name: "Experimental Lab",
      description: "Beta features and new capabilities being tested",
      llmGuidance:
        "WARNING: These endpoints are experimental and may change or be removed. Use with caution and do not rely on them for production workflows. Always have a fallback plan.",
      stabilityLevel: "experimental",
      icon: "🧪",
      color: "orange",
    },
  };

/**
 * Endpoint categorization based on stability and use case
 */
export const ENDPOINT_CLASSIFICATION = {
  // Core endpoints - Essential for basic functionality (6 total)
  core: [
    "fetch-scripture",
    "fetch-translation-notes",
    "fetch-translation-questions",
    "fetch-translation-word-links",
    "fetch-translation-word",
    "fetch-translation-academy",
  ],

  // Extended endpoints - Advanced features
  extended: [],

  // Experimental endpoints - Beta/testing
  experimental: [],
};

/**
 * Helper function to get endpoint category
 */
export function getEndpointCategory(endpointName: string): EndpointStability {
  for (const [category, endpoints] of Object.entries(ENDPOINT_CLASSIFICATION)) {
    if (endpoints.includes(endpointName)) {
      return category as EndpointStability;
    }
  }
  // Default to experimental if not classified
  return "experimental";
}

/**
 * Helper function to add category metadata to endpoint
 */
export function enrichEndpointWithCategory(endpoint: any): any {
  const category = getEndpointCategory(endpoint.name);
  const categoryInfo = ENDPOINT_CATEGORIES[category];

  return {
    ...endpoint,
    stability: category,
    category: categoryInfo.name,
    llmGuidance: categoryInfo.llmGuidance,
    metadata: {
      ...endpoint.metadata,
      stability: category,
      stabilityLevel: category,
      categoryDescription: categoryInfo.description,
      icon: categoryInfo.icon,
      color: categoryInfo.color,
    },
  };
}
