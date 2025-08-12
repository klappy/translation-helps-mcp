/**
 * Functional Data Fetchers
 *
 * Pure functions for fetching data from different sources.
 * Composable, testable, and easy to debug.
 */

import { getKVCache, initializeKVCache } from "../functions/kv-cache.js";
import { parseReference } from "../functions/reference-parser.js";
import { normalizeReference as normalizeReferenceNew } from "../parsers/referenceParser.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import { ZipResourceFetcher2 } from "../services/ZipResourceFetcher2.js";
import { logger } from "../utils/logger.js";
import type { DataSourceConfig, EndpointConfig } from "./EndpointConfig.js";

// Types for our functional approach
export type DataFetcher = (
  config: DataSourceConfig,
  params: Record<string, unknown>,
  context: FetchContext,
) => Promise<unknown>;

export interface FetchContext {
  traceId: string;
  platform?: { env?: { TRANSLATION_HELPS_CACHE?: unknown } };
  cache?: Map<string, unknown>;
}

// Pure function to create a DCS fetcher
export const createDCSFetcher = (client: DCSApiClient): DataFetcher => {
  return async (config, params) => {
    if (!config.dcsEndpoint) {
      throw new Error("DCS endpoint required for API data source");
    }

    // Build URL from template
    let url = config.dcsEndpoint;
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, String(value));
    });

    // Use the DCS client to fetch
    return client.get(url);
  };
};

