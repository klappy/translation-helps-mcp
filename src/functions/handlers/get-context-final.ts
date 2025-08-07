/**
 * Platform-agnostic Get Context Handler - FINAL VERSION
 * Uses the simple aggregation service
 */

import { getComprehensiveContext } from "../get-context-service.js";
import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";

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

    // Get comprehensive context
    const result = await getComprehensiveContext({
      reference: referenceParam,
      language,
      organization,
    });

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800", // Cache for 30 minutes
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Get Context API Error:", error);
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
