// Platform-agnostic adapter for function handling
import { logger } from "../utils/logger.js";
import {
  CacheBypassOptions,
  shouldBypassCache,
  unifiedCache,
} from "./unified-cache";
import { withMeasuredCacheHeaders } from "./unified-cache.js";

export interface PlatformRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string>;
}

export interface PlatformResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type PlatformHandler = (
  request: PlatformRequest,
) => Promise<PlatformResponse>;

// Cache interface for platform wrappers (deprecated - use unified cache)
export interface CacheAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
}

// Generate cache key from request
function generateRequestCacheKey(
  path: string,
  queryParams: Record<string, string>,
): string {
  const sortedParams = Object.keys(queryParams)
    .filter((key) => !["nocache", "bypass", "fresh", "_cache"].includes(key)) // Exclude cache control params
    .sort()
    .map((key) => `${key}=${queryParams[key]}`)
    .join("&");

  return `api:${path}${sortedParams ? ":" + sortedParams : ""}`;
}

// Netlify adapter with unified caching
export function createNetlifyHandler(
  handler: PlatformHandler,
  _cacheAdapter?: CacheAdapter,
) {
  // Note: cacheAdapter parameter is ignored in favor of unified cache
  return async (event: any, _context: any) => {
    const request: PlatformRequest = {
      method: event.httpMethod,
      url: `${event.headers?.origin || "https://localhost"}${event.path}`,
      headers: event.headers || {},
      body: event.body,
      queryStringParameters: event.queryStringParameters || {},
    };

    // Handle OPTIONS requests immediately
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

    const _cacheKey = generateRequestCacheKey(
      event.path,
      event.queryStringParameters || {},
    );
    const bypassOptions: CacheBypassOptions = {
      queryParams: event.queryStringParameters || {},
      headers: event.headers || {},
    };

    try {
      // Try unified cache first (unless bypassed)
      const cacheReadStart = performance.now();
      // Response caching disabled: only catalog/zip/blob/file caches are allowed
      const cacheResult = null as unknown as { value?: unknown };
      const cacheReadMs = performance.now() - cacheReadStart;

      if (cacheResult.value) {
        logger.info(`Cache HIT`, { path: event.path });
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            ...withMeasuredCacheHeaders(
              unifiedCache.generateCacheHeaders(cacheResult),
              cacheReadMs,
              cacheResult.cacheType === "memory" ? "memory" : "kv",
            ),
          },
          body: JSON.stringify(cacheResult.value),
        };
      }

      logger.info(`Cache MISS`, { path: event.path });
    } catch (error) {
      logger.warn("Cache read failed", { error: String(error) });
    }

    // Process the request
    const response = await handler(request);

    // Cache successful responses (unless bypassed)
    if (
      response.statusCode === 200 &&
      (!bypassOptions || !shouldBypassCache(bypassOptions))
    ) {
      try {
        const _responseData = JSON.parse(response.body);
        // Do not cache assembled responses
        logger.info(`Cached response`, { path: event.path });
      } catch (error) {
        logger.warn("Cache write failed", { error: String(error) });
      }
    }

    return {
      statusCode: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "X-Cache": "MISS",
        "X-Cache-Version": unifiedCache.getStats().appVersion,
        ...response.headers,
      },
      body: response.body,
    };
  };
}

// SvelteKit adapter with unified caching
export function createSvelteKitHandler(
  handler: PlatformHandler,
  _cacheAdapter?: CacheAdapter,
) {
  // Note: cacheAdapter parameter is ignored in favor of unified cache
  return async ({
    request,
    platform,
  }: {
    request: Request;
    platform?: { env?: { TRANSLATION_HELPS_CACHE?: unknown } };
  }) => {
    // Initialize KV cache if available
    if (platform?.env?.TRANSLATION_HELPS_CACHE) {
      const { initializeKVCache } = await import("./kv-cache.js");
      initializeKVCache(platform.env.TRANSLATION_HELPS_CACHE);
      logger.info("✅ KV cache initialized via platform adapter");
    } else {
      logger.warn("⚠️ No KV namespace binding found - using memory-only cache");
    }

    const url = new URL(request.url);
    const queryStringParameters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryStringParameters[key] = value;
    });

    const platformRequest: PlatformRequest = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== "GET" ? await request.text() : null,
      queryStringParameters,
    };

    // Handle OPTIONS requests immediately
    if (request.method === "OPTIONS") {
      return new Response("", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      });
    }

    const _cacheKey = generateRequestCacheKey(
      url.pathname,
      queryStringParameters,
    );
    const _bypassOptions: CacheBypassOptions = {
      queryParams: queryStringParameters,
      headers: Object.fromEntries(request.headers.entries()),
    };

    // Skip platform-level caching - let individual services handle their own caching
    // to avoid double-caching with different cache keys

    // Process the request
    const response = await handler(platformRequest);

    // Skip platform-level response caching - services handle their own caching

    return new Response(response.body, {
      status: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "X-Cache": "MISS",
        "X-Cache-Version": unifiedCache.getStats().appVersion,
        ...response.headers,
      },
    });
  };
}

// Helper function for cache bypass detection (re-exported from unified-cache)
export { shouldBypassCache } from "./unified-cache";
