/**
 * Platform-agnostic Get Context Handler - Using Resources Service
 * Aggregates ALL resources for comprehensive verse context
 */

import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";
import { fetchResources } from "../resources-service.js";

export const getContextHandler: PlatformHandler = async (
  request: PlatformRequest,
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
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";

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
          message:
            "Please provide a Bible reference. Example: ?reference=John+3:16",
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

    // Use the resources service to aggregate everything
    const resources = await fetchResources({
      reference: referenceParam,
      language,
      organization,
      resources: ["scripture", "notes", "questions", "words"], // All resources as specified
      includeIntro: true,
      includeVerseNumbers: true,
      format: "text",
    });

    // Debug log to see what we got
    logger.info("Resources fetched", {
      hasScripture: !!resources.scripture,
      hasNotes: !!resources.translationNotes,
      hasQuestions: !!resources.translationQuestions,
      hasWords: !!resources.translationWords,
      scriptureType: resources.scripture
        ? typeof resources.scripture
        : "undefined",
      notesLength: resources.translationNotes
        ? (resources.translationNotes as any[]).length
        : 0,
      questionsLength: resources.translationQuestions
        ? (resources.translationQuestions as any[]).length
        : 0,
      wordsLength: resources.translationWords
        ? (resources.translationWords as any[]).length
        : 0,
    });

    // Transform to array format as specified in the behavior spec
    const contextArray = [];

    // Add scripture (all versions)
    if (resources.scripture) {
      // Scripture service returns all versions as array
      const scriptureData = resources.scripture as any;
      if (Array.isArray(scriptureData) && scriptureData.length > 0) {
        contextArray.push({
          type: "scripture",
          data: scriptureData,
          count: scriptureData.length,
          note: "All available scripture versions for the language",
        });
      }
    }

    // Add translation notes
    if (
      resources.translationNotes &&
      Array.isArray(resources.translationNotes) &&
      resources.translationNotes.length > 0
    ) {
      contextArray.push({
        type: "translation-notes",
        data: resources.translationNotes,
        count: resources.translationNotes.length,
      });
    }

    // Add translation questions
    if (
      resources.translationQuestions &&
      Array.isArray(resources.translationQuestions) &&
      resources.translationQuestions.length > 0
    ) {
      contextArray.push({
        type: "translation-questions",
        data: resources.translationQuestions,
        count: resources.translationQuestions.length,
      });
    }

    // Add translation words
    if (
      resources.translationWords &&
      Array.isArray(resources.translationWords) &&
      resources.translationWords.length > 0
    ) {
      contextArray.push({
        type: "translation-words",
        data: resources.translationWords,
        count: resources.translationWords.length,
        note: "Translation word links for the verse. Use /api/fetch-translation-word to fetch full articles",
      });
    }

    // TODO: Add Translation Academy articles from RC links
    // This would require parsing notes for RC links and fetching TA articles

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        context: contextArray,
        reference: resources.reference,
        language,
        organization,
        metadata: {
          ...resources.metadata,
          responseTime: duration,
          timestamp: new Date().toISOString(),
          resourceTypes: contextArray.map((r) => r.type),
          totalResourcesReturned: contextArray.reduce(
            (sum, r) => sum + r.count,
            0,
          ),
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
        message:
          "An error occurred while aggregating context. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
