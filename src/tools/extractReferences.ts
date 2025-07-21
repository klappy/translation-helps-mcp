/**
 * Extract References Tool
 * Tool for extracting Bible references from text
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { extractReferences } from "../functions/references-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const ExtractReferencesArgs = z.object({
  text: z.string().describe("Text containing Bible references to extract"),
  includeContext: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include context around each reference"),
});

export type ExtractReferencesArgs = z.infer<typeof ExtractReferencesArgs>;

/**
 * Handle the extract references tool call
 */
export async function handleExtractReferences(args: ExtractReferencesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Extracting references from text", {
      textLength: args.text.length,
      includeContext: args.includeContext,
    });

    // Use the shared references service (same as Netlify functions)
    const result = await extractReferences({
      text: args.text,
      includeContext: args.includeContext,
    });

    // Build enhanced response format for MCP
    const response = {
      references: result.references,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        referencesFound: result.metadata.referencesFound,
        textLength: args.text.length,
      },
    };

    logger.info("References extracted successfully", {
      textLength: args.text.length,
      referencesFound: result.metadata.referencesFound,
      responseTime: response.metadata.responseTime,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to extract references", {
      textLength: args.text.length,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      error: errorMessage,
      text: args.text.substring(0, 100) + "...",
      timestamp: new Date().toISOString(),
    };
  }
}
