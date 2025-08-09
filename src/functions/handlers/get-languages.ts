/**
 * Pure Get Languages Handler - No Caching
 * Contains only business logic, caching handled by platform wrappers
 */

import { Errors } from "../../utils/errorEnvelope.js";
import { languagesResponseSchema } from "../../utils/schemas.js";
import { softValidate } from "../../utils/validator.js";
import { getVersion } from "../../version.js";
import { getLanguages } from "../languages-service";
import { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";

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
    } as const;

    softValidate(languagesResponseSchema, response, "get-languages");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(Errors.internal()),
    };
  }
};
