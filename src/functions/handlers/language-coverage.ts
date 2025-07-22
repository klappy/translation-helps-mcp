/**
 * Language Coverage Matrix API Handler
 *
 * Provides comprehensive overview of resource availability for Strategic Languages.
 * Shows which UW resources are available for each language with completeness metrics.
 *
 * Based on Task 8 of the implementation plan
 * Created for Enhanced Resource Discovery (Phase 3)
 */

import { ResourceType } from "../../constants/terminology.js";
import { DCSApiClient } from "../../services/DCSApiClient.js";
import type { Resource } from "../../types/dcs.js";
import { cache } from "../cache.js";
import type { PlatformHandler } from "../platform-adapter.js";
import { detectResourceType } from "../resource-detector.js";

/**
 * Resource availability information for a language
 */
interface ResourceAvailability {
  available: boolean;
  version?: string;
  updated?: string;
  books?: number;
  articles?: number;
  confidence?: number;
  organization?: string;
}

/**
 * Language coverage information
 */
interface LanguageCoverage {
  name: string;
  coverage: Record<ResourceType, ResourceAvailability>;
  completeness: number; // 0-100 percentage
  recommended: boolean;
  strategicLanguage: boolean;
  resourceCount: number;
}

/**
 * Complete coverage matrix response
 */
interface CoverageMatrixResponse {
  languages: Record<string, LanguageCoverage>;
  metadata: {
    totalLanguages: number;
    completeLanguages: number;
    recommendedLanguages: number;
    lastUpdated: string;
    cacheStatus: string;
    averageCompleteness: number;
  };
}

/**
 * Strategic Languages with high priority
 */
const STRATEGIC_LANGUAGES = [
  "en", // English - Primary strategic language
  "es",
  "es-419", // Spanish variants
  "fr", // French
  "pt",
  "pt-br", // Portuguese variants
  "zh",
  "zh-cn",
  "zh-tw", // Chinese variants
  "ar", // Arabic
  "hi", // Hindi
  "id", // Indonesian
  "sw", // Swahili
  "ru", // Russian
];

/**
 * Calculate completeness score based on available resources
 */
function calculateCompleteness(coverage: Record<ResourceType, ResourceAvailability>): number {
  const coreResources = [
    ResourceType.ULT,
    ResourceType.UST, // Scripture texts
    ResourceType.TN,
    ResourceType.TW,
    ResourceType.TQ, // Translation helps
  ];

  const weights = {
    [ResourceType.ULT]: 25, // Scripture texts are most important
    [ResourceType.UST]: 25,
    [ResourceType.TN]: 20, // Translation helps
    [ResourceType.TW]: 15,
    [ResourceType.TQ]: 10,
    [ResourceType.GLT]: 3, // Strategic language variants
    [ResourceType.GST]: 3,
    [ResourceType.TWL]: 2, // Links and methodology
    [ResourceType.TA]: 2,
    [ResourceType.UHB]: 0, // Original languages don't count for strategic languages
    [ResourceType.UGNT]: 0,
  };

  let totalWeight = 0;
  let availableWeight = 0;

  for (const [type, weight] of Object.entries(weights)) {
    totalWeight += weight;
    const resourceType = type as ResourceType;
    if (coverage[resourceType]?.available) {
      // Bonus for high confidence detection
      const confidenceBonus = (coverage[resourceType].confidence || 0.8) > 0.9 ? 1.1 : 1.0;
      availableWeight += weight * confidenceBonus;
    }
  }

  return Math.min(100, Math.round((availableWeight / totalWeight) * 100));
}

/**
 * Check if a language should be recommended for translation work
 */
function isRecommendedLanguage(
  coverage: Record<ResourceType, ResourceAvailability>,
  completeness: number
): boolean {
  // Must have both scripture texts and at least translation notes
  const hasScripture =
    (coverage[ResourceType.ULT]?.available || coverage[ResourceType.GLT]?.available) &&
    (coverage[ResourceType.UST]?.available || coverage[ResourceType.GST]?.available);

  const hasHelps = coverage[ResourceType.TN]?.available;

  return completeness >= 70 && hasScripture && hasHelps;
}

