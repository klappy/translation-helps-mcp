/**
 * Token Counter Utility
 * Estimate tokens for text content
 */

/**
 * Estimate the number of tokens in a text string
 * This is a simple approximation - in production you'd use a proper tokenizer
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple estimation: ~4 characters per token for English text
  // This is a rough approximation and should be replaced with proper tokenization
  const chars = text.length;
  const estimatedTokens = Math.ceil(chars / 4);

  return estimatedTokens;
}

/**
 * Check if text is within token limit
 */
export function isWithinTokenLimit(text: string, maxTokens: number): boolean {
  return estimateTokens(text) <= maxTokens;
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = estimateTokens(text);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Rough truncation based on character count
  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars) + "...";
}
