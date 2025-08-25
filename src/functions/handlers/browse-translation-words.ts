/**
 * Platform-agnostic Browse Translation Words Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { Errors } from "../../utils/errorEnvelope.js";
import { logger } from "../../utils/logger.js";
import { browseWords } from "../browse-words-service";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

export const browseTranslationWordsHandler: PlatformHandler = async (
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
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";
    const category = request.queryStringParameters.category;

    logger.info("Browsing translation words", {
      language,
      organization,
      category,
    });

    // Browse translation words
    const result = await browseWords({
      language,
      organization,
      category,
    });

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error("Browse Translation Words API Error", {
      error: String(error),
    });
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(
        Errors.internal("Failed to browse translation words"),
      ),
    };
  }
};
