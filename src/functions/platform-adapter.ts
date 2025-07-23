// Platform-agnostic adapter for function handling
import { CacheBypassOptions, shouldBypassCache, unifiedCache } from "./unified-cache";

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

export type PlatformHandler = (request: PlatformRequest) => Promise<PlatformResponse>;

// Cache interface for platform wrappers (deprecated - use unified cache)
export interface CacheAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
}

// Generate cache key from request
function generateRequestCacheKey(path: string, queryParams: Record<string, string>): string {
  const sortedParams = Object.keys(queryParams)
    .filter((key) => !["nocache", "bypass", "fresh", "_cache"].includes(key)) // Exclude cache control params
    .sort()
    .map((key) => `${key}=${queryParams[key]}`)
    .join("&");

  return `api:${path}${sortedParams ? ":" + sortedParams : ""}`;
}

// Netlify adapter with unified caching
export function createNetlifyHandler(handler: PlatformHandler, _cacheAdapter?: CacheAdapter) {
  // Note: cacheAdapter parameter is ignored in favor of unified cache
  return async (event: any, context: any) => {
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

    const cacheKey = generateRequestCacheKey(event.path, event.queryStringParameters || {});
    const bypassOptions: CacheBypassOptions = {
      queryParams: event.queryStringParameters || {},
      headers: event.headers || {},
    };

    try {
      // Try unified cache first (unless bypassed)
      const cacheResult = await unifiedCache.get(cacheKey, "apiResponse", bypassOptions);

      if (cacheResult.value) {
        console.log(`🚀 Cache HIT for ${event.path}`);
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            ...unifiedCache.generateCacheHeaders(cacheResult),
          },
          body: JSON.stringify(cacheResult.value),
        };
      }

      console.log(`🔄 Cache MISS for ${event.path} - processing request`);
    } catch (error) {
      console.warn("Cache read failed:", error);
    }

    // Process the request
    const response = await handler(request);

    // Cache successful responses (unless bypassed)
    if (response.statusCode === 200 && (!bypassOptions || !shouldBypassCache(bypassOptions))) {
      try {
        const responseData = JSON.parse(response.body);
        await unifiedCache.set(cacheKey, responseData, "apiResponse");
        console.log(`💾 Cached response for ${event.path}`);
      } catch (error) {
        console.warn("Cache write failed:", error);
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
export function createSvelteKitHandler(handler: PlatformHandler, _cacheAdapter?: CacheAdapter) {
  // Note: cacheAdapter parameter is ignored in favor of unified cache
  return async ({ request }: { request: Request }) => {
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

    const cacheKey = generateRequestCacheKey(url.pathname, queryStringParameters);
    const bypassOptions: CacheBypassOptions = {
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
