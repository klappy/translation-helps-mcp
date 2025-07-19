/**
 * Get Context Endpoint
 * GET /api/get-context
 */

import { Handler } from "@netlify/functions";
import { handleGetContext } from "../../src/tools/getContext.js";

export const handler: Handler = async (event, context) => {
  console.log("Get context requested");

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
      includeRawData = "false",
      maxTokens,
    } = event.queryStringParameters || {};

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Bad Request",
          message: "reference parameter is required",
          example: "/api/get-context?reference=John%203:16&language=en&organization=unfoldingWord",
        }),
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(actualData, null, 2),
    };
  } catch (error) {
    console.error("Get context error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to get context for reference",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
