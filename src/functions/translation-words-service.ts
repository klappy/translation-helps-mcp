/**
 * Translation Words Service
 * Fetches translation words from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { logger } from "../utils/logger.js";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";

export interface TranslationWord {
  id: string;
  word: string;
  definition: string;
  translationHelps?: string[];
  examples?: Array<{
    reference: string;
    text: string;
  }>;
  related?: string[];
}

export interface TranslationWordsOptions {
  reference: string;
  language?: string;
  organization?: string;
  category?: string;
}

export interface TranslationWordsResult {
  translationWords: TranslationWord[];
  citation: {
    resource: string;
    organization: string;
    language: string;
    url: string;
    version: string;
  };
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    wordsFound: number;
  };
}

/**
 * Core translation words fetching logic with unified resource discovery
 */
export async function fetchTranslationWords(
  options: TranslationWordsOptions
): Promise<TranslationWordsResult> {
  const startTime = Date.now();
  const { reference, language = "en", organization = "unfoldingWord", category } = options;

  const parsedRef = parseReference(reference);
  if (!parsedRef) {
    throw new Error(`Invalid reference format: ${reference}`);
  }

  logger.info(`Core translation words service called`, {
    reference,
    language,
    organization,
    category,
  });

  logger.info(`Processing fresh words request`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  logger.debug(`Using unified resource discovery for translation words...`);
  const resourceInfo = await getResourceForBook(reference, "words", language, organization);

  if (!resourceInfo) {
    throw new Error(`No translation words found for ${language}/${organization}`);
  }

  logger.info(`Using resource`, {
    name: resourceInfo.name,
    title: resourceInfo.title,
  });

  // Translation words are organized differently - we need to fetch the word links first
  // Then fetch individual word definitions

  // Try to find translation word links for this book
  const linksIngredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) =>
      ing.identifier?.toLowerCase() === `${parsedRef.book.toLowerCase()}_links` ||
      ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase()
  );

  if (!linksIngredient) {
    logger.warn(`Translation word links for book not found`, {
      book: parsedRef.book,
      resource: resourceInfo.name,
    });
    throw new Error(
      `Translation word links for ${parsedRef.book} not found in resource ${resourceInfo.name}`
    );
  }

  // Build URL for the links file
  // Direct raw URL fetch disabled. Use ZIP + ingredients.

  // Try to get links from cache first
  const linksCacheKey = `tw-links:${linksUrl}`;
  let linksData = await cache.getFileContent(linksCacheKey);

  if (!linksData) {
    logger.info(`Cache miss for TW links file, downloading...`);
    const linksResponse = await fetch(linksUrl);
    if (!linksResponse.ok) {
      logger.warn(`Failed to fetch TW links file`, {
        status: linksResponse.status,
      });
      throw new Error(`Failed to fetch translation word links: ${linksResponse.status}`);
    }

    linksData = await linksResponse.text();
    logger.info(`Downloaded word links data`, { length: linksData.length });

    // Cache the file content
    await cache.setFileContent(linksCacheKey, linksData);
    logger.info(`Cached TW links file`, { length: linksData.length });
  } else {
    logger.info(`Cache hit for TW links file`, { length: linksData.length });
  }

  // Parse the word links for the specific verse/chapter
  const wordIds = parseWordLinksFromTSV(linksData, parsedRef);
  logger.info(`Found word links for reference`, {
    count: wordIds.length,
    reference,
  });

  // For now, return empty array if no words found
  const words: TranslationWord[] = [];

  const result: TranslationWordsResult = {
    translationWords: words,
    citation: {
      resource: resourceInfo.name,
      organization,
      language,
      url: resourceInfo.url || `https://git.door43.org/${organization}/${resourceInfo.name}`,
      version: "master",
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      wordsFound: words.length,
    },
  };

  // Do not cache transformed responses

  logger.info(`Processed translation words`, { count: words.length });

  return result;
}

/**
 * Parse word links from TSV data
 */
function parseWordLinksFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number }
): string[] {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  const wordIds: string[] = [];

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 5) continue; // Skip malformed lines

    const [ref, , , , wordId] = columns;

    // Parse the reference to check if it matches
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch) continue;

    const chapterNum = parseInt(refMatch[1]);
    const verseNum = parseInt(refMatch[2]);

    // Check if this word link is in our range
    let include = false;
    if (reference.verse) {
      include = chapterNum === reference.chapter && verseNum === reference.verse;
    } else {
      include = chapterNum === reference.chapter;
    }

    if (include && wordId && wordId.trim()) {
      wordIds.push(wordId.trim());
    }
  }

  return [...new Set(wordIds)]; // Remove duplicates
}
