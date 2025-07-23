/**
 * Platform-agnostic Language Coverage Handler
 * Temporarily disabled while refactoring resource detection system
 */

import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter.js";

/**
 * Language Coverage Handler - Temporarily Disabled
 * This endpoint is being refactored due to resource detection system changes
 */
export const languageCoverageHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  return {
    statusCode: 503,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      error: "Language coverage temporarily disabled",
      message:
        "This endpoint is being refactored after resource detection system changes and will be available soon",
      code: "TEMPORARILY_DISABLED",
      timestamp: new Date().toISOString(),
    }),
  };
};
