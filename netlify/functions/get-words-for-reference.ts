/**
 * Get Words for Reference Endpoint
 * GET /api/get-words-for-reference
 */

import { Handler } from "@netlify/functions";
import { handleGetWordsForReference } from "../../src/tools/getWordsForReference.js";

export const handler: Handler = async (event, context) => {
  console.log("Get words for reference requested");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts GET requests",
      }),
    };
  }

  try {
    const {
      reference,
      language = "en",
      organization = "unfoldingWord",
    } = event.queryStringParameters || {};

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Bad Request",
          message: "reference parameter is required",
          example:
            "/api/get-words-for-reference?reference=John%203:16&language=en&organization=unfoldingWord",
        }),
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(actualData, null, 2),
    };
  } catch (error) {
    console.error("Get words for reference error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to get words for reference",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
