/**
 * UST/GST Scripture Endpoint Handler
 * Fetches meaning-based (simplified) Scripture texts with embedded alignment data
 * Complements ULT/GLT by showing natural, clear expressions of biblical meaning
 *
 * UST = unfoldingWord Simplified Text (English)
 * GST = Gateway Simplified Text (Strategic Languages)
 */

import { DEFAULT_STRATEGIC_LANGUAGE, Organization } from "../../constants/terminology.js";
import { DCSApiClient } from "../../services/DCSApiClient.js";
import type { PlatformHandler } from "../platform-adapter.js";
import { unifiedCache } from "../unified-cache.js";
import { ParsedUSFM, parseUSFMAlignment, WordAlignment } from "../usfm-alignment-parser.js";

interface VerseMapping {
  text: string;
  usfm: string;
  alignments: WordAlignment[];
  startPosition: number;
  endPosition: number;
}

interface USTResponse {
  success: boolean;
  data?: {
    reference: string;
    language: string;
    organization: string;
    resourceType: "ust" | "gst";
    scripture: {
      text: string; // Clean text without USFM markers
      usfmText: string; // Original USFM with alignment markers
      alignment: WordAlignment[]; // Parsed alignment data
      verseMapping: Record<number, VerseMapping>;
    };
    metadata: {
      version: string;
      lastModified: string;
      book: string;
      chapter?: number;
      verses?: number[];
      hasAlignment: boolean;
      alignmentStats: {
        totalAlignments: number;
        averageConfidence: number;
        confidenceDistribution: {
          high: number;
          medium: number;
          low: number;
        };
      };
      translationApproach: "meaning-based";
      sourceLanguages: string[]; // Hebrew, Greek, Aramaic
      targetLanguage: string; // Strategic/Heart language
      clarity: {
        readabilityScore: number; // 0-100, higher = more readable
        sentenceComplexity: "simple" | "moderate" | "complex";
        vocabularyLevel: "basic" | "intermediate" | "advanced";
      };
      cacheStatus: "hit" | "miss" | "partial";
      responseTime: number;
    };
  };
  error?: string;
  timestamp: string;
}

/**
 * Main handler for UST/GST Scripture requests
 */
