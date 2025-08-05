/**
 * Advanced Resource Filtering System
 *
 * Provides sophisticated filtering and ranking capabilities for UW resources.
 * Supports multiple filter criteria, relevance scoring, and intelligent recommendations.
 *
 * Based on Task 9 of the implementation plan
 * Created for Enhanced Resource Discovery (Phase 3)
 */

import { ResourceType } from "../constants/terminology.js";
import type { Resource } from "../types/dcs.js";
import { detectResourceType, type DetectionResult } from "./resource-detector.js";

/**
 * Filter criteria for advanced resource search
 */
export interface FilterCriteria {
  // Basic filters
  language?: string | string[];
  resourceTypes?: ResourceType | ResourceType[];
  organization?: string | string[];

  // Content filters
  minSize?: number; // Minimum resource size in bytes
  maxSize?: number; // Maximum resource size
  hasDescription?: boolean;
  hasWordAlignment?: boolean;

  // Quality filters
  minConfidence?: number; // Minimum detection confidence (0.0-1.0)
  onlyRecommended?: boolean;
  strategicLanguageOnly?: boolean;

  // Date filters
  updatedAfter?: string; // ISO date string
  updatedBefore?: string; // ISO date string

  // Content completeness
  minBooks?: number; // Minimum number of Bible books
  maxBooks?: number; // Maximum number of books
  hasNewTestament?: boolean;
  hasOldTestament?: boolean;

  // Translation workflow stage
  stage?: "draft" | "prod" | "preprod" | "latest";

  // Search text
  searchText?: string; // Free text search in name/description

