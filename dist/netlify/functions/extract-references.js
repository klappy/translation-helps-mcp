/**
 * Extract References Endpoint
 * POST /api/extract-references
 */
import { extractReferences } from "./_shared/reference-parser";
import { timedResponse, errorResponse } from "./_shared/utils";
export const handler = async (event, context) => {
    const startTime = Date.now();
    console.log("Extract references requested");
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: "",
        };
    }
    if (event.httpMethod !== "GET") {
        return errorResponse(405, "This endpoint only accepts GET requests", "METHOD_NOT_ALLOWED");
    }
    try {
        const { text } = event.queryStringParameters || {};
        if (!text || typeof text !== "string") {
            return errorResponse(400, "Text parameter is required and must be a string", "MISSING_PARAMETER", { example: "/api/extract-references?text=See%20John%203:16%20and%20Genesis%201:1" });
        }
        const references = extractReferences(text);
        const result = {
            text,
            references,
            count: references.length,
        };
        return timedResponse(result, startTime);
    }
    catch (error) {
        console.error("Extract references error:", error);
        return errorResponse(500, "Failed to extract references from text", "INTERNAL_SERVER_ERROR");
    }
};
