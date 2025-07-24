/**
 * Platform-agnostic Health Check Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { getVersion } from "../../version.js";
import type { PlatformHandler } from "../platform-adapter.js";
import { unifiedCache } from "../unified-cache.js";

export const healthHandler: PlatformHandler = async (request) => {
  try {
    const version = getVersion();
    const url = new URL(request.url);
    const clearCache = url.searchParams.get("clearCache") === "true";

    let cacheInfo = {};

    // Handle cache clearing
    if (clearCache) {
      await unifiedCache.clear();
      cacheInfo = {
        cacheCleared: true,
        message: "All cache entries have been cleared",
      };
      console.log("🧹 Cache manually cleared via health endpoint");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version,
        service: "translation-helps-mcp",
        description:
          "MCP Server for unfoldingWord translation resources supporting Mother Tongue Translators",
        ...cacheInfo,
      }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    };
  } catch (error) {
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
