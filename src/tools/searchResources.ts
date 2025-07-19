/**
 * Search Resources Tool
 * Search for available Bible translation resources
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { DCSApiClient } from "../services/DCSApiClient.js";

// Input schema
export const SearchResourcesArgs = z.object({
  language: z.string().optional(),
  organization: z.string().optional(),
  resource: z.string().optional(),
  subject: z.string().optional(),
});

export type SearchResourcesArgs = z.infer<typeof SearchResourcesArgs>;

/**
 * Handle the search resources tool call
 */
export async function handleSearchResources(args: SearchResourcesArgs) {
  const startTime = Date.now();

  try {
    logger.info("Searching resources", args);

    // Create DCS API client
    const client = new DCSApiClient();

    // Build search parameters for the DCS catalog API
    const searchParams: any = {
      stage: "prod",
      limit: 100,
    };

    // Add optional filters
    if (args.language) {
      searchParams.lang = args.language;
    }
    if (args.organization) {
      searchParams.owner = args.organization;
    }
    if (args.resource) {
      searchParams.resource = args.resource;
    }
    if (args.subject) {
      searchParams.subject = args.subject;
    }

    // Fetch resources from DCS catalog
    const response = await client.getResources(searchParams);

    if (!response.success) {
      throw new Error(`Failed to fetch resources: ${response.error || "Unknown error"}`);
    }

    // Transform the response data into a more user-friendly format
    const resources = (response.data || []).map((resource: any) => ({
      name: resource.title || resource.name || "Unknown Resource",
      language: resource.language || args.language || "unknown",
      organization: resource.owner || args.organization || "unknown",
      type: resource.subject || "unknown",
      description: resource.description || "",
      identifier: resource.identifier || "",
      format: resource.format || "",
      stage: resource.stage || "",
      url: resource.url || "",
      lastUpdated: resource.released || resource.modified || "",
    }));

    const results = {
      resources,
      query: args,
      totalResults: resources.length,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to search resources", {
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
              query: args,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
