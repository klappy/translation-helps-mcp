/**
 * Platform-agnostic Fetch Scripture Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { fetchScripture } from "../scripture-service";
import type { CacheBypassOptions } from "../unified-cache";

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
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
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
    const includeMultipleTranslations =
      request.queryStringParameters.includeMultipleTranslations !== "false";
    const specificTranslations = request.queryStringParameters.translations
      ? request.queryStringParameters.translations.split(",").map((t) => t.trim())
      : undefined;

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing reference parameter",
          code: "MISSING_PARAMETER",
        }),
      };
    }

    // Prepare cache bypass options from request
    const bypassOptions: CacheBypassOptions = {
      queryParams: request.queryStringParameters,
      headers: request.headers,
    };

    // Use the shared scripture service
    const result = await fetchScripture({
      reference: referenceParam,
      language,
      organization,
      includeVerseNumbers,
      format,
      includeMultipleTranslations,
      specificTranslations,
      bypassCache: bypassOptions,
    });

    // Clean, improved response structure (v4.0.0)
    const response = {
      scripture: result.scripture,
      scriptures: result.scriptures,
      citation: result.scripture?.citation,
      language,
      organization,
      metadata: {
        cached: result.metadata.cached,
        includeVerseNumbers: result.metadata.includeVerseNumbers,
        format: result.metadata.format,
        translationsFound: result.metadata.translationsFound,
        filesFound: result.metadata.translationsFound, // Backward compatibility
        cacheKey: result.metadata.cacheKey,
        cacheType: result.metadata.cacheType,
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": result.metadata.cached ? "max-age=300" : "no-cache",
        "X-Cache": result.metadata.cached ? "HIT" : "MISS",
        "X-Cache-Key": result.metadata.cacheKey || "",
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
