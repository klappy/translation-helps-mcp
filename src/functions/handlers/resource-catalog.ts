/**
 * Platform-agnostic Resource Catalog Handler
 * Provides detailed catalog information about available resources
 */

import { Errors } from "../../utils/errorEnvelope.js";
import { logger } from "../../utils/logger.js";
import type { PlatformHandler, PlatformRequest, PlatformResponse } from "../platform-adapter";
import { getResourceCatalogInfo } from "../resources-service";

export const resourceCatalogHandler: PlatformHandler = async (
  request: PlatformRequest
): Promise<PlatformResponse> => {
  const startTime = Date.now();

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

  try {
    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization = request.queryStringParameters.organization || "unfoldingWord";

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify(Errors.missingParameter("reference")),
      };
    }

    logger.info(`Resource catalog request`, { reference: referenceParam, language, organization });

    // Get the detailed catalog information
    const catalogInfo = await getResourceCatalogInfo(referenceParam, language, organization);

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800", // 30 minutes cache
        "X-Response-Time": `${duration}ms`,
        "X-Total-Resources": catalogInfo.summary.totalResources.toString(),
      },
      body: JSON.stringify(catalogInfo),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(Errors.internal()),
    };
  }
};
