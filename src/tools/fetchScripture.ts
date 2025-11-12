/**
 * Fetch Scripture Tool
 * Tool for fetching scripture text for a specific Bible reference
 * Uses shared core service for consistency with Netlify functions
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchScripture } from "../functions/scripture-service.js";

// Input schema
export const FetchScriptureArgs = z.object({
  reference: z.string().describe('Bible reference (e.g., "John 3:16")'),
  language: z
    .string()
    .optional()
    .default("en")
    .describe('Language code (default: "en")'),
  organization: z
    .string()
    .optional()
    .default("unfoldingWord")
    .describe('Organization (default: "unfoldingWord")'),
  includeVerseNumbers: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include verse numbers in the text (default: true)"),
  format: z
    .enum(["text", "usfm"])
    .optional()
    .default("text")
    .describe('Output format (default: "text")'),
});

export type FetchScriptureArgs = z.infer<typeof FetchScriptureArgs>;

/**
 * Handle the fetch scripture tool call
 */
export async function handleFetchScripture(args: FetchScriptureArgs) {
  const startTime = Date.now();

  try {
    logger.info("🎯 handleFetchScripture CALLED", {
      reference: args.reference,
      language: args.language,
    });

    logger.info("Fetching scripture", {
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: args.format,
    });

    logger.info("📞 Calling fetchScripture service...");

    // Use the shared scripture service (same as Netlify functions)
    const result = await fetchScripture({
      reference: args.reference,
      language: args.language,
      organization: args.organization,
      includeVerseNumbers: args.includeVerseNumbers,
      format: args.format,
    });

    logger.info("📦 fetchScripture service returned");

    // Extract scripture text - service returns either .scripture or .scriptures[]
    const scriptureText =
      result.scripture?.text || result.scriptures?.[0]?.text || "";
    const translation =
      result.scripture?.translation ||
      result.scriptures?.[0]?.translation ||
      "ULT";

    logger.info("✍️  Extracted scripture from result", {
      hasScripture: !!result.scripture,
      hasScriptures: !!result.scriptures,
      scripturesCount: result.scriptures?.length || 0,
      textLength: scriptureText.length,
      translation,
    });

    if (!scriptureText) {
      throw new Error("Scripture service returned no text");
    }

    logger.info("Scripture fetched successfully", {
      reference: args.reference,
      textLength: scriptureText.length,
      translation,
      responseTime: Date.now() - startTime,
      cached: result.metadata.cached,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch scripture", {
      reference: args.reference,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            reference: args.reference,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
      isError: true,
    };
  }
}
