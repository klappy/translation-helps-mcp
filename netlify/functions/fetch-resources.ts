/**
 * Fetch Resources - Netlify Function
 * Fetches Bible translation resources for a specific reference
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

    // Prepare options
    const options = {
      language: lang,
      organization: org,
      resources: resources
        ? resources.split(",")
        : ["scripture", "notes", "questions", "words", "links"],
    };

    // Fetch resources
    const aggregator = new ResourceAggregator();
    const resourceData = await aggregator.fetchResources(parsedRef, options);

    // Build response
    const response = {
      reference: {
        book: parsedRef.book,
        bookName: parsedRef.bookName,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        verseEnd: parsedRef.verseEnd,
        citation: parsedRef.citation,
      },
      scripture: resourceData.scripture || null,
      translationNotes: resourceData.translationNotes || [],
      translationQuestions: resourceData.translationQuestions || [],
      translationWords: resourceData.translationWords || [],
      translationWordLinks: resourceData.translationWordLinks || [],
      metadata: {
        language: lang,
        organization: org,
        timestamp: new Date().toISOString(),
        resourcesFound: Object.keys(resourceData).filter((key) => {
          const value = resourceData[key];
          return value && (Array.isArray(value) ? value.length > 0 : true);
        }),
        responseTime: Date.now() - startTime,
        cached: false,
      },
    };

    // Cache the successful response
    await cache.set(cacheKey, response, 3600); // 1 hour TTL

    // Log metrics
    console.log("METRIC", {
      function: "fetch-resources",
      duration: response.metadata.responseTime,
      cacheHit: 0,
      reference: reference,
      language: lang,
      organization: org,
      resourcesFound: response.metadata.resourcesFound.length,
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
  } catch (error) {
    console.error("Error in fetch-resources:", error);

    // Log error metrics
    console.log("METRIC", {
      function: "fetch-resources",
      duration: Date.now() - startTime,
      error: true,
      errorType: error.name,
      reference: event.queryStringParameters?.reference,
    });

    // Handle specific error types
    if (error.name === "ResourceNotFoundError") {
      return errorResponse(404, error.message, "RESOURCE_NOT_FOUND");
    }

    if (error.name === "NetworkError" || error.name === "FetchError") {
      return errorResponse(
        503,
        "Unable to fetch resources from upstream service",
        "UPSTREAM_ERROR"
      );
    }

    // Generic error response
    return errorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
  }
};
