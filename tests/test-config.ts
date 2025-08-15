/**
 * Test Configuration
 *
 * KISS: One port, one method - Wrangler only!
 * This is the ONLY way to test KV/R2 before production
 */

export const TEST_CONFIG = {
  // ALWAYS use Wrangler dev server on port 8787
  BASE_URL: process.env.TEST_BASE_URL || "http://localhost:8787",

  // Force Wrangler usage
  REQUIRE_WRANGLER: true,

  // Timeout for API calls
  TIMEOUT: 30000,

  // Test against real Cloudflare bindings
  USE_REAL_BINDINGS: true,
};

/**
 * Get the test base URL
 * Throws if Wrangler isn't running on the expected port
 */
export async function getTestBaseUrl(): Promise<string> {
  const url = TEST_CONFIG.BASE_URL;

  // Check if Wrangler is running
  try {
    const response = await fetch(`${url}/api/health`);
    if (!response.ok && response.status !== 404) {
      throw new Error("Wrangler dev server not responding correctly");
    }
    return url;
  } catch (_error) {
    throw new Error(
      `Wrangler dev server not running on ${url}!\n` +
        `Start it with: cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787\n` +
        `\n` +
        `This is the ONLY way to test KV/R2 functionality!`,
    );
  }
}

/**
 * Make a test request
 */
export async function makeTestRequest(
  path: string,
  params: Record<string, string> = {},
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  const baseUrl = await getTestBaseUrl();
  const url = new URL(`${baseUrl}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "X-Test-Request": "true",
      "User-Agent": "Test Suite",
    },
  });

  const contentType = response.headers.get("content-type");
  let data;

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}
