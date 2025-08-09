/**
 * Scripture Service
 * Shared core implementation for fetching scripture text
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseUSFMAlignment, type WordAlignment } from "../experimental/usfm-alignment-parser.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import { logger } from "../utils/logger.js";
import { parseReference } from "./reference-parser.js";
import { discoverAvailableResources } from "./resource-detector.js";
import { CacheBypassOptions, unifiedCache } from "./unified-cache.js";
import {
  extractChapterRange,
  extractChapterRangeWithNumbers,
  extractChapterText,
  extractChapterTextWithNumbers,
  extractVerseRange,
  extractVerseRangeWithNumbers,
  extractVerseText,
  extractVerseTextWithNumbers,
} from "./usfm-extractor.js";

export { type WordAlignment };

export interface ScriptureOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeVerseNumbers?: boolean;
  format?: "text" | "usfm";
  specificTranslations?: string[];
  bypassCache?: CacheBypassOptions;
  includeAlignment?: boolean; // New option for alignment data
}

export interface ScriptureResult {
  scripture?: {
    text: string;
    translation: string;
    citation: {
      resource: string;
      organization: string;
      language: string;
      url: string;
      version: string;
    };
    alignment?: {
      words: WordAlignment[];
      metadata: {
        totalAlignments: number;
        averageConfidence: number;
        hasCompleteAlignment: boolean;
      };
    };
  };
  scriptures?: Array<{
    text: string;
    translation: string;
    citation: {
      resource: string;
      organization: string;
      language: string;
      url: string;
      version: string;
    };
    alignment?: {
      words: WordAlignment[];
      metadata: {
        totalAlignments: number;
        averageConfidence: number;
        hasCompleteAlignment: boolean;
      };
    };
  }>;
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    includeVerseNumbers: boolean;
    format: string;
    translationsFound: number;
    cacheKey?: string;
    cacheType?: string;
    hasAlignmentData?: boolean;
  };
}

/**
 * Core scripture fetching logic - now properly handles all parameters
 */
