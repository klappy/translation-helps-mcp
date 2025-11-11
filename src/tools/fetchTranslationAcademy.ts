/**
 * Fetch Translation Academy Tool
 * Tool for fetching translation academy modules and training content
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { estimateTokens } from "../utils/tokenCounter.js";

// Input schema
export const FetchTranslationAcademyArgs = z.object({
  moduleId: z
    .string()
    .optional()
    .describe(
      'Academy module ID (e.g., "figs-metaphor"). Searches in order: translate, process, checking, intro',
    ),
  path: z
    .string()
    .optional()
    .describe(
      'Path to module. Can be directory (e.g., "translate/figs-metaphor") for all .md files concatenated, or file path (e.g., "translate/figs-metaphor/01.md") for single file.',
    ),
  rcLink: z
    .string()
    .optional()
    .describe(
      'RC link (e.g., "rc://*/ta/man/translate/figs-metaphor"). Supports wildcards for any segment.',
    ),
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
  format: z
    .string()
    .optional()
    .default("json")
    .describe('Response format: "json" or "markdown"'),
});

export type FetchTranslationAcademyArgs = z.infer<
  typeof FetchTranslationAcademyArgs
>;

/**
 * Handle the fetch translation academy tool call
 */
export async function handleFetchTranslationAcademy(
  args: FetchTranslationAcademyArgs,
) {
  const startTime = Date.now();

  try {
    logger.info("Fetching translation academy content", {
      moduleId: args.moduleId,
      path: args.path,
      rcLink: args.rcLink,
      language: args.language,
      organization: args.organization,
    });

    // Import dependencies
    const { EdgeXRayTracer } = await import("../functions/edge-xray.js");
    const { UnifiedResourceFetcher } = await import(
      "../../ui/src/lib/unifiedResourceFetcher.js"
    );
    const { parseTranslationAcademyRCLink, isTranslationAcademyRCLink } =
      await import("../../ui/src/lib/rcLinkParser.js");

    const tracer = new EdgeXRayTracer(`ta-mcp-${Date.now()}`, "mcp-ta");
    const fetcher = new UnifiedResourceFetcher(tracer);

    // Priority: rcLink > path > moduleId
    let finalPath: string | undefined;

    if (args.rcLink || isTranslationAcademyRCLink(args.moduleId)) {
      const linkToParse = args.rcLink || args.moduleId;
      const parsed = parseTranslationAcademyRCLink(
        linkToParse,
        args.language || "en",
      );
      if (!parsed.isValid) {
        throw new Error(`Invalid RC link: ${linkToParse}`);
      }
      finalPath = parsed.dirPath;
    } else if (args.path) {
      finalPath = args.path;
    }
    // If only moduleId provided (and not RC link), let fetcher handle category fallback

    const result = await fetcher.fetchTranslationAcademy(
      args.language || "en",
      args.organization || "unfoldingWord",
      args.moduleId,
      finalPath,
    );

    // Extract title from content
    // Title is now at the beginning as # Title
    const content = result.modules?.[0]?.markdown || "";
    let title = args.moduleId || result.modules?.[0]?.id || "Unknown";

    // Extract title from first H1 heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Build MCP response
    const mcpResponse = {
      success: true,
      content,
      title,
      path: result.modules?.[0]?.path || finalPath || args.moduleId,
      moduleId: args.moduleId || result.modules?.[0]?.id,
      metadata: {
        language: args.language,
        organization: args.organization,
        resourceType: "ta",
        responseTime: Date.now() - startTime,
        tokenEstimate: estimateTokens(content || JSON.stringify(result)),
        timestamp: new Date().toISOString(),
      },
    };

    logger.info("Translation academy content fetched successfully", {
      moduleId: args.moduleId,
      path: mcpResponse.path,
      responseTime: mcpResponse.metadata.responseTime,
    });

    return mcpResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch translation academy content", {
      moduleId: args.moduleId,
      path: args.path,
      rcLink: args.rcLink,
      error: errorMessage,
      responseTime: Date.now() - startTime,
    });

    return {
      success: false,
      error: errorMessage,
      moduleId: args.moduleId,
      path: args.path,
      rcLink: args.rcLink,
      timestamp: new Date().toISOString(),
    };
  }
}
