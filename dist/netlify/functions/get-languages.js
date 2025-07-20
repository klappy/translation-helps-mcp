/**
 * Get Languages Endpoint
 * GET /api/get-languages
 * IMPLEMENTS: Enhanced caching with version-aware keys and proper headers
 */
import { timedResponse, errorResponse } from "./_shared/utils";
import { getLanguages } from "./_shared/languages-service";
export const handler = async (event, context) => {
    const startTime = Date.now();
    // Handle CORS
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
            body: "",
        };
    }
    try {
        const params = new URLSearchParams(event.queryStringParameters || {});
        const organization = params.get("organization") || "unfoldingWord";
        const includeAlternateNames = params.get("includeAlternateNames") === "true";
        // Use the shared languages service
        const result = await getLanguages({
            organization,
            includeAlternateNames,
        });
        // Build response matching the original API format + enhanced structure
        const response = {
            // Original format for backward compatibility
            languages: result.languages,
            organization,
            // Metadata
            metadata: {
                timestamp: new Date().toISOString(),
                responseTime: result.metadata.responseTime,
                cached: result.metadata.cached,
                languagesFound: result.metadata.languagesFound,
                version: "3.6.0",
            },
        };
        return timedResponse(response, startTime, undefined, {
            cached: result.metadata.cached,
            cacheType: result.metadata.cached ? "memory" : undefined,
        });
    }
    catch (error) {
        console.error("Languages error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return errorResponse(500, errorMessage, "FETCH_ERROR");
    }
};
