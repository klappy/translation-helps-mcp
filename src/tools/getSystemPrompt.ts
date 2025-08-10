/**
 * Get System Prompt Tool
 *
 * Returns the complete system prompt and constraints for full transparency
 * about how the AI assistant operates.
 */

import { SACRED_TEXT_SYSTEM_PROMPT } from "../config/SacredTextConstraints";
import { logger } from "../utils/logger";

export interface GetSystemPromptParams {
  includeImplementationDetails?: boolean;
}

export interface GetSystemPromptResponse {
  systemPrompt: string;
  constraints: {
    sacredText: string[];
    citations: string[];
    transparency: string[];
  };
  version: string;
  lastUpdated: string;
  implementationDetails?: {
    validationFunctions: string[];
    errorHandling: string[];
    performanceTargets: Record<string, string>;
  };
}

/**
 * Get the system prompt and constraints
 */
export async function getSystemPrompt(
  params: GetSystemPromptParams = {},
): Promise<GetSystemPromptResponse> {
  try {
    logger.info("Getting system prompt for transparency");

    const response: GetSystemPromptResponse = {
      systemPrompt: SACRED_TEXT_SYSTEM_PROMPT,
      constraints: {
        sacredText: [
          "Scripture must be quoted verbatim, character for character",
          "No paraphrasing or summarization of scripture allowed",
          "No theological interpretation permitted",
          "Verse numbers must be included in quotes",
        ],
        citations: [
          "All resources must be cited in [Resource - Reference] format",
          "Citations must be listed at the end of each response",
          "Translation helps can be reworded but must cite source",
          "Clear distinction between scripture and translation helps",
        ],
        transparency: [
          "System prompt is fully accessible via this tool",
          "All constraints are documented and enforced",
          "X-Ray tool shows all MCP tool usage",
          "Performance metrics are visible for all operations",
        ],
      },
      version: "1.0.0",
      lastUpdated: "2025-07-25",
    };

    if (params.includeImplementationDetails) {
      response.implementationDetails = {
        validationFunctions: [
          "validateScriptureQuote() - Ensures exact quote matching",
          "extractCitations() - Extracts all citations from response",
          "checkForInterpretation() - Detects theological interpretation",
        ],
        errorHandling: [
          "Invalid references return clear error messages",
          "Missing resources are explicitly stated",
          "All errors include actionable suggestions",
        ],
        performanceTargets: {
          "Single verse": "< 200ms",
          "Verse range": "< 300ms",
          "Full chapter": "< 500ms",
          "With caching": "< 100ms",
          "Chat response": "< 2000ms",
        },
      };
    }

    return response;
  } catch (error) {
    logger.error("Error getting system prompt:", error);
    throw new Error("Failed to retrieve system prompt");
  }
}

/**
 * Tool metadata for MCP
 */
export const getSystemPromptTool = {
  name: "get_system_prompt",
  description:
    "Get the complete system prompt and constraints for full transparency about AI behavior",
  inputSchema: {
    type: "object",
    properties: {
      includeImplementationDetails: {
        type: "boolean",
        description: "Include technical implementation details",
        default: false,
      },
    },
  },
};

/**
 * Handle MCP tool call
 */
export async function handleGetSystemPrompt(args: any = {}) {
  const result = await getSystemPrompt(args);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
