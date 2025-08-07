/**
 * ⚠️ ⚠️ ⚠️ EXPERIMENTAL FEATURE - DO NOT USE IN PRODUCTION ⚠️ ⚠️ ⚠️
 *
 * Language Coverage Matrix - EXPERIMENTAL
 *
 * ⚠️ WARNING: This feature is EXPERIMENTAL and has implementation issues
 *
 * KNOWN ISSUES:
 * - Uses hard-coded estimates (books: 66, articles: 1000)
 * - Basic string matching for resource detection
 * - Only tests one reference (Genesis 1:1) for full coverage assessment
 * - Fixed 3-second timeout may be too aggressive
 * - Resource detection logic is unreliable
 *
 * PROMOTION CRITERIA:
 * - Implement proper resource counting (not estimates)
 * - Add comprehensive testing across multiple references
 * - Improve resource detection accuracy
 * - Add dynamic timeout based on network conditions
 * - Achieve <500ms response times consistently
 * - Get explicit approval from project maintainers
 *
 * See src/experimental/README.md for full promotion requirements
 * ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️
 */

/**
 * Platform-agnostic Language Coverage Handler
 * Provides comprehensive coverage matrix for all Strategic Languages
 */

import { ResourceType } from "../constants/terminology.js";
import { cache } from "../functions/cache.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../functions/platform-adapter.js";
import {
  checkResourceAvailability,
  discoverAvailableResources,
} from "../functions/resource-detector.js";

// Strategic Languages mapping for language coverage
const STRATEGIC_LANGUAGES = {
  en: { name: "English", code: "en" },
  es: { name: "Español", code: "es" },
  fr: { name: "Français", code: "fr" },
  pt: { name: "Português", code: "pt" },
  ru: { name: "Русский", code: "ru" },
  ar: { name: "العربية", code: "ar" },
  hi: { name: "हिन्दी", code: "hi" },
  zh: { name: "中文", code: "zh" },
  id: { name: "Bahasa Indonesia", code: "id" },
  sw: { name: "Kiswahili", code: "sw" },
} as const;

interface LanguageCoverage {
  [resourceType: string]: {
    available: boolean;
    version?: string;
    books?: number;
    articles?: number;
    updated?: string;
  };
}

interface LanguageEntry {
  name: string;
  coverage: LanguageCoverage;
  completeness: number;
  recommended: boolean;
  resourceCount: number;
}

interface LanguageCoverageResponse {
  languages: Record<string, LanguageEntry>;
  metadata: {
    totalLanguages: number;
    completeLanguages: number;
    recommendedLanguages: number;
    lastUpdated: string;
  };
}

/**
 * Calculate completeness score based on available resources
 */
function calculateCompleteness(coverage: LanguageCoverage): number {
  const requiredResources = [
    ResourceType.ULT,
    ResourceType.UST,
    ResourceType.TN,
    ResourceType.TW,
    ResourceType.TQ,
  ];

  const availableCount = requiredResources.filter((type) => coverage[type]?.available).length;

  return Math.round((availableCount / requiredResources.length) * 100);
}

/**
 * Check if language is recommended (>= 80% complete)
 */
function isRecommended(completeness: number): boolean {
  return completeness >= 80;
}

/**
 * Build coverage data for a specific language with timeout protection
 */