// Pure function to create a ZIP fetcher
export const createZIPFetcher = (
  getZipFetcher: () => ZipResourceFetcher2,
): DataFetcher => {
  return async (config, params) => {
    const { zipConfig } = config;
    if (!zipConfig) {
      throw new Error("ZIP config required for ZIP data source");
    }

    // Optional in-request NUKE: allow true cold run via _flush=true
    try {
      if (
        params._flush === true ||
        String(params._flush).toLowerCase() === "true"
      ) {
        const kv = getKVCache();
        await kv.clearAll();
      }
    } catch {
      // ignore flush errors in read path
    }

    // Get or create ZIP fetcher (lazy initialization)
    const zipFetcher = getZipFetcher();

    // Parse reference if needed
    const rawRef = String(params.reference || "");
    // Pre-normalize common abbreviations to avoid ambiguity (e.g., Jn -> John, Mt -> Matthew)
    // Avoid negative lookbehind with variable length by handling numbered forms first
    const normalizedRefStr = rawRef
      .replace(/\b1\s*Jn\b/gi, "1 John")
      .replace(/\b2\s*Jn\b/gi, "2 John")
      .replace(/\b3\s*Jn\b/gi, "3 John")
      .replace(/\bJn\b/gi, "John")
      .replace(/\bMt\b/gi, "Matthew");
    const reference = params.reference
      ? parseReference(normalizedRefStr)
      : null;
    if (!reference) {
      const err = new Error(
        `Invalid reference: ${String(params.reference || "")} — expected formats like 'John 3:16', 'Genesis 1', or 'Titus 1-2'`,
      );
      // Mark as 400 for API layer to propagate
      // @ts-expect-error - attach status property for HTTP propagation
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    // If chapter/verse clearly impossible, also throw 400 (but allow full book references)
    const chap = Number(
      (params.reference as string)?.match(/\s(\d+)/)?.[1] || 0,
    );
    const verse = Number(
      (params.reference as string)?.match(/:(\d+)/)?.[1] || 0,
    );
    // Only fail if there's a colon (indicating verse) but verse is 0 or negative
    if (/:/.test(String(params.reference)) && verse <= 0) {
      const err = new Error(`Invalid reference: chapter or verse out of range`);
      // @ts-expect-error - attach status property for HTTP propagation
      (err as Error & { status?: number }).status = 400;
      throw err;
    }

    // Route to appropriate method
    switch (zipConfig.fetchMethod) {
      case "getScripture": {
        // Validate using Reference shape - book is required, chapter is optional for full book references
        if (!reference || !reference.book) {
          const err = new Error("Invalid reference: valid reference required");
          // @ts-expect-error - attach status property for HTTP propagation
          (err as Error & { status?: number }).status = 400;
          throw err;
        }

        const language = String(params.language || "en");
        const organization = String(params.organization || "unfoldingWord");
        const requestedResource = String(
          params.resource || zipConfig.resourceType,
        );

        logger.info("DEBUG: Resource determination", {
          paramsResource: params.resource,
          zipConfigResourceType: zipConfig.resourceType,
          requestedResource,
          isAll: requestedResource === "all",
        });

        logger.debug("getScripture params", {
          reference: reference,
          language,
          organization,
          resource: requestedResource,
          rawResource: params.resource,
          zipResourceType: zipConfig.resourceType,
        });

        // Handle "all" resource type by fetching multiple translations
        let scriptures: Array<{ text: string; translation: string }> = [];

        if (requestedResource === "all") {
          // Fetch ALL available Bible resources via ZIP system
          // ZipResourceFetcher2.getScripture without version will iterate catalog
          // and return results for all matching Bible resources
          try {
            // Convert Reference to ParsedReference-compatible format for getScripture
            const compatibleRef = {
              ...reference,
              originalText: reference.original || "",
              isValid: true,
            };
            scriptures = await zipFetcher.getScripture(
              compatibleRef as any, // Type assertion to handle interface mismatch
              language,
              organization,
            );
          } catch (err) {
            logger.warn("Failed to fetch ALL resources", {
              error: String(err),
            });
            scriptures = [];
          }

          // If nothing came back (cold cache or catalog variance), try prioritized fallbacks
          if (!Array.isArray(scriptures) || scriptures.length === 0) {
            // Try common unfoldingWord resources in priority order
            const preferred = ["ult", "ust", "t4t", "ueb"];
            for (const code of preferred) {
              try {
                const compatibleRef = {
                  ...reference,
                  originalText: reference.original || "",
                  isValid: true,
                };
                const partial = await zipFetcher.getScripture(
                  compatibleRef as any,
                  language,
                  organization,
                  code,
                );
                if (Array.isArray(partial) && partial.length > 0) {
                  scriptures.push(...partial);
                }
              } catch {
                /* noop - try next */
              }
            }
          }
        } else {
          // Get specific translation
          const compatibleRef = {
            ...reference,
            originalText: reference.original || "",
            isValid: true,
          };
          scriptures = await zipFetcher.getScripture(
            compatibleRef as any,
            language,
            organization,
            requestedResource,
          );
        }

        // Normalize shape: translation -> resource for consistency across endpoints
        // Also track actual organization for accurate attribution
        let normalized = scriptures.map((s) => ({
          text: s.text,
          resource: s.translation,
          // @ts-expect-error - actualOrganization added for proper attribution
          actualOrganization:
            s.actualOrganization ||
            String(params.organization || "unfoldingWord"),
        }));

        // Dedupe by resource (UST can appear twice via different flavors)
        const seenResources = new Set<string>();
        normalized = normalized.filter((s) => {
          if (seenResources.has(s.resource)) return false;
          seenResources.add(s.resource);
          return true;
        });
        logger.debug("ZIP fetcher returned (unique)", {
          scripturesLength: normalized.length,
          sample: normalized.slice(0, 2),
        });

        // If we have multiple, prefer ULT when available for deterministic primary
        const primary =
          normalized.find((s) => s.resource.toUpperCase().includes("ULT")) ||
          normalized[0];
        const includeVerseNumbers = params.includeVerseNumbers !== "false";
        const format = (params.format as string) || "text";

        // Build the reference string properly using the shared normalizer
        logger.debug("Building reference string", { reference });

        // Determine if this is a chapter range (verseEnd but no verse means chapter range)
        const isChapterRange = reference.verseEnd && !reference.verse;

        // Use UI-side normalizer for display string to ensure standard book names
        const normalizeInput = {
          book: reference.bookName || reference.book,
          chapter: reference.chapter,
          verse: reference.verse,
          endChapter: isChapterRange ? reference.verseEnd : undefined, // For chapter ranges, verseEnd holds end chapter
          endVerse: isChapterRange ? undefined : reference.verseEnd, // For verse ranges, verseEnd holds end verse
          originalText: reference.original || "", // Reference uses original instead of originalText
          isValid: true,
        };
        logger.debug("Normalizing reference", {
          isChapterRange,
          normalizeInput,
        });
        const referenceStr = normalizeReferenceNew(
          normalizeInput as unknown as import("../parsers/referenceParser.js").ParsedReference,
        );

        // Inspect tracer to determine cache warm status
        let cacheWarm = false;
        try {
          const xray = (
            zipFetcher as unknown as { getTrace: () => unknown }
          )?.getTrace?.() as
            | {
                cacheStats?: { hits?: number };
                apiCalls?: Array<{ cached?: boolean; url?: string }>;
              }
            | undefined;
          const hits = xray?.cacheStats?.hits || 0;
          const hadKvZipHits = Array.isArray(xray?.apiCalls)
            ? xray.apiCalls.some(
                (c) =>
                  Boolean(c?.cached) &&
                  String(c?.url || "").includes("internal://kv/zip/"),
              )
            : false;
          cacheWarm = hits > 0 || hadKvZipHits;
        } catch {
          // ignore trace inspection failures
        }

        // If nothing was found but a chapter was requested, annotate reason for formatter
        const notFoundReason =
          !primary && reference.chapter ? "chapter_not_found" : undefined;

        // Check if the failure was due to server errors
        let serverErrorCount = 0;
        let hadValidCatalog = false;
        try {
          const xrayTrace = zipFetcher.getTrace() as XRayTrace;
          logger.debug("Checking xray trace for errors", {
            hasApiCalls: !!xrayTrace?.apiCalls,
            apiCallCount: xrayTrace?.apiCalls?.length || 0,
          });

          if (xrayTrace?.apiCalls) {
            serverErrorCount = xrayTrace.apiCalls.filter(
              (call) => call.status >= 500,
            ).length;
            hadValidCatalog = xrayTrace.apiCalls.some(
              (call) =>
                call.url.includes("catalog") &&
                call.status === 200 &&
                call.size > 0,
            );

            logger.debug("Server error check", {
              serverErrorCount,
              hadValidCatalog,
              apiCalls: xrayTrace.apiCalls.map((c) => ({
                url: c.url,
                status: c.status,
                isServerError: c.status >= 500,
              })),
            });
          }
        } catch (err) {
          logger.error("Failed to check xray trace", { error: String(err) });
        }

        if (!primary) {
          const status = serverErrorCount > 0 ? 503 : 400;
          const errorMessage =
            serverErrorCount > 0 && hadValidCatalog
              ? `Server error: Unable to download scripture files from Door43 (${serverErrorCount} failed requests). The server may be blocking automated requests.`
              : `Invalid reference: passage could not be found for ${String(
                  params.reference,
                )} in available resources`;

          const response = {
            error: errorMessage,
            citation: "",
            language: String(params.language || "en"),
            organization: String(params.organization || "unfoldingWord"),
            _metadata: {
              success: false,
              status,
              serverErrors: serverErrorCount > 0 ? serverErrorCount : undefined,
              responseTime: 0,
              timestamp: new Date().toISOString(),
            },
          };
          // Signal to RouteGenerator to set HTTP status
          (response as Record<string, unknown>).__httpStatus = status;
          return response;
        }

        // Return clean array of scripture objects as per design
        return normalized.map((scripture) => ({
          text: scripture.text,
          reference: referenceStr,
          resource: scripture.resource,
          language: String(params.language || "en"),
          citation: `${referenceStr} (${scripture.resource})`,
          organization:
            scripture.actualOrganization ||
            String(params.organization || "unfoldingWord"),
        }));
      }

      case "getTSVData": {
        if (!reference || !reference.book || !reference.chapter) {
          const err = new Error("Invalid reference: valid reference required");
          // @ts-expect-error - attach status property for HTTP propagation
          (err as Error & { status?: number }).status = 400;
          throw err;
        }
        const rows = await zipFetcher.getTSVData(
          reference,
          String(params.language || "en"),
          String(params.organization || "unfoldingWord"),
          zipConfig.resourceType,
        );
        const count = Array.isArray(rows) ? rows.length : 0;
        const baseMeta = {
          language: String(params.language || "en"),
          organization: String(params.organization || "unfoldingWord"),
          reference: params.reference,
          count,
        };
        if (zipConfig.resourceType === "tn") {
          return { verseNotes: rows, _metadata: baseMeta };
        }
        if (zipConfig.resourceType === "tq") {
          return { questions: rows, _metadata: baseMeta };
        }
        // twl
        return { links: rows, _metadata: baseMeta };
      }

      case "getMarkdownContent": {
        const resourceType = zipConfig.resourceType as "tw" | "ta";
        // Prefer explicit path when provided (delegated responsibility from browse endpoints/TWL)
        const identifier = (params.path || params.term || params.moduleId) as
          | string
          | undefined;
        if (resourceType === "tw" && !identifier) {
          throw new Error(
            "Path or term required for translation words content",
          );
        }
        return zipFetcher.getMarkdownContent(
          String(params.language || "en"),
          String(params.organization || "unfoldingWord"),
          resourceType,
          identifier,
        );
      }

      default:
        throw new Error(`Unknown fetch method: ${zipConfig.fetchMethod}`);
    }
  };
};

// Compose fetchers with error handling
export const withErrorHandling = (fetcher: DataFetcher): DataFetcher => {
  return async (config, params, context) => {
    try {
      return await fetcher(config, params, context);
    } catch (error) {
      logger.error(`[${context.traceId}] Fetch error`, {
        error: String(error),
      });
      // Convert typed errors with status to proper HTTP responses
      const status = (error as Error & { status?: number })?.status as
        | number
        | undefined;
      if (status && status >= 400 && status < 600) {
        const response = {
          error: String((error as Error)?.message || "Bad Request"),
          _metadata: {
            success: false,
            status,
            responseTime: 0,
            timestamp: new Date().toISOString(),
          },
        };
        // Signal to RouteGenerator to send this as the response
        // @ts-expect-error - attach httpStatus for RouteGenerator
        (response as Record<string, unknown>).__httpStatus = status;
        return response;
      }
      throw error;
    }
  };
};

// Add caching layer
export const withCaching = (fetcher: DataFetcher): DataFetcher => {
  return async (config, params, context) => {
    // Generate cache key
    const cacheKey = JSON.stringify({ config: config.type, params });

    // Check memory cache
    if (context.cache?.has(cacheKey)) {
      logger.debug(`[${context.traceId}] Cache hit`, { cacheKey });
      return context.cache.get(cacheKey);
    }

    // Fetch data
    const result = await fetcher(config, params, context);

    // Store in cache
    if (context.cache && config.cacheTtl) {
      context.cache.set(cacheKey, result);
      // In real implementation, add TTL handling
    }

    return result;
  };
};

// Add retry logic
export const withRetry = (
  fetcher: DataFetcher,
  maxRetries = 3,
): DataFetcher => {
  return async (config, params, context) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher(config, params, context);
      } catch (error) {
        lastError = error;
        logger.warn(`[${context.traceId}] Attempt failed`, {
          attempt,
          error: String(error),
        });

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    throw lastError;
  };
};

