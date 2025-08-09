/**
 * Shared utilities for Netlify Functions
 */

// Generic response interface (replaces Netlify-specific HandlerResponse)
interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

import { logger } from "../utils/logger.js";
import { getVersion } from "../version.js";
import { cache } from "./cache.js";

// Get the actual version from package.json (SINGLE SOURCE OF TRUTH)
const packageVersion = getVersion();

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin":
    (typeof process !== "undefined" && process.env?.ALLOWED_ORIGINS) || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Content-Type": "application/json",
};

/**
 * Create a standardized error response
 */
export function errorResponse(
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, any>
): ApiResponse {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: message,
      code: code || "ERROR",
      details,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Create a standardized success response
 */
export function successResponse(data: any, headers?: Record<string, string>): ApiResponse {
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Validate API key if required
 */
export function validateApiKey(headers: Record<string, string>): boolean {
  if (typeof process === "undefined" || process.env?.REQUIRE_API_KEY !== "true") {
    return true;
  }

  const apiKey = headers["x-api-key"] || headers["X-API-Key"];
  return apiKey === process.env?.API_KEY;
}

/**
 * Parse and validate JSON body
 */
export function parseJsonBody<T>(body: string | null): T | null {
  if (!body) return null;

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Log metrics for monitoring
 */
export function logMetric(functionName: string, metrics: Record<string, any>): void {
  logger.info("METRIC", {
    function: functionName,
    timestamp: new Date().toISOString(),
    ...metrics,
  });
}

/**
 * Create cache key with consistent format
 */
export function createCacheKey(parts: (string | number | undefined)[]): string {
  return parts
    .filter((part) => part !== undefined)
    .map((part) => String(part).toLowerCase().replace(/\s+/g, "-"))
    .join(":");
}

/**
 * Parse comma-separated values
 */
export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Calculate TTL based on resource type
 */
export function getResourceTTL(resourceType: string): number {
  const ttls: Record<string, number> = {
    scripture: 7 * 24 * 60 * 60, // 7 days
    notes: 24 * 60 * 60, // 24 hours
    questions: 24 * 60 * 60, // 24 hours
    words: 7 * 24 * 60 * 60, // 7 days
    links: 24 * 60 * 60, // 24 hours
    languages: 24 * 60 * 60, // 24 hours
    search: 60 * 60, // 1 hour
    context: 15 * 60, // 15 minutes
  };

  return (
    ttls[resourceType] ||
    parseInt((typeof process !== "undefined" && process.env?.DEFAULT_TTL) || "3600")
  );
}

/**
 * Format duration for logging
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge((result[key] || {}) as any, source[key] as any);
    } else {
      result[key] = source[key] as any;
    }
  }

  return result;
}

/**
 * Add consistent metadata to any response object
 */
export function addMetadata<T extends Record<string, any>>(
  data: T,
  startTime: number,
  additionalMetadata?: Record<string, any>
): T & {
  metadata: {
    timestamp: string;
    responseTime: number;
    version: string;
    cached?: boolean;
    cacheType?: string;
    cacheExpiresAt?: string;
    cacheTtlSeconds?: number;
  };
} {
  const responseTime = Date.now() - startTime;
  return {
    ...data,
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime,
      version: packageVersion,
      ...additionalMetadata,
    },
  };
}

/**
 * Add response time to any response object
 */
export function addResponseTime<T extends Record<string, any>>(
  data: T,
  startTime: number
): T & { responseTime: number } {
  const responseTime = Date.now() - startTime;
  return {
    ...data,
    responseTime,
  };
}

/**
 * Create a response with timing information
 */
export function timedResponse<T extends Record<string, any>>(
  data: T,
  startTime: number,
  headers?: Record<string, string>,
  cacheInfo?: { cached: boolean; cacheType?: string; expiresAt?: string; ttlSeconds?: number }
): ApiResponse {
  const additionalMetadata = cacheInfo
    ? {
        cached: cacheInfo.cached,
        cacheType: cacheInfo.cacheType,
        cacheExpiresAt: cacheInfo.expiresAt,
        cacheTtlSeconds: cacheInfo.ttlSeconds,
      }
    : {};
  const responseData = addMetadata(data, startTime, additionalMetadata);
  return successResponse(responseData, headers);
}

/**
 * Enhanced response caching helper
 * Implements consistent caching strategy across all functions with version-aware keys
 */
export async function withConservativeCache<T>(
  request: Request,
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    cacheType?:
      | "organizations"
      | "languages"
      | "resources"
      | "fileContent"
      | "metadata"
      | "transformedResponse";
    customTtl?: number;
    bypassCache?: boolean;
  }
): Promise<{
  data: T;
  cached: boolean;
  cacheHeaders: Record<string, string>;
  cacheInfo?: {
    expiresAt?: string;
    ttlSeconds?: number;
    version?: string;
  };
}> {
  const { cacheType = "transformedResponse", customTtl, bypassCache = false } = options || {};

  // Check for cache bypass headers
  const shouldBypassCache =
    bypassCache ||
    request.headers.get("cache-control")?.includes("no-cache") ||
    request.headers.get("x-bypass-cache") === "true";

  if (shouldBypassCache) {
    logger.info(`Cache bypassed`, { cacheKey });
    const data = await fetcher();
    return {
      data,
      cached: false,
      cacheHeaders: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Cache-Status": "BYPASSED",
      },
    };
  }

  try {
    // Try to get from cache first
    const cacheResult = await cache.getWithCacheInfo(cacheKey, cacheType);

    if (cacheResult.cached && cacheResult.value) {
      logger.info(`Serving from cache`, { cacheKey });

      return {
        data: cacheResult.value,
        cached: true,
        cacheInfo: {
          expiresAt: cacheResult.expiresAt,
          ttlSeconds: cacheResult.ttlSeconds,
          version: cacheResult.version,
        },
        cacheHeaders: {
          "Cache-Control": `public, max-age=${Math.max(0, cacheResult.ttlSeconds || 0)}`,
          "X-Cache-Status": "HIT",
          "X-Cache-Type": cacheResult.cacheType || "unknown",
          "X-Cache-Version": cacheResult.version || "unknown",
          "X-Cache-Expires": cacheResult.expiresAt || "unknown",
        },
      };
    }

    // Cache miss - fetch fresh data
    logger.info(`Cache miss, fetching fresh`, { cacheKey });
    const data = await fetcher();

    // Store in cache for next time
    await cache.set(cacheKey, data, cacheType, customTtl);

    // Get cache info for headers
    const newCacheResult = await cache.getWithCacheInfo(cacheKey, cacheType);

    return {
      data,
      cached: false,
      cacheInfo: {
        expiresAt: newCacheResult.expiresAt,
        ttlSeconds: newCacheResult.ttlSeconds,
        version: newCacheResult.version,
      },
      cacheHeaders: {
        "Cache-Control": `public, max-age=${newCacheResult.ttlSeconds || 300}`,
        "X-Cache-Status": "MISS",
        "X-Cache-Type": newCacheResult.cacheType || "unknown",
        "X-Cache-Version": newCacheResult.version || "unknown",
        "X-Cache-Expires": newCacheResult.expiresAt || "unknown",
      },
    };
  } catch (error) {
    logger.error(`Cache error`, { cacheKey, error: String(error) });

    // Fallback to direct fetch without caching
    const data = await fetcher();
    return {
      data,
      cached: false,
      cacheHeaders: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Cache-Status": "ERROR",
        "X-Cache-Error": (error as Error).message,
      },
    };
  }
}

/**
 * Build a versioned cache key for DCS resources
 */
export function buildDCSCacheKey(endpoint: string, params: Record<string, any> = {}): string {
  const appVersion = packageVersion;
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join(":");

  return `v${appVersion}:dcs:${endpoint}${paramString ? `:${paramString}` : ""}`;
}

/**
 * Build cache key for transformed/processed responses
 */
export function buildTransformedCacheKey(
  endpoint: string,
  params: Record<string, any> = {}
): string {
  const appVersion = packageVersion;
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join(":");

  return `v${appVersion}:transformed:${endpoint}${paramString ? `:${paramString}` : ""}`;
}
