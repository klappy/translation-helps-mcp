/**
 * Pure Get Languages Handler - No Caching
 * Contains only business logic, caching handled by platform wrappers
 */

import { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { getLanguages } from "../languages-service";
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
    return "4.3.0"; // Only as absolute fallback
  }
}

export const getLanguagesHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const organization = request.queryStringParameters.organization || "unfoldingWord";
    const includeAlternateNames = request.queryStringParameters.includeAlternateNames === "true";

    // Pure business logic - no caching here
    const result = await getLanguages({
      organization,
      includeAlternateNames,
    });

    // Build response matching the original API format + enhanced structure
    const response = {
      // Original format for backward compatibility
      languages: result.languages,
      organization,

      // Metadata (without cache info - that's handled by wrapper)
      metadata: {
        responseTime: result.metadata.responseTime,
        languagesFound: result.metadata.languagesFound,
        version: getVersion(),
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Languages error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        code: "FETCH_ERROR",
      }),
    };
  }
};