// Create a fallback fetcher that tries ZIP first, then API
export const createFallbackFetcher = (
  primary: DataFetcher,
  fallback: DataFetcher,
): DataFetcher => {
  return async (config, params, context) => {
    try {
      return await primary(config, params, context);
    } catch (primaryError) {
      logger.warn(
        `[${context.traceId}] Primary fetch failed, trying fallback:`,
        {
          primaryError: String(primaryError),
        },
      );
      return fallback(config, params, context);
    }
  };
};

// Main factory function to create the appropriate fetcher
export const createDataFetcher = (dependencies: {
  dcsClient: DCSApiClient;
  getZipFetcher: () => ZipResourceFetcher2;
}): DataFetcher => {
  // Create base fetchers
  const dcsFetcher = createDCSFetcher(dependencies.dcsClient);
  const zipFetcher = createZIPFetcher(dependencies.getZipFetcher);

  // Return a function that routes based on config type
  return (config, params, context) => {
    let fetcher: DataFetcher;

    switch (config.type) {
      case "dcs-api":
        fetcher = dcsFetcher;
        break;

      case "zip-cached":
        fetcher = zipFetcher;
        break;

      case "computed":
        // For computed, we might want custom logic
        throw new Error("Computed endpoints need custom implementation");

      default:
        throw new Error(`Unknown data source type: ${config.type}`);
    }

    // Compose with cross-cutting concerns
    const enhanced = withErrorHandling(withCaching(withRetry(fetcher)));

    return enhanced(config, params, context);
  };
};

