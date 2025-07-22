/**
 * Platform-agnostic List Available Resources Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 * 
 * Returns unfoldingWord-compliant resource types with Strategic Language terminology.
 */

import { ResourceDescriptions } from "../constants/terminology";
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

    // Resource types aligned with unfoldingWord standards
    // This should be enhanced to actually search the API catalog
    const result = {
      resources: [
        {
          type: "ult",
          name: "ULT/GLT (Literal Text)",
          description: "Form-centric translation preserving original language structure, word order, and idioms",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "ust", 
          name: "UST/GST (Simplified Text)",
          description: "Meaning-based translation in clear, natural language demonstrating clear expression",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "tn",
          name: "Translation Notes",
          description: "Verse-by-verse explanations for difficult passages with cultural background",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "tw",
          name: "Translation Words", 
          description: "Comprehensive biblical term definitions with consistent terminology",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "twl",
          name: "Translation Words Links",
          description: "Precise mapping of original language words to Translation Words definitions",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "tq",
          name: "Translation Questions",
          description: "Comprehension validation questions for translation checking",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "ta",
          name: "Translation Academy",
          description: "Translation methodology and theory with best practices",
          languages: language ? [language] : ["en", "es", "fr"],
        },
        {
          type: "alignment",
          name: "Word Alignment Data",
          description: "Word-level connections between Strategic Language and original Hebrew/Greek",
          languages: language ? [language] : ["en", "es", "fr"],
        },
      ],
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        resourcesFound: 8,
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
