/**
 * Fetch Translation Academy Tool
 * Tool for fetching translation academy modules and training content
 *
 * SUPPORTS FORMAT PARAMETER:
 * - json: Raw JSON (default)
 * - md/markdown: TRUE markdown with YAML frontmatter
 * - text: Plain text
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import {
  formatMCPResponse,
  type OutputFormat,
} from "../utils/mcp-response-formatter.js";
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
    const { ZipFetcherFactory } = await import(
      "../services/zip-fetcher-provider.js"
    );
    const { parseTranslationAcademyRCLink, isTranslationAcademyRCLink } =
      await import("../../ui/src/lib/rcLinkParser.js");
    const osModule = await import("os");
    const pathModule = await import("path");
    const os = osModule.default || osModule;
    const path = pathModule.default || pathModule;

    const tracer = new EdgeXRayTracer(`ta-mcp-${Date.now()}`, "mcp-ta");

    // Use configurable ZIP fetcher provider (from config or environment)
    const providerName =
      (args as any).zipFetcherProvider ||
      process.env.ZIP_FETCHER_PROVIDER ||
      "auto";

    const cacheDir =
      typeof process !== "undefined" && process.env.CACHE_PATH
        ? process.env.CACHE_PATH
        : path.join(os.homedir(), ".translation-helps-mcp", "cache");

    const zipFetcher = ZipFetcherFactory.create(providerName, cacheDir, tracer);
    logger.info(`📦 Using ZIP fetcher provider: ${zipFetcher.name}`);

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

    // Use ZipResourceFetcher2.getMarkdownContent directly (same as UnifiedResourceFetcher does)
    const result = (await zipFetcher.getMarkdownContent(
      args.language || "en",
      args.organization || "unfoldingWord",
      "ta",
      finalPath || args.moduleId,
    )) as any;

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

    // Build response data for formatter
    const responseData = {
      moduleId: args.moduleId || result.modules?.[0]?.id,
      title,
      content,
      path: result.modules?.[0]?.path || finalPath || args.moduleId,
      metadata,
    };

    logger.info("Translation academy content fetched successfully", {
      moduleId: args.moduleId,
      path: responseData.path,
      format: args.format,
      ...metadata,
    });

    // Format based on requested format
    const format = (args.format || "md") as OutputFormat;
    return formatMCPResponse(responseData, format, "translation-academy");
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