async function buildLanguageCoverage(languageCode: string): Promise<LanguageEntry> {
  const languageInfo = STRATEGIC_LANGUAGES[languageCode as keyof typeof STRATEGIC_LANGUAGES];
  const languageName = languageInfo?.name || languageCode;

  // Use a common reference to check availability
  const testReference = "Genesis 1:1";

  try {
    // Add timeout wrapper for network calls
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Network timeout")), 3000);
    });

    const resourceCheck = await Promise.race([
      checkResourceAvailability(testReference, languageCode, "unfoldingWord"),
      timeout,
    ]);

    // Get detailed resource info with timeout
    const availability = await Promise.race([
      discoverAvailableResources(testReference, languageCode, "unfoldingWord"),
      timeout,
    ]);

    const coverage: LanguageCoverage = {};

    // Scripture resources
    if (resourceCheck.hasScripture) {
      // Check for ULT/GLT
      const ultResource = availability.scripture.find(
        (r) => r.name.toLowerCase().includes("ult") || r.name.toLowerCase().includes("glt")
      );
      if (ultResource) {
        coverage[ResourceType.ULT] = {
          available: true,
          version: "latest",
          updated: availability.lastUpdated,
        };
      }

      // Check for UST/GST
      const ustResource = availability.scripture.find(
        (r) => r.name.toLowerCase().includes("ust") || r.name.toLowerCase().includes("gst")
      );
      if (ustResource) {
        coverage[ResourceType.UST] = {
          available: true,
          version: "latest",
          updated: availability.lastUpdated,
        };
      }
    }

    // Translation Notes
    if (resourceCheck.hasNotes) {
      coverage[ResourceType.TN] = {
        available: true,
        books: 66, // Estimate based on availability
        updated: availability.lastUpdated,
      };
    }

    // Translation Words
    if (resourceCheck.hasWords) {
      coverage[ResourceType.TW] = {
        available: true,
        articles: 1000, // Estimate
        updated: availability.lastUpdated,
      };
    }

    // Translation Word Links
    if (resourceCheck.hasWordLinks) {
      coverage[ResourceType.TWL] = {
        available: true,
        books: 66,
        updated: availability.lastUpdated,
      };
    }

    // Translation Questions
    if (resourceCheck.hasQuestions) {
      coverage[ResourceType.TQ] = {
        available: true,
        books: 66,
        updated: availability.lastUpdated,
      };
    }

    const completeness = calculateCompleteness(coverage);
    const resourceCount = Object.keys(coverage).length;

    return {
      name: languageName,
      coverage,
      completeness,
      recommended: isRecommended(completeness),
      resourceCount,
    };
  } catch (error) {
    console.warn(`Error building coverage for ${languageCode}:`, error);

    // For network timeouts or other errors, return a basic entry
    // This allows the API to continue working even when external services are down
    return {
      name: languageName,
      coverage: {},
      completeness: 0,
      recommended: false,
      resourceCount: 0,
    };
  }
}

/**
 * Language Coverage Handler
 */
export const languageCoverageHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  const startTime = Date.now();

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const filterLanguage = url.searchParams.get("language");
    const includeDetails = url.searchParams.get("details") === "true";

    // Cache key based on parameters
    const cacheKey = `language-coverage:${filterLanguage || "all"}:${includeDetails}`;

    // Try cache first (1 hour TTL)
    const cached = await cache.getWithCacheInfo(cacheKey, "metadata");
    if (cached.value) {
      console.log(`🎯 Language coverage cache HIT for ${cacheKey}`);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
          "X-Cache": "HIT",
        },
        body: JSON.stringify(cached.value),
      };
    }

    console.log(`🔍 Building language coverage matrix`);

    // Determine languages to process
    const languagesToProcess = filterLanguage
      ? [filterLanguage].filter((lang) => lang in STRATEGIC_LANGUAGES) // Only process valid languages
      : Object.keys(STRATEGIC_LANGUAGES);

    // If filtering resulted in no valid languages, return empty result
    if (languagesToProcess.length === 0) {
      const emptyResponse: LanguageCoverageResponse = {
        languages: {},
        metadata: {
          totalLanguages: 0,
          completeLanguages: 0,
          recommendedLanguages: 0,
          lastUpdated: new Date().toISOString(),
        },
      };

      // Cache the empty result too
      await cache.set(cacheKey, emptyResponse, "metadata");

      const duration = Date.now() - startTime;
      console.log(`✅ Empty language coverage matrix built in ${duration}ms`);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
          "X-Cache": "MISS",
          "X-Response-Time": `${duration}ms`,
        },
        body: JSON.stringify(emptyResponse),
      };
    }

    // Build coverage for each language in parallel
    const coveragePromises = languagesToProcess.map(async (langCode) => {
      const coverage = await buildLanguageCoverage(langCode);
      return [langCode, coverage] as [string, LanguageEntry];
    });

    const coverageResults = await Promise.all(coveragePromises);
    const languages: Record<string, LanguageEntry> = {};

    for (const [langCode, entry] of coverageResults) {
      languages[langCode] = entry;
    }

    // Calculate metadata
    const totalLanguages = Object.keys(languages).length;
    const completeLanguages = Object.values(languages).filter(
      (lang) => lang.completeness >= 100
    ).length;
    const recommendedLanguages = Object.values(languages).filter((lang) => lang.recommended).length;

    const response: LanguageCoverageResponse = {
      languages,
      metadata: {
        totalLanguages,
        completeLanguages,
        recommendedLanguages,
        lastUpdated: new Date().toISOString(),
      },
    };

    // Cache the result
    await cache.set(cacheKey, response, "metadata");

    const duration = Date.now() - startTime;
    console.log(`✅ Language coverage matrix built in ${duration}ms`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "MISS",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Language coverage error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: "Failed to build language coverage matrix",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
