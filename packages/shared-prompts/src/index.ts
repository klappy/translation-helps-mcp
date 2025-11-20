/**
 * Shared Prompts - Main Export
 *
 * Provides optimized, contextual system prompts for Translation Helps MCP clients
 */

import { CORE_PROMPT } from "./core-prompt.js";
import { getContextualRules, type RequestType } from "./contextual-rules.js";
import { detectRequestType, type EndpointCall } from "./request-detector.js";

/**
 * Get the optimized system prompt with contextual rules
 *
 * @param requestType - The type of request (auto-detected if not provided)
 * @param endpointCalls - Optional endpoint calls for auto-detection
 * @param message - Optional message for auto-detection
 * @returns The complete system prompt
 */
export function getSystemPrompt(
  requestType?: RequestType,
  endpointCalls?: EndpointCall[],
  message?: string,
): string {
  // Auto-detect if not provided
  if (!requestType && endpointCalls && message) {
    requestType = detectRequestType(endpointCalls, message);
  }

  const contextualRules = requestType ? getContextualRules(requestType) : "";

  return contextualRules ? `${CORE_PROMPT}\n\n${contextualRules}` : CORE_PROMPT;
}

// Re-export types and utilities
export type { RequestType, EndpointCall };
export { detectRequestType, getContextualRules, CORE_PROMPT };
