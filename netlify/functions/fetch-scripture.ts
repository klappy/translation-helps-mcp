import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { timedResponse, errorResponse } from "./_shared/utils";
import { fetchScripture } from "./_shared/scripture-service";

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
    const includeVerseNumbers = params.get("includeVerseNumbers") !== "false";
    const formatParam = params.get("format") || "text";
    const format = (formatParam === "usfm" ? "usfm" : "text") as "text" | "usfm";

    if (!referenceParam) {
      return errorResponse(400, "Missing reference parameter", "MISSING_PARAMETER");
    }

    // Use the shared scripture service
    const result = await fetchScripture({
      reference: referenceParam,
      language,
      organization,
      includeVerseNumbers,
      format,
    });

    // Clean, improved response structure (v4.0.0)
    const response = {
      scripture: result.scripture,
      citation: result.scripture?.citation,
      language,
      organization,
      metadata: {
        cached: result.metadata.cached,
        includeVerseNumbers: result.metadata.includeVerseNumbers,
        format: result.metadata.format,
        filesFound: 1, // We found scripture data
      },
    };

    return timedResponse(response, startTime, undefined, {
      cached: result.metadata.cached,
      cacheType: result.metadata.cached ? "memory" : undefined,
    });
  } catch (error) {
    console.error("Scripture error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(500, errorMessage, "FETCH_ERROR");
  }
};
