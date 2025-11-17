export const config = {
  runtime: "edge",
};

import { logger } from "$lib/utils/logger";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Dynamic Chat Endpoint
 * Processes requests without hardcoded field mappings
 */

// Simple pattern matching for tool selection
const TOOL_PATTERNS = [
  { pattern: /scripture|verse|passage|text/i, tool: "fetch_scripture" },
  { pattern: /notes|translation notes/i, tool: "fetch_translation_notes" },
  {
    pattern: /questions|translation questions/i,
    tool: "fetch_translation_questions",
  },
  { pattern: /word|definition|term/i, tool: "get_translation_word" },
  {
    pattern: /academy|article|learn|teaching/i,
    tool: "fetch_translation_academy",
  },
];

// Reference extraction - kept simple
function extractReference(message: string): string | null {
  // Try various reference patterns
  const patterns = [
    /(\w+\s+\d+:\d+(?:-\d+)?)/i, // Book Chapter:Verse
    /(\w+\s+\d+)(?!:)/i, // Book Chapter
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message } = await request.json();

    if (!message) {
      return json({ error: "No message provided" });
    }

    // Determine which tool to use
    let selectedTool = null;
    for (const { pattern, tool } of TOOL_PATTERNS) {
      if (pattern.test(message)) {
        selectedTool = tool;
        break;
      }
    }

    if (!selectedTool) {
      return json({
        content:
          "I'm not sure what you're looking for. Try asking about scripture, translation notes, questions, words, or academy articles.",
      });
    }

    // Build parameters dynamically
    const params: any = {};

    // Extract reference if needed
    const reference = extractReference(message);
    if (reference) {
      params.reference = reference;
    }

    // Extract article ID for TA
    if (selectedTool === "fetch_translation_academy") {
      const articleMatch = message.match(/about\s+(\S+)|article\s+(\S+)/i);
      if (articleMatch) {
        params.articleId = articleMatch[1] || articleMatch[2];
      }
    }

    // Extract word ID
    if (selectedTool === "get_translation_word") {
      const wordMatch = message.match(/word\s+(\S+)|define\s+(\S+)/i);
      if (wordMatch) {
        params.term = wordMatch[1] || wordMatch[2];
      }
    }

    // Always add language
    params.language = "en";
    params.organization = "unfoldingWord";

    // Call the dynamic MCP endpoint
    const mcpResponse = await fetch(
      new URL("/api/mcp-dynamic", request.url).toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "tools/call",
          params: {
            name: selectedTool,
            arguments: params,
          },
        }),
      },
    );

    const mcpData = await mcpResponse.json();

    // Pass through the response with minimal processing
    return json({
      content: mcpData.content?.[0]?.text || "No content found",
      tool: selectedTool,
      params,
      _debug: mcpData._debug,
    });
  } catch (error) {
    logger?.error?.("Dynamic chat error", { error: String(error) });
    return json({
      error: "An error occurred processing your request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
