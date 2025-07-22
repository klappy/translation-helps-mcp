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
            "ULT/GLT (Literal) and UST/GST (Simplified) Scripture texts with word alignment",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "notes",
          name: "Translation Notes",
          description:
            "Verse-by-verse cultural and linguistic guidance for Mother Tongue Translators",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "questions",
          name: "Translation Questions",
          description:
            "Community checking and comprehension validation questions for quality assurance",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "words",
          name: "Translation Words",
          description: "Key biblical terms and concepts",
          languages: language ? [language] : ["en", "es", "fr"],
        },
      ],
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        resourcesFound: 4,
        query,
        language,
        organization,
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
