/**
 * Fetch Translation Notes Tool
 * Tool for fetching translation notes for a specific Bible reference
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { estimateTokens } from "../utils/tokenCounter.js";
import { formatCitation } from "../utils/referenceFormatter.js";

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
    .default(false)
    .describe("Include introduction notes (default: false)"),
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
    });

    // Parse the Bible reference
    const reference = parseReference(args.reference);
    if (!reference) {
      throw new Error(`Invalid Bible reference: ${args.reference}`);
    }

    // Set up options for translation notes only
    const options = {
      language: args.language,
      organization: args.organization,
      resources: ["notes"],
    };

    // Fetch translation notes using aggregator
    const aggregator = new ResourceAggregator();
    const resources = await aggregator.aggregateResources(reference, options);

    // Build response in OLD API format + metadata for MCP
    const response = {
      translationNotes: resources.translationNotes || [],
      citation: {
        resource: `${args.organization}_tn`,
        title: `${args.organization} Translation Notes`,
        organization: args.organization,
        language: args.language,
        url: `https://git.door43.org/${args.organization}/${args.language}_tn`,
        version: "master",
      },
      language: args.language,
      organization: args.organization,
      metadata: {
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(JSON.stringify(resources)),
        timestamp: new Date().toISOString(),
        notesCount: resources.translationNotes?.length || 0,
      },
    };

    logger.info("Translation notes fetched successfully", {
      reference: args.reference,
      notesCount: response.metadata.notesCount,
      responseTime: response.metadata.responseTime,
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
