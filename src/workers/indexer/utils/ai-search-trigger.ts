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
 * Failures are logged but not thrown - content is already in R2 and will
 * be indexed on the next automatic 6-hour sync. This prevents unnecessary
 * queue retries for non-critical reindex optimization.
 *
 * @param env - Worker environment with credentials
 */
export async function triggerAISearchReindex(env: Env): Promise<void> {
  const now = Date.now();

  console.log(`[AI Search Trigger] === REINDEX TRIGGER CALLED ===`);

  // Rate limit check
  if (now - lastTriggerTime < MIN_TRIGGER_INTERVAL_MS) {
    console.log(
      `[AI Search Trigger] Skipping - last trigger was ${now - lastTriggerTime}ms ago (min: ${MIN_TRIGGER_INTERVAL_MS}ms)`,
    );
    return;
  }

  // Validate environment - only log "set" or "missing", never actual values
  if (!env.CF_ACCOUNT_ID || !env.AI_SEARCH_INDEX_ID || !env.CF_API_TOKEN) {
    console.warn(
      "[AI Search Trigger] Missing required environment variables:",
      {
        CF_ACCOUNT_ID: env.CF_ACCOUNT_ID ? "set" : "missing",
        AI_SEARCH_INDEX_ID: env.AI_SEARCH_INDEX_ID ? "set" : "missing",
        CF_API_TOKEN: env.CF_API_TOKEN ? "set" : "missing",
      },
    );
    return;
  }

  // API uses "autorag" path and PATCH method per https://developers.cloudflare.com/api/resources/autorag/
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/autorag/rags/${env.AI_SEARCH_INDEX_ID}/sync`;

  console.log(`[AI Search Trigger] Calling reindex API: ${url}`);

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const body = await response.text();
    console.log(
      `[AI Search Trigger] Response: ${response.status} ${response.statusText}`,
    );
    console.log(`[AI Search Trigger] Body: ${body}`);

    if (!response.ok) {
      // Check for rate limit response - don't update lastTriggerTime to allow retry
      if (response.status === 429) {
        console.log(
          "[AI Search Trigger] Rate limited by API - will retry on next batch",
        );
        return;
      }

      // 404 means the endpoint doesn't exist - AI Search may sync automatically
      if (response.status === 404) {
        console.log(
          "[AI Search Trigger] ⚠️ Reindex API endpoint not found (404). AI Search may sync automatically from R2 bucket.",
        );
        // Don't spam logs - mark as "triggered" to rate limit
        lastTriggerTime = now;
        return;
      }

      // Log non-rate-limit errors but don't throw
      console.error(
        `[AI Search Trigger] ❌ API ERROR: ${response.status} ${response.statusText} - ${body}`,
      );
      return;
    }

    // Only update lastTriggerTime on SUCCESS
    lastTriggerTime = now;

    console.log("[AI Search Trigger] ✅ Reindex triggered successfully!");
  } catch (error) {
    // Log but don't throw - content is already in R2 and will be indexed
    // on the next automatic 6-hour sync. No need to block queue processing.
    console.error("[AI Search Trigger] ❌ EXCEPTION:", error);
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
