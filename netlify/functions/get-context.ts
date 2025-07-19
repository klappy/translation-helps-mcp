/**
 * Get Context Endpoint
 * GET /api/get-context
 */

import { Handler } from "@netlify/functions";
import { handleGetContext } from "../../src/tools/getContext.js";
import { timedResponse, errorResponse } from "./_shared/utils.js";

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
    } = event.queryStringParameters || {};

    if (!reference) {
      return errorResponse(400, "reference parameter is required", "MISSING_PARAMETER", {
        example: "/api/get-context?reference=John%203:16&language=en&organization=unfoldingWord",
      });
    }

    const mcpResult = await handleGetContext({
      reference,
      language,
      organization,
      includeRawData: includeRawData === "true",
      maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
    });

    // Unwrap the MCP response format to get the actual data
    let actualData;
    try {
      // MCP returns { content: [{ type: "text", text: "JSON string" }] }
      // We want to extract and parse the actual JSON data
      const textContent = mcpResult.content?.[0]?.text;
      actualData = textContent ? JSON.parse(textContent) : mcpResult;
    } catch (parseError) {
      // If parsing fails, return the original result
      actualData = mcpResult;
    }

    return timedResponse(actualData, startTime);
  } catch (error) {
    console.error("Get context error:", error);
    return errorResponse(500, "Failed to get context for reference", "INTERNAL_SERVER_ERROR");
  }
};
