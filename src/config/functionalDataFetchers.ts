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
import {
  transformScriptureResultToHTTP,
  transformTranslationNotesResultToHTTP,
  transformTranslationQuestionsResultToHTTP,
} from "../utils/http-response-transformers.js";
import { extractErrorMessage, extractErrorStatus } from "../utils/mcp-error-handler.js";
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

        logger.info("Using core scripture service", {
          reference: String(params.reference),
          language,
          organization,
          resource: requestedResource,
        });

        try {
          // Use core scripture service (same as MCP tools)
          const { fetchScripture } = await import(
            "../functions/scripture-service.js"
          );

          const result = await fetchScripture({
            reference: String(params.reference),
            language,
            organization,
            format: (params.format as string) === "usfm" ? "usfm" : "text",
            includeVerseNumbers: params.includeVerseNumbers !== "false",
            specificTranslations:
              requestedResource === "all"
                ? undefined
                : requestedResource.split(",").map((r) => r.trim()),
            includeAlignment: params.includeAlignment === true,
          });

          // Transform service result to HTTP format
          const httpResponse = transformScriptureResultToHTTP(
            result,
            String(params.reference),
            { language, organization },
          );

          // If no scriptures found, return error response
          if (httpResponse.length === 0) {
            const status = 400;
            const errorMessage = `Invalid reference: passage could not be found for ${String(
              params.reference,
            )} in available resources`;

            const response = {
              error: errorMessage,
              citation: "",
              language,
              organization,
              _metadata: {
                success: false,
                status,
                responseTime: result.metadata?.responseTime || 0,
                timestamp: new Date().toISOString(),
              },
            };
            // Signal to RouteGenerator to set HTTP status
            (response as Record<string, unknown>).__httpStatus = status;
            return response;
          }

          return httpResponse;
        } catch (error) {
          // Extract error status if present
          const errorStatus = extractErrorStatus(error);
          const errorMessage = extractErrorMessage(error);

          // If service threw an error, return appropriate HTTP error response
          const status = errorStatus || 500;
          const response = {
            error: errorMessage,
            citation: "",
            language,
            organization,
            _metadata: {
              success: false,
              status,
              responseTime: 0,
              timestamp: new Date().toISOString(),
            },
          };
          // Signal to RouteGenerator to set HTTP status
          (response as Record<string, unknown>).__httpStatus = status;
          return response;
        }
      }

      case "getTSVData": {
        if (!reference || !reference.book || !reference.chapter) {
          const err = new Error("Invalid reference: valid reference required");
          // @ts-expect-error - attach status property for HTTP propagation
          (err as Error & { status?: number }).status = 400;
          throw err;
        }

        const language = String(params.language || "en");
        const organization = String(params.organization || "unfoldingWord");
        const referenceStr = String(params.reference);

        logger.info("Using core service for TSV data", {
          resourceType: zipConfig.resourceType,
          reference: referenceStr,
          language,
          organization,
        });

        try {
          if (zipConfig.resourceType === "tn") {
            // Use core translation notes service
            const { fetchTranslationNotes } = await import(
              "../functions/translation-notes-service.js"
            );

            const result = await fetchTranslationNotes({
              reference: referenceStr,
              language,
              organization,
              includeIntro: params.includeIntro !== "false",
              includeContext: params.includeContext !== "false",
            });

            return transformTranslationNotesResultToHTTP(result, {
              language,
              organization,
            });
          }

          if (zipConfig.resourceType === "tq") {
            // Use core translation questions service
            const { fetchTranslationQuestions } = await import(
              "../functions/translation-questions-service.js"
            );

            const result = await fetchTranslationQuestions({
              reference: referenceStr,
              language,
              organization,
            });

            return transformTranslationQuestionsResultToHTTP(result, {
              language,
              organization,
              reference: referenceStr,
            });
          }

          if (zipConfig.resourceType === "twl") {
            // Use core word links service
            const { fetchWordLinks } = await import(
              "../functions/word-links-service.js"
            );

            const result = await fetchWordLinks({
              reference: referenceStr,
              language,
              organization,
            });

            return {
              links: result.translationWordLinks,
              _metadata: {
                language,
                organization,
                reference: referenceStr,
                count: result.metadata.linksFound,
              },
            };
          }

          // Fallback to old method if resource type not recognized
          logger.warn("Unknown resource type, falling back to direct ZIP fetch", {
            resourceType: zipConfig.resourceType,
          });
          const rows = await zipFetcher.getTSVData(
            reference,
            language,
            organization,
            zipConfig.resourceType,
          );
          const count = Array.isArray(rows) ? rows.length : 0;
          return {
            data: rows,
            _metadata: {
              language,
              organization,
              reference: referenceStr,
              count,
            },
          };
        } catch (error) {
          // Extract error status if present
          const errorStatus = extractErrorStatus(error);
          const errorMessage = extractErrorMessage(error);

          // Return error response
          const status = errorStatus || 500;
          const response = {
            error: errorMessage,
            _metadata: {
              success: false,
              status,
              language,
              organization,
              reference: referenceStr,
              responseTime: 0,
              timestamp: new Date().toISOString(),
            },
          };
          // Signal to RouteGenerator to set HTTP status
          (response as Record<string, unknown>).__httpStatus = status;
          return response;
        }
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
