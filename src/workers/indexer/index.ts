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
