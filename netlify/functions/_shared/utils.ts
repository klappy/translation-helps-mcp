/**
 * Shared utilities for Netlify Functions
 */

import type { HandlerResponse } from "@netlify/functions";

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
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
): HandlerResponse {
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
export function successResponse(data: any, headers?: Record<string, string>): HandlerResponse {
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
  if (process.env.REQUIRE_API_KEY !== "true") {
    return true;
  }

  const apiKey = headers["x-api-key"] || headers["X-API-Key"];
  return apiKey === process.env.API_KEY;
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
  console.log("METRIC", {
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

  return ttls[resourceType] || parseInt(process.env.DEFAULT_TTL || "3600");
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
  headers?: Record<string, string>
): HandlerResponse {
  const responseData = addResponseTime(data, startTime);
  return successResponse(responseData, headers);
}
