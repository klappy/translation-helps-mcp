/**
 * Platform-agnostic Get Context Handler - ULTIMATE SIMPLE VERSION
 * No imports, no services, just HTTP calls to our working endpoints
 */

import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

export const getContextHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
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
    const reference = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";

    if (!reference) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing required parameter: 'reference'",
          code: "MISSING_PARAMETER",
          message:
            "Please provide a Bible reference. Example: ?reference=John+3:16",
        }),
      };
    }

    // Get the host from the request headers
    const host =
      request.headers?.host || request.headers?.Host || "localhost:8174";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Build query string
    const params = new URLSearchParams({
      reference,
      language,
      organization,
    });

    // Make parallel requests to our own endpoints
    const [scriptureRes, notesRes, questionsRes, linksRes] = await Promise.all([
      fetch(`${baseUrl}/api/fetch-scripture?${params}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${baseUrl}/api/fetch-translation-notes?${params}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${baseUrl}/api/fetch-translation-questions?${params}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${baseUrl}/api/fetch-translation-word-links?${params}`)
        .then((r) => r.json())
        .catch(() => null),
    ]);

    const contextArray = [];

    // Process scripture
    if (scriptureRes?.data?.length > 0) {
      contextArray.push({
        type: "scripture",
        data: scriptureRes.data,
        count: scriptureRes.data.length,
        note: "All available scripture versions",
      });
    }

    // Process notes
    if (notesRes?.notes?.length > 0) {
      contextArray.push({
        type: "translation-notes",
        data: notesRes.notes,
        count: notesRes.notes.length,
      });
    }

    // Process questions
    if (questionsRes?.translationQuestions?.length > 0) {
      contextArray.push({
        type: "translation-questions",
        data: questionsRes.translationQuestions,
        count: questionsRes.translationQuestions.length,
      });
    }

    // Process word links
    if (linksRes?.links?.length > 0) {
      const uniqueWords = new Map();
      linksRes.links.forEach((link: any) => {
        if (link.TWLink && !uniqueWords.has(link.TWLink)) {
          uniqueWords.set(link.TWLink, {
            word: link.TWLink,
            occurrences: link.Occurrence || 1,
            originalWords: link.OrigWords || "",
          });
        }
      });

      if (uniqueWords.size > 0) {
        contextArray.push({
          type: "translation-words",
          data: Array.from(uniqueWords.values()),
          count: uniqueWords.size,
          note: "Use /api/get-translation-word to fetch full articles",
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        context: contextArray,
        reference,
        language,
        organization,
        metadata: {
          responseTime: duration,
          timestamp: new Date().toISOString(),
          resourceTypes: contextArray.map((r) => r.type),
          totalResourcesReturned: contextArray.reduce(
            (sum, r) => sum + r.count,
            0,
          ),
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
