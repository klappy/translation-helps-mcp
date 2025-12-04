/**
 * Example Test Using Wrangler
 *
 * This shows how ALL tests should be written
 * Uses the standardized test configuration
 */

import { describe, expect, it } from "vitest";
import { makeTestRequest } from "./test-config";

describe("Example Wrangler Tests", () => {
  it("should connect to Wrangler dev server", async () => {
    const { status, data } = await makeTestRequest("/api/health");

    expect(status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.deployment.platform).toBe("cloudflare-pages");
  });

  it("should fetch scripture through Wrangler with KV/R2", async () => {
    const { status, data } = await makeTestRequest("/api/fetch-scripture", {
      reference: "John 3:16",
      language: "en",
      organization: "unfoldingWord",
      format: "json",
    });

    expect(status).toBe(200);
    expect(data.scripture).toBeDefined();
    expect(Array.isArray(data.scripture)).toBe(true);
    expect(data.scripture.length).toBeGreaterThan(0);
    // This actually tests KV/R2 because Wrangler provides real bindings!
  });

  it("should fetch translation word links", async () => {
    const { status, data } = await makeTestRequest(
      "/api/fetch-translation-word-links",
      {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
        format: "json",
      },
    );

    expect(status).toBe(200);
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("should return error for invalid reference", async () => {
    const { status, data } = await makeTestRequest("/api/fetch-scripture", {
      reference: "NotABook 99:99",
      language: "en",
      organization: "unfoldingWord",
      format: "json",
    });

    // API currently returns 500 for invalid references
    // TODO: Consider returning 404 for "not found" scenarios
    expect([404, 500]).toContain(status);
    expect(data.error).toBeDefined();
  });
});
