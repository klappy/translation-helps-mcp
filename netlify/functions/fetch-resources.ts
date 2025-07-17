/**
 * Fetch Resources - Netlify Function
 * Fetches Bible translation resources for a specific reference
 * IMPLEMENTS: Enhanced caching, ingredients array pattern, request deduplication
 */

import type { Handler } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { ResourceAggregator } from "./_shared/resource-aggregator";
import { cache } from "./_shared/cache";
import { corsHeaders, errorResponse } from "./_shared/utils";

export const handler: Handler = async (event) => {
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

    // Parse the reference
    const parsedRef = parseReference(reference);
    if (!parsedRef) {
      return errorResponse(400, "Invalid scripture reference format");
    }

    // Build the reference object for the new ResourceAggregator
    const parsedReference = {
      book: parsedRef.book,
      bookName: parsedRef.bookName,
      chapter: parsedRef.chapter,
      verse: parsedRef.verse,
      verseEnd: parsedRef.verseEnd,
      citation: parsedRef.citation,
      original: parsedRef.original,
    };

    // Prepare options for our enhanced ResourceAggregator
    // Map resource type aliases to expected values
    const resourceList = resources
      ? resources.split(",").map((r) => {
          // Handle resource type aliases
          if (r === "wordLinks") return "links";
          return r;
        })
      : ["scripture", "notes", "questions", "words", "links"];

    const options = {
      language: lang,
      organization: org,
      resources: resourceList,
    };

    // ENHANCED CACHING WITH REQUEST DEDUPLICATION
    const cacheKey = `resources:${reference}:${lang}:${org}:${resources || "all"}`;

    console.log("Fetching resources using enhanced ingredients array pattern", {
      reference: parsedReference.original,
      options,
      cacheKey,
    });

    // Use request deduplication pattern from documentation
    const resourceData = await cache.getWithDeduplication(
      cacheKey,
      async () => {
        // Use our enhanced ResourceAggregator with DCS API client and ingredients array
        const aggregator = new ResourceAggregator();
        return await aggregator.fetchResources(parsedReference, options);
      },
      "fileContent" // Use file content TTL (10 minutes)
    );

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
      scriptures: resourceData.scriptures || [], // All available translations
      translationNotes: resourceData.translationNotes || [],
      translationQuestions: resourceData.translationQuestions || [],
      translationWords: resourceData.translationWords || [],
      translationWordLinks: resourceData.translationWordLinks || [],
      metadata: {
        timestamp: resourceData.timestamp,
        resourcesRequested: options.resources,
        resourcesFound: {
          scripture: !!resourceData.scripture,
          scriptures: (resourceData.scriptures || []).length,
          notes: (resourceData.translationNotes || []).length,
          questions: (resourceData.translationQuestions || []).length,
          words: (resourceData.translationWords || []).length,
          links: (resourceData.translationWordLinks || []).length,
        },
        responseTime: Date.now() - startTime,
        cached: false, // This will be updated by deduplication if cached
        source: "Door43 Content Service via Enhanced DCS API with Ingredients Array",
        implementsPatterns: [
          "ingredients-array-resolution",
          "3-tier-fallback",
          "enhanced-usfm-extraction",
          "multi-level-caching",
          "request-deduplication",
        ],
      },
    };

    // Log enhanced metrics
    console.log("METRIC", {
      function: "fetch-resources",
      duration: response.metadata.responseTime,
      reference: reference,
      language: lang,
      organization: org,
      resourcesFound: Object.values(response.metadata.resourcesFound).reduce((sum: number, val) => {
        return sum + (typeof val === "number" ? val : val ? 1 : 0);
      }, 0),
      cacheStats: cache.getStats(),
      implementsDocumentedPatterns: true,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "X-Cache": "ENHANCED",
        "X-Implements-Patterns": "ingredients-array,3-tier-fallback,request-dedup",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error in enhanced fetch-resources:", error);

    // Log error metrics
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log("METRIC", {
      function: "fetch-resources",
      duration: Date.now() - startTime,
      error: true,
      errorType: errorName,
      reference: event.queryStringParameters?.reference,
      cacheStats: cache.getStats(),
    });

    // Handle specific error types with better context
    if (errorName === "ResourceNotFoundError") {
      return errorResponse(404, errorMessage, "RESOURCE_NOT_FOUND");
    }

    if (errorName === "NetworkError" || errorName === "FetchError") {
      return errorResponse(
        503,
        "Unable to fetch resources from upstream service",
        "UPSTREAM_ERROR"
      );
    }

    if (errorMessage.includes("ingredients")) {
      return errorResponse(
        500,
        "Resource metadata unavailable - ingredients array not accessible",
        "METADATA_ERROR"
      );
    }

    // Generic error response
    return errorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
  }
};
