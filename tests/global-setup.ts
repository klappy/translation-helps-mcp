/**
 * Global Test Setup
 *
 * Ensures Wrangler is running before ANY tests execute
 * This is the ONLY way to test KV/R2 functionality!
 */

export async function setup() {
  console.log("\n🔧 Checking Wrangler dev server...\n");

  const WRANGLER_PORT = 8787;
  const url = `http://localhost:${WRANGLER_PORT}`;

  try {
    // Try to hit the dev server
    const response = await fetch(`${url}/api/health`).catch(() => null);

    if (!response) {
      throw new Error("Cannot connect to Wrangler");
    }

    console.log(`✅ Wrangler dev server is running on port ${WRANGLER_PORT}\n`);
  } catch (_error) {
    console.error(`❌ Wrangler dev server is NOT running!\n`);
    console.error(`Please start it with:`);
    console.error(
      `cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port ${WRANGLER_PORT}\n`,
    );
    console.error(`This is REQUIRED to test KV/R2 functionality!\n`);

    // Exit with error
    process.exit(1);
  }
}

export async function teardown() {
  // Nothing to tear down - leave Wrangler running
}
