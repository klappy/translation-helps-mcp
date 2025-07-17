/**
 * Get Languages Endpoint
 * GET /api/get-languages
 */
import { DCSApiClient } from "../../src/services/DCSApiClient.js";
// Simple in-memory cache for development (5 minute TTL)
let languageCache = {};
let cacheTimestamp = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const handler = async (event, context) => {
    console.log("Get languages requested");
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
    };
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers,
            body: "",
        };
    }
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: "Method not allowed",
                message: "This endpoint only accepts GET requests",
            }),
        };
    }
    try {
        // Create cache key for all languages
        const cacheKey = "all";
        const now = Date.now();
        // Check cache first
        if (languageCache[cacheKey] &&
            cacheTimestamp[cacheKey] &&
            now - cacheTimestamp[cacheKey] < CACHE_TTL) {
            console.log(`Returning cached languages`);
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    "Cache-Control": "public, max-age=300",
                    "X-Cache": "HIT",
                },
                body: JSON.stringify(languageCache[cacheKey]),
            };
        }
        console.log("Fetching ALL languages from DCS dedicated languages endpoint...");
        // Use our new DCS API client to fetch language data from the fast endpoint
        const dcsClient = new DCSApiClient();
        const response = await dcsClient.getLanguages();
        if (!response.success) {
            console.error("Failed to fetch languages from DCS:", response.error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "Failed to fetch languages",
                    message: response.error?.message || "Unknown error",
                    code: response.error?.code || "DCS_ERROR",
                }),
            };
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
        console.log(`Successfully fetched ${transformedLanguages.length} languages`);
        // Prepare response
        const responseData = {
            success: true,
            data: transformedLanguages,
            count: transformedLanguages.length,
            timestamp: new Date().toISOString(),
            metadata: {
                source: "Door43 Content Service",
                cached: false,
                responseTime: Date.now(),
            },
        };
        // Store in cache
        languageCache[cacheKey] = responseData;
        cacheTimestamp[cacheKey] = now;
        return {
            statusCode: 200,
            headers: {
                ...headers,
                "Cache-Control": "public, max-age=300",
                "X-Cache": "MISS",
            },
            body: JSON.stringify(responseData),
        };
    }
    catch (error) {
        console.error("Error in get-languages:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            }),
        };
    }
};
