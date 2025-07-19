/**
 * Search Resources Endpoint
 * GET /api/search-resources
 */

import { Handler } from "@netlify/functions";
import { handleSearchResources } from "../../src/tools/searchResources.js";

export const handler: Handler = async (event, context) => {
  console.log("Search resources requested");

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

    const result = await handleSearchResources({
      language,
      organization,
      resource,
      subject,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2),
    };
  } catch (error) {
    console.error("Search resources error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to search resources",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
