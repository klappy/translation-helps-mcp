/**
 * Smart Resource Recommendations API Handler
 *
 * Provides intelligent resource recommendations based on user context and scripture references.
 * Uses advanced analysis to suggest the most helpful UW resources for translation work.
 *
 * Implements Task 9 from the implementation plan
 */

import { logger } from "../../utils/logger.js";
import { cache } from "../cache.js";
import type { PlatformHandler } from "../platform-adapter.js";
import {
  recommendResources,
  type RecommendationContext,
  type ScriptureReference,
} from "../resource-recommender.js";

// Cache TTL: 30 minutes (recommendations can be cached but not too long since context matters)
const CACHE_TTL = 1800; // 30 minutes in seconds

export const resourceRecommendationsHandler: PlatformHandler = async (
  request,
) => {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Parse required parameters
    const book = params.get("book");
    const chapter = params.get("chapter");
    const userRole = params.get("userRole") as
      | "translator"
      | "checker"
      | "consultant"
      | "facilitator";

    if (!book || !chapter || !userRole) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required parameters",
          message: "book, chapter, and userRole are required",
          required: {
            book: "string (e.g., 'Romans')",
            chapter: "number (e.g., 9)",
            userRole: "one of: translator, checker, consultant, facilitator",
          },
          timestamp: new Date().toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Parse optional parameters
    const verse = params.get("verse")
      ? parseInt(params.get("verse")!)
      : undefined;
    const endVerse = params.get("endVerse")
      ? parseInt(params.get("endVerse")!)
      : undefined;
    const targetLanguage = params.get("targetLanguage") || undefined;
    const sourceLanguages = params.get("sourceLanguages")?.split(",") || [];
    const previousQueries = params.get("previousQueries")?.split(",") || [];
    const languageCapabilities =
      params.get("languageCapabilities")?.split(",") || [];

    // Build scripture reference
    const reference: ScriptureReference = {
      book,
      chapter: parseInt(chapter),
      verse,
      endVerse,
    };

    // Build recommendation context
    const context: RecommendationContext = {
      reference,
      userRole,
      previousQueries,
      languageCapabilities,
      targetLanguage,
      sourceLanguages,
    };

    // Generate cache key
    const cacheKey = `recommendations:${JSON.stringify(context)}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug("Resource recommendations served from cache");

      return {
        statusCode: 200,
        body: JSON.stringify({
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
          },
        }),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800",
        },
      };
    }

    logger.debug("Generating fresh resource recommendations");

    // Generate recommendations
    const recommendations = recommendResources(context);

    // Add API metadata
    const responseData = {
      ...recommendations,
      metadata: {
        ...recommendations.metadata,
        apiVersion: "1.0",
        requestTime: new Date().toISOString(),
        cacheHit: false,
      },
    };

    // Cache the result
    await cache.set(cacheKey, responseData, "metadata", CACHE_TTL);

    const duration = Date.now() - startTime;
    logger.info("Resource recommendations generated", { durationMs: duration });

    // Validate response time requirement (Task 9: < 100ms)
    if (duration > 100) {
      logger.warn("Recommendations slower than target", {
        durationMs: duration,
        targetMs: 100,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=1800",
        "X-Response-Time": `${duration}ms`,
      },
    };
  } catch (error) {
    logger.error("Resource recommendations failed", { error: String(error) });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate resource recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
