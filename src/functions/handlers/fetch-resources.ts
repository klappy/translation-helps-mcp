/**
 * Platform-agnostic Fetch Resources Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { Errors } from "../../utils/errorEnvelope.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";
import { fetchResources } from "../resources-service";
import type { CacheBypassOptions } from "../unified-cache";

export const fetchResourcesHandler: PlatformHandler = async (
  request: PlatformRequest,
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
    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";
    const resourcesParam = request.queryStringParameters.resources;

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify(Errors.missingParameter("reference")),
      };
    }

    // Parse resources array if provided
    let resources = ["scripture", "notes", "questions", "words", "links"];
    if (resourcesParam) {
      try {
        resources = JSON.parse(resourcesParam);
      } catch {
        // Fall back to comma-separated string
        resources = resourcesParam.split(",").map((r) => r.trim());
      }
    }

    // Prepare cache bypass options from request
    const bypassOptions: CacheBypassOptions = {
      queryParams: request.queryStringParameters,
      headers: request.headers,
    };

    // Fetch resources
    const result = await fetchResources({
      reference: referenceParam,
      language,
      organization,
      resources,
    });

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
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(Errors.internal()),
    };
  }
};
