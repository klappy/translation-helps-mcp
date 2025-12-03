/**
 * Global Test Setup
 *
 * Ensures Wrangler is running before ANY tests execute
 * This is the ONLY way to test KV/R2 functionality!
 */

export async function setup() {
  const WRANGLER_PORT = 8787;
  const healthUrl = `http://localhost:${WRANGLER_PORT}/api/health`;

  console.log("\n🔧 Checking Wrangler dev server...");
  console.log(`   URL: ${healthUrl}\n`);

  try {
    // Try to hit the dev server with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      signal: controller.signal,
    }).catch((err: Error) => {
      if (err.name === "AbortError") {
        throw new Error("Connection timed out after 5s");
      }
      throw new Error(`Connection failed: ${err.message}`);
    });

    clearTimeout(timeoutId);

    if (!response) {
      throw new Error("No response received");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check the actual health status
    const data = await response.json();
    if (data?.status !== "healthy") {
      throw new Error(
        `Server responded but status is "${data?.status || "undefined"}" (expected "healthy")`,
      );
    }

    console.log(
      `✅ Wrangler dev server is running on port ${WRANGLER_PORT} (status: ${data.status})\n`,
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`❌ Wrangler dev server check FAILED!\n`);
    console.error(`   Error: ${errorMsg}\n`);
    console.error(`   Diagnostic: curl -s ${healthUrl}\n`);
    console.error(`Troubleshooting:`);
    console.error(`   1. Is something else using port ${WRANGLER_PORT}?`);
    console.error(`      Run: lsof -i :${WRANGLER_PORT}`);
    console.error(`   2. Start the Wrangler dev server:`);
    console.error(
      `      cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port ${WRANGLER_PORT}`,
    );
    console.error(`   3. Make sure the build is up to date:`);
    console.error(`      npm run build\n`);
    console.error(`This is REQUIRED to test KV/R2 functionality!\n`);

    // Exit with error
    process.exit(1);
  }
}

export async function teardown() {
  // Nothing to tear down - leave Wrangler running
}
