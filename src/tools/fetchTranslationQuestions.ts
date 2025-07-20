/**
 * Fetch Translation Questions Tool
 * Tool for fetching translation questions for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchTranslationQuestions } from "../../netlify/functions/_shared/translation-questions-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const FetchTranslationQuestionsArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
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

    // Use the shared translation questions service (same as Netlify functions)
    const result = await fetchTranslationQuestions({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    // Build enhanced response format for MCP
    const response = {
      translationQuestions: result.translationQuestions,
      citation: result.citation,
      language: args.language,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        questionsFound: result.metadata.questionsFound,
        cached: result.metadata.cached,
      },
    };

    logger.info("Translation questions fetched successfully", {
      reference: args.reference,
      questionsFound: result.metadata.questionsFound,
      responseTime: response.metadata.responseTime,
      cached: result.metadata.cached,
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
