/**
 * Tool handler for getting translation words related to a specific Bible reference
 * Finds all translation word articles that are linked to a particular verse
 */

import { DCSApiClient } from "../services/DCSApiClient.js";
import { logger } from "../utils/logger.js";
import { parseReference } from "../parsers/referenceParser.js";

interface GetWordsForReferenceParams {
  reference: string;
  language?: string;
  organization?: string;
}

interface TranslationWordLink {
  term: string;
  path: string;
  excerpt?: string;
}

export async function handleGetWordsForReference(
  params: GetWordsForReferenceParams,
): Promise<{ content: TranslationWordLink[] }> {
  const client = new DCSApiClient();
  const organization = params.organization || "unfoldingWord";
  const language = params.language || "en";

  logger.info("Getting translation words for reference", {
    reference: params.reference,
    language,
    organization,
  });

  try {
    // Parse the reference
    const parsedRef = parseReference(params.reference);
    if (!parsedRef) {
      throw new Error(`Invalid reference format: ${params.reference}`);
    }

    // For now, we'll get translation word links from the translation notes
    // In the future, we could also check USFM files for tw: links
    const tnRepo = `${language}_tn`;
    const book = parsedRef.book.toLowerCase();
    const chapter = parsedRef.chapter?.toString().padStart(2, "0") || "01";
    const verse = parsedRef.verse?.toString().padStart(2, "0") || "01";

    const results: TranslationWordLink[] = [];
    const foundTerms = new Set<string>();

    // Try to get translation notes for this verse
    const notePath = `${book}/${chapter}/${verse}.md`;

    try {
      const noteResponse = await client.getRawFileContent(
        organization,
        tnRepo,
        notePath,
      );

      if (noteResponse.success && noteResponse.data) {
        // Extract translation word links from the notes
        // Translation words are typically linked as [[rc://*/tw/dict/bible/kt/term]]
        const twLinkPattern =
          /\[\[rc:\/\/\*\/tw\/dict\/bible\/([^\/]+)\/([^\]]+)\]\]/g;
        let match;

        while ((match = twLinkPattern.exec(noteResponse.data)) !== null) {
          const category = match[1]; // kt, other, names, etc.
          const term = match[2];

          if (!foundTerms.has(term)) {
            foundTerms.add(term);

            // Construct the path to the translation word
            const firstLetter = term[0];
            const twPath = `bible/${category}/${firstLetter}/${term}.md`;

            results.push({
              term,
              path: twPath,
              excerpt: `Referenced in ${params.reference}`,
            });
          }
        }
      }
    } catch (error) {
      logger.debug("No translation notes found for verse", { notePath });
    }

    // Also check chapter-level intro notes
    const introPath = `${book}/${chapter}/intro.md`;

    try {
      const introResponse = await client.getRawFileContent(
        organization,
        tnRepo,
        introPath,
      );

      if (introResponse.success && introResponse.data) {
        const twLinkPattern =
          /\[\[rc:\/\/\*\/tw\/dict\/bible\/([^\/]+)\/([^\]]+)\]\]/g;
        let match;

        while ((match = twLinkPattern.exec(introResponse.data)) !== null) {
          const category = match[1];
          const term = match[2];

          if (!foundTerms.has(term)) {
            foundTerms.add(term);

            const firstLetter = term[0];
            const twPath = `bible/${category}/${firstLetter}/${term}.md`;

            results.push({
              term,
              path: twPath,
              excerpt: `Referenced in ${book} ${chapter} introduction`,
            });
          }
        }
      }
    } catch (error) {
      logger.debug("No chapter intro found", { introPath });
    }

    // If we have the verse content from USFM, we could also search for key terms
    // This would require fetching the scripture text first and analyzing it
    // For now, we rely on the translation notes links

    logger.info("Found translation words for reference", {
      reference: params.reference,
      count: results.length,
    });

    return {
      content: results,
    };
  } catch (error) {
    logger.error("Error getting words for reference", { error });
    throw error;
  }
}
