/**
 * Platform-agnostic Get Context Handler - PROPER AGGREGATION VERSION
 * Aggregates ALL resources for comprehensive verse context
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { ResourceAggregator } from "../../services/ResourceAggregator.js";
import { parseReference } from "../../parsers/referenceParser.js";
import { logger } from "../../utils/logger.js";

export const getContextHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization = request.queryStringParameters.organization || "unfoldingWord";

    if (!referenceParam) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing required parameter: 'reference'",
          code: "MISSING_PARAMETER",
          message: "Please provide a Bible reference. Example: ?reference=John+3:16",
          validEndpoints: [
            "/api/list-available-resources - Find available organizations/languages",
            "/api/get-available-books - List valid book names",
          ],
        }),
      };
    }

    logger.info("Fetching comprehensive context", {
      reference: referenceParam,
      language,
      organization,
    });

    // Parse the reference
    const parsedRef = parseReference(referenceParam);
    if (!parsedRef.isValid) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Invalid Bible reference format",
          code: "INVALID_REFERENCE",
          message:
            "Please provide a valid reference like 'John 3:16', 'Genesis 1:1-5', or 'Psalm 23'",
          providedReference: referenceParam,
          validFormats: [
            "Book Chapter:Verse (e.g., John 3:16)",
            "Book Chapter:Verse-Verse (e.g., Genesis 1:1-5)",
            "Book Chapter (e.g., Psalm 23)",
          ],
        }),
      };
    }

    // Create aggregator and fetch all resources
    const aggregator = new ResourceAggregator(language, organization);

    // As per spec: Include ALL resource types for comprehensive context
    const resources = await aggregator.aggregateResources(parsedRef, {
      language,
      organization,
      resources: ["scripture", "notes", "questions", "words", "links"],
      includeContext: true, // Get full chapter for scripture context
    });

    // Transform to array format as specified
    const contextArray = [];

    // Add all scripture versions (full chapter as specified)
    if (resources.scriptures && resources.scriptures.length > 0) {
      contextArray.push({
        type: "scripture",
        data: resources.scriptures,
        count: resources.scriptures.length,
      });
    }

    // Add translation notes
    if (resources.translationNotes && resources.translationNotes.length > 0) {
      contextArray.push({
        type: "translation-notes",
        data: resources.translationNotes,
        count: resources.translationNotes.length,
      });
    }

    // Add translation questions
    if (resources.translationQuestions && resources.translationQuestions.length > 0) {
      contextArray.push({
        type: "translation-questions",
        data: resources.translationQuestions,
        count: resources.translationQuestions.length,
      });
    }

    // Add unique translation words via TWL
    if (resources.translationWordLinks && resources.translationWordLinks.length > 0) {
      // Extract unique words from links
      const uniqueWords = new Set<string>();
      const wordDetails = [];

      resources.translationWordLinks.forEach((link: any) => {
        if (link.TWLink && !uniqueWords.has(link.TWLink)) {
          uniqueWords.add(link.TWLink);
          wordDetails.push({
            word: link.TWLink,
            occurrences: link.Occurrence,
            originalWords: link.OrigWords,
          });
        }
      });

      contextArray.push({
        type: "translation-words",
        data: wordDetails,
        count: wordDetails.length,
        note: "Use /api/get-translation-word to fetch full articles for each word",
      });
    }

    // TODO: Add Translation Academy articles from RC links in notes
    // This requires parsing notes for RC links and fetching TA articles

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        context: contextArray,
        reference: resources.reference,
        language: resources.language,
        organization: resources.organization,
        metadata: {
          responseTime: duration,
          timestamp: new Date().toISOString(),
          resourceTypes: contextArray.map((r) => r.type),
          totalResources: contextArray.reduce((sum, r) => sum + r.count, 0),
        },
      }),
    };
  } catch (error) {
    logger.error("Get Context API Error:", error);
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "An error occurred while aggregating context. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
