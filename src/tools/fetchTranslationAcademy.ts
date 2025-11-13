/**
 * Fetch Translation Academy Tool
 * Tool for fetching translation academy modules and training content
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import {
  LanguageParam,
  OrganizationParam,
  FormatParam,
  ModuleIdParam,
  PathParam,
  RCLinkParam,
} from "../schemas/common-params.js";

// Input schema - using shared common parameters
export const FetchTranslationAcademyArgs = z.object({
  moduleId: ModuleIdParam,
  path: PathParam,
  rcLink: RCLinkParam,
  language: LanguageParam,
  organization: OrganizationParam,
  format: FormatParam,
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

    // Build metadata using shared utility
    const metadata = buildMetadata({
      startTime,
      data: result,
      serviceMetadata: {},
      additionalFields: {
        language: args.language,
        organization: args.organization,
        resourceType: "ta",
      },
    });

    // Build MCP response
    const mcpResponse = {
      success: true,
      content,
      title,
      path: result.modules?.[0]?.path || finalPath || args.moduleId,
      moduleId: args.moduleId || result.modules?.[0]?.id,
      metadata,
    };

    logger.info("Translation academy content fetched successfully", {
      moduleId: args.moduleId,
      path: mcpResponse.path,
      ...metadata,
    });

    return mcpResponse;
  } catch (error) {
    return handleMCPError({
      toolName: "fetch_translation_academy",
      args: {
        moduleId: args.moduleId,
        path: args.path,
        rcLink: args.rcLink,
        language: args.language,
        organization: args.organization,
      },
      startTime,
      originalError: error,
    });
  }
}