/**
 * Parse version information from resource metadata
 */
function extractResourceInfo(resource: Resource): {
  version?: string;
  updated?: string;
  books?: number;
  articles?: number;
} {
  const info: any = {};

  // Try to extract version from description or name
  const versionMatch = resource.description?.match(/v(\d+)/i) || resource.name?.match(/v(\d+)/i);
  if (versionMatch) {
    info.version = versionMatch[1];
  }

  // Use resource updated date
  if (resource.updated_at) {
    info.updated = resource.updated_at.split("T")[0]; // Just the date part
  }

  // Estimate content based on resource size (rough heuristic)
  if (resource.size > 0) {
    // For scripture: estimate books based on size
    if (resource.size > 10000000) {
      // > 10MB likely full Bible
      info.books = 66;
    } else if (resource.size > 5000000) {
      // > 5MB likely NT + some OT
      info.books = 40;
    } else if (resource.size > 1000000) {
      // > 1MB likely NT
      info.books = 27;
    }

    // For helps: estimate articles/entries
    if (resource.size > 100000) {
      info.articles = Math.floor(resource.size / 1000); // Rough estimate
    }
  }

  return info;
}

/**
 * Build coverage matrix for all languages
 */
async function buildCoverageMatrix(): Promise<CoverageMatrixResponse> {
  const dcsClient = new DCSApiClient();

  // Get all available resources from catalog
  const catalogResponse = await dcsClient.getResources({
    stage: "prod",
  });

  if (!catalogResponse.success || !catalogResponse.data) {
    throw new Error("Failed to fetch catalog data");
  }

  // Group resources by language
  const languageResources = new Map<string, Resource[]>();

  for (const resource of catalogResponse.data) {
    const langCode = resource.language || "unknown";
    if (!languageResources.has(langCode)) {
      languageResources.set(langCode, []);
    }
    languageResources.get(langCode)!.push(resource);
  }

  // Build coverage for each language
  const languages: Record<string, LanguageCoverage> = {};
  let completeLanguages = 0;
  let recommendedLanguages = 0;
  let totalCompleteness = 0;

  for (const [langCode, resources] of languageResources) {
    // Skip if no resources
    if (resources.length === 0) continue;

    // Detect resource types
    const detectionResults = new Map();
    for (const resource of resources) {
      const detection = detectResourceType(resource);
      if (detection.type && detection.confidence > 0.7) {
        const key = `${detection.type}_${resource.owner?.username || "unknown"}`;

        // Keep the highest confidence detection for each type
        if (
          !detectionResults.has(detection.type) ||
          detection.confidence > detectionResults.get(detection.type).confidence
        ) {
          detectionResults.set(detection.type, {
            resource,
            detection,
            ...extractResourceInfo(resource),
          });
        }
      }
    }

    // Build coverage record
    const coverage: Record<ResourceType, ResourceAvailability> = {} as any;

    // Initialize all resource types as unavailable
    for (const type of Object.values(ResourceType)) {
      coverage[type] = { available: false };
    }

    // Fill in available resources
    for (const [type, info] of detectionResults) {
      coverage[type] = {
        available: true,
        version: info.version,
        updated: info.updated,
        books: info.books,
        articles: info.articles,
        confidence: info.detection.confidence,
        organization: info.resource.owner?.username,
      };
    }

    // Calculate metrics
    const completeness = calculateCompleteness(coverage);
    const recommended = isRecommendedLanguage(coverage, completeness);
    const strategicLanguage = STRATEGIC_LANGUAGES.includes(langCode);

    // Get language name (use first resource's language info or fallback)
    const languageName = resources[0]?.language || langCode;

    languages[langCode] = {
      name: languageName,
      coverage,
      completeness,
      recommended,
      strategicLanguage,
      resourceCount: resources.length,
    };

    // Update counters
    if (completeness >= 90) completeLanguages++;
    if (recommended) recommendedLanguages++;
    totalCompleteness += completeness;
  }

  return {
    languages,
    metadata: {
      totalLanguages: languageResources.size,
      completeLanguages,
      recommendedLanguages,
      lastUpdated: new Date().toISOString(),
      cacheStatus: "fresh",
      averageCompleteness:
        languageResources.size > 0 ? Math.round(totalCompleteness / languageResources.size) : 0,
    },
  };
}

