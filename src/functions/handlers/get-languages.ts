/**
 * Platform-agnostic Get Languages Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { timedResponse, errorResponse } from "../utils";
import { getLanguages } from "../languages-service";

export const getLanguagesHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const organization = request.queryStringParameters.organization || "unfoldingWord";
    const includeAlternateNames = request.queryStringParameters.includeAlternateNames === "true";

    // Use the shared languages service
    const result = await getLanguages({
      organization,
      includeAlternateNames,
    });

    // Build response matching the original API format + enhanced structure
    const response = {
      // Original format for backward compatibility
      languages: result.languages,
      organization,

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: result.metadata.responseTime,
        cached: result.metadata.cached,
        languagesFound: result.metadata.languagesFound,
        version: "3.6.0",
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": result.metadata.cached ? "max-age=300" : "no-cache",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Languages error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        code: "FETCH_ERROR",
      }),
    };
  }
};
