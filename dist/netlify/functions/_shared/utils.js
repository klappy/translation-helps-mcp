/**
 * Shared utilities for Netlify Functions
 */
import { cache } from "./cache.js";
import fs from "fs";
import path from "path";
// Get the actual version from package.json (via version.json)
let packageVersion = "4.0.0"; // Default fallback
try {
    const versionPath = path.join(process.cwd(), "netlify/functions/_shared/version.json");
    if (fs.existsSync(versionPath)) {
        const versionData = JSON.parse(fs.readFileSync(versionPath, "utf8"));
        packageVersion = versionData.version;
    }
}
catch (error) {
    console.warn("Could not read version.json, using default version:", packageVersion);
}
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
export function errorResponse(statusCode, message, code, details) {
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
export function successResponse(data, headers) {
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
export function validateApiKey(headers) {
    if (process.env.REQUIRE_API_KEY !== "true") {
        return true;
    }
    const apiKey = headers["x-api-key"] || headers["X-API-Key"];
    return apiKey === process.env.API_KEY;
}
/**
 * Parse and validate JSON body
 */
export function parseJsonBody(body) {
    if (!body)
        return null;
    try {
        return JSON.parse(body);
    }
    catch {
        return null;
    }
}
/**
 * Log metrics for monitoring
 */
export function logMetric(functionName, metrics) {
    console.log("METRIC", {
        function: functionName,
        timestamp: new Date().toISOString(),
        ...metrics,
    });
}
/**
 * Create cache key with consistent format
 */
export function createCacheKey(parts) {
    return parts
        .filter((part) => part !== undefined)
        .map((part) => String(part).toLowerCase().replace(/\s+/g, "-"))
        .join(":");
}
/**
 * Parse comma-separated values
 */
export function parseCommaSeparated(value) {
    if (!value)
        return [];
    return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}
/**
 * Calculate TTL based on resource type
 */
export function getResourceTTL(resourceType) {
    const ttls = {
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
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}
/**
 * Sleep utility for rate limiting
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Chunk array into smaller arrays
 */
export function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * Deep merge objects
 */
export function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = deepMerge((result[key] || {}), source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
/**
 * Add consistent metadata to any response object
 */
export function addMetadata(data, startTime, additionalMetadata) {
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
export function addResponseTime(data, startTime) {
    const responseTime = Date.now() - startTime;
    return {
        ...data,
        responseTime,
    };
}
/**
 * Create a response with timing information
 */
export function timedResponse(data, startTime, headers, cacheInfo) {
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
export async function withConservativeCache(request, cacheKey, fetcher, options) {
    const { cacheType = "transformedResponse", customTtl, bypassCache = false } = options || {};
    // Check for cache bypass headers
    const shouldBypassCache = bypassCache ||
        request.headers.get("cache-control")?.includes("no-cache") ||
        request.headers.get("x-bypass-cache") === "true";
    if (shouldBypassCache) {
        console.log(`🚫 Cache bypassed for: ${cacheKey}`);
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
            console.log(`🎯 Serving from cache: ${cacheKey}`);
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
        console.log(`⚡ Cache miss, fetching fresh: ${cacheKey}`);
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
    }
    catch (error) {
        console.error(`❌ Cache error for ${cacheKey}:`, error);
        // Fallback to direct fetch without caching
        const data = await fetcher();
        return {
            data,
            cached: false,
            cacheHeaders: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Cache-Status": "ERROR",
                "X-Cache-Error": error.message,
            },
        };
    }
}
/**
 * Build a versioned cache key for DCS resources
 */
export function buildDCSCacheKey(endpoint, params = {}) {
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
export function buildTransformedCacheKey(endpoint, params = {}) {
    const appVersion = packageVersion;
    const paramString = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .join(":");
    return `v${appVersion}:transformed:${endpoint}${paramString ? `:${paramString}` : ""}`;
}
