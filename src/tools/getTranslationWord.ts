/**
 * Get Translation Word Tool
 * Tool for fetching translation words by term name, path, rcLink, or Bible reference
 * Matches HTTP endpoint behavior: supports term, path, rcLink parameters
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { fetchTranslationWords } from "../functions/translation-words-service.js";
import { buildMetadata } from "../utils/metadata-builder.js";
import { handleMCPError } from "../utils/mcp-error-handler.js";
import { EdgeXRayTracer } from "../functions/edge-xray.js";
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";
import * as os from "os";
import * as path from "path";
import {
  TermParam,
  PathParam,
  RCLinkParam,
  ReferenceParam,
  LanguageParam,
  OrganizationParam,
} from "../schemas/common-params.js";

// Input schema - using shared common parameters
export const GetTranslationWordArgs = z.object({
  // Term-based lookup (matches HTTP endpoint)
  term: TermParam,
  path: PathParam,
  rcLink: RCLinkParam,
  // Reference-based lookup (legacy, for backward compatibility)
  reference: ReferenceParam.optional().describe(
    'Bible reference (e.g., "John 3:16") - use term instead for term lookups',
  ),
  language: LanguageParam,
  organization: OrganizationParam,
  category: z
    .string()
    .optional()
    .describe(
      "Filter by category (kt, names, other) - only used with reference",
    ),
});

export type GetTranslationWordArgs = z.infer<typeof GetTranslationWordArgs>;

/**
 * Handle the get translation word tool call
 * Supports both term-based lookup (term, path, rcLink) and reference-based lookup
 */
export async function handleGetTranslationWord(args: GetTranslationWordArgs) {
  const startTime = Date.now();

  try {
    // Determine lookup type: term-based or reference-based
    const identifier = args.path || args.term || args.rcLink;
    const hasReference = !!args.reference;

    if (identifier) {
      // Term-based lookup using ZipResourceFetcher2 (matches HTTP endpoint behavior)
      logger.info("Fetching translation word by term/path/rcLink", {
        term: args.term,
        path: args.path,
        rcLink: args.rcLink,
        language: args.language,
        organization: args.organization,
      });

      const tracer = new EdgeXRayTracer("mcp-tool", "fetch_translation_word");

      // Use configurable ZIP fetcher provider (from config or environment)
      const providerName =
        (args as any).zipFetcherProvider ||
        process.env.ZIP_FETCHER_PROVIDER ||
        "auto";

      const cacheDir =
        typeof process !== "undefined" && process.env.CACHE_PATH
          ? process.env.CACHE_PATH
          : path.join(os.homedir(), ".translation-helps-mcp", "cache");

      // Log which cache directory is being used
      if (typeof process !== "undefined" && process.env.CACHE_PATH) {
        logger.info(
          `📁 getTranslationWord: Using CACHE_PATH from environment: ${process.env.CACHE_PATH}`,
        );
      } else {
        logger.info(
          `📁 getTranslationWord: Using default cache directory: ${cacheDir}`,
        );
      }

      const zipFetcher = ZipFetcherFactory.create(
        providerName,
        cacheDir,
        tracer,
      );
      logger.info(`📦 Using ZIP fetcher provider: ${zipFetcher.name}`);

      // Extract identifier from term, path, or rcLink (matches functionalDataFetchers.ts logic)
      let finalIdentifier: string | undefined;
      if (args.path) {
        finalIdentifier = args.path;
      } else if (args.term) {
        finalIdentifier = args.term.toLowerCase().replace(/\s+/g, "");
      } else if (args.rcLink) {
        // Extract term from RC link: rc://*/tw/dict/bible/kt/love -> love
        const match = args.rcLink.match(/\/tw\/dict\/bible\/[^/]+\/([^/]+)/);
        finalIdentifier = match ? match[1] : args.rcLink;
      }

      if (!finalIdentifier) {
        throw new Error("No valid identifier found from term, path, or rcLink");
      }

      const result = await zipFetcher.getMarkdownContent(
        args.language || "en",
        args.organization || "unfoldingWord",
        "tw",
        finalIdentifier,
      );

      // Transform result to match expected format
      const articles = Array.isArray((result as any).articles)
        ? (result as any).articles
        : [];

      // Build metadata using shared utility
      const metadata = buildMetadata({
        startTime,
        data: result,
        serviceMetadata: (result as any).metadata || {},
        additionalFields: {
          wordsFound: articles.length,
        },
      });

      const response = {
        articles,
        language: args.language || "en",
        organization: args.organization || "unfoldingWord",
        metadata,
      };

      logger.info("Translation word fetched successfully by term", {
        identifier: finalIdentifier,
        ...metadata,
      });

      // Return in MCP format (wrapped in content array like other tools)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: false,
      };
    } else if (hasReference) {
      // Reference-based lookup (legacy, for backward compatibility)
      logger.info("Fetching translation words by reference", {
        reference: args.reference,
        language: args.language,
        organization: args.organization,
        category: args.category,
      });

      const result = await fetchTranslationWords({
        reference: args.reference!,
        language: args.language,
        organization: args.organization,
        category: args.category,
      });

      // Build metadata using shared utility
      const metadata = buildMetadata({
        startTime,
        data: result,
        serviceMetadata: result.metadata,
        additionalFields: {
          wordsFound: result.metadata.wordsFound,
        },
      });

      const response = {
        translationWords: result.translationWords,
        citation: result.citation,
        language: args.language,
        organization: args.organization,
        metadata,
      };

      logger.info("Translation words fetched successfully by reference", {
        reference: args.reference,
        ...metadata,
      });

      return response;
    } else {
      throw new Error(
        "Either term/path/rcLink or reference parameter is required",
      );
    }
  } catch (error) {
    return handleMCPError({
      toolName: "fetch_translation_word",
      args: {
        reference: args.reference,
        term: args.term,
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
