/**
 * Fetch Resources - Netlify Function
 * Fetches Bible translation resources for a specific reference
 * IMPLEMENTS: Enhanced caching, ingredients array pattern, request deduplication
 */
import { ResourceAggregator } from "./_shared/resource-aggregator";
import { parseReference } from "./_shared/reference-parser";
import { timedResponse } from "./_shared/utils";
import { z } from "zod";
// Configuration schema with defaults
const configSchema = z.object({
    language: z.string().default("en"),
    organization: z.string().default("unfoldingWord"),
    resources: z.array(z.string()).default(["scripture", "notes", "questions", "words", "links"]),
});
export const handler = async (event) => {
    const startTime = Date.now();
    // Set CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json",
    };
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }
    try {
        // Parse and validate input
        const body = event.body ? JSON.parse(event.body) : {};
        // Parse configuration with defaults
        const config = configSchema.parse({
            language: body.language || event.queryStringParameters?.language,
            organization: body.organization || event.queryStringParameters?.organization,
            resources: body.resources || event.queryStringParameters?.resources?.split(","),
        });
        const reference = body.reference || event.queryStringParameters?.reference;
        if (!reference) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Reference parameter is required",
                    example: "?reference=John 3:16&language=en&organization=unfoldingWord&resources=all",
                }),
            };
        }
        console.log(`📖 Fetch Resources Request:`, {
            reference,
            config,
            method: event.httpMethod,
        });
        // Parse the reference
        const parsedRef = parseReference(reference);
        if (!parsedRef) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Invalid reference format", reference }),
            };
        }
        // Handle "all" resources shorthand
        const resourceTypes = config.resources.includes("all")
            ? ["scripture", "notes", "questions", "words", "links"]
            : config.resources;
        // Fetch resources
        const aggregator = new ResourceAggregator();
        const resourceData = await aggregator.fetchResources(parsedRef, {
            language: config.language,
            organization: config.organization,
            resources: resourceTypes,
        });
        // Add metadata
        const response = {
            ...resourceData,
            reference: parsedRef,
            config: {
                language: config.language,
                organization: config.organization,
                resources: resourceTypes,
            },
            metadata: {
                cached: false,
            },
            summary: {
                scripture: resourceData.scriptures?.length || 0,
                notes: resourceData.translationNotes?.length || 0,
                questions: resourceData.translationQuestions?.length || 0,
                words: resourceData.translationWords?.length || 0,
                links: resourceData.translationWordLinks?.length || 0,
            },
        };
        return timedResponse(response, startTime, headers);
    }
    catch (error) {
        console.error("❌ Fetch Resources Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Internal server error",
                details: error instanceof Error ? error.message : String(error),
                hint: "Check that organization and language are correct. Example: organization=unfoldingWord, language=en",
            }),
        };
    }
};
