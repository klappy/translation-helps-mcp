/**
 * Scripture Service
 * Shared core implementation for fetching scripture text
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseReference } from "./reference-parser";
import { discoverAvailableResources } from "./resource-detector";
import { CacheBypassOptions, unifiedCache } from "./unified-cache";
import { parseUSFMAlignment, type WordAlignment } from "./usfm-alignment-parser.js";
import {
  extractChapterRange,
  extractChapterRangeWithNumbers,
  extractChapterText,
  extractChapterTextWithNumbers,
  extractVerseRange,
  extractVerseRangeWithNumbers,
  extractVerseText,
  extractVerseTextWithNumbers,
} from "./usfm-extractor";

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

  console.log(`📖 Core scripture service called with:`, {
    reference: referenceParam,
    language,
    organization,
    includeVerseNumbers,
    format,
    includeAlignment,
    bypassCache: bypassCache ? "enabled" : "disabled",
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
      console.log(`🔄 Processing fresh scripture request: ${responseKey}`);
      return await fetchFreshScripture();
    },
    "transformedResponse",
    bypassCache
  );

  if (cachedResponse.fromCache) {
    console.log(`🚀 FAST cache hit for processed scripture: ${responseKey}`);
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
    console.log(`🆔 fetchFreshScripture execution ID: ${executionId}`);

    // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog searches
    console.log(`🔍 Using unified resource discovery for scripture...`);
    const availability = await discoverAvailableResources(referenceParam, language, organization);
    const allResources = availability.scripture;

    if (allResources.length === 0) {
      console.error(`❌ No scripture resources found for ${language}/${organization}`);
      throw new Error(`No scripture resources found for ${language}/${organization}`);
    }

    console.log(`📊 Found ${allResources.length} scripture resources from unified discovery`);

    // Filter by specific translations if requested
    let filteredResources = allResources;
    if (specificTranslations && specificTranslations.length > 0) {
      filteredResources = allResources.filter((resource) =>
        specificTranslations!.includes(resource.name)
      );
      console.log(
        `🎯 Filtered to ${filteredResources.length} specific translations: ${specificTranslations.join(", ")}`
      );

      if (filteredResources.length === 0) {
        console.warn(
          `⚠️ No resources found for specified translations: ${specificTranslations.join(", ")}`
        );
        // Fall back to all available resources if none of the specified ones exist
        filteredResources = allResources;
      }
    }

    // Handle translations: if none specified, return all; if specified, return only those
    const resourcesToProcess = specificTranslations
      ? filteredResources // Use only the specified translations
      : allResources; // Use all available translations (default)

    console.log(
      `📖 Processing ${resourcesToProcess.length} resource(s) (${specificTranslations ? `specific: ${specificTranslations.join(",")}` : "all available"})`
    );
    console.log(
      `🐛 DEBUG: resourcesToProcess names: ${resourcesToProcess.map((r) => r.name).join(", ")}`
    );

    const scriptures = [];
    for (const resource of resourcesToProcess) {
      console.log(`📖 Processing resource: ${resource.name} (${resource.title})`);

      // Find the correct file from ingredients
      const ingredient = resource.ingredients?.find(
        (ing: { identifier: string }) => ing.identifier?.toLowerCase() === reference?.book.toLowerCase()
      );

      if (!ingredient || !reference) {
        console.warn(`Book ${reference?.book || "unknown"} not found in resource ${resource.name}`);
        continue;
      }

      // Build URL for the USFM file
      const fileUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
      console.log(`🔗 Fetching from: ${fileUrl}`);

      try {
        // Get USFM data
        console.log(`🔍 Checking USFM cache for: usfm:${fileUrl}`);
        const usfmCacheResult = await unifiedCache.getWithDeduplication(
          `usfm:${fileUrl}`,
          async () => {
            console.log(`🔄 Cache miss for USFM file, downloading...`);
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch scripture content: ${fileResponse.status}`);
            }
            const usfmData = await fileResponse.text();
            console.log(`📄 Downloaded ${usfmData.length} characters of USFM data`);
            return usfmData;
          },
          "fileContent",
          bypassCache
        );

        console.log(
          `🎯 USFM cache result: fromCache=${usfmCacheResult.fromCache}, length=${usfmCacheResult.data?.length || 0}`
        );
        if (usfmCacheResult.fromCache) {
          console.log(`🚀 USFM cache HIT! Using cached file.`);
        }

        const usfmData = usfmCacheResult.data;

        // Choose extraction method based on format and includeVerseNumbers
        const extractionStart = Date.now();
        console.log(
          `⚡ Starting USFM extraction for ${reference.book} ${reference.chapter}:${reference.verse}`
        );
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
              console.log(`🔗 Processing alignment data for ${resource.name}`);
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
              console.log(
                `🔗 Alignment processing completed in ${alignmentTime}ms: ${parsedAlignment.alignments.length} alignments found`
              );
            } catch (alignmentError) {
              console.warn(`⚠️ Alignment processing failed for ${resource.name}:`, alignmentError);
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
          console.log(
            `📝 Extracted ${text.length} characters from ${resource.name} in ${extractionTime}ms`
          );
        }
      } catch (error) {
        console.warn(`⚠️ Failed to process ${resource.name}:`, error);
        continue;
      }
    }

    if (scriptures.length === 0) {
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
    console.log(`💾 Cached transformed scripture response: ${responseKey}`);
  } else {
    console.log(`🚫 Skipping cache due to bypass: ${cachedResponse.cacheInfo?.bypassReason}`);
  }

  return result;
}

/**
 * Extract raw USFM passage for format=usfm requests
 */
function extractUSFMPassage(
  usfm: string,
  reference: { book: string; chapter?: number; verse?: number; verseEnd?: number }
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
