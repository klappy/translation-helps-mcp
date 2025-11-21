/**
 * Fetch Translation Word Links Tool
 * Tool for fetching translation word links for a specific Bible reference
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";
import { ResourceAggregator } from "../services/ResourceAggregator.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import {
  ReferenceParam,
  LanguageParam,
  OrganizationParam,
  FormatParam,
} from "../schemas/common-params.js";

// Input schema - using shared common parameters
export const FetchTranslationWordLinksArgs = z.object({
  reference: ReferenceParam,
  language: LanguageParam,
  organization: OrganizationParam,
  format: FormatParam,
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

    // Transform links to extract category, term, and path from RC link
    // Return ONLY the clean, transformed fields (not raw TSV data)
    const transformedLinks = (resources.translationWordLinks || []).map(
      (link: any, index: number) => {
        // Try different field names (ResourceAggregator uses TWLink)
        const rcLink = link.TWLink || link.twlid || link.rcLink || "";

        // Parse RC link to extract category, term, and path
        // Format: rc://*/tw/dict/bible/{category}/{term}
        let category = "";
        let term = "";
        let path = "";

        if (rcLink) {
          // Extract everything after /dict/ and add .md extension
          const pathMatch = rcLink.match(/rc:\/\/\*\/tw\/dict\/(.+)/);
          if (pathMatch) {
            path = pathMatch[1] + ".md"; // e.g., "bible/kt/love.md"
          }

          // Extract category and term
          const match = rcLink.match(
            /rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/([^/]+)/,
          );
          if (match) {
            category = match[1]; // e.g., "kt", "names", "other"
            term = match[2]; // e.g., "love", "grace", "abraham"
          }
        }

        // Return ONLY clean, transformed fields (no raw TSV columns)
        return {
          id: link.id || `twl${index + 1}`,
          reference: link.Reference || link.reference || args.reference,
          occurrence: parseInt(link.Occurrence || link.occurrence || "1", 10),
          quote: link.Quote || link.quote || "",
          category,
          term,
          path,
          strongsId: link.StrongsId || link.strongsId || "",
          rcLink,
          position: link.position || null,
        };
      },
    );

    // Build metadata using shared utility
    const metadata = buildMetadata({
      startTime,
      data: resources,
      serviceMetadata: {},
      additionalFields: {
        linksCount: transformedLinks.length,
        language: args.language,
        organization: args.organization,
      },
    });

    // Build response
    const response = {
      reference: {
        book: reference.book,
        chapter: reference.chapter,
        verse: reference.verse,
        verseEnd: reference.endVerse,
      },
      translationWordLinks: transformedLinks,
      metadata,
    };

    logger.info("Translation word links fetched successfully", {
      reference: args.reference,
      ...metadata,
    });

    return response;
  } catch (error) {
    return handleMCPError({
      toolName: "fetch_translation_word_links",
      args: {
        reference: args.reference,
        language: args.language,
        organization: args.organization,
      },
      startTime,
      originalError: error,
    });
  }
}