/**
 * Language Coverage Matrix API Handler
 */
export const languageCoverageHandler: PlatformHandler = async (context, headers = {}) => {
  try {
    const url = new URL(context.request.url);
    const params = url.searchParams;

    // Parse query parameters
    const language = params.get("language");
    const minCompleteness = parseInt(params.get("minCompleteness") || "0");
    const onlyRecommended = params.get("onlyRecommended") === "true";
    const strategicOnly = params.get("strategicOnly") === "true";
    const includeStats = params.get("includeStats") !== "false";

    // Cache key for matrix data
    const cacheKey = `language-coverage-matrix-v1`;

    // Try to get from cache first (1 hour TTL)
    let coverageMatrix = await cache.get(cacheKey);

    if (!coverageMatrix) {
      console.log("[Coverage] Building fresh coverage matrix...");
      coverageMatrix = await buildCoverageMatrix();

      // Cache for 1 hour
      await cache.set(cacheKey, coverageMatrix, 3600);
      coverageMatrix.metadata.cacheStatus = "fresh";
    } else {
      console.log("[Coverage] Using cached coverage matrix");
      coverageMatrix.metadata.cacheStatus = "cached";
    }

    // Filter results based on query parameters
    let filteredLanguages = { ...coverageMatrix.languages };

    if (language) {
      // Single language request
      if (filteredLanguages[language]) {
        filteredLanguages = { [language]: filteredLanguages[language] };
      } else {
        filteredLanguages = {};
      }
    } else {
      // Apply filters
      filteredLanguages = Object.fromEntries(
        Object.entries(filteredLanguages).filter(([langCode, info]) => {
          if (minCompleteness > 0 && info.completeness < minCompleteness) return false;
          if (onlyRecommended && !info.recommended) return false;
          if (strategicOnly && !info.strategicLanguage) return false;
          return true;
        })
      );
    }

    // Build response
    const response: any = {
      languages: filteredLanguages,
    };

    if (includeStats) {
      // Recalculate metadata for filtered results
      const filteredEntries = Object.entries(filteredLanguages);
      const totalFiltered = filteredEntries.length;
      const completeFiltered = filteredEntries.filter(
        ([_, info]) => info.completeness >= 90
      ).length;
      const recommendedFiltered = filteredEntries.filter(([_, info]) => info.recommended).length;
      const avgCompletenessFiltered =
        totalFiltered > 0
          ? Math.round(
              filteredEntries.reduce((sum, [_, info]) => sum + info.completeness, 0) / totalFiltered
            )
          : 0;

      response.metadata = {
        ...coverageMatrix.metadata,
        totalLanguages: totalFiltered,
        completeLanguages: completeFiltered,
        recommendedLanguages: recommendedFiltered,
        averageCompleteness: avgCompletenessFiltered,
        filtered: {
          originalTotal: coverageMatrix.metadata.totalLanguages,
          filters: {
            language: language || null,
            minCompleteness: minCompleteness || null,
            onlyRecommended: onlyRecommended || false,
            strategicOnly: strategicOnly || false,
          },
        },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response, null, 2),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        ...headers,
      },
    };
  } catch (error) {
    console.error("[Coverage] Error building language coverage matrix:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to build language coverage matrix",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
  }
};
