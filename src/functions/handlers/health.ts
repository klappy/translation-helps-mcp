/**
 * Platform-agnostic Health Check Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler } from "../platform-adapter.js";
import { getVersion } from "../../version.js";

export const healthHandler: PlatformHandler = async (context, headers = {}) => {
  try {
    const version = getVersion();

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version,
        service: "translation-helps-mcp",
        description: "MCP Server for unfoldingWord Bible translation resources with Strategic Language support",
      }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...headers,
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
        ...headers,
      },
    };
  }
};
