/**
 * Search Biblical Resources MCP Tool
 *
 * Wrapper around the /api/search endpoint for MCP integration
 * Enables ad-hoc search across all Door43 translation resources
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";

// Input schema
export const SearchBiblicalResourcesArgs = z.object({
  query: z
    .string()
    .describe("Search query (natural language, keywords, or phrases)"),
  language: z
    .string()
    .optional()
    .describe('Language code (e.g., "en", "es", "fr"). Default: "en"'),
  organization: z
    .string()
    .optional()
    .describe(
      'Organization/owner (e.g., "unfoldingWord", "Wycliffe"). Default: "unfoldingWord"',
    ),
  reference: z
    .string()
    .optional()
    .describe(
      'Optional Bible reference to filter results (e.g., "John 3:16", "Genesis 1")',
    ),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return. Default: 50"),
  includeHelps: z
    .boolean()
    .optional()
    .describe(
      "Include translation helps (notes, words, academy). Default: true",
    ),
});

export type SearchBiblicalResourcesArgs = z.infer<
  typeof SearchBiblicalResourcesArgs
>;

/**
 * Handle the search biblical resources tool call
 */
export async function handleSearchBiblicalResources(
  args: SearchBiblicalResourcesArgs,
) {
  const startTime = Date.now();

  try {
    logger.info("[MCP:Search] Searching biblical resources", args);

    // Build search request
    const searchRequest = {
      query: args.query,
      language: args.language || "en",
      owner: args.organization || "unfoldingWord",
      reference: args.reference,
      limit: args.limit || 50,
      includeHelps: args.includeHelps !== false,
    };

    // Call search endpoint
    // In MCP context, we need to use the full URL
    const apiUrl = process.env.API_BASE_URL || "http://localhost:8787";
    const response = await fetch(`${apiUrl}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Format results for LLM consumption
    const formattedResults = {
      query: data.query,
      language: data.language,
      organization: data.owner,
      resourceCount: data.resourceCount,
      hitCount: data.hits?.length || 0,
      took_ms: data.took_ms,
      hits: (data.hits || []).map((hit: any) => ({
        resource: hit.resource,
        type: hit.type,
        path: hit.path,
        score: Math.round(hit.score * 100) / 100,
        preview: hit.preview,
      })),
    };

    // Return in MCP format
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedResults, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("[MCP:Search] Search failed", {
      args,
      error: (error as Error).message,
      responseTime: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: (error as Error).message,
              query: args.query,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
