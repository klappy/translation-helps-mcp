/**
 * Search Indexing Pipeline Worker
 *
 * Unified entry point for the event-driven indexing pipeline.
 * Routes messages based on R2 key pattern:
 * - ZIP files → Unzip logic (extract files one at a time)
 * - Extracted files → Index logic (clean and write to search index)
 *
 * Architecture (Event-Driven Pipeline v2):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  ZIP Event → Unzip (list + extract loop) → writes files to R2   │
 * │                                                   ↓              │
 * │                     R2 Event (extracted file) → Index Worker     │
 * │                            ↑                                     │
 * │     Main API extractions ──┘                                     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Key insight: R2 events on extracted files trigger indexing regardless of source.
 */

import type { MessageBatch } from "@cloudflare/workers-types";
import type { Env, R2EventNotification } from "./types.js";

// Import handlers
import { processZipFiles } from "./unzip-worker.js";
import { processExtractedFiles } from "./index-worker.js";
import { triggerAISearchReindex } from "./utils/ai-search-trigger.js";

/**
 * Determine message type from R2 key
 */
function getMessageType(key: string): "zip" | "extracted" | "unknown" {
  if (key.endsWith(".zip") && !key.includes("/files/")) {
    return "zip";
  }
  if (key.includes("/files/")) {
    return "extracted";
  }
  return "unknown";
}

/**
 * Queue consumer handler
 * Routes messages to appropriate handler based on R2 key pattern
 */
export default {
  /**
   * HTTP handler for diagnostics and manual reindex trigger
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify(
          {
            status: "ok",
            worker: "translation-helps-indexer",
            env: {
              CF_ACCOUNT_ID: env.CF_ACCOUNT_ID
                ? `set (${env.CF_ACCOUNT_ID.substring(0, 8)}...)`
                : "⚠️ MISSING",
              AI_SEARCH_INDEX_ID: env.AI_SEARCH_INDEX_ID || "⚠️ MISSING",
              CF_API_TOKEN: env.CF_API_TOKEN
                ? `set (${env.CF_API_TOKEN.substring(0, 8)}...)`
                : "⚠️ MISSING",
            },
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Manual reindex trigger for debugging
    if (url.pathname === "/reindex") {
      console.log("[HTTP] Manual reindex trigger requested");
      try {
        await triggerAISearchReindex(env);
        return new Response(
          JSON.stringify(
            {
              status: "triggered",
              message: "Check worker logs for results",
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        return new Response(
          JSON.stringify(
            {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // List AI Search indexes to debug - try multiple API paths
    if (url.pathname === "/list-indexes") {
      const paths = [
        `/accounts/${env.CF_ACCOUNT_ID}/ai-search/indexes`,
        `/accounts/${env.CF_ACCOUNT_ID}/ai/search/indexes`,
        `/accounts/${env.CF_ACCOUNT_ID}/autorag/indexes`,
        `/accounts/${env.CF_ACCOUNT_ID}/vectorize/indexes`,
      ];
      const results: Record<string, unknown> = {};

      for (const path of paths) {
        const testUrl = `https://api.cloudflare.com/client/v4${path}`;
        try {
          const response = await fetch(testUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${env.CF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          });
          const body = await response.text();
          results[path] = { status: response.status, body: JSON.parse(body) };
        } catch (error) {
          results[path] = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  async queue(
    batch: MessageBatch<R2EventNotification>,
    env: Env,
  ): Promise<void> {
    console.log(
      `[Pipeline] Received batch of ${batch.messages.length} messages`,
    );

    // Separate messages by type (using mutable arrays)
    const zipMessages: Array<(typeof batch.messages)[number]> = [];
    const extractedMessages: Array<(typeof batch.messages)[number]> = [];

    for (const message of batch.messages) {
      const key = message.body.object.key;
      const type = getMessageType(key);

      switch (type) {
        case "zip":
          zipMessages.push(message);
          break;
        case "extracted":
          extractedMessages.push(message);
          break;
        default:
          console.log(`[Pipeline] Skipping unknown message type: ${key}`);
          message.ack();
      }
    }

    console.log(
      `[Pipeline] Routing: ${zipMessages.length} ZIPs, ${extractedMessages.length} extracted files`,
    );

    // Process ZIP files (unzip and extract to R2)
    if (zipMessages.length > 0) {
      await processZipFiles(zipMessages, env);
    }

    // Process extracted files (index to search bucket)
    if (extractedMessages.length > 0) {
      await processExtractedFiles(extractedMessages, env);
    }

    console.log(`[Pipeline] Batch processing complete`);
  },
};
