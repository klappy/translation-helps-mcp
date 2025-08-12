/**
 * Language Coverage Matrix API Test Suite
 *
 * Tests the language coverage endpoint implementation.
 * Validates Task 8 from implementation plan.
 */

import { describe, expect, test } from "vitest";
import { languageCoverageHandler } from "../src/functions/handlers/language-coverage.js";
import type { PlatformRequest } from "../src/functions/platform-adapter.js";

// Helper to create test platform requests
const createRequest = (
  queryParams: Record<string, string> = {},
): PlatformRequest => ({
  method: "GET",
  url: `https://api.example.com/language-coverage?${new URLSearchParams(queryParams).toString()}`,
  headers: { "Content-Type": "application/json" },
  body: null,
  queryStringParameters: queryParams,
});

describe("Language Coverage Matrix API", () => {
  test("endpoint returns valid response structure", async () => {
    const request = createRequest();
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.["Content-Type"]).toBe("application/json");

    const data = JSON.parse(response.body);
    expect(data).toHaveProperty("languages");
    expect(data).toHaveProperty("metadata");
    expect(data.metadata).toHaveProperty("totalLanguages");
    expect(data.metadata).toHaveProperty("completeLanguages");
    expect(data.metadata).toHaveProperty("recommendedLanguages");
    expect(data.metadata).toHaveProperty("lastUpdated");
  });

  test("supports language filtering", async () => {
    const request = createRequest({ language: "en" });
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);

    // When filtering by language, should only return that language
    if (data.languages.en) {
      expect(Object.keys(data.languages)).toHaveLength(1);
      expect(data.metadata.totalLanguages).toBe(1);
    }
  });

  test("language entries have correct structure", async () => {
    const request = createRequest();
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);

    // Check structure of first language entry (if any exist)
    const languages = Object.values(data.languages);
    if (languages.length > 0) {
      const firstLang = languages[0] as any;
      expect(firstLang).toHaveProperty("name");
      expect(firstLang).toHaveProperty("coverage");
      expect(firstLang).toHaveProperty("completeness");
      expect(firstLang).toHaveProperty("recommended");
      expect(firstLang).toHaveProperty("resourceCount");

      expect(typeof firstLang.completeness).toBe("number");
      expect(firstLang.completeness).toBeGreaterThanOrEqual(0);
      expect(firstLang.completeness).toBeLessThanOrEqual(100);
      expect(typeof firstLang.recommended).toBe("boolean");
    }
  });

  test("handles details parameter", async () => {
    const request = createRequest({ details: "true" });
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    // Should not throw errors when details=true is specified
  });

  test("handles empty results gracefully", async () => {
    // Test with non-existent language
    const request = createRequest({ language: "xyz999" });
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data.metadata.totalLanguages).toBe(0);
    expect(Object.keys(data.languages)).toHaveLength(0);
  });

  test("sets appropriate cache headers", async () => {
    const request = createRequest();
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.["Cache-Control"]).toContain("max-age=3600");
  });

  test("API follows UW terminology standards", async () => {
    const request = createRequest();
    const response = await languageCoverageHandler(request);

    expect(response.statusCode).toBe(200);
    const responseText = response.body;

    // Should not contain deprecated terminology
    expect(responseText).not.toContain("Gateway Language");
    expect(responseText).not.toContain("isGatewayLanguage");

    // Should use Strategic Language terminology if present
    if (responseText.includes("Strategic")) {
      expect(responseText).toContain("Strategic Language");
    }
  });
});

/**
 * Integration test for the complete workflow
 */
describe("Language Coverage Integration", () => {
  test("complete workflow: fetch, analyze, format", async () => {
    const request: PlatformRequest = {
      method: "GET",
      url: "https://api.example.com/language-coverage",
      headers: { "Content-Type": "application/json" },
      body: null,
      queryStringParameters: {},
    };

    const response = await languageCoverageHandler(request);

    // Should successfully process even if no resources found
    expect(response.statusCode).toBe(200);

    const data = JSON.parse(response.body);

    // Should have valid metadata even with empty results
    expect(typeof data.metadata.totalLanguages).toBe("number");
    expect(typeof data.metadata.completeLanguages).toBe("number");
    expect(typeof data.metadata.recommendedLanguages).toBe("number");
    expect(data.metadata.lastUpdated).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );

    // Metadata should be consistent
    expect(data.metadata.completeLanguages).toBeLessThanOrEqual(
      data.metadata.totalLanguages,
    );
    expect(data.metadata.recommendedLanguages).toBeLessThanOrEqual(
      data.metadata.totalLanguages,
    );
  });
});

/**
 * Performance test for Task 8 requirements
 */
describe("Language Coverage Performance", () => {
  test("responds within acceptable time limits", async () => {
    const startTime = Date.now();

    const request = createRequest();
    const response = await languageCoverageHandler(request);

    const duration = Date.now() - startTime;

    expect(response.statusCode).toBe(200);

    // Task 8 requirement: Response time < 2s
    expect(duration).toBeLessThan(2000);

    console.log(`Language coverage API responded in ${duration}ms`);
  });
});
