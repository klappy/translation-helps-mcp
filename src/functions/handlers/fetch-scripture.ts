/**
 * Platform-agnostic Fetch Scripture Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { getCachedDCSClient } from "../../services/cached-dcs-client.js";
import type { XRayTrace } from "../../types/dcs.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";
import { fetchScripture } from "../scripture-service";
import type { CacheBypassOptions } from "../unified-cache";

export const fetchScriptureHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  // Initialize DCS client for X-Ray tracing
  const dcsClient = getCachedDCSClient();
  const traceId = `scripture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Enable X-Ray tracing
    dcsClient.enableTracing(traceId, "/api/fetch-scripture");

    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";
    const includeVerseNumbers =
      request.queryStringParameters.includeVerseNumbers !== "false";
    const formatParam = request.queryStringParameters.format || "text";
    const format = (formatParam === "usfm" ? "usfm" : "text") as
      | "text"
      | "usfm";
    const specificTranslations = request.queryStringParameters.translations
      ? request.queryStringParameters.translations
          .split(",")
          .map((t) => t.trim())
      : undefined;
    const includeAlignment =
      request.queryStringParameters.includeAlignment === "true";

    if (!referenceParam) {
      dcsClient.disableTracing();
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
      specificTranslations,
      bypassCache: bypassOptions,
      includeAlignment,
    });

    // If this was a cache hit, add a synthetic trace entry for the internal cache access
    if (result.metadata.cached) {
      dcsClient.addCustomTrace({
        id: `internal_cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        endpoint: "unified-cache",
        url: `internal://cache/${result.metadata.cacheKey}`,
        method: "GET",
        startTime: 0,
        endTime: 5, // Simulate very fast cache access
        duration: 5,
        statusCode: 200,
        success: true,
        cacheStatus: "HIT",
        cacheSource: "unified-cache",
        attempts: 1,
        responseSize: JSON.stringify(result).length,
        requestData: { cacheKey: result.metadata.cacheKey },
      });
    }

    // Collect X-Ray trace data BEFORE disabling tracing
    const xrayTrace: XRayTrace | null = dcsClient.getTrace();

    // Disable X-Ray tracing
    dcsClient.disableTracing();

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
        responseTime: Date.now() - performance.now(),
        cacheStatus: result.metadata.cached ? "hit" : "miss",
        // Include X-Ray trace if available (always fresh, never cached)
        ...(xrayTrace && { xrayTrace }),
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
    // Ensure tracing is disabled even on error
    dcsClient.disableTracing();

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
