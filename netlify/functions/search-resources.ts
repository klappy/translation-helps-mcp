/**
 * List Available Resources Endpoint
 * GET /api/search-resources
 */

import { Handler } from "@netlify/functions";
import { handleSearchResources } from "../../src/tools/searchResources.js";

export const handler: Handler = async (event, context) => {
  console.log("List available resources requested");

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(actualData, null, 2),
    };
  } catch (error) {
    console.error("List available resources error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to list available resources",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
