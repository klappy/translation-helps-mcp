/**
 * AI Search Reindex Trigger
 *
 * Triggers a manual reindex of the AI Search index after writing new content.
 * Without this, content would wait up to 6 hours for the automatic reindex.
 * With the trigger, content becomes searchable within ~1-5 minutes.
 */

import type { Env } from "../types.js";

/**
 * Last reindex trigger timestamp (for rate limiting)
 * AI Search allows triggering every 30 seconds
 */
let lastTriggerTime = 0;
const MIN_TRIGGER_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Trigger AI Search to reindex the search index bucket
 *
 * Rate limited to once every 30 seconds per Cloudflare limits.
 * Silently skips if called too frequently.
 *
 * @param env - Worker environment with credentials
 * @throws Error if the API call fails (non-rate-limit errors)
 */
export async function triggerAISearchReindex(env: Env): Promise<void> {
  const now = Date.now();

  // Rate limit check
  if (now - lastTriggerTime < MIN_TRIGGER_INTERVAL_MS) {
    console.log(
      `[AI Search Trigger] Skipping - last trigger was ${now - lastTriggerTime}ms ago (min: ${MIN_TRIGGER_INTERVAL_MS}ms)`,
    );
    return;
  }

  // Validate environment
  if (!env.CF_ACCOUNT_ID || !env.AI_SEARCH_INDEX_ID || !env.CF_API_TOKEN) {
    console.warn("[AI Search Trigger] Missing required environment variables");
    console.warn(`  CF_ACCOUNT_ID: ${env.CF_ACCOUNT_ID ? "set" : "missing"}`);
    console.warn(
      `  AI_SEARCH_INDEX_ID: ${env.AI_SEARCH_INDEX_ID ? "set" : "missing"}`,
    );
    console.warn(`  CF_API_TOKEN: ${env.CF_API_TOKEN ? "set" : "missing"}`);
    return;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai-search/indexes/${env.AI_SEARCH_INDEX_ID}/reindex`;

  console.log(`[AI Search Trigger] Triggering reindex: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    lastTriggerTime = now;

    if (!response.ok) {
      const body = await response.text();

      // Check for rate limit response
      if (response.status === 429) {
        console.log(
          "[AI Search Trigger] Rate limited - will retry on next batch",
        );
        return;
      }

      throw new Error(
        `AI Search reindex failed: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    const result = await response.json();
    console.log("[AI Search Trigger] Reindex triggered successfully:", result);
  } catch (error) {
    // Log but don't throw for network errors - content is already indexed
    console.error("[AI Search Trigger] Failed to trigger reindex:", error);
    throw error;
  }
}

/**
 * Check if enough time has passed since the last trigger
 * Useful for deciding whether to batch more work
 */
export function canTriggerReindex(): boolean {
  return Date.now() - lastTriggerTime >= MIN_TRIGGER_INTERVAL_MS;
}

/**
 * Get time until next trigger is allowed (in milliseconds)
 */
export function getTimeUntilNextTrigger(): number {
  const elapsed = Date.now() - lastTriggerTime;
  return Math.max(0, MIN_TRIGGER_INTERVAL_MS - elapsed);
}
