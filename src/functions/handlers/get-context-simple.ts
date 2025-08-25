/**
 * Platform-agnostic Get Context Handler - SIMPLE DIRECT VERSION
 * Aggregates ALL resources by calling endpoints directly
 */

import { Errors } from "../../utils/errorEnvelope.js";
import { logger } from "../../utils/logger.js";
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

    if (!referenceParam) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(Errors.missingParameter("reference")),
      };
    }

    logger.info("Fetching comprehensive context (simple version)", {
      reference: referenceParam,
      language,
      organization,
    });

    const contextArray = [];
    // When running in edge function, we need to use relative URLs
    const isEdge =
      typeof globalThis.Deno !== "undefined" ||
      typeof globalThis.EdgeRuntime !== "undefined";
    const baseUrl = isEdge
      ? ""
      : process.env.API_BASE_URL || "http://localhost:8174";

    // Helper to fetch from an endpoint
    const fetchEndpoint = async (path: string) => {
      const url = `${baseUrl}/api/${path}?reference=${encodeURIComponent(referenceParam)}&language=${language}&organization=${organization}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        logger.warn(`Failed to fetch ${path}:`, err);
      }
      return null;
    };

    // Fetch all resources in parallel
    const [scriptureRes, notesRes, questionsRes, linksRes] = await Promise.all([
      fetchEndpoint("fetch-scripture"),
      fetchEndpoint("fetch-translation-notes"),
      fetchEndpoint("fetch-translation-questions"),
      fetchEndpoint("fetch-translation-word-links"),
    ]);

    // Debug logging
    logger.info("Fetched resources", {
      hasScripture: !!scriptureRes?.data,
      hasNotes: !!notesRes?.notes,
      hasQuestions: !!questionsRes?.translationQuestions,
      hasLinks: !!linksRes?.links,
      scriptureCount: scriptureRes?.data?.length || 0,
      notesCount: notesRes?.notes?.length || 0,
      questionsCount: questionsRes?.translationQuestions?.length || 0,
      linksCount: linksRes?.links?.length || 0,
    });

    // Add scripture (all versions)
    if (
      scriptureRes?.data &&
      Array.isArray(scriptureRes.data) &&
      scriptureRes.data.length > 0
    ) {
      contextArray.push({
        type: "scripture",
        data: scriptureRes.data,
        count: scriptureRes.data.length,
        note: "All available scripture versions for the language",
      });
    }

    // Add translation notes
    if (
      notesRes?.notes &&
      Array.isArray(notesRes.notes) &&
      notesRes.notes.length > 0
    ) {
      contextArray.push({
        type: "translation-notes",
        data: notesRes.notes,
        count: notesRes.notes.length,
      });
    }

    // Add translation questions
    if (
      questionsRes?.translationQuestions &&
      Array.isArray(questionsRes.translationQuestions) &&
      questionsRes.translationQuestions.length > 0
    ) {
      contextArray.push({
        type: "translation-questions",
        data: questionsRes.translationQuestions,
        count: questionsRes.translationQuestions.length,
      });
    }

    // Add translation word links (unique words)
    if (
      linksRes?.links &&
      Array.isArray(linksRes.links) &&
      linksRes.links.length > 0
    ) {
      // Extract unique words from links
      const uniqueWords = new Map();

      linksRes.links.forEach((link: any) => {
        if (link.TWLink && !uniqueWords.has(link.TWLink)) {
          uniqueWords.set(link.TWLink, {
            word: link.TWLink,
            occurrences: link.Occurrence,
            originalWords: link.OrigWords,
          });
        }
      });

      contextArray.push({
        type: "translation-words",
        data: Array.from(uniqueWords.values()),
        count: uniqueWords.size,
        note: "Translation word links for the verse. Use /api/get-translation-word to fetch full articles",
      });
    }

    // TODO: Add Translation Academy articles from RC links

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
        reference: referenceParam,
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
    logger.error("Get Context API Error:", error);
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
