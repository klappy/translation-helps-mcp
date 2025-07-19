/**
 * Fetch Translation Questions Tool
 * Tool for fetching translation questions for a specific Bible reference
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { estimateTokens } from "../utils/tokenCounter.js";
import { formatCitation } from "../utils/referenceFormatter.js";

// Input schema
export const FetchTranslationQuestionsArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "Matthew 5:1")'),
  language: z.string().optional().default("en").describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
});

export type FetchTranslationQuestionsArgs = z.infer<typeof FetchTranslationQuestionsArgs>;

/**
 * Handle the fetch translation questions tool call
 */
export async function handleFetchTranslationQuestions(args: FetchTranslationQuestionsArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation questions", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    // Parse the Bible reference
    const reference = parseReference(args.reference);
    if (!reference) {
      throw new Error(`Invalid Bible reference: ${args.reference}`);
    }

    // Set up options for translation questions only
    const options = {
      language: args.language,
      organization: args.organization,
      resources: ["questions"],
    };

    // Fetch translation questions using aggregator
    const aggregator = new ResourceAggregator();
    const resources = await aggregator.aggregateResources(reference, options);

    // Build response
    const response = {
      reference: {
        book: reference.book,
        chapter: reference.chapter,
        verse: reference.verse,
        verseEnd: reference.endVerse,
      },
      translationQuestions: resources.translationQuestions || [],
      metadata: {
        language: args.language,
        organization: args.organization,
        timestamp: new Date().toISOString(),
        questionsCount: resources.translationQuestions?.length || 0,
        tokenEstimate: estimateTokens(JSON.stringify(resources)),
        responseTime: Date.now() - startTime,
      },
    };

    logger.info("Translation questions fetched successfully", {
      reference: args.reference,
      questionsCount: response.metadata.questionsCount,
      responseTime: response.metadata.responseTime,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch translation questions", {
      reference: args.reference,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      error: errorMessage,
      reference: args.reference,
      timestamp: new Date().toISOString(),
    };
  }
}
