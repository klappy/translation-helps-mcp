/**
 * Platform-agnostic Fetch Translation Questions Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { fetchTranslationQuestions } from "../translation-questions-service";

export const fetchTranslationQuestionsHandler: PlatformHandler = async (
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
    // Parse parameters from either query string or POST body
    let params: { reference?: string; language?: string; organization?: string } = {};

    if (request.method === "POST" && request.body) {
      try {
        params = JSON.parse(request.body);
      } catch {
        params = {};
      }
    }

    // Prefer query parameters over body parameters
    const referenceParam = request.queryStringParameters.reference || params.reference;
    const language = request.queryStringParameters.language || params.language || "en";
    const organization =
      request.queryStringParameters.organization || params.organization || "unfoldingWord";

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing reference parameter",
          code: "MISSING_PARAMETER",
        }),
      };
    }

    // Fetch translation questions
    const result = await fetchTranslationQuestions({
      reference: referenceParam,
      language,
      organization,
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
    console.error("Translation Questions API Error:", error);
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        error: "Failed to fetch translation questions",
        code: "INTERNAL_ERROR",
      }),
    };
  }
};
