/**
 * Get Words for Reference Endpoint
 * GET /api/get-words-for-reference
 */

import { Handler } from "@netlify/functions";
import { handleGetWordsForReference } from "../../src/tools/getWordsForReference.js";
import { timedResponse, errorResponse } from "./_shared/utils.js";

export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  console.log("Get words for reference requested");

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
    } = event.queryStringParameters || {};

    if (!reference) {
      return errorResponse(400, "reference parameter is required", "MISSING_PARAMETER", {
        example:
          "/api/get-words-for-reference?reference=John%203:16&language=en&organization=unfoldingWord",
      });
    }

    const mcpResult = await handleGetWordsForReference({
      reference,
      language,
      organization,
    });

    // Unwrap the MCP response format to get the actual data
    let actualData;
    try {
      // MCP returns { content: [{ type: "text", text: "JSON string" }] } sometimes
      // But this one might return the data directly, so handle both cases
      if ((mcpResult as any).content && Array.isArray((mcpResult as any).content)) {
        const textContent = (mcpResult as any).content[0]?.text;
        actualData = textContent ? JSON.parse(textContent) : mcpResult;
      } else {
        // This handler might return data directly
        actualData = mcpResult;
      }
    } catch (parseError) {
      // If parsing fails, return the original result
      actualData = mcpResult;
    }

    return timedResponse(actualData, startTime);
  } catch (error) {
    console.error("Get words for reference error:", error);
    return errorResponse(500, "Failed to get words for reference", "INTERNAL_SERVER_ERROR");
  }
};
