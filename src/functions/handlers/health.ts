/**
 * Platform-agnostic Health Check Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { readFileSync } from "fs";
import { join } from "path";
import { cache } from "../cache";

// Read version from package.json
function getAppVersion(): string {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.warn("Failed to read version from package.json, using fallback");
    return "4.0.0"; // Updated fallback version
  }
}

const VERSION = getAppVersion(); // Get version from package.json

export const healthHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  console.log("Health check requested");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  if (request.method !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts GET requests",
      }),
    };
  }

  try {
    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: VERSION,
      environment: process.env.NODE_ENV || "production",
      architecture: "platform-agnostic",
      endpoints: [
        "/api/health",
        "/api/fetch-resources",
        "/api/fetch-scripture",
        "/api/get-context",
        "/api/get-languages",
        "/api/extract-references",
        "/api/fetch-translation-notes",
        "/api/fetch-translation-questions",
        "/api/fetch-translation-words",
        "/api/browse-translation-words",
        "/api/get-words-for-reference",
        "/api/list-available-resources",
      ],
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cache: cache.getStats(),
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error) {
    console.error("Health check error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        status: "unhealthy",
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