  // Sorting and limits
  sortBy?: "relevance" | "updated" | "size" | "name" | "confidence";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Filtered resource with metadata
 */
export interface FilteredResource {
  resource: Resource;
  detection: DetectionResult;
  relevanceScore: number;
  matchReasons: string[];
  qualityIndicators: {
    confidence: number;
    completeness: number;
    freshness: number; // 0-1 based on last update
    alignment: boolean; // Has word alignment markers
  };
}

/**
 * Filter results with metadata
 */
export interface FilterResults {
  resources: FilteredResource[];
  totalFound: number;
  criteria: FilterCriteria;
  suggestions: {
    alternativeLanguages: string[];
    relatedResourceTypes: ResourceType[];
    recommendedFilters: Partial<FilterCriteria>;
  };
  performance: {
    processingTimeMs: number;
    resourcesProcessed: number;
    filtersApplied: string[];
  };
}

/**
 * Strategic Languages with higher relevance
 */
const STRATEGIC_LANGUAGES = new Set([
  "en",
  "es",
  "es-419",
  "fr",
  "pt",
  "pt-br",
  "zh",
  "zh-cn",
  "zh-tw",
  "ar",
  "hi",
  "id",
  "sw",
  "ru",
  "de",
  "ja",
  "ko",
  "it",
  "nl",
  "tr",
]);

/**
 * Recommended organizations for quality content
 */
const TRUSTED_ORGANIZATIONS = new Set(["unfoldingWord", "Door43-Catalog", "STR", "WA", "BCS"]);

/**
 * Calculate relevance score for a resource based on criteria
 */
function calculateRelevanceScore(
  resource: Resource,
  detection: DetectionResult,
  criteria: FilterCriteria
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Base score from detection confidence
  score += detection.confidence * 30;
  if (detection.confidence > 0.9) {
    reasons.push("High confidence detection");
  }

  // Language relevance
  if (criteria.language) {
    const targetLanguages = Array.isArray(criteria.language)
      ? criteria.language
      : [criteria.language];

    if (targetLanguages.includes(resource.language)) {
      score += 25;
      reasons.push(`Exact language match: ${resource.language}`);
    }

    // Strategic language bonus
    if (STRATEGIC_LANGUAGES.has(resource.language)) {
      score += 10;
      reasons.push("Strategic language");
    }
  }

  // Resource type relevance
  if (criteria.resourceTypes && detection.type) {
    const targetTypes = Array.isArray(criteria.resourceTypes)
      ? criteria.resourceTypes
      : [criteria.resourceTypes];

    if (targetTypes.includes(detection.type)) {
      score += 20;
      reasons.push(`Requested resource type: ${detection.type}`);
    }
  }

  // Organization trustworthiness
  const orgName = resource.owner?.username;
  if (orgName && TRUSTED_ORGANIZATIONS.has(orgName)) {
    score += 15;
    reasons.push(`Trusted organization: ${orgName}`);
  }

  // Content completeness (for scripture resources)
  if (detection.type && ["ult", "ust", "glt", "gst"].includes(detection.type)) {
    if (resource.size > 5000000) {
      // > 5MB suggests significant content
      score += 10;
      reasons.push("Substantial content size");
    }
  }

  // Freshness (more recent updates score higher)
  if (resource.updated_at) {
    const lastUpdate = new Date(resource.updated_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 30) {
      score += 8;
      reasons.push("Recently updated");
    } else if (daysSinceUpdate < 180) {
      score += 4;
      reasons.push("Moderately recent");
    }
  }

  // Word alignment bonus (for scripture)
  if (resource.description?.toLowerCase().includes("align")) {
    score += 5;
    reasons.push("Has word alignment");
  }

  // Search text relevance
  if (criteria.searchText) {
    const searchLower = criteria.searchText.toLowerCase();
    const nameMatch = (resource.name || "").toLowerCase().includes(searchLower);
    const descMatch = (resource.description || "").toLowerCase().includes(searchLower);

    if (nameMatch && descMatch) {
      score += 15;
      reasons.push("Strong text match in name and description");
    } else if (nameMatch) {
      score += 10;
      reasons.push("Text match in name");
    } else if (descMatch) {
      score += 5;
      reasons.push("Text match in description");
    }
  }

  // Description quality bonus
  if (resource.description && resource.description.length > 50) {
    score += 3;
    reasons.push("Detailed description");
  }

  return { score: Math.round(score), reasons };
}

/**
 * Check if resource passes all filter criteria
 */
function passesFilters(
  resource: Resource,
  detection: DetectionResult,
  criteria: FilterCriteria
): { passes: boolean; failures: string[] } {
  const failures: string[] = [];

  // Language filter
  if (criteria.language) {
    const targetLanguages = Array.isArray(criteria.language)
      ? criteria.language
      : [criteria.language];

    if (!targetLanguages.includes(resource.language)) {
      failures.push(`Language ${resource.language} not in ${targetLanguages.join(", ")}`);
    }
  }

  // Resource type filter
  if (criteria.resourceTypes) {
    const targetTypes = Array.isArray(criteria.resourceTypes)
      ? criteria.resourceTypes
      : [criteria.resourceTypes];

    if (!detection.type || !targetTypes.includes(detection.type)) {
      failures.push(
        `Resource type ${detection.type || "unknown"} not in ${targetTypes.join(", ")}`
      );
    }
  }

  // Organization filter
  if (criteria.organization) {
    const targetOrgs = Array.isArray(criteria.organization)
      ? criteria.organization
      : [criteria.organization];

    const resourceOrg = resource.owner?.username;
    if (!resourceOrg || !targetOrgs.includes(resourceOrg)) {
      failures.push(`Organization ${resourceOrg || "unknown"} not in ${targetOrgs.join(", ")}`);
    }
  }

  // Size filters
  if (criteria.minSize && resource.size < criteria.minSize) {
    failures.push(`Size ${resource.size} below minimum ${criteria.minSize}`);
  }

  if (criteria.maxSize && resource.size > criteria.maxSize) {
    failures.push(`Size ${resource.size} above maximum ${criteria.maxSize}`);
  }

  // Confidence filter
  if (criteria.minConfidence && detection.confidence < criteria.minConfidence) {
    failures.push(
      `Confidence ${detection.confidence.toFixed(2)} below minimum ${criteria.minConfidence}`
    );
  }

  // Description requirement
  if (criteria.hasDescription && (!resource.description || resource.description.length < 10)) {
    failures.push("Missing adequate description");
  }

  // Word alignment requirement
  if (criteria.hasWordAlignment) {
    const hasAlignment =
      resource.description?.toLowerCase().includes("align") ||
      resource.name?.toLowerCase().includes("align");
    if (!hasAlignment) {
      failures.push("No word alignment indicators");
    }
  }

  // Strategic language filter
  if (criteria.strategicLanguageOnly && !STRATEGIC_LANGUAGES.has(resource.language)) {
    failures.push(`${resource.language} is not a strategic language`);
  }

  // Recommended organizations only
  if (criteria.onlyRecommended) {
    const orgName = resource.owner?.username;
    if (!orgName || !TRUSTED_ORGANIZATIONS.has(orgName)) {
      failures.push(`${orgName || "unknown"} is not a recommended organization`);
    }
  }

  // Date filters
  if (criteria.updatedAfter) {
    const afterDate = new Date(criteria.updatedAfter);
    const resourceDate = new Date(resource.updated_at);
    if (resourceDate < afterDate) {
      failures.push(`Updated ${resource.updated_at} before required date ${criteria.updatedAfter}`);
    }
  }

  if (criteria.updatedBefore) {
    const beforeDate = new Date(criteria.updatedBefore);
    const resourceDate = new Date(resource.updated_at);
    if (resourceDate > beforeDate) {
      failures.push(`Updated ${resource.updated_at} after required date ${criteria.updatedBefore}`);
    }
  }

  // Search text filter
  if (criteria.searchText) {
    const searchLower = criteria.searchText.toLowerCase();
    const nameMatch = (resource.name || "").toLowerCase().includes(searchLower);
    const descMatch = (resource.description || "").toLowerCase().includes(searchLower);

    if (!nameMatch && !descMatch) {
      failures.push(`No match for search text: ${criteria.searchText}`);
    }
  }

  return { passes: failures.length === 0, failures };
}

/**
 * Calculate quality indicators for a resource
 */
function calculateQualityIndicators(
  resource: Resource,
  detection: DetectionResult
): FilteredResource["qualityIndicators"] {
  // Confidence from detection
  const confidence = detection.confidence;

  // Completeness based on size and type
  let completeness = 0.5; // Base completeness

  if (detection.type && ["ult", "ust", "glt", "gst"].includes(detection.type)) {
    // Scripture completeness based on size
    if (resource.size > 10000000)
      completeness = 1.0; // Full Bible
    else if (resource.size > 5000000)
      completeness = 0.8; // Substantial content
    else if (resource.size > 1000000)
      completeness = 0.6; // NT likely
    else completeness = 0.3; // Partial content
  } else if (detection.type && ["tn", "tw", "tq", "ta"].includes(detection.type)) {
    // Translation helps completeness
    if (resource.size > 1000000) completeness = 1.0;
    else if (resource.size > 500000) completeness = 0.8;
    else if (resource.size > 100000) completeness = 0.6;
    else completeness = 0.4;
  }

  // Freshness based on last update
  let freshness = 0.5; // Default
  if (resource.updated_at) {
    const lastUpdate = new Date(resource.updated_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 30) freshness = 1.0;
    else if (daysSinceUpdate < 90) freshness = 0.8;
    else if (daysSinceUpdate < 180) freshness = 0.6;
    else if (daysSinceUpdate < 365) freshness = 0.4;
    else freshness = 0.2;
  }

  // Word alignment detection
  const alignment =
    resource.description?.toLowerCase().includes("align") ||
    resource.name?.toLowerCase().includes("align") ||
    false;

  return {
    confidence,
    completeness,
    freshness,
    alignment,
  };
}

/**
 * Generate suggestions based on filter results
 */
function generateSuggestions(
  allResources: Resource[],
  criteria: FilterCriteria,
  results: FilteredResource[]
): FilterResults["suggestions"] {
  const suggestions: FilterResults["suggestions"] = {
    alternativeLanguages: [],
    relatedResourceTypes: [],
    recommendedFilters: {},
  };

  // If few results, suggest alternative languages
  if (results.length < 5) {
    const languageFreq = new Map<string, number>();

    for (const resource of allResources) {
      const lang = resource.language;
      languageFreq.set(lang, (languageFreq.get(lang) || 0) + 1);
    }

    // Sort by frequency and suggest top alternatives
    const sortedLangs = Array.from(languageFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang);

    suggestions.alternativeLanguages = sortedLangs.filter(
      (lang) => lang !== criteria.language && STRATEGIC_LANGUAGES.has(lang)
    );
  }

  // Suggest related resource types
  if (criteria.resourceTypes) {
    const targetType = Array.isArray(criteria.resourceTypes)
      ? criteria.resourceTypes[0]
      : criteria.resourceTypes;

    // Suggest complementary resources
    if (targetType === "ult") {
      suggestions.relatedResourceTypes = ["ust", "tn", "tw"];
    } else if (targetType === "ust") {
      suggestions.relatedResourceTypes = ["ult", "tn", "tq"];
    } else if (targetType === "tn") {
      suggestions.relatedResourceTypes = ["ult", "ust", "tw", "tq"];
    }
  }

  // Recommend filter relaxation if results are sparse
  if (results.length < 3) {
    if (criteria.minConfidence && criteria.minConfidence > 0.7) {
      suggestions.recommendedFilters.minConfidence = 0.7;
    }

    if (criteria.onlyRecommended) {
      suggestions.recommendedFilters.onlyRecommended = false;
    }

    if (criteria.strategicLanguageOnly) {
      suggestions.recommendedFilters.strategicLanguageOnly = false;
    }
  }

  return suggestions;
}

/**
 * Advanced resource filtering function
 */
export async function filterResources(
  resources: Resource[],
  criteria: FilterCriteria
): Promise<FilterResults> {
  const startTime = Date.now();
  const filtersApplied: string[] = [];

  // Track which filters are being applied
  Object.keys(criteria).forEach((key) => {
    if (criteria[key as keyof FilterCriteria] !== undefined) {
      filtersApplied.push(key);
    }
  });

  // Process each resource
  const candidateResources: FilteredResource[] = [];

  for (const resource of resources) {
    // Detect resource type
    const detection = detectResourceType(resource);

    // Apply filters
    const filterResult = passesFilters(resource, detection, criteria);

    if (filterResult.passes) {
      // Calculate relevance and quality
      const relevanceResult = calculateRelevanceScore(resource, detection, criteria);
      const qualityIndicators = calculateQualityIndicators(resource, detection);

      candidateResources.push({
        resource,
        detection,
        relevanceScore: relevanceResult.score,
        matchReasons: relevanceResult.reasons,
        qualityIndicators,
      });
    }
  }

  // Sort results
  const sortBy = criteria.sortBy || "relevance";
  const sortOrder = criteria.sortOrder || "desc";

  candidateResources.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "relevance":
        comparison = a.relevanceScore - b.relevanceScore;
        break;
      case "updated":
        const dateA = new Date(a.resource.updated_at).getTime();
        const dateB = new Date(b.resource.updated_at).getTime();
        comparison = dateA - dateB;
        break;
      case "size":
        comparison = a.resource.size - b.resource.size;
        break;
      case "name":
        comparison = (a.resource.name || "").localeCompare(b.resource.name || "");
        break;
      case "confidence":
        comparison = a.detection.confidence - b.detection.confidence;
        break;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  // Apply pagination
  const offset = criteria.offset || 0;
  const limit = criteria.limit || candidateResources.length;
  const paginatedResults = candidateResources.slice(offset, offset + limit);

  // Generate suggestions
  const suggestions = generateSuggestions(resources, criteria, candidateResources);

  const processingTime = Date.now() - startTime;

  return {
    resources: paginatedResults,
    totalFound: candidateResources.length,
    criteria,
    suggestions,
    performance: {
      processingTimeMs: processingTime,
      resourcesProcessed: resources.length,
      filtersApplied,
    },
  };
}

/**
 * Helper function to create common filter presets
 */
export function createFilterPreset(preset: string, language?: string): FilterCriteria {
  switch (preset) {
    case "complete-translation-kit":
      return {
        language,
        resourceTypes: ["ult", "ust", "tn", "tw", "tq"],
        onlyRecommended: true,
        minConfidence: 0.8,
        sortBy: "relevance",
      };

    case "scripture-texts":
      return {
        language,
        resourceTypes: ["ult", "ust", "glt", "gst"],
        hasWordAlignment: true,
        minSize: 1000000, // At least 1MB
        sortBy: "size",
        sortOrder: "desc",
      };

    case "translation-helps":
      return {
        language,
        resourceTypes: ["tn", "tw", "tq", "ta"],
        onlyRecommended: true,
        hasDescription: true,
        sortBy: "updated",
        sortOrder: "desc",
      };

    case "strategic-languages":
      return {
        strategicLanguageOnly: true,
        onlyRecommended: true,
        minConfidence: 0.7,
        updatedAfter: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        sortBy: "relevance",
      };

    case "recent-updates":
      return {
        language,
        updatedAfter: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        sortBy: "updated",
        sortOrder: "desc",
        limit: 20,
      };

    default:
      return {
        sortBy: "relevance",
        limit: 50,
      };
  }
}
