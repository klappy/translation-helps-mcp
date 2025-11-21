/**
 * Platform-agnostic Get Context Handler - WORKING VERSION
 * Aggregates all resources by calling the existing working handlers
 */

import { Errors } from "../../utils/errorEnvelope.js";
import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";
import { fetchScriptureHandler } from "./fetch-scripture.js";
import { fetchTranslationNotesHandler } from "./fetch-translation-notes.js";
import { fetchTranslationQuestionsHandler } from "./fetch-translation-questions.js";
import { fetchTranslationWordLinksHandler } from "./fetch-translation-word-links.js";

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

    logger.info("Fetching comprehensive context", {
      reference: referenceParam,
    });

    const contextArray = [];

    // Call each handler directly in parallel
    const [scriptureRes, notesRes, questionsRes, linksRes] = await Promise.all([
      fetchScriptureHandler(request).catch((err) => {
        logger.warn("Scripture handler failed", { error: String(err) });
        return null;
      }),
      fetchTranslationNotesHandler(request).catch((err) => {
        logger.warn("Notes handler failed", { error: String(err) });
        return null;
      }),
      fetchTranslationQuestionsHandler(request).catch((err) => {
        logger.warn("Questions handler failed", { error: String(err) });
        return null;
      }),
      fetchTranslationWordLinksHandler(request).catch((err) => {
        logger.warn("Links handler failed", { error: String(err) });
        return null;
      }),
    ]);

    // Process scripture response
    if (scriptureRes && scriptureRes.statusCode === 200) {
      try {
        const scriptureData = JSON.parse(scriptureRes.body);
        if (
          scriptureData.data &&
          Array.isArray(scriptureData.data) &&
          scriptureData.data.length > 0
        ) {
          contextArray.push({
            type: "scripture",
            data: scriptureData.data,
            count: scriptureData.data.length,
            note: "All available scripture versions for the language",
          });
        }
      } catch (e) {
        logger.warn("Failed to parse scripture response");
      }
    }

    // Process notes response
    if (notesRes && notesRes.statusCode === 200) {
      try {
        const notesData = JSON.parse(notesRes.body);
        if (
          notesData.notes &&
          Array.isArray(notesData.notes) &&
          notesData.notes.length > 0
        ) {
          contextArray.push({
            type: "translation-notes",
            data: notesData.notes,
            count: notesData.notes.length,
          });
        }
      } catch (e) {
        logger.warn("Failed to parse notes response");
      }
    }

    // Process questions response
    if (questionsRes && questionsRes.statusCode === 200) {
      try {
        const questionsData = JSON.parse(questionsRes.body);
        if (
          questionsData.translationQuestions &&
          Array.isArray(questionsData.translationQuestions) &&
          questionsData.translationQuestions.length > 0
        ) {
          contextArray.push({
            type: "translation-questions",
            data: questionsData.translationQuestions,
            count: questionsData.translationQuestions.length,
          });
        }
      } catch (e) {
        logger.warn("Failed to parse questions response");
      }
    }

    // Process links response for unique words
    if (linksRes && linksRes.statusCode === 200) {
      try {
        const linksData = JSON.parse(linksRes.body);
        if (
          linksData.links &&
          Array.isArray(linksData.links) &&
          linksData.links.length > 0
        ) {
          // Extract unique words from links
          const uniqueWords = new Map();

          linksData.links.forEach((link: any) => {
            if (link.TWLink && !uniqueWords.has(link.TWLink)) {
              uniqueWords.set(link.TWLink, {
                word: link.TWLink,
                occurrences: link.Occurrence,
                originalWords: link.OrigWords,
              });
            }
          });

          if (uniqueWords.size > 0) {
            contextArray.push({
              type: "translation-words",
              data: Array.from(uniqueWords.values()),
              count: uniqueWords.size,
              note: "Translation word links for the verse. Use /api/fetch-translation-word to fetch full articles",
            });
          }
        }
      } catch (e) {
        logger.warn("Failed to parse links response");
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
