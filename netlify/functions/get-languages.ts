/**
 * Get Languages Endpoint
 * GET /api/get-languages
 */

import { Handler } from "@netlify/functions";
import { DCSApiClient } from "../../src/services/DCSApiClient.js";

export const handler: Handler = async (event, context) => {
  console.log("Get languages requested");

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
    console.log("Fetching languages from DCS API...");

    // Use our new DCS API client to fetch real language data
    const dcsClient = new DCSApiClient();
    const response = await dcsClient.getLanguages();

    if (!response.success) {
      console.error("Failed to fetch languages from DCS:", response.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to fetch languages",
          message: response.error?.message || "Unknown error",
          code: response.error?.code || "DCS_ERROR",
        }),
      };
    }

    const languages = response.data || [];

    // Transform the data to include additional metadata for the UI
    const transformedLanguages = languages.map((lang) => ({
      code: lang.code,
      name: lang.name,
      direction: lang.direction,
      // Add common resource types that are typically available
      resources: ["scripture", "notes", "questions", "words", "links"],
    }));

    console.log(`Successfully fetched ${transformedLanguages.length} languages`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: JSON.stringify({
        success: true,
        data: transformedLanguages,
        count: transformedLanguages.length,
        timestamp: new Date().toISOString(),
        metadata: {
          source: "Door43 Content Service",
          cached: false,
          responseTime: Date.now(),
        },
      }),
    };
  } catch (error) {
    console.error("Error in get-languages:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
