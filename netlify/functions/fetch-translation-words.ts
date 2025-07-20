import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { timedResponse, errorResponse } from "./_shared/utils";
import { fetchTranslationWords } from "./_shared/translation-words-service";

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
    const params = new URLSearchParams(
      (event.queryStringParameters as Record<string, string>) || {}
    );
    const referenceParam = params.get("reference");
    const language = params.get("language") || "en";
    const organization = params.get("organization") || "unfoldingWord";
    const category = params.get("category") || undefined;

    if (!referenceParam) {
      return errorResponse(400, "Missing reference parameter", "MISSING_PARAMETER");
    }

    // Use the shared translation words service
    const result = await fetchTranslationWords({
      reference: referenceParam,
      language,
      organization,
      category,
    });

    // Build response matching the original API format + enhanced structure
    const response = {
      // Original format for backward compatibility
      translationWords: result.translationWords,
      citation: result.citation,
      language,
      organization,

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: result.metadata.responseTime,
        cached: result.metadata.cached,
        wordsFound: result.metadata.wordsFound,
        version: "3.6.0",
      },
    };

    return timedResponse(response, startTime, undefined, {
      cached: result.metadata.cached,
      cacheType: result.metadata.cached ? "memory" : undefined,
    });
  } catch (error) {
    console.error("Translation words error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(500, errorMessage, "FETCH_ERROR");
  }
};
