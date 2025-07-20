/**
 * Get Languages Tool
 * Tool for fetching available languages from Door43
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { getLanguages } from "../../netlify/functions/_shared/languages-service.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const GetLanguagesArgs = z.object({
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  includeAlternateNames: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include alternate language names (default: false)"),
});

export type GetLanguagesArgs = z.infer<typeof GetLanguagesArgs>;

/**
 * Handle the get languages tool call
 */
export async function handleGetLanguages(args: GetLanguagesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Fetching available languages", {
      organization: args.organization,
      includeAlternateNames: args.includeAlternateNames,
    });

    // Use the shared languages service (same as Netlify functions)
    const result = await getLanguages({
      organization: args.organization,
      includeAlternateNames: args.includeAlternateNames,
    });

    // Build enhanced response format for MCP
    const response = {
      languages: result.languages,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(result)),
        timestamp: new Date().toISOString(),
        languagesFound: result.metadata.languagesFound,
        cached: result.metadata.cached,
      },
    };

    logger.info("Languages fetched successfully", {
      organization: args.organization,
      languagesFound: result.metadata.languagesFound,
      responseTime: response.metadata.responseTime,
      cached: result.metadata.cached,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch languages", {
      organization: args.organization,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      error: errorMessage,
      organization: args.organization,
      timestamp: new Date().toISOString(),
    };
  }
}
