/**
 * Fetch Translation Notes Tool
 * Tool for fetching translation notes for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchTranslationNotes } from "../functions/translation-notes-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const FetchTranslationNotesArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "Titus 1:1")'),
  language: z.string().optional().default("en").describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  includeIntro: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include book and chapter introduction notes for context (default: true)"),
  includeContext: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include contextual notes from related passages (default: true)"),
});

export type FetchTranslationNotesArgs = z.infer<typeof FetchTranslationNotesArgs>;

/**
 * Handle the fetch translation notes tool call
 */
export async function handleFetchTranslationNotes(args: FetchTranslationNotesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation notes", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeIntro: args.includeIntro,
      includeContext: args.includeContext,
    });

    // Use the shared translation notes service (same as Netlify functions)
    const result = await fetchTranslationNotes({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeIntro: args.includeIntro,
      includeContext: args.includeContext,
    });

    // Build enhanced response format for MCP
    const response = {
      verseNotes: result.verseNotes,
      contextNotes: result.contextNotes,
      translationNotes: result.translationNotes, // Keep original for backward compatibility
      citation: result.citation,
      language: args.language,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        verseNotesCount: result.metadata.verseNotesCount,
        contextNotesCount: result.metadata.contextNotesCount,
        totalNotesCount: result.metadata.sourceNotesCount,
        cached: result.metadata.cached,
      },
    };

    logger.info("Translation notes fetched successfully", {
      reference: args.reference,
      verseNotesCount: response.metadata.verseNotesCount,
      contextNotesCount: response.metadata.contextNotesCount,
      responseTime: response.metadata.responseTime,
      cached: result.metadata.cached,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch translation notes", {
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
