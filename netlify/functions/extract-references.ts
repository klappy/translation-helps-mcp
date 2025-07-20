/**
 * Extract References Endpoint
 * POST /api/extract-references
 */

import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { timedResponse, errorResponse } from "./_shared/utils";
import { extractReferences } from "./_shared/references-service";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    // Parse input from both query params and body
    const params = new URLSearchParams(
      (event.queryStringParameters as Record<string, string>) || {}
    );
    const body = event.body ? JSON.parse(event.body) : {};

    const text = body.text || params.get("text");
    const includeContext = (body.includeContext ?? params.get("includeContext")) === "true";

    if (!text) {
      return errorResponse(400, "Missing text parameter", "MISSING_PARAMETER");
    }

    // Use the shared references service
    const result = await extractReferences({
      text,
      includeContext,
    });

    // Build response matching the original API format + enhanced structure
    const response = {
      // Original format for backward compatibility
      references: result.references,

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: result.metadata.responseTime,
        referencesFound: result.metadata.referencesFound,
        textLength: text.length,
        version: "3.6.0",
      },
    };

    return timedResponse(response, startTime);
  } catch (error) {
    console.error("Extract references error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(500, errorMessage, "EXTRACT_ERROR");
  }
};
