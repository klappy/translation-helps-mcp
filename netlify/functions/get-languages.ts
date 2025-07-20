/**
 * Get Languages Endpoint
 * GET /api/get-languages
 * IMPLEMENTS: Enhanced caching with version-aware keys and proper headers
 */

import { Handler } from "@netlify/functions";
import { DCSApiClient } from "../../src/services/DCSApiClient.js";
import {
  corsHeaders,
  errorResponse,
  withConservativeCache,
  buildDCSCacheKey,
} from "./_shared/utils";

export const handler: Handler = async (event, context) => {
  console.log("Get languages requested with enhanced caching");

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== "GET") {
    return errorResponse(405, "Method not allowed", "METHOD_NOT_ALLOWED");
  }

  const startTime = Date.now();

  // Fix Request construction for production
  const protocol = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host || "translation-helps-mcp.netlify.app";
  const path = event.path || "/.netlify/functions/get-languages";

  const request = new Request(`${protocol}://${host}${path}`, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
  });

  try {
    // Build conservative cache key
    const cacheKey = buildDCSCacheKey("languages", "all", {});

    console.log("Fetching languages using enhanced caching strategy...");

    // Use enhanced caching with proper headers
    const cacheResult = await withConservativeCache(
      request,
      cacheKey,
      async () => {
        console.log("Cache miss - fetching fresh languages from DCS");

        // Use our DCS API client to fetch language data
        const dcsClient = new DCSApiClient();
        const response = await dcsClient.getLanguages();

        if (!response.success) {
          console.error("Failed to fetch languages from DCS:", response.error);
          throw new Error(response.error?.message || "Failed to fetch languages from DCS");
        }

        const languages = response.data || [];

        // Transform the data to include additional metadata for the UI
        const transformedLanguages = languages.map((lang) => ({
          code: lang.code,
          name: lang.name,
          romanizedName: lang.romanizedName,
          direction: lang.direction,
          region: lang.region,
          homeCountry: lang.homeCountry,
          countryCodes: lang.countryCodes,
          alternativeNames: lang.alternativeNames,
          isGatewayLanguage: lang.isGatewayLanguage,
          // Add common resource types that are typically available
          resources: ["scripture", "notes", "questions", "words", "links"],
        }));

        console.log(`Successfully fetched ${transformedLanguages.length} languages from DCS`);

        return {
          success: true,
          data: transformedLanguages,
          count: transformedLanguages.length,
          timestamp: new Date().toISOString(),
        };
      },
      {
        cacheType: "languages", // Uses conservative 30-minute TTL
        bypassCache: false,
      }
    );

    // Prepare final response with metadata
    const responseData = {
      ...cacheResult.data,
      cached: cacheResult.cached,
      metadata: {
        source: "Door43 Content Service with Enhanced Caching",
        responseTime: Date.now() - startTime,
        cacheInfo: cacheResult.cacheInfo,
        implementsPatterns: ["enhanced-caching", "version-aware-keys", "proper-cache-headers"],
      },
    };

    // Log metrics with cache info
    console.log("METRIC", {
      function: "get-languages",
      duration: responseData.metadata.responseTime,
      languageCount: cacheResult.data.count,
      cached: cacheResult.cached,
      cacheVersion: cacheResult.cacheInfo?.version,
      implementsEnhancedCaching: true,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...cacheResult.cacheHeaders,
        "X-Implements-Patterns": "enhanced-caching,version-aware-keys,proper-headers",
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Error in enhanced get-languages:", error);

    // Log error metrics
    console.log("METRIC", {
      function: "get-languages",
      duration: Date.now() - startTime,
      error: true,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    // Handle specific error types
    if (error instanceof Error && error.message.includes("DCS")) {
      return errorResponse(
        503,
        "Unable to fetch languages from upstream service",
        "UPSTREAM_ERROR"
      );
    }

    return errorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
  }
};
