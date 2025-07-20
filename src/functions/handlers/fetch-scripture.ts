/**
 * Platform-agnostic Fetch Scripture Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { fetchScripture } from "../scripture-service";

export const fetchScriptureHandler: PlatformHandler = async (
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
    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization = request.queryStringParameters.organization || "unfoldingWord";
    const includeVerseNumbers = request.queryStringParameters.includeVerseNumbers !== "false";
    const formatParam = request.queryStringParameters.format || "text";
    const format = (formatParam === "usfm" ? "usfm" : "text") as "text" | "usfm";

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing reference parameter",
          code: "MISSING_PARAMETER",
        }),
      };
    }

    // Use the shared scripture service
    const result = await fetchScripture({
      reference: referenceParam,
      language,
      organization,
      includeVerseNumbers,
      format,
    });

    // Clean, improved response structure (v4.0.0)
    const response = {
      scripture: result.scripture,
      citation: result.scripture?.citation,
      language,
      organization,
      metadata: {
        cached: result.metadata.cached,
        includeVerseNumbers: result.metadata.includeVerseNumbers,
        format: result.metadata.format,
        filesFound: 1, // We found scripture data
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
    console.error("Scripture error:", error);
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
