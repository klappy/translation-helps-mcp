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

export const healthHandler: PlatformHandler = async (request) => {
  try {
    const version = getVersion();
    const url = new URL(request.url);
    const clearCache = url.searchParams.get("clearCache") === "true";
    const clearKv = url.searchParams.get("clearKv") === "true";

    let cacheInfo = {} as Record<string, unknown>;

    // Handle cache clearing
    if (clearCache) {
      await unifiedCache.clear();
      cacheInfo = {
        cacheCleared: true,
        message: "All cache entries have been cleared",
      };
      logger.warn("Cache manually cleared via health endpoint");
    }

    // Optionally clear KV-backed caches (zip, zipfile, catalog)
    if (clearKv) {
      const kv = getKVCache();
      try {
        const deleted = await kv.clearPrefixes(["zip:", "zipfile:", "catalog:"]);
        // Also clear in-memory layer of the KV cache
        await kv.clear();
        cacheInfo = {
          ...cacheInfo,
          kvCleared: true,
          kvDeletedKeys: deleted,
        };
        logger.warn("KV caches cleared via health endpoint", { deleted });
      } catch (error) {
        cacheInfo = { ...cacheInfo, kvCleared: false, kvClearError: String(error) };
        logger.error("KV clear error via health endpoint", { error: String(error) });
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
