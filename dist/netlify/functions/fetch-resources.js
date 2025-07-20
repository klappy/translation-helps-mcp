/**
 * Fetch Resources - Netlify Function
 * Fetches Bible translation resources for a specific reference
 * IMPLEMENTS: Enhanced caching, ingredients array pattern, request deduplication
 */
import { timedResponse, errorResponse } from "./_shared/utils";
import { fetchResources } from "./_shared/resources-service";
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
        // Parse input from both query params and body
        const params = new URLSearchParams(event.queryStringParameters || {});
        const body = event.body ? JSON.parse(event.body) : {};
        const referenceParam = body.reference || params.get("reference");
        const language = body.language || params.get("language") || "en";
        const organization = body.organization || params.get("organization") || "unfoldingWord";
        const resourcesParam = body.resources || params.get("resources");
        const resources = resourcesParam
            ? Array.isArray(resourcesParam)
                ? resourcesParam
                : resourcesParam.split(",")
            : ["scripture", "notes", "questions", "words"];
        const includeIntro = (body.includeIntro ?? params.get("includeIntro")) !== "false";
        const includeVerseNumbers = (body.includeVerseNumbers ?? params.get("includeVerseNumbers")) !== "false";
        const format = body.format || params.get("format") || "text";
        if (!referenceParam) {
            return errorResponse(400, "Missing reference parameter", "MISSING_PARAMETER");
        }
        // Use the shared resources service
        const result = await fetchResources({
            reference: referenceParam,
            language,
            organization,
            resources,
            includeIntro,
            includeVerseNumbers,
            format: format,
        });
        // Build response matching the original API format + enhanced structure
        const response = {
            // Original format for backward compatibility
            reference: result.reference,
            scripture: result.scripture,
            translationNotes: result.translationNotes,
            translationQuestions: result.translationQuestions,
            translationWords: result.translationWords,
            citations: result.citations,
            language,
            organization,
            // Metadata
            metadata: {
                timestamp: new Date().toISOString(),
                responseTime: result.metadata.responseTime,
                cached: result.metadata.cached,
                resourcesRequested: result.metadata.resourcesRequested,
                resourcesFound: result.metadata.resourcesFound,
                version: "3.6.0",
            },
        };
        return timedResponse(response, startTime, undefined, {
            cached: result.metadata.cached,
            cacheType: result.metadata.cached ? "memory" : undefined,
        });
    }
    catch (error) {
        console.error("Resources error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return errorResponse(500, errorMessage, "FETCH_ERROR");
    }
};
