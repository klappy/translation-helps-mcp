/**
 * Platform-agnostic Health Check Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { getAllEndpoints } from "../../config/EndpointRegistry.js";
import { logger } from "../../utils/logger.js";
import { getVersion } from "../../version.js";
import { getKVCache } from "../kv-cache.js";
import type { PlatformHandler } from "../platform-adapter.js";
import { unifiedCache } from "../unified-cache.js";
import { getR2Env } from "../r2-env.js";

export const healthHandler: PlatformHandler = async (request) => {
  try {
    const version = getVersion();
    const url = new URL(request.url);
    const clearCache = url.searchParams.get("clearCache") === "true";
    const clearKv = url.searchParams.get("clearKv") === "true";
    const clearEdgeCache = url.searchParams.get("clearEdgeCache") === "true";

    let cacheInfo = {} as Record<string, unknown>;

    // Handle memory cache clearing
    if (clearCache) {
      await unifiedCache.clear();
      cacheInfo = {
        cacheCleared: true,
        message: "All memory cache entries have been cleared",
      };
      logger.warn("Memory cache manually cleared via health endpoint");
    }

    // Optionally clear KV-backed caches (zip, zipfile, catalog)
    if (clearKv) {
      const kv = getKVCache();
      try {
        const deleted = await kv.clearPrefixes([
          "zip:",
          "zipfile:",
          "catalog:",
        ]);
        // Also clear in-memory layer of the KV cache
        await kv.clear();
        cacheInfo = {
          ...cacheInfo,
          kvCleared: true,
          kvDeletedKeys: deleted,
        };
        logger.warn("KV caches cleared via health endpoint", { deleted });
      } catch (error) {
        cacheInfo = {
          ...cacheInfo,
          kvCleared: false,
          kvClearError: String(error),
        };
        logger.error("KV clear error via health endpoint", {
          error: String(error),
        });
      }
    }

    // Clear Cloudflare Edge Cache API (where ZIPs are cached)
    // This is needed to force fresh R2 lookups and trigger indexing events
    if (clearEdgeCache) {
      try {
        const { caches: cacheStorage } = getR2Env();
        // @ts-expect-error - caches.default exists in Cloudflare Workers
        const defaultCache =
          cacheStorage?.default ?? (globalThis as any).caches?.default;
        if (defaultCache) {
          // We can't enumerate Cache API keys, but we can delete known patterns
          // The caller should provide specific keys to delete via query param
          const keysParam = url.searchParams.get("cacheKeys");
          if (keysParam) {
            const keys = keysParam.split(",");
            let deleted = 0;
            for (const key of keys) {
              const req = new Request(`https://r2.local/${key.trim()}`);
              const wasDeleted = await defaultCache.delete(req);
              if (wasDeleted) deleted++;
            }
            cacheInfo = {
              ...cacheInfo,
              edgeCacheCleared: true,
              edgeCacheDeletedKeys: deleted,
            };
            logger.warn("Edge cache entries cleared via health endpoint", {
              deleted,
            });
          } else {
            cacheInfo = {
              ...cacheInfo,
              edgeCacheCleared: false,
              edgeCacheMessage:
                "Provide cacheKeys param with comma-separated R2 keys to delete from edge cache",
            };
          }
        } else {
          cacheInfo = {
            ...cacheInfo,
            edgeCacheCleared: false,
            edgeCacheMessage: "Edge cache not available in this environment",
          };
        }
      } catch (error) {
        cacheInfo = {
          ...cacheInfo,
          edgeCacheCleared: false,
          edgeCacheError: String(error),
        };
        logger.error("Edge cache clear error via health endpoint", {
          error: String(error),
        });
      }
    }

    // Discover available endpoints dynamically from the registry
    const endpoints = Object.values(getAllEndpoints() || {}).map((e: any) => ({
      name: e?.name,
      path: e?.path,
      category: e?.category,
      enabled: e?.enabled,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version,
        service: "translation-helps-mcp",
        description:
          "MCP Server for unfoldingWord translation resources supporting Mother Tongue Translators",
        endpoints,
        ...cacheInfo,
      }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  } catch (error) {
    logger.error("Health endpoint error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  }
};