export async function fetchScripture(options: ScriptureOptions): Promise<ScriptureResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
    includeVerseNumbers = true,
    format = "text",
    specificTranslations,
    bypassCache,
    includeAlignment = false, // Default to false for backward compatibility
  } = options;

  logger.info(`Core scripture service called`, {
    reference: referenceParam,
    language,
    organization,
    includeVerseNumbers,
    format,
    includeAlignment,
    bypassCache: Boolean(bypassCache),
  });

  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Create cache key that includes ALL parameters
  const responseKey = `scripture:${referenceParam}:${language}:${organization}:${includeVerseNumbers}:${format}:${specificTranslations?.join(",")}`;

  // Try to get cached response first
  const cachedResponse = await unifiedCache.getWithDeduplication(
    responseKey,
    async () => {
      logger.debug(`Processing fresh scripture request`, { key: responseKey });
      return await fetchFreshScripture();
    },
    "transformedResponse",
    bypassCache
  );

  if (cachedResponse.fromCache) {
    logger.info(`FAST cache hit for processed scripture`, { key: responseKey });
    return {
      ...cachedResponse.data,
      metadata: {
        ...cachedResponse.data.metadata,
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        cacheKey: responseKey,
        cacheType: cachedResponse.cacheInfo?.cacheType || "unknown",
      },
    };
  }

  async function fetchFreshScripture(): Promise<ScriptureResult> {
    const executionId = Math.random().toString(36).substr(2, 9);
    logger.debug(`fetchFreshScripture execution`, { id: executionId });

    // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog searches
    logger.debug(`Using unified resource discovery for scripture...`);
    const availability = await discoverAvailableResources(referenceParam, language, organization);
    const allResources = availability.scripture;

    if (allResources.length === 0) {
      logger.error(`No scripture resources found`, { language, organization });
      throw new Error(`No scripture resources found for ${language}/${organization}`);
    }

    logger.info(`Found scripture resources from unified discovery`, { count: allResources.length });

    // Filter by specific translations if requested
    let filteredResources = allResources;
    if (specificTranslations && specificTranslations.length > 0) {
      filteredResources = allResources.filter((resource) =>
        specificTranslations!.includes(resource.name)
      );
      logger.info(`Filtered to specific translations`, {
        count: filteredResources.length,
        specificTranslations,
      });

      if (filteredResources.length === 0) {
        logger.warn(`No resources found for specified translations`, { specificTranslations });
        // Fall back to all available resources if none of the specified ones exist
        filteredResources = allResources;
      }
    }

    // Handle translations: if none specified, return all; if specified, return only those
    const resourcesToProcess = specificTranslations ? filteredResources : allResources;

    logger.debug(`Processing resources`, {
      count: resourcesToProcess.length,
      specific: specificTranslations?.join(", "),
    });

    const scriptures = [] as ScriptureResult["scriptures"];
    for (const resource of resourcesToProcess) {
      logger.debug(`Processing resource`, { name: resource.name, title: resource.title });

      // Find the correct file from ingredients
      const ingredient = resource.ingredients?.find(
        (ing: { identifier: string }) =>
          ing.identifier?.toLowerCase() === reference?.book.toLowerCase()
      );

      if (!ingredient || !reference) {
        logger.warn(`Book not found in resource`, {
          book: reference?.book,
          resource: resource.name,
        });
        continue;
      }

      // Do not build raw paths; rely on ZIP + ingredients in ZipResourceFetcher2

      try {
        // Get USFM data using the cached DCS client
        logger.debug(`Fetching USFM file via DCS client...`);
        const dcsClient = new DCSApiClient();
        const fileResponse = await dcsClient.getRawFileContent(
          organization,
          resource.name,
          filePath,
          "master"
        );

        if (!fileResponse.success || !fileResponse.data) {
          logger.error(`Failed to fetch scripture content`, {
            error: fileResponse.error || "Unknown",
          });
          continue;
        }

        const usfmData = fileResponse.data;
        logger.debug(`Retrieved USFM data`, { length: usfmData.length });

        // Choose extraction method based on format and includeVerseNumbers
        const extractionStart = Date.now();
        logger.debug(`Starting USFM extraction`, {
          reference: `${reference.book} ${reference.chapter}:${reference.verse}`,
        });
        let text = "";

        if (format === "usfm") {
          // Return raw USFM for the requested passage
          text = extractUSFMPassage(usfmData, reference);
        } else {
          // Extract clean text with or without verse numbers
          if (includeVerseNumbers) {
            if (reference.verse && reference.verseEnd) {
              text = extractVerseRangeWithNumbers(
                usfmData,
                reference.chapter,
                reference.verse,
                reference.verseEnd
              );
            } else if (reference.verse) {
              text = extractVerseTextWithNumbers(usfmData, reference.chapter, reference.verse);
            } else if (reference.verseEnd) {
              text = extractChapterRangeWithNumbers(
                usfmData,
                reference.chapter,
                reference.verseEnd
              );
            } else {
              text = extractChapterTextWithNumbers(usfmData, reference.chapter);
            }
          } else {
            if (reference.verse && reference.verseEnd) {
              text = extractVerseRange(
                usfmData,
                reference.chapter,
                reference.verse,
                reference.verseEnd
              );
            } else if (reference.verse) {
              text = extractVerseText(usfmData, reference.chapter, reference.verse);
            } else if (reference.verseEnd) {
              text = extractChapterRange(usfmData, reference.chapter, reference.verseEnd);
            } else {
              text = extractChapterText(usfmData, reference.chapter);
            }
          }
        }

        if (text.trim()) {
          // Process alignment data if requested
          let alignmentData:
            | {
                words: WordAlignment[];
                metadata: {
                  totalAlignments: number;
                  averageConfidence: number;
                  hasCompleteAlignment: boolean;
                };
              }
            | undefined;

          if (includeAlignment && format !== "usfm") {
            try {
              logger.debug(`Processing alignment data`, { resource: resource.name });
              const alignmentStart = Date.now();

              // Parse alignment from the full USFM data for the passage
              const passageUSFM = extractUSFMPassage(usfmData, reference);
              const parsedAlignment = parseUSFMAlignment(passageUSFM);

              alignmentData = {
                words: parsedAlignment.alignments,
                metadata: {
                  totalAlignments: parsedAlignment.metadata.totalAlignments,
                  averageConfidence: parsedAlignment.metadata.averageConfidence,
                  hasCompleteAlignment: parsedAlignment.metadata.hasCompleteAlignment,
                },
              };

              const alignmentTime = Date.now() - alignmentStart;
              logger.debug(`Alignment processing completed`, {
                ms: alignmentTime,
                count: parsedAlignment.alignments.length,
              });
            } catch (alignmentError) {
              logger.warn(`Alignment processing failed`, {
                resource: resource.name,
                error: String(alignmentError),
              });
              // Continue without alignment data
            }
          }

          scriptures.push({
            text: text.trim(),
            translation: resource.title,
            citation: {
              resource: resource.name,
              organization,
              language,
              url: `https://git.door43.org/${organization}/${resource.name}`,
              version: "master",
            },
            alignment: alignmentData,
          });
          const extractionTime = Date.now() - extractionStart;
          logger.debug(`Extracted scripture text`, {
            resource: resource.name,
            ms: extractionTime,
            length: text.length,
          });
        }
      } catch (error) {
        logger.warn(`Failed to process resource`, {
          resource: resource.name,
          error: String(error),
        });
        continue;
      }
    }

    if (!scriptures || scriptures.length === 0) {
      throw new Error(`No scripture text found for ${referenceParam}`);
    }

    const result: ScriptureResult =
      specificTranslations && specificTranslations.length === 1
        ? {
            scripture: scriptures[0],
            metadata: {
              responseTime: Date.now() - startTime,
              cached: false,
              timestamp: new Date().toISOString(),
              includeVerseNumbers,
              format,
              translationsFound: scriptures.length,
              cacheKey: responseKey,
              hasAlignmentData: includeAlignment && scriptures[0]?.alignment !== undefined,
            },
          }
        : {
            scriptures,
            metadata: {
              responseTime: Date.now() - startTime,
              cached: false,
              timestamp: new Date().toISOString(),
              includeVerseNumbers,
              format,
              translationsFound: scriptures.length,
              cacheKey: responseKey,
              hasAlignmentData:
                includeAlignment && scriptures.some((s) => s.alignment !== undefined),
            },
          };

    return result;
  }

  const result = await fetchFreshScripture();

  // Cache the result (unless explicitly bypassed)
  if (!cachedResponse.cacheInfo?.bypassReason) {
    await unifiedCache.set(responseKey, result, "transformedResponse");
    logger.info(`Cached transformed scripture response`, { key: responseKey });
  } else {
    logger.info(`Skipping cache due to bypass`, { reason: cachedResponse.cacheInfo?.bypassReason });
  }

  return result;
}

