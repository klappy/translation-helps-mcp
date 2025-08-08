/**
 * Functional Data Fetchers
 *
 * Pure functions for fetching data from different sources.
 * Composable, testable, and easy to debug.
 */

import { initializeKVCache } from "../functions/kv-cache.js";
import { normalizeReference, parseReference } from "../parsers/referenceParser.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import { ZipResourceFetcher2 } from "../services/ZipResourceFetcher2.js";
import type { DataSourceConfig, EndpointConfig } from "./EndpointConfig.js";

// Types for our functional approach
export type DataFetcher = (
  config: DataSourceConfig,
  params: Record<string, unknown>,
  context: FetchContext
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
export const createZIPFetcher = (getZipFetcher: () => ZipResourceFetcher2): DataFetcher => {
  return async (config, params) => {
    const { zipConfig } = config;
    if (!zipConfig) {
      throw new Error("ZIP config required for ZIP data source");
    }

    // Get or create ZIP fetcher (lazy initialization)
    const zipFetcher = getZipFetcher();

    // Parse reference if needed
    const reference = params.reference ? parseReference(String(params.reference)) : null;

    // Route to appropriate method
    switch (zipConfig.fetchMethod) {
      case "getScripture": {
        if (!reference?.isValid) throw new Error("Valid reference required");

        const language = String(params.language || "en");
        const organization = String(params.organization || "unfoldingWord");
        const requestedResource = String(params.resource || zipConfig.resourceType);

        console.log("[functionalDataFetchers] getScripture params:", {
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
            scriptures = await zipFetcher.getScripture(reference, language, organization);
          } catch (err) {
            console.log("[functionalDataFetchers] Failed to fetch ALL resources:", err);
            scriptures = [];
          }

          // If nothing came back (cold cache or catalog variance), try prioritized fallbacks
          if (!Array.isArray(scriptures) || scriptures.length === 0) {
            // Try common unfoldingWord resources in priority order
            const preferred = ["ult", "ust", "t4t", "ueb"];
            for (const code of preferred) {
              try {
                const partial = await zipFetcher.getScripture(
                  reference,
                  language,
                  organization,
                  code
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
          scriptures = await zipFetcher.getScripture(
            reference,
            language,
            organization,
            requestedResource
          );
        }

        // Normalize shape: translation -> resource for consistency across endpoints
        let normalized = scriptures.map((s) => ({
          text: s.text,
          resource: s.translation,
        }));

        // Dedupe by resource (UST can appear twice via different flavors)
        const seenResources = new Set<string>();
        normalized = normalized.filter((s) => {
          if (seenResources.has(s.resource)) return false;
          seenResources.add(s.resource);
          return true;
        });
        console.log("[functionalDataFetchers] ZIP fetcher returned (unique):", {
          scripturesLength: normalized.length,
          sample: normalized.slice(0, 2),
        });

        // Transform to match expected endpoint response format
        const primary = normalized[0];
        const includeVerseNumbers = params.includeVerseNumbers !== "false";
        const format = (params.format as string) || "text";

        // Build the reference string properly using the shared normalizer
        console.log("[functionalDataFetchers] Building reference string:", reference);
        const referenceStr = normalizeReference(reference);

        // Inspect tracer to determine cache warm status
        let cacheWarm = false;
        try {
          const xray = (zipFetcher as unknown as { getTrace: () => unknown })?.getTrace?.() as
            | {
                cacheStats?: { hits?: number };
                apiCalls?: Array<{ cached?: boolean; url?: string }>;
              }
            | undefined;
          const hits = xray?.cacheStats?.hits || 0;
          const hadKvZipHits = Array.isArray(xray?.apiCalls)
            ? xray.apiCalls.some(
                (c) => Boolean(c?.cached) && String(c?.url || "").includes("internal://kv/zip/")
              )
            : false;
          cacheWarm = hits > 0 || hadKvZipHits;
        } catch {
          // ignore trace inspection failures
        }

        // If nothing was found but a chapter was requested, annotate reason for formatter
        const notFoundReason = !primary && reference.chapter ? "chapter_not_found" : undefined;

        return {
          scripture: primary
            ? {
                text: primary.text,
                reference: referenceStr,
                resource: primary.resource,
                language: String(params.language || "en"),
                citation: `${referenceStr} (${primary.resource})`,
              }
            : null,
          resources: normalized.length > 1 ? normalized : undefined,
          citation: primary ? `${referenceStr} (${primary.resource})` : "",
          language: String(params.language || "en"),
          organization: String(params.organization || "unfoldingWord"),
          metadata: {
            cached: false,
            includeVerseNumbers,
            format,
            resourcesFound: normalized.length,
            filesFound: normalized.length,
            cacheType: "zip",
            cacheKey: JSON.stringify({
              endpoint: "fetch-scripture",
              params: {
                reference: params.reference,
                language: params.language,
                organization: params.organization,
                resource: params.resource,
              },
            }),
            cacheWarm,
            ...(notFoundReason ? { notFoundReason } : {}),
          },
        };
      }

      case "getTSVData": {
        if (!reference?.isValid) throw new Error("Valid reference required");
        const rows = await zipFetcher.getTSVData(
          reference,
          String(params.language || "en"),
          String(params.organization || "unfoldingWord"),
          zipConfig.resourceType
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
        const identifier = (params.path || params.term || params.moduleId) as string | undefined;
        if (resourceType === "tw" && !identifier) {
          throw new Error("Path or term required for translation words content");
        }
        return zipFetcher.getMarkdownContent(
          String(params.language || "en"),
          String(params.organization || "unfoldingWord"),
          resourceType,
          identifier
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
      console.error(`[${context.traceId}] Fetch error:`, error);
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
      console.log(`[${context.traceId}] Cache hit: ${cacheKey}`);
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
export const withRetry = (fetcher: DataFetcher, maxRetries = 3): DataFetcher => {
  return async (config, params, context) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher(config, params, context);
      } catch (error) {
        lastError = error;
        console.warn(`[${context.traceId}] Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  };
};

// Create a fallback fetcher that tries ZIP first, then API
export const createFallbackFetcher = (primary: DataFetcher, fallback: DataFetcher): DataFetcher => {
  return async (config, params, context) => {
    try {
      return await primary(config, params, context);
    } catch (primaryError) {
      console.warn(`[${context.traceId}] Primary fetch failed, trying fallback:`, primaryError);
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
    console.log("✅ KV cache initialized");
  } else {
    console.log("⚠️ No KV cache available - using memory only");
  }
};

// Example usage in an endpoint
export const createEndpointHandler = (config: EndpointConfig, fetcher: DataFetcher) => {
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
        }
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
        }
      );
    }
  };
};

// Placeholder for transformations
async function applyTransformation(data: unknown, transformation: string): Promise<unknown> {
  // This would apply TSV parsing, markdown parsing, etc.
  void transformation; // satisfy eslint no-unused-vars for placeholder
  return data;
}
