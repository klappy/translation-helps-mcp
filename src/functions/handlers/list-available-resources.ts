/**
 * Platform-agnostic List Available Resources Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";

export const listAvailableResourcesHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const language = request.queryStringParameters.language;
    const organization = request.queryStringParameters.organization;
    const query = request.queryStringParameters.query;

    // For now, return a basic response with common resource types
    // This should be enhanced to actually search the API catalog
    const result = {
      resources: [
        {
          type: "scripture",
          name: "Scripture Texts",
          description:
            "ULT/GLT (Literal) and UST/GST (Simplified) Scripture texts with embedded word alignment data",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "ult",
          name: "unfoldingWord Literal Text",
          description:
            "Form-centric translation preserving original language structure and word order",
          languages: language ? [language] : ["en"],
        },
        {
          type: "ust",
          name: "unfoldingWord Simplified Text",
          description: "Meaning-based translation demonstrating clear, natural expression",
          languages: language ? [language] : ["en"],
        },
        {
          type: "glt",
          name: "Gateway Literal Text",
          description:
            "Form-centric translation in Strategic Languages preserving source structure",
          languages: language ? [language] : ["es", "fr", "pt", "ru"],
        },
        {
          type: "gst",
          name: "Gateway Simplified Text",
          description: "Meaning-based translation in Strategic Languages emphasizing clarity",
          languages: language ? [language] : ["es", "fr", "pt", "ru"],
        },
        {
          type: "notes",
          name: "Translation Notes",
          description:
            "Verse-by-verse explanations for difficult passages with cultural background",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "questions",
          name: "Translation Questions",
          description: "Comprehension validation questions for translation checking",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "words",
          name: "Translation Words",
          description: "Comprehensive biblical term definitions with cross-references",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "words-links",
          name: "Translation Words Links",
          description: "Maps word occurrences to Translation Words articles",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "academy",
          name: "Translation Academy",
          description: "Translation methodology and best practices training modules",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "obs",
          name: "Open Bible Stories",
          description: "Chronological Scripture overview through 50 key Bible stories",
          languages: language ? [language] : ["en", "es", "fr", "pt", "ru", "ar"],
        },
      ],
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        resourcesFound: 11,
        query,
        language,
        organization,
        terminology: "Strategic Language compliant",
        translationApproaches: ["form-centric", "meaning-based"],
      },
    };

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("List Available Resources API Error:", error);
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        error: "Failed to list available resources",
        code: "INTERNAL_ERROR",
      }),
    };
  }
};
