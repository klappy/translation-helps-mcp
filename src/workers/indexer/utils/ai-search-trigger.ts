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

    const bodyText = await response.text();
    console.log(
      `[AI Search Trigger] Response: ${response.status} ${response.statusText}`,
    );

    // Check HTTP status first
    if (!response.ok) {
      if (response.status === 429) {
        console.log(
          "[AI Search Trigger] Rate limited by API - will retry on next batch",
        );
        return;
      }
      if (response.status === 404) {
        console.log("[AI Search Trigger] ⚠️ Endpoint not found (404)");
        lastTriggerTime = now; // Rate limit retries
        return;
      }
      console.error(
        `[AI Search Trigger] ❌ HTTP ${response.status}: ${bodyText}`,
      );
      return;
    }

    // Parse and validate Cloudflare API response envelope
    let result: {
      success?: boolean;
      errors?: Array<{ message: string }>;
      result?: { job_id?: string };
    };
    try {
      result = JSON.parse(bodyText);
    } catch {
      console.error(
        `[AI Search Trigger] ❌ Invalid JSON response: ${bodyText}`,
      );
      return;
    }

    // Cloudflare API can return 200 with success: false
    if (!result.success) {
      const errorMsg =
        result.errors?.map((e) => e.message).join(", ") || "Unknown error";
      console.error(
        `[AI Search Trigger] ❌ API returned success=false: ${errorMsg}`,
      );
      return;
    }

    // Success - update rate limit timer
    lastTriggerTime = now;
    const jobId = result.result?.job_id || "unknown";
    console.log(
      `[AI Search Trigger] ✅ Sync triggered successfully (job_id: ${jobId})`,
    );
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
