/**
 * Get Context Endpoint
 * GET /api/get-context
 */

import { Handler } from "@netlify/functions";
import { getContextFromTranslationNotes } from "./_shared/context-service";
import { timedResponse, errorResponse } from "./_shared/utils";

export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  console.log("Get context requested");

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return errorResponse(405, "This endpoint only accepts GET requests", "METHOD_NOT_ALLOWED");
  }

  try {
    const {
      reference,
      language = "en",
      organization = "unfoldingWord",
      includeRawData = "false",
      maxTokens,
      deepAnalysis = "true",
    } = event.queryStringParameters || {};

    if (!reference) {
      return errorResponse(400, "reference parameter is required", "MISSING_PARAMETER", {
        example: "/api/get-context?reference=John%203:16&language=en&organization=unfoldingWord",
      });
    }

    // Use the shared context service
    const contextResult = await getContextFromTranslationNotes({
      reference,
      language,
      organization,
      includeRawData: includeRawData === "true",
      maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
      deepAnalysis: deepAnalysis === "true",
    });

    // Token estimate will be calculated by the context service

    return timedResponse(contextResult, startTime);
  } catch (error) {
    console.error("Get context error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(500, errorMessage, "INTERNAL_SERVER_ERROR");
  }
};
