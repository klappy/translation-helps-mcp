/**
 * Fetch Translation Word Links Tool
 * Tool for fetching translation word links for a specific Bible reference
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { estimateTokens } from "../utils/tokenCounter.js";
import { formatCitation } from "../utils/referenceFormatter.js";

// Input schema
export const FetchTranslationWordLinksArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "Titus 1:1")'),
  language: z
    .string()
    .optional()
    .default("en")
    .describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
});

export type FetchTranslationWordLinksArgs = z.infer<
  typeof FetchTranslationWordLinksArgs
>;

/**
 * Handle the fetch translation word links tool call
 */
export async function handleFetchTranslationWordLinks(
  args: FetchTranslationWordLinksArgs,
) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation word links", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
    });

    // Parse the Bible reference
    const reference = parseReference(args.reference);
    if (!reference) {
      throw new Error(`Invalid Bible reference: ${args.reference}`);
    }

    // Set up options for translation word links only
    const options = {
      language: args.language,
      organization: args.organization,
      resources: ["links"],
    };

    // Fetch translation word links using aggregator
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
      translationWordLinks: resources.translationWordLinks || [],
      metadata: {
        language: args.language,
        organization: args.organization,
        timestamp: new Date().toISOString(),
        linksCount: resources.translationWordLinks?.length || 0,
        tokenEstimate: estimateTokens(JSON.stringify(resources)),
        responseTime: Date.now() - startTime,
      },
    };

    logger.info("Translation word links fetched successfully", {
      reference: args.reference,
      linksCount: response.metadata.linksCount,
      responseTime: response.metadata.responseTime,
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch translation word links", {
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
