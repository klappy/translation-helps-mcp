/**
 * Fetch Scripture Tool
 * Tool for fetching Bible scripture text for a specific reference
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { estimateTokens } from "../utils/tokenCounter.js";
import { formatCitation } from "../utils/referenceFormatter.js";

// Input schema
export const FetchScriptureArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
  language: z.string().optional().default("en").describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  translation: z
    .string()
    .optional()
    .describe('Specific translation (e.g., "ult", "ust", "t4t") or "all" for all translations'),
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
      translation: args.translation,
    });

    // Parse the Bible reference
    const reference = parseReference(args.reference);
    if (!reference) {
      throw new Error(`Invalid Bible reference: ${args.reference}`);
    }

    // Set up options for scripture only
    const options = {
      language: args.language,
      organization: args.organization,
      resources: ["scripture"],
    };

    // Fetch scripture using aggregator
    const aggregator = new ResourceAggregator();
    const resources = await aggregator.aggregateResources(reference, options);

    // Build response in OLD API format
    const scriptures = resources.scriptures || [];

    // Convert scriptures to old API format with proper citations
    const formattedScriptures = scriptures.map((s) => ({
      text: s.text,
      translation: s.translation,
      citation: {
        resource: `${args.organization} ${s.translation}`,
        organization: args.organization,
        language: args.language,
        url: `https://git.door43.org/${args.organization}/${args.language}_${s.translation.toLowerCase()}`,
        version: "master",
      },
    }));

    // Return OLD API format + metadata for MCP
    const baseResponse =
      formattedScriptures.length === 1 && args.translation !== "all"
        ? {
            scripture: formattedScriptures[0],
            language: args.language,
            organization: args.organization,
          }
        : {
            scriptures: formattedScriptures,
            language: args.language,
            organization: args.organization,
          };

    const response = {
      ...baseResponse,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(resources)),
        timestamp: new Date().toISOString(),
      },
    };

    logger.info("Scripture fetched successfully", {
      reference: args.reference,
      responseTime: response.metadata.responseTime,
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
