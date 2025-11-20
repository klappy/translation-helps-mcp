/**
 * Request Type Detection
 *
 * Detects the type of request from endpoint calls and message patterns
 */

import type { RequestType } from "./contextual-rules.js";

export interface EndpointCall {
  endpoint?: string;
  prompt?: string;
  params?: Record<string, string>;
}

export function detectRequestType(
  endpointCalls: EndpointCall[],
  message: string,
): RequestType {
  // Check for comprehensive prompts
  if (endpointCalls.some((c) => c.prompt === "translation-helps-for-passage")) {
    return "comprehensive";
  }
  if (
    endpointCalls.some((c) => c.prompt === "get-translation-words-for-passage")
  ) {
    return "term";
  }
  if (
    endpointCalls.some(
      (c) => c.prompt === "get-translation-academy-for-passage",
    )
  ) {
    return "concept";
  }

  // Check message patterns
  const msgLower = message.toLowerCase();
  if (
    msgLower.includes("list") ||
    msgLower.includes("what notes are there") ||
    msgLower.includes("show me the")
  ) {
    return "list";
  }
  if (
    msgLower.includes("explain") ||
    msgLower.includes("what do the notes say") ||
    msgLower.includes("help me understand")
  ) {
    return "explanation";
  }
  if (
    msgLower.includes("what does") ||
    msgLower.includes("who is") ||
    msgLower.includes("what is") ||
    msgLower.includes("mean")
  ) {
    return "term";
  }

  return "default";
}
