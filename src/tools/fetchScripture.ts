/**
 * Fetch Scripture Tool
 * Tool for fetching scripture text for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchScripture } from "../../netlify/functions/_shared/scripture-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const FetchScriptureArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
  language: z.string().optional().default("en").describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  includeVerseNumbers: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include verse numbers in the text (default: true)"),
  format: z
    .enum(["text", "usfm"])
    .optional()
    .default("text")
    .describe('Output format (default: "text")'),
});

export type FetchScriptureArgs = z.infer<typeof FetchScriptureArgs>;

/**
 * Handle the fetch scripture tool call
 */
export async function handleFetchScripture(args: FetchScriptureArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching scripture", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: args.format,
    });

    // Use the shared scripture service (same as Netlify functions)
    const result = await fetchScripture({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: args.format,
    });

    // Build enhanced response format for MCP
    const response = {
      scripture: result.scripture,
      language: args.language,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        includeVerseNumbers: result.metadata.includeVerseNumbers,
        format: result.metadata.format,
        cached: result.metadata.cached,
      },
    };

    logger.info("Scripture fetched successfully", {
      reference: args.reference,
      textLength: result.scripture?.text.length || 0,
      translation: result.scripture?.translation,
      responseTime: response.metadata.responseTime,
      cached: result.metadata.cached,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch scripture", {
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