export const fetchUSTScriptureHandler: PlatformHandler = async (request) => {
  const startTime = Date.now();
  const url = new URL(request.url);

  // Extract parameters
  const reference = url.searchParams.get("reference");
  const language = url.searchParams.get("language") || DEFAULT_STRATEGIC_LANGUAGE;
  const organization = url.searchParams.get("organization") || Organization.UNFOLDINGWORD;
  const includeAlignment = url.searchParams.get("includeAlignment") !== "false";
  const includeVerseMapping = url.searchParams.get("includeVerseMapping") !== "false";
  const includeClarity = url.searchParams.get("includeClarity") !== "false";
  const bypassCache = url.searchParams.get("bypassCache") === "true";

  // Validate required parameters
  if (!reference) {
    const errorResponse: USTResponse = {
      success: false,
      error: "Reference parameter is required",
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 400,
      body: JSON.stringify(errorResponse),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  }

  try {
    // Determine resource type based on language
    const resourceType: "ust" | "gst" = language === "en" ? "ust" : "gst";

    // Create cache key
    const cacheKey = `ust:${language}:${organization}:${reference}:${includeAlignment}:${includeClarity}`;

    // Check cache first (unless bypassed)
    let cacheStatus: "hit" | "miss" | "partial" = "miss";
    if (!bypassCache) {
      try {
        const cached = await unifiedCache.get(cacheKey);
        if (cached?.value) {
          const response = {
            ...cached.value,
            data: {
              ...cached.value.data,
              metadata: {
                ...cached.value.data.metadata,
                cacheStatus: "hit" as const,
                responseTime: Date.now() - startTime,
              },
            },
          };

          return {
            statusCode: 200,
            body: JSON.stringify(response),
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          };
        }
      } catch (error) {
        console.warn("Cache retrieval failed:", error);
      }
    }

    // Initialize DCS client
    const dcsClient = new DCSApiClient();

    // Fetch the UST/GST resource
    const scriptureData = await fetchUSTResource(
      dcsClient,
      language,
      organization,
      resourceType,
      reference
    );

    if (!scriptureData) {
      const notFoundResponse: USTResponse = {
        success: false,
        error: `UST/GST resource not found for ${language}:${reference}`,
        timestamp: new Date().toISOString(),
      };

      return {
        statusCode: 404,
        body: JSON.stringify(notFoundResponse),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      };
    }

    // Parse USFM and extract alignment data
    const alignmentData =
      includeAlignment && scriptureData.usfmText
        ? parseUSFMAlignment(scriptureData.usfmText)
        : null;

    // Build verse mapping if requested
    const verseMapping =
      includeVerseMapping && alignmentData
        ? buildVerseMapping(scriptureData.usfmText, alignmentData)
        : {};

    // Calculate alignment statistics
    const alignmentStats = alignmentData
      ? calculateAlignmentStats(alignmentData.alignments)
      : {
          totalAlignments: 0,
          averageConfidence: 0,
          confidenceDistribution: { high: 0, medium: 0, low: 0 },
        };

    // Calculate clarity metrics if requested
    const clarity = includeClarity
      ? calculateClarityMetrics(alignmentData?.text || scriptureData.cleanText)
      : {
          readabilityScore: 0,
          sentenceComplexity: "moderate" as const,
          vocabularyLevel: "intermediate" as const,
        };

    // Build response
    const response: USTResponse = {
      success: true,
      data: {
        reference,
        language,
        organization,
        resourceType,
        scripture: {
          text: alignmentData?.text || scriptureData.cleanText,
          usfmText: scriptureData.usfmText,
          alignment: alignmentData?.alignments || [],
          verseMapping,
        },
        metadata: {
          version: scriptureData.version,
          lastModified: scriptureData.lastModified,
          book: alignmentData?.book || scriptureData.book,
          chapter: alignmentData?.chapter,
          verses: Object.keys(verseMapping).map(Number).filter(Boolean),
          hasAlignment: !!alignmentData && alignmentData.alignments.length > 0,
          alignmentStats,
          translationApproach: "meaning-based",
          sourceLanguages: ["Hebrew", "Greek", "Aramaic"],
          targetLanguage: language,
          clarity,
          cacheStatus,
          responseTime: Date.now() - startTime,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the response (5 minute TTL for UST/GST)
    try {
      await unifiedCache.set(cacheKey, response);
    } catch (error) {
      console.warn("Cache storage failed:", error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    };
  } catch (error) {
    console.error("Error fetching UST/GST scripture:", error);

    const errorResponse: USTResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  }
};

/**
 * Fetch UST/GST resource from DCS
 */
async function fetchUSTResource(
  dcsClient: DCSApiClient,
  language: string,
  organization: string,
  resourceType: "ust" | "gst",
  reference: string
): Promise<{
  usfmText: string;
  cleanText: string;
  version: string;
  lastModified: string;
  book: string;
} | null> {
  try {
    // Parse reference to get book information
    const refParts = reference.split(/[\s:.-]/);
    const book = refParts[0]?.toLowerCase();

    if (!book) {
      throw new Error("Invalid reference format");
    }

    // Get the file path for UST/GST resource
    const fileName = `${book}.usfm`;
    const filePath = `content/${fileName}`;

    // Fetch the resource data using getFileContent
    const resourceResponse = await dcsClient.getFileContent(
      organization,
      `${language}_${resourceType}`,
      filePath
    );

    if (!resourceResponse.success || !resourceResponse.data) {
      return null;
    }

    const fileContent = resourceResponse.data;
    const content = fileContent.content;

    if (!content) {
      console.error("No content found in file");
      return null;
    }

    // Decode base64 content if needed
    const decodedContent = fileContent.encoding === "base64" ? atob(content) : content;

    // Extract the specific passage from USFM
    const extractedText = extractPassageFromUSFM(decodedContent, reference);

    // Generate clean text (remove USFM markers)
    const cleanText = generateCleanText(extractedText);

    return {
      usfmText: extractedText,
      cleanText,
      version: "latest", // FileContent doesn't have version info
      lastModified: new Date().toISOString(), // FileContent doesn't have lastModified
      book: book.toUpperCase(),
    };
  } catch (error) {
    console.error(`Error fetching ${resourceType} resource:`, error);
    return null;
  }
}

/**
 * Extract specific passage from USFM text
 */
function extractPassageFromUSFM(usfmText: string, reference: string): string {
  try {
    const refParts = reference.split(/[\s:.-]/);
    const chapter = parseInt(refParts[1]) || 1;
    const startVerse = parseInt(refParts[2]) || 1;
    const endVerse = refParts[3] ? parseInt(refParts[3]) : startVerse;

    // Find chapter marker
    const chapterRegex = new RegExp(`\\\\c\\s+${chapter}\\s`, "i");
    const chapterMatch = usfmText.search(chapterRegex);

    if (chapterMatch === -1) {
      return usfmText; // Return full text if chapter not found
    }

    // Extract from chapter start to next chapter or end
    const nextChapterRegex = new RegExp(`\\\\c\\s+${chapter + 1}\\s`, "i");
    const nextChapterMatch = usfmText.search(nextChapterRegex);

    const chapterText =
      nextChapterMatch !== -1
        ? usfmText.slice(chapterMatch, nextChapterMatch)
        : usfmText.slice(chapterMatch);

    // If specific verses requested, extract those
    if (startVerse > 1 || endVerse < 999) {
      return extractVerseRange(chapterText, startVerse, endVerse);
    }

    return chapterText;
  } catch (error) {
    console.error("Error extracting passage:", error);
    return usfmText; // Return full text on error
  }
}

/**
 * Extract verse range from chapter text
 */
function extractVerseRange(chapterText: string, startVerse: number, endVerse: number): string {
  const verses: string[] = [];

  for (let v = startVerse; v <= endVerse; v++) {
    const verseRegex = new RegExp(`\\\\v\\s+${v}\\s(.*?)(?=\\\\v\\s+${v + 1}|$)`, "s");
    const verseMatch = chapterText.match(verseRegex);

    if (verseMatch) {
      verses.push(`\\v ${v} ${verseMatch[1].trim()}`);
    }
  }

  return verses.join(" ");
}

/**
 * Generate clean text without USFM markers
 */
function generateCleanText(usfmText: string): string {
  let cleanText = usfmText;

  // Remove alignment markers
  cleanText = cleanText.replace(/\\zaln-s[^*]*\*/g, "");
  cleanText = cleanText.replace(/\\zaln-e\\\*/g, "");

  // Remove word markers but keep the text
  cleanText = cleanText.replace(/\\w\s+([^|\\]+)\|[^\\]*?\\w\*/g, "$1");

  // Remove verse and chapter markers
  cleanText = cleanText.replace(/\\[cv]\s+\d+/g, "");

  // Remove other USFM markers
  cleanText = cleanText.replace(/\\[a-z]+\*/g, "");
  cleanText = cleanText.replace(/\\[a-z]+\s/g, "");

  // Clean up whitespace
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return cleanText;
}

/**
 * Build verse-by-verse mapping with alignment data
 */
function buildVerseMapping(
  usfmText: string,
  alignmentData: ParsedUSFM
): Record<number, VerseMapping> {
  const mapping: Record<number, VerseMapping> = {};

  // Extract verses from USFM
  const verseRegex = /\\v\s+(\d+)\s(.*?)(?=\\v\s+\d+|$)/gs;
  let match;

  while ((match = verseRegex.exec(usfmText)) !== null) {
    const verseNum = parseInt(match[1]);
    const verseText = match[2];
    const startPos = match.index!;
    const endPos = startPos + match[0].length;

    // Find alignments for this verse
    const verseAlignments = alignmentData.alignments.filter(
      (a: WordAlignment) => a.position.verse === verseNum
    );

    mapping[verseNum] = {
      text: generateCleanText(verseText),
      usfm: verseText,
      alignments: verseAlignments,
      startPosition: startPos,
      endPosition: endPos,
    };
  }

  return mapping;
}

/**
 * Calculate alignment statistics
 */
function calculateAlignmentStats(alignments: WordAlignment[]) {
  if (!alignments || alignments.length === 0) {
    return {
      totalAlignments: 0,
      averageConfidence: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
    };
  }

  const total = alignments.length;
  const totalConfidence = alignments.reduce((sum, a) => sum + (a.confidence || 0), 0);
  const averageConfidence = totalConfidence / total;

  const high = alignments.filter((a) => (a.confidence || 0) > 0.8).length;
  const medium = alignments.filter(
    (a) => (a.confidence || 0) >= 0.5 && (a.confidence || 0) <= 0.8
  ).length;
  const low = alignments.filter((a) => (a.confidence || 0) < 0.5).length;

  return {
    totalAlignments: total,
    averageConfidence,
    confidenceDistribution: { high, medium, low },
  };
}

/**
 * Calculate clarity metrics for UST/GST meaning-based texts
 */
function calculateClarityMetrics(text: string) {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const totalWords = words.length;
  const totalSentences = sentences.length;

  // Basic readability calculation (simplified Flesch Reading Ease)
  const avgWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;
  const avgSyllablesPerWord = calculateAverageSyllables(words);

  // Flesch Reading Ease formula (simplified)
  const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const readabilityScore = Math.max(0, Math.min(100, fleschScore));

  // Determine sentence complexity
  let sentenceComplexity: "simple" | "moderate" | "complex" = "moderate";
  if (avgWordsPerSentence < 10) {
    sentenceComplexity = "simple";
  } else if (avgWordsPerSentence > 20) {
    sentenceComplexity = "complex";
  }

  // Determine vocabulary level (basic analysis)
  const commonWords = countCommonWords(words);
  const commonWordRatio = totalWords > 0 ? commonWords / totalWords : 0;

  let vocabularyLevel: "basic" | "intermediate" | "advanced" = "intermediate";
  if (commonWordRatio > 0.8) {
    vocabularyLevel = "basic";
  } else if (commonWordRatio < 0.6) {
    vocabularyLevel = "advanced";
  }

  return {
    readabilityScore: Math.round(readabilityScore),
    sentenceComplexity,
    vocabularyLevel,
  };
}

/**
 * Calculate average syllables per word (simplified estimation)
 */
function calculateAverageSyllables(words: string[]): number {
  if (words.length === 0) return 0;

  const totalSyllables = words.reduce((sum, word) => {
    // Simplified syllable counting - count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/gi) || [];
    const syllableCount = Math.max(1, vowelGroups.length);

    // Adjust for silent 'e'
    if (word.endsWith("e") && syllableCount > 1) {
      return sum + syllableCount - 1;
    }

    return sum + syllableCount;
  }, 0);

  return totalSyllables / words.length;
}

/**
 * Count common words (simplified analysis)
 */
function countCommonWords(words: string[]): number {
  const commonWords = new Set([
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "a",
    "an",
    "this",
    "that",
    "these",
    "those",
    "is",
    "are",
    "was",
    "were",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "can",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "he",
    "she",
    "it",
    "they",
    "we",
    "you",
    "i",
    "me",
    "him",
    "her",
    "them",
    "us",
    "my",
    "your",
    "his",
    "its",
    "our",
    "their",
    "who",
    "what",
    "when",
    "where",
    "why",
    "how",
    "all",
    "some",
    "any",
    "many",
    "much",
    "most",
    "more",
    "less",
    "few",
    "little",
    "big",
    "small",
    "good",
    "bad",
    "new",
    "old",
    "first",
    "last",
    "long",
    "short",
    "high",
    "low",
    "right",
    "wrong",
    "true",
    "false",
    "yes",
    "no",
    "not",
    "very",
    "too",
    "so",
    "just",
    "only",
    "also",
    "even",
    "still",
    "yet",
    "already",
    "now",
    "then",
    "here",
    "there",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "again",
    "back",
  ]);

  return words.filter((word) => commonWords.has(word.replace(/[^\w]/g, ""))).length;
}
