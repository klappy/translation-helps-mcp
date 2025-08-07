/**
 * Platform-agnostic Get Translation Word Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { browseWords } from "../browse-words-service";

export const getTranslationWordHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const term = request.queryStringParameters.term;
    const language = request.queryStringParameters.language || "en";
    const organization = request.queryStringParameters.organization || "unfoldingWord";

    if (!term) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing term parameter",
          code: "MISSING_PARAMETER",
        }),
      };
    }

    // Browse words to find the specific term
    const result = await browseWords({
      language,
      organization,
      search: term,
      limit: 1,
    });

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Get Translation Word API Error:", error);
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        error: "Failed to get translation word",
        code: "INTERNAL_ERROR",
      }),
    };
  }
};
