/**
 * List Available Resources Endpoint
 * GET /api/search-resources
 */

import { Handler } from "@netlify/functions";
import { handleSearchResources } from "../../src/tools/searchResources.js";
import { timedResponse, errorResponse } from "./_shared/utils.js";

export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  console.log("List available resources requested");

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
    const { language, organization, resource, subject } = event.queryStringParameters || {};

    const mcpResult = await handleSearchResources({
      language,
      organization,
      resource,
      subject,
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
    console.error("List available resources error:", error);
    return errorResponse(500, "Failed to list available resources", "INTERNAL_SERVER_ERROR");
  }
};
