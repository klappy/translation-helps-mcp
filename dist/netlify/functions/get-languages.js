/**
 * Get Languages Endpoint
 * GET /api/get-languages
 * IMPLEMENTS: Enhanced caching with proper TTLs (documented pattern)
 */
import { DCSApiClient } from "../../src/services/DCSApiClient.js";
import { cache } from "./_shared/cache";
import { corsHeaders, errorResponse } from "./_shared/utils";
import { readFileSync } from "fs";
import { join } from "path";
// Get version directly from package.json - SINGLE SOURCE OF TRUTH!
const packageJsonPath = join(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const API_VERSION = packageJson.version;
export const handler = async (event, context) => {
    console.log("Get languages requested with enhanced caching");
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders };
    }
    if (event.httpMethod !== "GET") {
        return errorResponse(405, "Method not allowed", "METHOD_NOT_ALLOWED");
    }
    const startTime = Date.now();
    try {
        // Enhanced cache key with version for cache invalidation on releases
        const cacheKey = `languages:all:v${API_VERSION}`;
        console.log("Fetching ALL languages using enhanced caching and request deduplication...");
        // Use enhanced caching with request deduplication (documented pattern)
        const languagesData = await cache.getWithDeduplication(cacheKey, async () => {
            console.log("Cache miss - fetching from DCS dedicated languages endpoint");
            // Use our DCS API client to fetch language data from the fast endpoint
            const dcsClient = new DCSApiClient();
            const response = await dcsClient.getLanguages();
            if (!response.success) {
                console.error("Failed to fetch languages from DCS:", response.error);
                throw new Error(response.error?.message || "Failed to fetch languages from DCS");
            }
            const languages = response.data || [];
            // Transform the data to include additional metadata for the UI
            const transformedLanguages = languages.map((lang) => ({
                code: lang.code,
                name: lang.name,
                romanizedName: lang.romanizedName,
                direction: lang.direction,
                region: lang.region,
                homeCountry: lang.homeCountry,
                countryCodes: lang.countryCodes,
                alternativeNames: lang.alternativeNames,
                isGatewayLanguage: lang.isGatewayLanguage,
                // Add common resource types that are typically available
                resources: ["scripture", "notes", "questions", "words", "links"],
            }));
            console.log(`Successfully fetched ${transformedLanguages.length} languages from DCS`);
            return {
                success: true,
                data: transformedLanguages,
                count: transformedLanguages.length,
                timestamp: new Date().toISOString(),
                cached: false,
            };
        }, "languages" // Use languages TTL (1 hour)
        );
        // Prepare final response with enhanced metadata
        const responseData = {
            ...languagesData,
            metadata: {
                source: "Door43 Content Service via Enhanced DCS API",
                apiVersion: API_VERSION,
                responseTime: Date.now() - startTime,
                cacheStats: cache.getStats(),
                implementsPatterns: [
                    "dedicated-languages-endpoint",
                    "enhanced-caching",
                    "request-deduplication",
                ],
            },
        };
        // Log enhanced metrics
        console.log("METRIC", {
            function: "get-languages",
            duration: responseData.metadata.responseTime,
            languageCount: languagesData.count,
            cacheStats: cache.getStats(),
            implementsDocumentedPatterns: true,
        });
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "Cache-Control": "public, max-age=3600", // 1 hour cache (matches internal TTL)
                "X-Cache": "ENHANCED",
                "X-Implements-Patterns": "dedicated-endpoint,enhanced-caching,request-dedup",
            },
            body: JSON.stringify(responseData),
        };
    }
    catch (error) {
        console.error("Error in enhanced get-languages:", error);
        // Log error metrics
        console.log("METRIC", {
            function: "get-languages",
            duration: Date.now() - startTime,
            error: true,
            errorType: error instanceof Error ? error.name : "UnknownError",
            cacheStats: cache.getStats(),
        });
        // Handle specific error types
        if (error instanceof Error && error.message.includes("DCS")) {
            return errorResponse(503, "Unable to fetch languages from upstream service", "UPSTREAM_ERROR");
        }
        return errorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
    }
};
