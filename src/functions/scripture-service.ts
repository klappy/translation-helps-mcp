/**
 * Scripture Service
 * Shared core implementation for fetching scripture text
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseReference } from "./reference-parser";
import { CacheBypassOptions, unifiedCache } from "./unified-cache";
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

export interface ScriptureOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeVerseNumbers?: boolean;
  format?: "text" | "usfm";
  includeMultipleTranslations?: boolean;
  specificTranslations?: string[];
  bypassCache?: CacheBypassOptions;
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
    includeMultipleTranslations = false,
    bypassCache,
  } = options;

  console.log(`📖 Core scripture service called with:`, {
    reference: referenceParam,
    language,
    organization,
    includeVerseNumbers,
    format,
    bypassCache: bypassCache ? "enabled" : "disabled",
  });

  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Create cache key that includes ALL parameters
  const responseKey = `scripture:${referenceParam}:${language}:${organization}:${includeVerseNumbers}:${format}:${includeMultipleTranslations}`;

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
    // Search for scripture resources from BOTH subjects
    const subjects = ["Aligned%20Bible", "Bible"];
    const allResources: any[] = [];

    for (const subject of subjects) {
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?subject=${subject}&lang=${language}&owner=${organization}`;
      console.log(`🔍 Searching catalog: ${searchUrl}`);

      const catalogResponse = await fetch(searchUrl);
      if (!catalogResponse.ok) {
        console.warn(`⚠️ Catalog search failed for ${subject}: ${catalogResponse.status}`);
        continue; // Continue to next subject instead of throwing
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          title: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };

      if (catalogData.data) {
        allResources.push(...catalogData.data);
      }
    }

    if (allResources.length === 0) {
      console.error(`❌ No scripture resources found for ${language}/${organization}`);
      throw new Error(`No scripture resources found for ${language}/${organization}`);
    }

    console.log(`📊 Found ${allResources.length} scripture resources across all subjects`);

    // Deduplicate resources by name (in case same resource appears in multiple subjects)
    const uniqueResources = allResources.reduce((acc: any[], resource: any) => {
      if (!acc.find((r: any) => r.name === resource.name)) {
        acc.push(resource);
      }
      return acc;
    }, []);

    console.log(`📊 Found ${uniqueResources.length} unique scripture resources`);

    // Filter by specific translations if requested
    let filteredResources = uniqueResources;
    if (options.specificTranslations && options.specificTranslations.length > 0) {
      filteredResources = uniqueResources.filter((resource) =>
        options.specificTranslations!.includes(resource.name)
      );
      console.log(
        `🎯 Filtered to ${filteredResources.length} specific translations: ${options.specificTranslations.join(", ")}`
      );

      if (filteredResources.length === 0) {
        console.warn(
          `⚠️ No resources found for specified translations: ${options.specificTranslations.join(", ")}`
        );
        // Fall back to all available resources if none of the specified ones exist
        filteredResources = uniqueResources;
      }
    }

    // Handle multiple translations if requested (and not overridden by specific translations)
    const resourcesToProcess = options.specificTranslations
      ? filteredResources
      : includeMultipleTranslations
        ? filteredResources
        : [filteredResources[0]];

    console.log(
      `📖 Processing ${resourcesToProcess.length} resource(s) (multiple translations: ${includeMultipleTranslations})`
    );

    const scriptures = [];
    for (const resource of resourcesToProcess) {
      console.log(`📖 Processing resource: ${resource.name} (${resource.title})`);

      // Find the correct file from ingredients
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier === reference?.book.toLowerCase()
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

        const usfmData = usfmCacheResult.data;

        // Choose extraction method based on format and includeVerseNumbers
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
          });
          console.log(`📝 Extracted ${text.length} characters from ${resource.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to process ${resource.name}:`, error);
        continue;
      }
    }

    if (scriptures.length === 0) {
      throw new Error(`No scripture text found for ${referenceParam}`);
    }

    const result: ScriptureResult = includeMultipleTranslations
      ? {
          scriptures,
          metadata: {
            responseTime: Date.now() - startTime,
            cached: false,
            timestamp: new Date().toISOString(),
            includeVerseNumbers,
            format,
            translationsFound: scriptures.length,
            cacheKey: responseKey,
          },
        }
      : {
          scripture: scriptures[0],
          metadata: {
            responseTime: Date.now() - startTime,
            cached: false,
            timestamp: new Date().toISOString(),
            includeVerseNumbers,
            format,
            translationsFound: scriptures.length,
            cacheKey: responseKey,
          },
        };

    return result;
  }

  const result = await fetchFreshScripture();

  // Cache the result (unless bypassed)
  if (!bypassCache || !cachedResponse.cacheInfo?.bypassReason) {
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
function extractUSFMPassage(usfm: string, reference: any): string {
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
