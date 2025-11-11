/**
 * Platform-agnostic Get Context Handler - TEST VERSION
 * Returns hardcoded aggregated results to test the structure
 */

import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

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
    const referenceParam =
      request.queryStringParameters.reference || "John 3:16";
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
        }),
      };
    }

    logger.info("Returning test context payload", {
      reference: referenceParam,
      language,
      organization,
    });

    // Return hardcoded test data
    const testContext = {
      context: [
        {
          type: "scripture",
          data: [
            { version: "ULT", text: "For God so loved the world..." },
            {
              version: "UST",
              text: "God loved the people of the world so much...",
            },
          ],
          count: 2,
          note: "All available scripture versions",
        },
        {
          type: "translation-notes",
          data: [
            { reference: "3:16", note: "This is the most famous verse..." },
          ],
          count: 1,
        },
        {
          type: "translation-questions",
          data: [
            {
              question: "How did God show his love?",
              answer: "By giving his Son",
            },
          ],
          count: 1,
        },
        {
          type: "translation-words",
          data: [
            { word: "love", occurrences: 1 },
            { word: "eternal-life", occurrences: 1 },
          ],
          count: 2,
          note: "Use /api/fetch-translation-word to fetch full articles",
        },
      ],
      reference: referenceParam,
      language,
      organization,
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        resourceTypes: [
          "scripture",
          "translation-notes",
          "translation-questions",
          "translation-words",
        ],
        totalResourcesReturned: 6,
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
      body: JSON.stringify(testContext),
    };
  } catch (error) {
    logger.error("Get Context API Error (test)", { error: String(error) });
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
        message: "Test handler error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
