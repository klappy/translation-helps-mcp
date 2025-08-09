/**
 * Platform-agnostic Extract References Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { Errors } from "../../utils/errorEnvelope.js";
import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { extractReferences } from "../reference-parser";

export const extractReferencesHandler: PlatformHandler = async (
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
    const text = request.queryStringParameters.text;

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify(Errors.missingParameter("text")),
      };
    }

    // Extract references
    const result = extractReferences(text);

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
        references: result,
        metadata: {
          responseTime: duration,
          timestamp: new Date().toISOString(),
          referencesFound: result.length,
        },
      }),
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
