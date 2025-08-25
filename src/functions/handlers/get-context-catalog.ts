/**
 * Platform-agnostic Get Context Handler - CATALOG VERSION
 * Uses the D43 catalog search to get ALL resources in ONE call!
 */

import { DCSApiClient } from "../../services/DCSApiClient.js";
import type { XRayTrace } from "../../types/dcs.js";
import { Errors } from "../../utils/errorEnvelope.js";
import { proxyFetch } from "../../utils/httpClient.js";
import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

export const getContextHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  const startTime = Date.now();
  const performanceStart = performance.now();

  // Initialize DCS client for X-Ray tracing
  const dcsClient = new DCSApiClient();
  const traceId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Enable X-Ray tracing
  dcsClient.enableTracing(traceId, "/api/get-context");

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const reference = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";

    if (!reference) {
      dcsClient.disableTracing();
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(Errors.missingParameter("reference", traceId)),
      };
    }

    // Parse the reference to get book and chapter
    const refParts = reference.match(
      /^(\d?\s*\w+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/,
    );
    if (!refParts) {
      dcsClient.disableTracing();
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          code: "INVALID_REFERENCE",
          message: "Please provide a valid reference like 'John 3:16'",
        }),
      };
    }

    const [, book, chapter, verseStart, verseEnd] = refParts;
    const bookCode = getBookCode(book);

    logger.info("Parsed reference", {
      book,
      bookCode,
      chapter,
      verseStart,
      verseEnd,
    });

    // Build subject-specific catalog URLs for optimized caching
    const resourceTypes = [
      { subject: "Bible,Aligned%20Bible", name: "bible" },
      { subject: "TSV%20Translation%20Notes", name: "notes" },
      { subject: "TSV%20Translation%20Questions", name: "questions" },
      { subject: "TSV%20Translation%20Words%20Links", name: "links" },
    ];

    const contextArray = [];
    const resourcePromises = [];

    // Fetch each resource type with subject-specific caching
    for (const resourceType of resourceTypes) {
      const catalogUrl = new URL(
        "https://git.door43.org/api/v1/catalog/search",
      );
      catalogUrl.searchParams.append("lang", language);
      catalogUrl.searchParams.append("owner", organization);
      catalogUrl.searchParams.append("stage", "prod");
      catalogUrl.searchParams.append("subject", resourceType.subject);
      catalogUrl.searchParams.append("metadataType", "rc");
      catalogUrl.searchParams.append("includeMetadata", "true");

      const catalogStartTime = performance.now();

      try {
        const catalogResponse = await proxyFetch(catalogUrl.toString());
        const catalogDuration = performance.now() - catalogStartTime;

        // Add manual trace entry for each catalog call
        dcsClient.addCustomTrace({
          id: `${traceId}_catalog_${resourceType.name}`,
          endpoint: "/api/v1/catalog/search",
          url: catalogUrl.toString(),
          method: "GET",
          startTime: catalogStartTime,
          endTime: catalogStartTime + catalogDuration,
          duration: catalogDuration,
          statusCode: catalogResponse.status,
          success: catalogResponse.ok,
          cacheStatus: "miss",
          attempts: 1,
        });

        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json();
          const resources = catalogData.data || [];

          // Process each resource
          for (const resource of resources) {
            const { name, ingredients } = resource;

            if (!ingredients || !Array.isArray(ingredients)) continue;

            // Find the ingredient for our book
            const bookIngredient = ingredients.find(
              (ing) =>
                ing.identifier === bookCode.toLowerCase() ||
                ing.identifier === bookCode ||
                ing.identifier === book.toUpperCase() ||
                ing.identifier === book.toLowerCase(),
            );

            if (!bookIngredient || !bookIngredient.path) {
              logger.info(`No ingredient found for ${bookCode} in ${name}`, {
                identifiers: ingredients.map((i) => i.identifier),
              });
              continue;
            }

            // Route based on resource type
            if (resourceType.name === "bible") {
              resourcePromises.push(
                fetchRawContent(
                  organization,
                  name,
                  bookIngredient.path,
                  dcsClient,
                  traceId,
                ).then((content) => {
                  if (content) {
                    const verses = extractVerses(
                      content,
                      chapter,
                      verseStart,
                      verseEnd,
                    );
                    if (verses) {
                      return {
                        type: "scripture",
                        version: resource.title || name,
                        data: verses,
                      };
                    }
                  }
                }),
              );
            } else if (resourceType.name === "notes") {
              resourcePromises.push(
                fetchRawContent(
                  organization,
                  name,
                  bookIngredient.path,
                  dcsClient,
                  traceId,
                ).then((content) => parseTSV(content, "notes", reference)),
              );
            } else if (resourceType.name === "questions") {
              resourcePromises.push(
                fetchRawContent(
                  organization,
                  name,
                  bookIngredient.path,
                  dcsClient,
                  traceId,
                ).then((content) => parseTSV(content, "questions", reference)),
              );
            } else if (resourceType.name === "links") {
              resourcePromises.push(
                fetchRawContent(
                  organization,
                  name,
                  bookIngredient.path,
                  dcsClient,
                  traceId,
                ).then((content) => parseTSV(content, "links", reference)),
              );
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch ${resourceType.name} resources`, {
          error: String(error),
        });
      }
    }

    // Wait for all fetches to complete
    const results = await Promise.allSettled(resourcePromises);

    // Aggregate scripture versions
    const scriptureVersions = [];
    const notes = [];
    const questions = [];
    const wordLinks = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const { type, data, version } = result.value;
        if (type === "scripture" && data) {
          scriptureVersions.push({ version, text: data });
        } else if (type === "notes" && data) {
          notes.push(...data);
        } else if (type === "questions" && data) {
          questions.push(...data);
        } else if (type === "links" && data) {
          wordLinks.push(...data);
        }
      }
    }

    // Build context array
    if (scriptureVersions.length > 0) {
      contextArray.push({
        type: "scripture",
        data: scriptureVersions,
        count: scriptureVersions.length,
        note: "All available scripture versions",
      });
    }

    if (notes.length > 0) {
      contextArray.push({
        type: "translation-notes",
        data: notes,
        count: notes.length,
      });
    }

    if (questions.length > 0) {
      contextArray.push({
        type: "translation-questions",
        data: questions,
        count: questions.length,
      });
    }

    if (wordLinks.length > 0) {
      // Extract unique words
      const uniqueWords = new Map();
      wordLinks.forEach((link) => {
        if (link.TWLink && !uniqueWords.has(link.TWLink)) {
          uniqueWords.set(link.TWLink, {
            word: link.TWLink,
            occurrences: link.Occurrence || 1,
            originalWords: link.OrigWords || "",
          });
        }
      });

      contextArray.push({
        type: "translation-words",
        data: Array.from(uniqueWords.values()),
        count: uniqueWords.size,
        note: "Use /api/get-translation-word to fetch full articles",
      });
    }

    const duration = Date.now() - startTime;
    const responseTime = performance.now() - performanceStart;

    // Get X-Ray trace before disabling
    const xrayTrace = dcsClient.getTrace() as XRayTrace | null;
    dcsClient.disableTracing();

    // Generate cache key for consistency (subject-specific caching now handled per resource type)
    const cacheKey = `context:${language}:${organization}:${reference}`;
    const cached = false; // Response caching disabled by policy

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Cache": cached ? "HIT" : "MISS",
        "X-Cache-Key": cacheKey,
        "X-Response-Time": `${duration}ms`,
        // X-ray trace in headers only (never response body)
        ...(xrayTrace && {
          "X-Xray-Summary": `${xrayTrace.apiCalls?.length || 0} calls in ${xrayTrace.totalDuration || 0}ms`,
          "X-Xray-Trace": btoa(JSON.stringify(xrayTrace)),
        }),
      },
      body: JSON.stringify({
        context: contextArray,
        reference,
        language,
        organization,
        metadata: {
          cached,
          cacheKey,
          cacheType: "none",
          cacheStatus: cached ? "hit" : "miss",
          responseTime,
          timestamp: new Date().toISOString(),
          resourceTypes: contextArray.map((r) => r.type),
          totalResourcesReturned: contextArray.reduce(
            (sum, r) => sum + r.count,
            0,
          ),
          catalogResourcesFound: resources.length,
          // xrayTrace removed - diagnostic data belongs in headers only
        },
      }),
    };
  } catch {
    // Ensure tracing is disabled even on error
    dcsClient.disableTracing();

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(Errors.internal(traceId)),
    };
  }
};

// Helper to fetch raw content from DCS
async function fetchRawContent(
  org: string,
  repo: string,
  path: string,
  dcsClient?: DCSApiClient,
  traceId?: string,
): Promise<string | null> {
  const startTime = performance.now();
  try {
    const url = `disabled://raw/${org}/${repo}/${path}`;
    const response = await fetch(url);
    const duration = performance.now() - startTime;

    // Add trace if client provided
    if (dcsClient && traceId) {
      dcsClient.addCustomTrace({
        id: `${traceId}_${repo}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
        endpoint: `/raw-disabled/${org}/${repo}/${path}`,
        url,
        method: "GET",
        startTime,
        endTime: startTime + duration,
        duration,
        statusCode: response.status,
        success: response.ok,
        cacheStatus: "miss",
        attempts: 1,
      });
    }

    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Silent fail
  }
  return null;
}

// Helper to parse TSV content
function parseTSV(
  content: string | null,
  type: string,
  reference: string,
): { type: string; data: unknown[] } {
  if (!content) return { type, data: [] };

  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return { type, data: [] };

  // Parse reference to get chapter:verse
  const refMatch = reference.match(/(\d+):(\d+)/);
  if (!refMatch) return { type, data: [] };

  const [, chapterStr, verseStr] = refMatch;
  const targetRef = `${chapterStr}:${verseStr}`;

  const data = [];
  const headers = lines[0].split("\t");

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Filter by reference
    if (row.Reference === targetRef || row.Reference?.startsWith(targetRef)) {
      if (type === "notes") {
        data.push(row);
      } else if (type === "questions" && row.Question) {
        data.push({
          id: row.ID,
          reference: row.Reference,
          question: row.Question,
          response: row.Response || "",
        });
      } else if (type === "links" && row.TWLink) {
        data.push(row);
      }
    }
  }

  return { type, data };
}

// Helper to extract verses from USFM
function extractVerses(
  usfm: string,
  chapter: string,
  verseStart?: string,
  verseEnd?: string,
): string | null {
  try {
    // Find chapter
    const chapterRegex = new RegExp(
      `\\\\c\\s+${chapter}\\b[\\s\\S]*?(?=\\\\c\\s+\\d+|$)`,
    );
    const chapterMatch = usfm.match(chapterRegex);
    if (!chapterMatch) return null;

    let text = chapterMatch[0];

    // If specific verses requested
    if (verseStart) {
      const startNum = parseInt(verseStart);
      const endNum = verseEnd ? parseInt(verseEnd) : startNum;

      let result = "";
      for (let v = startNum; v <= endNum; v++) {
        const verseRegex = new RegExp(
          `\\\\v\\s+${v}\\b[\\s\\S]*?(?=\\\\v\\s+\\d+|\\\\c\\s+\\d+|$)`,
        );
        const verseMatch = text.match(verseRegex);
        if (verseMatch) {
          result += verseMatch[0] + "\n";
        }
      }
      text = result || text;
    }

    // Clean USFM markers
    return text
      .replace(/\\[a-z]+\d?\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return null;
  }
}

// Helper to convert book names to codes
function getBookCode(book: string): string {
  const bookMap: Record<string, string> = {
    genesis: "GEN",
    gen: "GEN",
    exodus: "EXO",
    exo: "EXO",
    exod: "EXO",
    psalms: "PSA",
    psalm: "PSA",
    psa: "PSA",
    ps: "PSA",
    isaiah: "ISA",
    isa: "ISA",
    matthew: "MAT",
    matt: "MAT",
    mat: "MAT",
    mt: "MAT",
    luke: "LUK",
    luk: "LUK",
    lk: "LUK",
    john: "JHN",
    jhn: "JHN",
    jn: "JHN",
    romans: "ROM",
    rom: "ROM",
    ro: "ROM",
    ephesians: "EPH",
    eph: "EPH",
    philippians: "PHP",
    phil: "PHP",
    php: "PHP",
    corinthians: "COR",
    "1corinthians": "1CO",
    "2corinthians": "2CO",
    // Add more as needed
  };

  const normalized = book.toLowerCase().replace(/[^a-z0-9]/g, "");
  return bookMap[normalized] || book.toUpperCase().slice(0, 3);
}