/**
 * Extract raw USFM passage for format=usfm requests
 */
function extractUSFMPassage(
  usfm: string,
  reference: {
    book: string;
    chapter?: number;
    verse?: number;
    verseEnd?: number;
  }
): string {
  const chapterPattern = new RegExp(`\\\\c\\s+${reference.chapter}\\b`);
  const chapterSplit = usfm.split(chapterPattern);

  if (chapterSplit.length < 2) {
    return "";
  }

  let chapterContent = chapterSplit[1];

  // Find next chapter to limit scope
  const nextChapterMatch = chapterContent.match(/\\c\s+\d+/);
  if (nextChapterMatch) {
    chapterContent = chapterContent.substring(0, nextChapterMatch.index);
  }

  if (reference.verse) {
    // Extract specific verse(s) with USFM markup
    const versePattern = new RegExp(`\\\\v\\s+${reference.verse}\\b`);
    const verseSplit = chapterContent.split(versePattern);

    if (verseSplit.length < 2) {
      return "";
    }

    let verseContent = verseSplit[1];

    if (reference.verseEnd) {
      // Find end verse
      const endVersePattern = new RegExp(`\\\\v\\s+${reference.verseEnd + 1}\\b`);
      const endMatch = verseContent.match(endVersePattern);
      if (endMatch) {
        verseContent = verseContent.substring(0, endMatch.index);
      }
    } else {
      // Single verse - find next verse marker
      const nextVerseMatch = verseContent.match(/\\v\s+\d+/);
      if (nextVerseMatch) {
        verseContent = verseContent.substring(0, nextVerseMatch.index);
      }
    }

    return `\\c ${reference.chapter}\n\\v ${reference.verse}${verseContent}`.trim();
  } else {
    // Return full chapter with USFM markup
    return `\\c ${reference.chapter}${chapterContent}`.trim();
  }
}
