/**
 * Translation Words Links (TWL) Handler
 * Fetches word-to-definition links that map specific word occurrences to Translation Words articles
 * Enables precise linking between scripture text and translation helps
 */

import {
  DEFAULT_STRATEGIC_LANGUAGE,
  Organization,
  ResourceType,
} from "../../constants/terminology.js";
import { parseUSFMAlignment } from "../../experimental/usfm-alignment-parser.js";
import { DCSApiClient } from "../../services/DCSApiClient.js";
import { logger } from "../../utils/logger.js";
import type { PlatformHandler } from "../platform-adapter.js";

interface WordLink {
  id: string;
  word: string;
  strongNumber?: string;
  lemma?: string;
  occurrence: number;
  totalOccurrences: number;
  translationWordId: string;
  translationWordTitle: string;
  confidence: number;
  position: {
    start: number;
    end: number;
    verse: number;
    chapter: number;
  };
  metadata: {
    sourceLanguage: string;
    targetLanguage: string;
    resourceType: ResourceType;
  };
}

interface TWLResponse {
  success: boolean;
  data?: {
    reference: string;
    language: string;
    organization: string;
    links: WordLink[];
    metadata: {
      totalLinks: number;
      averageConfidence: number;
      coveragePercentage: number;
      sourceLanguages: string[];
      cacheStatus: "hit" | "miss" | "partial";
      responseTime: number;
    };
  };
  error?: string;
  timestamp: string;
}

/**
 * Main handler for Translation Words Links requests
 */
export const fetchTranslationWordLinksHandler: PlatformHandler = async (
  request,
) => {
  const startTime = Date.now();
  const url = new URL(request.url);

  // Extract parameters
  const reference = url.searchParams.get("reference");
  const language =
    url.searchParams.get("language") || DEFAULT_STRATEGIC_LANGUAGE;
  const organization =
    url.searchParams.get("organization") || Organization.UNFOLDINGWORD;
  const includeMetadata = url.searchParams.get("includeMetadata") !== "false";
  const bypassCache = url.searchParams.get("bypassCache") === "true";

  // Validate required parameters
  if (!reference) {
    const errorResponse: TWLResponse = {
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
    // Create cache key
    const cacheKey = `twl:${reference}:${language}:${organization}:${includeMetadata}`;

    // Response caching disabled by policy; skip transformed response reads

    logger.info(`TWL cache MISS, fetching fresh data`, { reference });

    // Fetch fresh data with X-Ray tracing
    const dcsClient = new DCSApiClient();
    const traceId = `twl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dcsClient.enableTracing(traceId, "/api/fetch-translation-word-links");

    const result = await fetchTWLData(
      dcsClient,
      reference,
      language,
      organization,
    );

    // Collect X-Ray trace data
    // const xrayTrace = dcsClient.getTrace();
    dcsClient.disableTracing();

    if (!result) {
      const errorResponse: TWLResponse = {
        success: false,
        error: `No translation word links found for ${reference}`,
        timestamp: new Date().toISOString(),
      };

      return {
        statusCode: 404,
        body: JSON.stringify(errorResponse),
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      };
    }

    // Do not cache transformed responses

    const responseTime = Date.now() - startTime;

    const response: TWLResponse = {
      success: true,
      data: {
        ...result,
        metadata: {
          ...result.metadata,
          responseTime,
          cacheStatus: bypassCache ? "miss" : "miss",
        },
      },
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600",
        "X-Cache": "MISS",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error("TWL error", {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorResponse: TWLResponse = {
      success: false,
      error: errorMessage,
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
 * Fetch TWL data for the given reference
 */
async function fetchTWLData(
  dcsClient: DCSApiClient,
  reference: string,
  language: string,
  organization: string,
): Promise<{
  reference: string;
  language: string;
  organization: string;
  links: WordLink[];
  metadata: {
    totalLinks: number;
    averageConfidence: number;
    coveragePercentage: number;
    sourceLanguages: string[];
  };
} | null> {
  try {
    // First, get the scripture text with alignment data
    const scriptureResponse = await dcsClient.getSpecificResourceMetadata(
      language,
      organization,
      "ult", // Use ULT for alignment data
    );

    if (!scriptureResponse.success || !scriptureResponse.data) {
      logger.warn(`No ULT resource found`, { language, organization });
      return null;
    }

    // Get the USFM text for the reference
    // Do not construct raw USFM URLs; this handler should be migrated to use ingredients via ZIP
    const usfmResponse = await Promise.resolve({ ok: false } as Response);
    if (!usfmResponse.ok) {
      logger.warn(`Failed to fetch USFM`, { status: usfmResponse.status });
      return null;
    }

    const usfmText = await usfmResponse.text();

    // Parse alignment data
    const alignmentData = parseUSFMAlignment(usfmText);

    // Get Translation Words catalog
    const twResponse = await dcsClient.getSpecificResourceMetadata(
      language,
      organization,
      "tw",
    );

    if (!twResponse.success || !twResponse.data) {
      logger.warn(`No TW resource found`, { language, organization });
      return null;
    }

    // Build word links from alignment data
    const links: WordLink[] = [];
    const sourceLanguages = new Set<string>();

    for (const alignment of alignmentData.alignments) {
      if (alignment.attributes["x-strong"] || alignment.attributes["x-tw"]) {
        const link: WordLink = {
          id: `${alignment.id}-link`,
          word: alignment.targetWord,
          strongNumber: alignment.attributes["x-strong"],
          lemma: alignment.attributes["x-lemma"],
          occurrence: parseInt(alignment.attributes["x-occurrence"] || "1"),
          totalOccurrences: parseInt(
            alignment.attributes["x-occurrences"] || "1",
          ),
          translationWordId:
            alignment.attributes["x-tw"] ||
            alignment.attributes["x-strong"] ||
            "",
          translationWordTitle:
            alignment.attributes["x-content"] || alignment.targetWord,
          confidence: alignment.confidence,
          position: {
            start: alignment.position.start,
            end: alignment.position.end,
            verse: alignment.position.verse,
            chapter: alignment.position.chapter,
          },
          metadata: {
            sourceLanguage: alignment.attributes["x-lemma"]
              ? "hebrew"
              : "greek",
            targetLanguage: language,
            resourceType: ResourceType.TWL,
          },
        };

        links.push(link);

        if (alignment.attributes["x-lemma"]) {
          sourceLanguages.add("hebrew");
        } else {
          sourceLanguages.add("greek");
        }
      }
    }

    // Calculate metadata
    const totalLinks = links.length;
    const averageConfidence =
      totalLinks > 0
        ? links.reduce((sum, link) => sum + link.confidence, 0) / totalLinks
        : 0;

    const coveragePercentage =
      totalLinks > 0 ? (totalLinks / alignmentData.alignments.length) * 100 : 0;

    return {
      reference,
      language,
      organization,
      links,
      metadata: {
        totalLinks,
        averageConfidence,
        coveragePercentage,
        sourceLanguages: Array.from(sourceLanguages),
      },
    };
  } catch (error) {
    logger.error("Error fetching TWL data", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
