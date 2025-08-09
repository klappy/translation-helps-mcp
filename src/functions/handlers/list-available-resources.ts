/**
 * Platform-agnostic List Available Resources Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { ResourceDescriptions, ResourceType } from "../../constants/terminology.js";
import { logger } from "../../utils/logger.js";
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

    logger.info("Listing available resources", { language, organization, query });
    const resourceTypes = [
      {
        type: ResourceType.ULT,
        name: "unfoldingWord Literal Text",
        description: ResourceDescriptions[ResourceType.ULT],
        languages: language ? [language] : ["en"],
      },
      {
        type: ResourceType.UST,
        name: "unfoldingWord Simplified Text",
        description: ResourceDescriptions[ResourceType.UST],
        languages: language ? [language] : ["en"],
      },
      {
        type: ResourceType.GLT,
        name: "Gateway Literal Text",
        description: ResourceDescriptions[ResourceType.GLT],
        languages: language ? [language] : ["es", "fr", "pt", "ru"],
      },
      {
        type: ResourceType.GST,
        name: "Gateway Simplified Text",
        description: ResourceDescriptions[ResourceType.GST],
        languages: language ? [language] : ["es", "fr", "pt", "ru"],
      },
      {
        type: ResourceType.TN,
        name: "Translation Notes",
        description: ResourceDescriptions[ResourceType.TN],
        languages: language ? [language] : ["en", "es", "fr"],
      },
      {
        type: ResourceType.TQ,
        name: "Translation Questions",
        description: ResourceDescriptions[ResourceType.TQ],
        languages: language ? [language] : ["en", "es", "fr"],
      },
      {
        type: ResourceType.TW,
        name: "Translation Words",
        description: ResourceDescriptions[ResourceType.TW],
        languages: language ? [language] : ["en", "es", "fr"],
      },
      {
        type: ResourceType.TWL,
        name: "Translation Words Links",
        description: ResourceDescriptions[ResourceType.TWL],
        languages: language ? [language] : ["en", "es", "fr"],
      },
      {
        type: ResourceType.TA,
        name: "Translation Academy",
        description: ResourceDescriptions[ResourceType.TA],
        languages: language ? [language] : ["en", "es", "fr"],
      },
      {
        type: ResourceType.OBS,
        name: "Open Bible Stories",
        description: ResourceDescriptions[ResourceType.OBS],
        languages: language ? [language] : ["en", "es", "fr", "pt", "ru", "ar"],
      },
    ];

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        resourceTypes,
        metadata: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          resourcesFound: resourceTypes.length,
          query,
          language,
          organization,
          terminology: "Strategic Language compliant",
          translationApproaches: ["form-centric", "meaning-based"],
        },
      }),
    };
  } catch (error) {
    logger.error("List Available Resources API Error", { error: String(error) });
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
