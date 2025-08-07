/**
 * Platform-agnostic Get Context Handler - KISS VERSION
 * Keep It Simple, Stupid! Just fetch and return.
 */

import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";

export const getContextHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const reference = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization = request.queryStringParameters.organization || "unfoldingWord";

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
          message: "Please provide a Bible reference. Example: ?reference=John+3:16",
        }),
      };
    }

    // KISS: Import handlers directly, call them directly
    const { fetchScriptureHandler } = await import("./fetch-scripture.js");
    const { fetchTranslationNotesHandler } = await import("./fetch-translation-notes.js");
    const { fetchTranslationQuestionsHandler } = await import("./fetch-translation-questions.js");
    const { fetchTranslationWordLinksHandler } = await import("./fetch-translation-word-links.js");

    // Call all handlers in parallel
    const results = await Promise.allSettled([
      fetchScriptureHandler(request),
      fetchTranslationNotesHandler(request),
      fetchTranslationQuestionsHandler(request),
      fetchTranslationWordLinksHandler(request)
    ]);

    const contextArray = [];

    // Process results one by one - no fancy parsing, just check what we got
    const [scriptureResult, notesResult, questionsResult, linksResult] = results;

    // Scripture
    if (scriptureResult.status === 'fulfilled' && scriptureResult.value.statusCode === 200) {
      try {
        const data = JSON.parse(scriptureResult.value.body);
        if (data.data?.length > 0) {
          contextArray.push({
            type: "scripture",
            data: data.data,
            count: data.data.length,
            note: "All available scripture versions"
          });
        }
      } catch (e) {
        // Silent fail - just don't add it
      }
    }

    // Notes
    if (notesResult.status === 'fulfilled' && notesResult.value.statusCode === 200) {
      try {
        const data = JSON.parse(notesResult.value.body);
        if (data.notes?.length > 0) {
          contextArray.push({
            type: "translation-notes",
            data: data.notes,
            count: data.notes.length
          });
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Questions
    if (questionsResult.status === 'fulfilled' && questionsResult.value.statusCode === 200) {
      try {
        const data = JSON.parse(questionsResult.value.body);
        if (data.translationQuestions?.length > 0) {
          contextArray.push({
            type: "translation-questions",
            data: data.translationQuestions,
            count: data.translationQuestions.length
          });
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Word Links
    if (linksResult.status === 'fulfilled' && linksResult.value.statusCode === 200) {
      try {
        const data = JSON.parse(linksResult.value.body);
        if (data.links?.length > 0) {
          // Extract unique words
          const uniqueWords = new Map();
          data.links.forEach((link: any) => {
            if (link.TWLink && !uniqueWords.has(link.TWLink)) {
              uniqueWords.set(link.TWLink, {
                word: link.TWLink,
                occurrences: link.Occurrence || 1,
                originalWords: link.OrigWords || ""
              });
            }
          });

          if (uniqueWords.size > 0) {
            contextArray.push({
              type: "translation-words",
              data: Array.from(uniqueWords.values()),
              count: uniqueWords.size,
              note: "Use /api/get-translation-word to fetch full articles"
            });
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800",
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
          resourceTypes: contextArray.map(r => r.type),
          totalResourcesReturned: contextArray.reduce((sum, r) => sum + r.count, 0)
        }
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
        message: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};
