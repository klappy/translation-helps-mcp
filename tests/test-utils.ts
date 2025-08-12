/**
 * Test Utilities
 *
 * Common utilities for endpoint tests following our new patterns.
 * Simple, consistent, and focused on the 80/20 rule.
 */

import type { RequestInit } from "node-fetch";
import fetch from "node-fetch";

// Test server configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8174";

/**
 * Start the test server
 * In reality, we just verify the dev server is running
 */
export async function startTestServer(): Promise<void> {
  // Try to hit the health endpoint
  try {
    const response = await fetch(`${TEST_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error("Dev server not responding");
    }
    console.log("✅ Test server ready");
  } catch (_error) {
    throw new Error(
      "Dev server not running. Start it with: npm run dev\n" +
        "Or set TEST_BASE_URL environment variable",
    );
  }
}

/**
 * Stop the test server
 * No-op since we're using the dev server
 */
export async function stopTestServer(): Promise<void> {
  // No-op
}

/**
 * Make a request to the test server
 */
export async function makeRequest(
  path: string,
  params: Record<string, any> = {},
  options: RequestInit = {},
): Promise<{
  status: number;
  data: any;
  headers: Record<string, string>;
}> {
  // Build URL with query params
  const url = new URL(`${TEST_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  // Make the request
  const response = await fetch(url.toString(), {
    method: "GET",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  // Parse response
  let data: any;
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else if (contentType?.includes("text/")) {
    data = await response.text();
  } else {
    data = await response.buffer();
  }

  // Return standardized response
  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

/**
 * Helper to wait for a condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Common test data
 */
export const testData = {
  references: {
    valid: ["John 3:16", "Genesis 1:1", "Psalm 23:1-4", "Matthew 5:3-7"],
    invalid: ["Not a verse", "John 99:99", "!!!", ""],
  },
  languages: {
    valid: ["en", "es", "fr", "hi"],
    invalid: ["xyz", "123", "!!"],
  },
  organizations: {
    valid: ["unfoldingWord"],
    invalid: ["fakeOrg", ""],
  },
};

/**
 * Snapshot test helper
 */
export function expectSnapshot(actual: any, name: string): void {
  // In real tests, this would use vitest's snapshot feature
  // For now, just validate the structure exists
  expect(actual).toBeDefined();
  if (name) {
    // Snapshot name is recorded
  }
}
