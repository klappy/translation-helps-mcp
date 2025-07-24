/**
 * ULT/GLT Scripture Endpoint Handler
 * Fetches literal (form-centric) Scripture texts with embedded alignment data
 * Implements the foundation of the unfoldingWord translation ecosystem
 *
 * ULT = unfoldingWord Literal Text (English)
 * GLT = Gateway Literal Text (Strategic Languages) - Form-centric translation
 */

import {
  DEFAULT_STRATEGIC_LANGUAGE,
  Organization,
} from "../../constants/terminology.js";
import { DCSApiClient } from "../../services/DCSApiClient.js";
import type { XRayTrace } from "../../types/dcs.js";
import type { PlatformHandler } from "../platform-adapter.js";
import { unifiedCache } from "../unified-cache.js";
import {
  ParsedUSFM,
  WordAlignment,
  parseUSFMAlignment,
} from "../usfm-alignment-parser.js";

interface VerseMapping {
  text: string;
  usfm: string;
  alignments: WordAlignment[];
  startPosition: number;
  endPosition: number;
}

interface ULTResponse {
  success: boolean;
  data?: {
    reference: string;
    language: string;
    organization: string;
    resourceType: "ult" | "glt";
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
      translationApproach: "form-centric";
      sourceLanguages: string[]; // Hebrew, Greek, Aramaic
      cacheStatus: "hit" | "miss" | "partial";
      responseTime: number;
      xrayTrace?: XRayTrace;
    };
  };
  error?: string;
  timestamp: string;
}

/**
 * Main handler for ULT/GLT Scripture requests
 */
export const fetchULTScriptureHandler: PlatformHandler = async (request) => {
  const startTime = Date.now();
  const url = new URL(request.url);

  // Initialize DCS client for X-Ray tracing
  const dcsClient = new DCSApiClient();
  const traceId = `ult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract parameters
  const reference = url.searchParams.get("reference");
  const language =
    url.searchParams.get("language") || DEFAULT_STRATEGIC_LANGUAGE;
  const organization =
    url.searchParams.get("organization") || Organization.UNFOLDINGWORD;
  const includeAlignment = url.searchParams.get("includeAlignment") !== "false";
  const includeVerseMapping =
    url.searchParams.get("includeVerseMapping") !== "false";
  const bypassCache = url.searchParams.get("bypassCache") === "true";

  // Validate required parameters
  if (!reference) {
    const errorResponse: ULTResponse = {
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
    // Enable X-Ray tracing
    dcsClient.enableTracing(traceId, "/api/fetch-ult-scripture");

    // Determine resource type based on language
    const resourceType: "ult" | "glt" = language === "en" ? "ult" : "glt";

    // Create cache key
    const cacheKey = `ult:${language}:${organization}:${reference}:${includeAlignment}`;

    // Check cache first (unless bypassed)
    const cacheStatus: "hit" | "miss" | "partial" = "miss";
    if (!bypassCache) {
      try {
        const cached = await unifiedCache.get(cacheKey);
        if (cached?.value) {
          // Add synthetic trace for cache hit
          dcsClient.addCustomTrace({
            id: `internal_cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            endpoint: "unified-cache",
            url: `internal://cache/${cacheKey}`,
            method: "GET",
            startTime: 0,
            endTime: 5,
            duration: 5,
            statusCode: 200,
            success: true,
            cacheStatus: "HIT",
            cacheSource: "unified-cache",
            attempts: 1,
            responseSize: JSON.stringify(cached.value).length,
            requestData: { cacheKey },
          });

          // Collect X-Ray trace for cache hit
          const xrayTrace: XRayTrace | null = dcsClient.getTrace();
          dcsClient.disableTracing();

          const response = {
            ...cached.value,
            data: {
              ...cached.value.data,
              metadata: {
                ...cached.value.data.metadata,
                cacheStatus: "hit" as const,
                responseTime: Date.now() - startTime,
                // Include fresh X-Ray trace
                ...(xrayTrace && { xrayTrace }),
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

    // Fetch the ULT/GLT resource
    const scriptureData = await fetchULTResource(
      dcsClient,
      language,
      organization,
      resourceType,
      reference,
    );

    if (!scriptureData) {
      // Disable tracing before error response
      dcsClient.disableTracing();

      const notFoundResponse: ULTResponse = {
        success: false,
        error: `ULT/GLT resource not found for ${language}:${reference}`,
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

    // Collect X-Ray trace BEFORE disabling tracing
    const xrayTrace: XRayTrace | null = dcsClient.getTrace();
    dcsClient.disableTracing();

    // Build response
    const response: ULTResponse = {
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
          translationApproach: "form-centric",
          sourceLanguages: ["Hebrew", "Greek", "Aramaic"],
          cacheStatus,
          responseTime: Date.now() - startTime,
          // Include X-Ray trace if available (always fresh, never cached)
          ...(xrayTrace && { xrayTrace }),
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the response (5 minute TTL for ULT/GLT)
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
    // Ensure tracing is disabled on error
    dcsClient.disableTracing();

    console.error("Error fetching ULT/GLT scripture:", error);

    const errorResponse: ULTResponse = {
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
 * Fetch ULT/GLT resource from DCS
 */
async function fetchULTResource(
  dcsClient: DCSApiClient,
  language: string,
  organization: string,
  resourceType: "ult" | "glt",
  reference: string,
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

    // Get the file path for ULT/GLT resource
    const fileName = `${book}.usfm`;
    const filePath = `content/${fileName}`;

    // Fetch the resource data using getFileContent
    const resourceResponse = await dcsClient.getFileContent(
      organization,
      `${language}_${resourceType}`,
      filePath,
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
    const decodedContent =
      fileContent.encoding === "base64" ? atob(content) : content;

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
function extractVerseRange(
  chapterText: string,
  startVerse: number,
  endVerse: number,
): string {
  const verses: string[] = [];

  for (let v = startVerse; v <= endVerse; v++) {
    const verseRegex = new RegExp(
      `\\\\v\\s+${v}\\s(.*?)(?=\\\\v\\s+${v + 1}|$)`,
      "s",
    );
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
  alignmentData: ParsedUSFM,
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
      (a: WordAlignment) => a.position.verse === verseNum,
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
  const totalConfidence = alignments.reduce(
    (sum, a) => sum + (a.confidence || 0),
    0,
  );
  const averageConfidence = totalConfidence / total;

  const high = alignments.filter((a) => (a.confidence || 0) > 0.8).length;
  const medium = alignments.filter(
    (a) => (a.confidence || 0) >= 0.5 && (a.confidence || 0) <= 0.8,
  ).length;
  const low = alignments.filter((a) => (a.confidence || 0) < 0.5).length;

  return {
    totalAlignments: total,
    averageConfidence,
    confidenceDistribution: { high, medium, low },
  };
}
