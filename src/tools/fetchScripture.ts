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
        const serviceFormat =
          args.format === "text" || args.format === "usfm"
            ? args.format
            : "text";

        const result = await fetchScripture({
          reference: args.reference,
          language: args.language,
          organization: args.organization,
          includeVerseNumbers: args.includeVerseNumbers,
          format: serviceFormat,
          specificTranslations:
            args.resource === "all"
              ? undefined
              : args.resource?.split(",").map((r) => r.trim()),
          includeAlignment: args.includeAlignment,
        });

        // Check if we have multiple scriptures (when resource: "all")
        const hasMultipleScriptures =
          result.scriptures && result.scriptures.length > 1;

        // Extract scripture text - service returns either .scripture or .scriptures[]
        const scriptureText =
          result.scripture?.text || result.scriptures?.[0]?.text || "";
        const translation =
          result.scripture?.translation ||
          result.scriptures?.[0]?.translation ||
          "ULT";

        if (
          !scriptureText &&
          (!result.scriptures || result.scriptures.length === 0)
        ) {
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

        // If multiple scriptures requested (resource: "all"), return structured JSON with all resources
        if (hasMultipleScriptures && args.format === "json") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  reference: args.reference,
                  scriptures: result.scriptures.map((s: any) => ({
                    text: s.text,
                    translation: s.translation,
                    reference: args.reference,
                  })),
                  metadata: {
                    count: result.scriptures.length,
                    translations: result.scriptures.map(
                      (s: any) => s.translation,
                    ),
                  },
                }),
              },
            ],
            isError: false,
          };
        }

        // For single scripture or non-JSON format, return just the text
        return {
          content: [
            {
              type: "text",
              text:
                hasMultipleScriptures && args.format !== "json"
                  ? result.scriptures
                      .map((s: any) => `${s.translation}: ${s.text}`)
                      .join("\n\n")
                  : scriptureText,
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
      extractCacheHit: (_result) => {
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