// Helper to initialize KV cache if available
export const initializeCache = (platform?: {
  env?: { TRANSLATION_HELPS_CACHE?: unknown };
}): void => {
  const kv = platform?.env?.TRANSLATION_HELPS_CACHE;
  if (kv) {
    initializeKVCache(kv);
    logger.info("KV cache initialized");
  } else {
    logger.warn("No KV cache available - using memory only");
  }
};

// Example usage in an endpoint
export const createEndpointHandler = (
  config: EndpointConfig,
  fetcher: DataFetcher,
) => {
  return async (request: Request, platform?: unknown) => {
    // Initialize cache
    initializeCache(platform);

    // Parse parameters
    const url = new URL(request.url);
    const params: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Create context
    const context: FetchContext = {
      traceId: `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform,
      cache: new Map(),
    };

    try {
      // Fetch data
      const data = await fetcher(config.dataSource, params, context);

      // Apply transformations if needed
      const transformed = config.dataSource.transformation
        ? await applyTransformation(data, config.dataSource.transformation)
        : data;

      // Return response (explicitly disable response-layer caching; rely on ZIP/KV)
      return new Response(
        JSON.stringify({
          data: transformed,
          _metadata: {
            endpoint: config.name,
            traceId: context.traceId,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          _metadata: {
            endpoint: config.name,
            traceId: context.traceId,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
};

// Placeholder for transformations
async function applyTransformation(
  data: unknown,
  transformation: string,
): Promise<unknown> {
  // This would apply TSV parsing, markdown parsing, etc.
  void transformation; // satisfy eslint no-unused-vars for placeholder
  return data;
}
