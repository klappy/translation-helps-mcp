export const config = {
  runtime: "edge",
};

import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { fetchWordLinks } from "../../../../../src/functions/word-links-service.js";
import { logger } from "../../../../../src/utils/logger.js";

export const GET: RequestHandler = async ({ url }) => {
  try {
    const reference = url.searchParams.get("reference") || "Titus 1";
    const language = url.searchParams.get("language") || "en";
    const organization = url.searchParams.get("organization") || "unfoldingWord";

    logger.info("Test TWL endpoint called", { reference, language, organization });

    // Use the word-links-service directly
    const result = await fetchWordLinks({
      reference,
      language,
      organization,
    });

    logger.debug("Word links service returned", {
      hasResult: !!result,
      hasLinks: !!result.links,
      linksCount: result.links?.length || 0,
      sampleLink: result.links?.[0],
    });

    return json(result);
  } catch (error) {
    logger.error("Error in test-twl", { error: String(error) });
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
};
