/**
 * Fetch Resources - Netlify Function
 * Fetches Bible translation resources for a specific reference
 */
import { parseReference } from "./_shared/reference-parser";
import { ResourceAggregator } from "../../src/services/ResourceAggregator.js";
import { cache } from "./_shared/cache";
import { corsHeaders, errorResponse } from "./_shared/utils";
export const handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders };
    }
    // Only allow GET requests
    if (event.httpMethod !== "GET") {
        return errorResponse(405, "Method not allowed", "METHOD_NOT_ALLOWED");
    }
    const startTime = Date.now();
    try {
        // Parse query parameters
        const params = event.queryStringParameters || {};
        const { reference, lang = "en", org = "unfoldingWord", resources } = params;
        // Validate required parameters
        if (!reference) {
            return errorResponse(400, "Reference parameter is required", "MISSING_REFERENCE");
        }
        // Create cache key
        const cacheKey = `resources:${reference}:${lang}:${org}:${resources || "all"}`;
        // Check cache
        const cached = await cache.get(cacheKey);
        if (cached) {
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    "X-Cache": "HIT",
                    "Cache-Control": "public, max-age=300",
                },
                body: JSON.stringify({
                    ...cached,
                    metadata: {
                        ...cached.metadata,
                        cached: true,
                        responseTime: Date.now() - startTime,
                    },
                }),
            };
        }
        // Parse the Bible reference
        const parsedRef = parseReference(reference);
        if (!parsedRef) {
            return errorResponse(400, `Invalid Bible reference: ${reference}`, "INVALID_REFERENCE");
        }
        // Convert Reference to ParsedReference for our ResourceAggregator
        const parsedReference = {
            book: parsedRef.book,
            chapter: parsedRef.chapter,
            verse: parsedRef.verse,
            endVerse: parsedRef.verseEnd,
            originalText: parsedRef.original,
            isValid: true, // If parseReference succeeded, it's valid
        };
        // Prepare options for our new ResourceAggregator
        const options = {
            language: lang,
            organization: org,
            resources: resources
                ? resources.split(",")
                : ["scripture", "notes", "questions", "words", "links"],
        };
        console.log("Fetching resources using new DCS API client", {
            reference: parsedReference.originalText,
            options,
        });
        // Use our new ResourceAggregator with DCS API client
        const aggregator = new ResourceAggregator(lang, org);
        const resourceData = await aggregator.aggregateResources(parsedReference, options);
        // Build response using the aggregated data
        const response = {
            reference: {
                book: parsedRef.book,
                bookName: parsedRef.bookName,
                chapter: parsedRef.chapter,
                verse: parsedRef.verse,
                verseEnd: parsedRef.verseEnd,
                citation: parsedRef.citation,
                original: parsedRef.original,
            },
            language: resourceData.language,
            organization: resourceData.organization,
            scripture: resourceData.scripture || null,
            translationNotes: resourceData.translationNotes || [],
            translationQuestions: resourceData.translationQuestions || [],
            translationWords: resourceData.translationWords || [],
            translationWordLinks: resourceData.translationWordLinks || [],
            metadata: {
                timestamp: resourceData.timestamp,
                resourcesRequested: options.resources,
                resourcesFound: {
                    scripture: !!resourceData.scripture,
                    notes: (resourceData.translationNotes || []).length,
                    questions: (resourceData.translationQuestions || []).length,
                    words: (resourceData.translationWords || []).length,
                    links: (resourceData.translationWordLinks || []).length,
                },
                responseTime: Date.now() - startTime,
                cached: false,
                source: "Door43 Content Service via DCS API",
            },
        };
        // Cache the successful response
        await cache.set(cacheKey, response, 1800); // 30 minutes TTL
        // Log metrics
        console.log("METRIC", {
            function: "fetch-resources",
            duration: response.metadata.responseTime,
            cacheHit: 0,
            reference: reference,
            language: lang,
            organization: org,
            resourcesFound: Object.values(response.metadata.resourcesFound).reduce((sum, val) => {
                return sum + (typeof val === "number" ? val : val ? 1 : 0);
            }, 0),
        });
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                "X-Cache": "MISS",
                "Cache-Control": "public, max-age=300",
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error("Error in fetch-resources:", error);
        // Log error metrics
        const errorName = error instanceof Error ? error.name : "UnknownError";
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("METRIC", {
            function: "fetch-resources",
            duration: Date.now() - startTime,
            error: true,
            errorType: errorName,
            reference: event.queryStringParameters?.reference,
        });
        // Handle specific error types
        if (errorName === "ResourceNotFoundError") {
            return errorResponse(404, errorMessage, "RESOURCE_NOT_FOUND");
        }
        if (errorName === "NetworkError" || errorName === "FetchError") {
            return errorResponse(503, "Unable to fetch resources from upstream service", "UPSTREAM_ERROR");
        }
        // Generic error response
        return errorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
    }
};
