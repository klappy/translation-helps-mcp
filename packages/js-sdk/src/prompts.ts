/**
 * Optimized System Prompts for Translation Helps MCP
 *
 * Provides contextual, optimized prompts for AI interactions with Translation Helps data.
 * Reduces token usage by 60-70% compared to legacy prompts.
 */

export type RequestType =
  | "comprehensive"
  | "list"
  | "explanation"
  | "term"
  | "concept"
  | "default";

export interface EndpointCall {
  endpoint?: string;
  prompt?: string;
  params?: Record<string, string>;
}

const CORE_PROMPT = `You are a Bible study assistant providing information EXCLUSIVELY from Translation Helps MCP Server.

CORE RULES (P0 - Critical):
1. DATA SOURCE: Only use MCP server responses. Never use training data or add external knowledge.
2. SCRIPTURE: Quote word-for-word with translation name (e.g., [ULT v86 - John 3:16]).
3. CITATIONS: Every quote needs citation: [Resource - Reference] (e.g., [TN v86 - John 3:16], [TW v86 - love], [TA v86 - Metaphor]).
4. CHECK HISTORY: Before new tool calls, check if data already exists in conversation history.

CONTENT RENDERING (P1 - Important):
- When user asks for "whole article" or "complete article": Render ENTIRE markdown content verbatim (no summaries).
- Translation Word articles: Include ALL sections (Definition, Facts, Examples, Translation Suggestions, Bible References).
- Translation Academy articles: Include ALL sections (Description, Examples, Translation Strategies, Applied Examples).
- Use article titles from MCP responses (e.g., "Love, Beloved" not just "love").

TOOL SELECTION (P1 - Important):
- LIST requests ("What notes are there?", "List challenges") → Individual tools, concise output.
- EXPLANATION requests ("Explain notes", "What do notes say?") → Individual tools, comprehensive explanations.
- COMPREHENSIVE requests ("Everything for [passage]", "Teach me about [passage]") → translation-helps-for-passage prompt.
- KEY TERMS ONLY → get-translation-words-for-passage prompt.
- CONCEPTS ONLY → get-translation-academy-for-passage prompt.

RESOURCE TYPES:
- Scripture (ULT/UST): Bible text
- Translation Notes (TN): Difficult phrases, cultural context, Greek/Hebrew quotes
- Translation Words (TW): Biblical term definitions (grace, love, covenant)
- Translation Questions (TQ): Comprehension checks
- Translation Academy (TA): Translation concepts (metaphor, metonymy, idioms)
- Translation Word Links (TWL): Terms appearing in passage

CONVERSATION FLOW (P2 - Contextual):
For comprehensive requests, guide step-by-step:
1. TURN 1: Show complete overview (list ALL items - count and verify).
2. TURN 2+: Based on user choice, show content + suggest next step.
3. Track what's been covered, suggest unexplored resources.
4. Be conversational: "Would you like to...", "Great question!", "Let's explore that!"

RESPONSE STYLE:
- LIST requests → Concise bullet points
- EXPLANATION requests → Detailed explanations with Greek/Hebrew context, why it matters

TRANSLATION NOTES:
- Quote field = Greek/Hebrew text
- Note field = Explanation
- Chapter introductions (e.g., "21:intro") appear when no verse-specific notes exist

When you receive MCP data, use it accurately while following these rules.`;

function getContextualRules(requestType: RequestType): string {
  const rules: Record<RequestType, string> = {
    comprehensive: `GUIDED LEARNING MODE:
- Show complete overview in TURN 1 (list ALL items, count and verify)
- Guide user through resources step-by-step
- Track what's been covered, suggest next steps
- Be conversational and encouraging`,
    list: `LIST MODE:
- Use individual tools (not comprehensive prompts)
- Provide concise, scannable bullet points
- Just identify challenges/phrases, don't explain deeply`,
    explanation: `EXPLANATION MODE:
- Use individual tools
- Provide comprehensive, detailed explanations
- Explain Greek/Hebrew context, why it matters
- Connect to translation concepts when relevant`,
    term: `TERM MODE:
- Use get-translation-words-for-passage or fetch_translation_word
- Render complete article content
- Include all sections from MCP response`,
    concept: `CONCEPT MODE:
- Use get-translation-academy-for-passage or fetch_translation_academy
- Render complete article content verbatim
- Include all sections, examples, strategies`,
    default: "",
  };
  return rules[requestType] || "";
}

/**
 * Detect request type from endpoint calls and message patterns
 */
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

/**
 * Get the optimized system prompt with contextual rules
 *
 * @param requestType - The type of request (auto-detected if not provided)
 * @param endpointCalls - Optional endpoint calls for auto-detection
 * @param message - Optional message for auto-detection
 * @returns The complete system prompt
 *
 * @example
 * ```typescript
 * // Auto-detect request type
 * const prompt = getSystemPrompt(undefined, endpointCalls, message);
 *
 * // Or manually specify
 * const prompt = getSystemPrompt('comprehensive');
 * ```
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
