/**
 * Fetch Scripture Tool
 * Tool for fetching scripture text for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchScripture } from "../functions/scripture-service.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import { withPerformanceTracking } from "../utils/mcp-performance-tracker.js";
import {
  ReferenceParam,
  LanguageParam,
  OrganizationParam,
  IncludeVerseNumbersParam,
  FormatParam,
  ResourceParam,
  IncludeAlignmentParam,
} from "../schemas/common-params.js";

// Input schema - using shared common parameters
export const FetchScriptureArgs = z.object({
  reference: ReferenceParam,
  language: LanguageParam,
  organization: OrganizationParam,
  includeVerseNumbers: IncludeVerseNumbersParam,
  format: FormatParam,
  resource: ResourceParam,
  includeAlignment: IncludeAlignmentParam,
});

export type FetchScriptureArgs = z.infer<typeof FetchScriptureArgs>;

/**
 * Handle the fetch scripture tool call
 */
export async function handleFetchScripture(args: FetchScriptureArgs) {
  const startTime = Date.now();

  return withPerformanceTracking(
    "fetch_scripture",
    async () => {
      try {
    logger.info("Fetching scripture", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: args.format,
      resource: args.resource,
      includeAlignment: args.includeAlignment,
    });

    // Use the shared scripture service (same as Netlify functions)
    // Map format to service-compatible format (service only accepts "text" | "usfm")
    const serviceFormat = args.format === "text" || args.format === "usfm"
      ? args.format
      : "text";
    
    const result = await fetchScripture({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: serviceFormat,
      specificTranslations: args.resource === "all" 
        ? undefined 
        : args.resource?.split(",").map((r) => r.trim()),
      includeAlignment: args.includeAlignment,
    });

    // Extract scripture text - service returns either .scripture or .scriptures[]
    const scriptureText =
      result.scripture?.text || result.scriptures?.[0]?.text || "";
    const translation =
      result.scripture?.translation ||
      result.scriptures?.[0]?.translation ||
      "ULT";

    if (!scriptureText) {
      throw new Error("Scripture service returned no text");
    }

    // Build metadata using shared utility
    const metadata = buildMetadata({
      startTime,
      data: result,
      serviceMetadata: result.metadata,
      additionalFields: {
        textLength: scriptureText.length,
        translation,
        scripturesCount: result.scriptures?.length || 0,
      },
    });

    logger.info("Scripture fetched successfully", {
      reference: args.reference,
      ...metadata,
    });

        // Return in MCP format with just the text
        return {
          content: [
            {
              type: "text",
              text: scriptureText,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return handleMCPError({
          toolName: "fetch_scripture",
          args: {
            reference: args.reference,
            language: args.language,
            organization: args.organization,
          },
          startTime,
          originalError: error,
        });
      }
    },
    {
      extractCacheHit: (result) => {
        // Check if result indicates cache hit (would need to inspect metadata)
        return false; // Service doesn't expose cache status in result
      },
      extractDataSize: (result) => {
        // Extract data size from result
        if (result && typeof result === "object" && "content" in result) {
          const content = (result as any).content;
          if (Array.isArray(content) && content[0]?.text) {
            return Buffer.byteLength(content[0].text, "utf8");
          }
        }
        return 0;
      },
    },
  );
}
