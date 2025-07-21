/**
 * Platform-agnostic Health Check Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import type { PlatformHandler } from "../platform-adapter.js";
import fs from "fs";
import path from "path";

// Get version from ROOT package.json (SINGLE SOURCE OF TRUTH)
function getVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.warn("Failed to read version from ROOT package.json, using fallback");
    return "4.2.0"; // Only as absolute fallback
  }
}

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
        description: "MCP Server for Bible translation resources",
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
