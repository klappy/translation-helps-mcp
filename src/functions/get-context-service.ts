/**
 * Get Context Service
 * Simple aggregation of all translation resources
 */

import { logger } from "../utils/logger.js";
import { fetchScripture } from "./scripture-service.js";
import { fetchTranslationNotes } from "./translation-notes-service.js";
import { fetchTranslationQuestions } from "./translation-questions-service.js";
import { fetchTranslationWordLinks } from "./translation-word-links-service.js";

export interface ContextOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface ContextResult {
  context: Array<{
    type: string;
    data: any[];
    count: number;
    note?: string;
  }>;
  reference: string;
  language: string;
  organization: string;
  metadata: {
    responseTime: number;
    timestamp: string;
    resourceTypes: string[];
    totalResourcesReturned: number;
  };
}

export async function getComprehensiveContext(options: ContextOptions): Promise<ContextResult> {
  const startTime = Date.now();
  const { reference, language = "en", organization = "unfoldingWord" } = options;

  logger.info("Aggregating comprehensive context", { reference, language, organization });

  const contextArray = [];

  // Fetch all resources in parallel
  try {
    const [scriptureResult, notesResult, questionsResult, linksResult] = await Promise.all([
      fetchScripture({ reference, language, organization }).catch((err) => {
        logger.warn("Scripture fetch failed", err);
        return null;
      }),
      fetchTranslationNotes({ reference, language, organization }).catch((err) => {
        logger.warn("Notes fetch failed", err);
        return null;
      }),
      fetchTranslationQuestions({ reference, language, organization }).catch((err) => {
        logger.warn("Questions fetch failed", err);
        return null;
      }),
      fetchTranslationWordLinks({ reference, language, organization }).catch((err) => {
        logger.warn("Links fetch failed", err);
        return null;
      }),
    ]);

    // Add scripture (all versions)
    if (scriptureResult?.scripture) {
      const scriptureData = Array.isArray(scriptureResult.scripture)
        ? scriptureResult.scripture
        : [scriptureResult.scripture];

      if (scriptureData.length > 0) {
        contextArray.push({
          type: "scripture",
          data: scriptureData,
          count: scriptureData.length,
          note: "All available scripture versions for the language",
        });
      }
    }

    // Add translation notes
    if (notesResult?.translationNotes && notesResult.translationNotes.length > 0) {
      contextArray.push({
        type: "translation-notes",
        data: notesResult.translationNotes,
        count: notesResult.translationNotes.length,
      });
    }

    // Add translation questions
    if (questionsResult?.translationQuestions && questionsResult.translationQuestions.length > 0) {
      contextArray.push({
        type: "translation-questions",
        data: questionsResult.translationQuestions,
        count: questionsResult.translationQuestions.length,
      });
    }

    // Add translation word links (unique words)
    if (linksResult?.links && linksResult.links.length > 0) {
      // Extract unique words from links
      const uniqueWords = new Map();

      linksResult.links.forEach((link: any) => {
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
          note: "Translation word links for the verse. Use /api/get-translation-word to fetch full articles",
        });
      }
    }
  } catch (error) {
    logger.error("Error during resource aggregation", error);
  }

  const duration = Date.now() - startTime;

  return {
    context: contextArray,
    reference,
    language,
    organization,
    metadata: {
      responseTime: duration,
      timestamp: new Date().toISOString(),
      resourceTypes: contextArray.map((r) => r.type),
      totalResourcesReturned: contextArray.reduce((sum, r) => sum + r.count, 0),
    },
  };
}
