/**
 * R2 Bucket Flush Script
 *
 * Deletes all objects from an R2 bucket. Useful for:
 * - Testing the search indexing pipeline from scratch
 * - Clearing cached ZIPs to trigger fresh downloads
 * - Debugging R2 event notifications
 *
 * USAGE:
 *   cd scripts
 *   npx wrangler dev --config flush-wrangler.toml --remote --port 8788
 *
 * Then in another terminal:
 *   curl http://localhost:8788/flush    # Delete all objects
 *   curl http://localhost:8788/count    # Count objects (without deleting)
 *   curl http://localhost:8788          # Show help
 *
 * Press 'x' in the wrangler terminal to stop when done.
 *
 * NOTE: Uses flush-wrangler.toml which binds to translation-helps-mcp-zip-persistence
 * Edit that file to target a different bucket.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/flush") {
      const bucket = env.ZIP_FILES;

      if (!bucket) {
        return new Response(
          "No R2 bucket bound. Run with: --r2 ZIP_FILES=translation-helps-mcp-zip-persistence",
          { status: 500 },
        );
      }

      let deleted = 0;
      let cursor = undefined;
      const BATCH_SIZE = 25; // Parallel delete batch size (conservative)

      console.log("Starting bucket flush with parallel deletes...");

      // List and delete in parallel batches
      do {
        const listed = await bucket.list({ cursor, limit: 500 });
        const keys = listed.objects.map((obj) => obj.key);

        // Delete in parallel batches of BATCH_SIZE
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((key) => bucket.delete(key)),
          );
          deleted += results.filter((r) => r.status === "fulfilled").length;
          console.log(`Deleted batch: ${deleted} total`);
        }

        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      console.log(`Flush complete! Deleted ${deleted} objects.`);

      return new Response(`✅ Flushed ${deleted} objects from bucket`, {
        status: 200,
      });
    }

    if (url.pathname === "/count") {
      const bucket = env.ZIP_FILES;

      if (!bucket) {
        return new Response("No R2 bucket bound", { status: 500 });
      }

      let count = 0;
      let cursor = undefined;

      do {
        const listed = await bucket.list({ cursor, limit: 1000 });
        count += listed.objects.length;
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      return new Response(`📊 Bucket contains ${count} objects`, {
        status: 200,
      });
    }

    if (url.pathname === "/list") {
      const bucket = env.ZIP_FILES;

      if (!bucket) {
        return new Response("No R2 bucket bound", { status: 500 });
      }

      const keys = [];
      let cursor = undefined;

      do {
        const listed = await bucket.list({ cursor, limit: 100 });
        for (const obj of listed.objects) {
          keys.push(`${obj.key} (${obj.size} bytes)`);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor && keys.length < 100);

      return new Response(keys.join("\n") || "(empty)", {
        status: 200,
      });
    }

    return new Response(
      `
R2 Bucket Flush Tool
====================

GET /flush - Delete ALL objects from the bound R2 bucket
GET /count - Count objects in the bucket (non-destructive)

Current bucket: ${env.ZIP_FILES ? "✅ bound" : "❌ NOT BOUND"}

Usage:
  curl http://localhost:8788/count   # Check how many objects
  curl http://localhost:8788/flush   # Delete everything
    `,
      { status: 200 },
    );
  },
};
