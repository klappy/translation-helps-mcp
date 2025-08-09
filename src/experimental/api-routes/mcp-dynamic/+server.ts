export const config = {
  runtime: "edge",
};

import { DynamicDataPipeline } from "$lib/core/DynamicDataPipeline";
import { logger } from "$lib/utils/logger";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Dynamic MCP Endpoint
 * Zero-configuration approach that discovers and preserves data structure
 */

// Simple endpoint registry - just maps tool names to endpoints
const ENDPOINT_MAP: Record<string, string> = {
  fetch_scripture: "/api/fetch-scripture",
  fetch_translation_notes: "/api/fetch-translation-notes",
  fetch_translation_questions: "/api/fetch-translation-questions",
  get_translation_word: "/api/get-translation-word",
  fetch_translation_academy: "/api/fetch-translation-academy",
  // Add more as needed
};

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const body = await request.json();
    const method = body.method;

    // Handle tool list request
    if (method === "tools/list") {
      return json({
        tools: Object.keys(ENDPOINT_MAP).map((name) => ({
          name,
          description: `Dynamically handled ${name} tool`,
        })),
      });
    }

    // Handle tool calls
    if (method === "tools/call") {
      const toolName = body.params?.name;
      const args = body.params?.arguments || {};

      // Check if we have this endpoint
      const endpoint = ENDPOINT_MAP[toolName];
      if (!endpoint) {
        return json({
          content: [
            {
              type: "text",
              text: `Unknown tool: ${toolName}`,
            },
          ],
        });
      }

      // Use the dynamic pipeline
      const handler = DynamicDataPipeline.createUniversalHandler();
      const response = await handler(endpoint, args);

      // Return in MCP format
      return json({
        content: [
          {
            type: "text",
            text: DynamicDataPipeline.formatForLLM(response),
          },
        ],
        _debug: {
          structure: response._meta.structure,
          hasData: response._meta.hasData,
          source: response._meta.source,
        },
      });
    }

    // Unknown method
    return json({
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    });
  } catch (error) {
    logger?.error?.("Dynamic MCP error", { error: String(error) });
    return json({
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
};
