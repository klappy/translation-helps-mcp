/**
 * Get Context Tool
 * Get contextual information for a Bible reference using shared context service
 * Uses the same implementation as Netlify functions for consistency
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { getContextFromTranslationNotes } from "../functions/context-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const GetContextArgs = z.object({
  reference: z.string().describe("Bible reference (e.g., 'John 3:16')"),
  language: z.string().optional().default("en").describe("Language code (default: 'en')"),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe("Organization (default: 'unfoldingWord')"),
  includeRawData: z.boolean().optional().default(false).describe("Include raw USFM data"),
  maxTokens: z.number().optional().describe("Maximum tokens for context"),
  deepAnalysis: z
    .boolean()
    .optional()
    .default(true)
    .describe("Perform deep analysis of surrounding context"),
});

export type GetContextArgs = z.infer<typeof GetContextArgs>;

/**
 * Handle the get context tool call
 */
export async function handleGetContext(args: GetContextArgs) {
  const startTime = Date.now();

  try {
    logger.info("Getting context for reference", args);

    // Use the shared context service (same as Netlify functions)
    const contextResult = await getContextFromTranslationNotes({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeRawData: args.includeRawData,
      maxTokens: args.maxTokens,
      deepAnalysis: args.deepAnalysis,
    });

    // Calculate token estimate
    contextResult.metadata.tokenEstimate = estimateTokens(JSON.stringify(contextResult));

    logger.info("Context extracted successfully", {
      reference: args.reference,
      bookIntroFound: contextResult.metadata.bookIntroFound,
      chapterIntroFound: contextResult.metadata.chapterIntroFound,
      verseNotesFound: contextResult.metadata.verseNotesFound,
      responseTime: contextResult.metadata.responseTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(contextResult, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to get context", {
      args,
      error: (error as Error).message,
      responseTime: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: (error as Error).message,
              reference: args.reference,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
