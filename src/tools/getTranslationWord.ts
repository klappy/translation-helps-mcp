/**
 * Get Translation Word Tool
 * Tool for fetching translation words for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchTranslationWords } from "../functions/translation-words-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const GetTranslationWordArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
  language: z.string().optional().default("en").describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  category: z.string().optional().describe("Filter by category (kt, names, other)"),
});

export type GetTranslationWordArgs = z.infer<typeof GetTranslationWordArgs>;

/**
 * Handle the get translation word tool call
 */
export async function handleGetTranslationWord(args: GetTranslationWordArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation words", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      category: args.category,
    });

    // Use the shared translation words service (same as Netlify functions)
    const result = await fetchTranslationWords({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      category: args.category,
    });

    // Build enhanced response format for MCP
    const response = {
      translationWords: result.translationWords,
      citation: result.citation,
      language: args.language,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        wordsFound: result.metadata.wordsFound,
        cached: result.metadata.cached,
      },
    };

    logger.info("Translation words fetched successfully", {
      reference: args.reference,
      wordsFound: result.metadata.wordsFound,
      responseTime: response.metadata.responseTime,
      cached: result.metadata.cached,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch translation words", {
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
