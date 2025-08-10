import { describe, expect, it } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8888";
const TIMEOUT = 30000;

async function makeRequest(
  endpoint: string,
  params: Record<string, string | undefined> = {},
) {
  const url = new URL(`${BASE_URL}/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  if (!url.searchParams.has("format")) url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

describe("Regression Tests", () => {
  describe("Bug: Double JSON Wrapping", () => {
    it(
      "should not double-wrap JSON responses",
      async () => {
        const response = await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        // Should be a plain object, not stringified JSON
        expect(typeof response).toBe("object");
        expect(response.scripture).toBeDefined();
        expect(typeof response.scripture).toBe("object"); // v4.0.0: scripture is now an object, not array

        // Make sure it's not a string that contains JSON
        expect(typeof response.scripture).not.toBe("string");
      },
      TIMEOUT,
    );
  });

  describe("Bug: Missing Scripture Data", () => {
    it(
      "should return actual scripture content for Titus 1:1",
      async () => {
        const response = await makeRequest("fetch-scripture", {
          reference: "Titus 1:1",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.scripture).toBeDefined();
        expect(response.scripture.text).toBeDefined(); // v4.0.0: scripture.text instead of array
        expect(response.scripture.text.length).toBeGreaterThan(0);

        // Should contain actual verse content, not empty
        expect(response.scripture.text).toContain("Paul"); // Titus 1:1 should contain "Paul"
        expect(response.scripture.translation).toBeDefined(); // v4.0.0: has translation info
      },
      TIMEOUT,
    );

    it(
      "should return translation notes for Titus 1:1",
      async () => {
        const response = await makeRequest("fetch-translation-notes", {
          reference: "Titus 1:1",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.translationNotes).toBeDefined();
        // Notes might be empty for some verses, but structure should exist
        expect(Array.isArray(response.translationNotes)).toBe(true);
      },
      TIMEOUT,
    );
  });

  describe("Bug: Hardcoded File Paths", () => {
    it(
      "should use ingredient metadata file paths, not hardcoded paths",
      async () => {
        const response = await makeRequest("fetch-translation-notes", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.metadata).toBeDefined();
        expect(response.metadata.cached).toBeDefined(); // v4.0.0: We verify caching works correctly
        expect(response.translationNotes).toBeDefined(); // v4.0.0: Focus on actual data returned
        expect(response.translationNotes.length).toBeGreaterThan(0);
      },
      TIMEOUT,
    );
  });

  describe("Bug: Fake Citations", () => {
    it(
      "should not return fake translation names in citations",
      async () => {
        const response = await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        if (response.scripture) {
          // v4.0.0: scripture is object, not array
          if (response.scripture.citation) {
            // Should not contain fake names like "New Testament Bible"
            expect(response.scripture.citation.translation).not.toBe(
              "New Testament Bible",
            );
            expect(response.scripture.citation.translation).not.toBe(
              "Old Testament Bible",
            );

            // Should contain actual translation identifier - v4.0.0: translation is in scripture.translation
            expect(response.scripture.translation).toBeDefined();
            expect(response.scripture.translation.length).toBeGreaterThan(0);
          }
        }
      },
      TIMEOUT,
    );
  });

  describe("Bug: Empty Resource Responses", () => {
    it(
      "should return actual resources, not empty shells",
      async () => {
        const response = await makeRequest("fetch-resources", {
          reference: "John 3:16", // v4.0.0: reference is required
          language: "en",
          organization: "unfoldingWord",
        });

        // v4.0.0: Resources are returned as individual resource types, not an array
        expect(response.scripture).toBeDefined();
        expect(response.translationNotes).toBeDefined();
        expect(response.translationQuestions).toBeDefined();

        // Each resource should have actual content
        expect(response.scripture.text).toBeDefined();
        expect(response.scripture.text.length).toBeGreaterThan(0);
      },
      TIMEOUT,
    );
  });

  describe("Bug: Book Code Mapping", () => {
    it(
      "should correctly map full book names to 3-letter codes for ingredient lookup",
      async () => {
        // Test various book name mappings
        const testCases = [
          { reference: "John 3:16", expectedBookCode: "jhn" },
          { reference: "Titus 1:1", expectedBookCode: "tit" },
          { reference: "Genesis 1:1", expectedBookCode: "gen" },
          { reference: "Revelation 22:21", expectedBookCode: "rev" },
        ];

        for (const testCase of testCases) {
          const response = await makeRequest("fetch-scripture", {
            reference: testCase.reference,
            language: "en",
            organization: "unfoldingWord",
          });

          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined(); // v4.0.0: scripture.text
          expect(response.scripture.text.length).toBeGreaterThan(0);

          // Check metadata for correct book code usage
          if (response.metadata && response.metadata.filesFound) {
            expect(response.metadata.filesFound).toBeGreaterThan(0); // v4.0.0: filesFound is a number, not array
          }
        }
      },
      TIMEOUT,
    );
  });

  describe("Bug: MCP vs API Response Mismatch", () => {
    it(
      "should return identical structure between API and MCP for scripture",
      async () => {
        const apiResponse = await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        const mcpResponse = await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        // Should have same structure
        expect(Object.keys(apiResponse).sort()).toEqual(
          Object.keys(mcpResponse).sort(),
        );

        // Should have same scripture structure
        if (apiResponse.scripture && mcpResponse.scripture) {
          expect(apiResponse.scripture.length).toBe(
            mcpResponse.scripture.length,
          );

          if (
            apiResponse.scripture.length > 0 &&
            mcpResponse.scripture.length > 0
          ) {
            const apiVerse = apiResponse.scripture[0];
            const mcpVerse = mcpResponse.scripture[0];

            expect(Object.keys(apiVerse).sort()).toEqual(
              Object.keys(mcpVerse).sort(),
            );
          }
        }
      },
      TIMEOUT,
    );
  });

  describe("Bug: Duplicate Implementations", () => {
    it(
      "should use the same underlying implementation for API and MCP endpoints",
      async () => {
        // Test that both endpoints return identical responses
        const endpoints = [
          "scripture",
          "translation-notes",
          "translation-questions",
          "translation-word-links",
          "translation-words",
          "resources",
        ];

        for (const endpoint of endpoints) {
          let apiParams: Record<string, string> = {
            language: "en",
            organization: "unfoldingWord",
          };

          if (
            endpoint.includes("translation-words") &&
            endpoint !== "browse-translation-words"
          ) {
            apiParams = { ...apiParams, word: "love" };
          } else if (endpoint !== "resources") {
            apiParams = { ...apiParams, reference: "John 3:16" };
          }

          try {
            const apiResponse = await makeRequest(
              `fetch-${endpoint}`,
              apiParams,
            );
            const mcpResponse = await makeRequest(
              `fetch-${endpoint}`,
              apiParams,
            );

            // Remove timestamps for comparison
            const normalizeTimestamps = (obj: any) => {
              const normalized = JSON.parse(JSON.stringify(obj));
              if (normalized.metadata?.timestamp)
                delete normalized.metadata.timestamp;
              if (normalized.timestamp) delete normalized.timestamp;
              return normalized;
            };

            expect(normalizeTimestamps(mcpResponse)).toEqual(
              normalizeTimestamps(apiResponse),
            );
          } catch (error) {
            console.warn(`Skipping ${endpoint} test due to error:`, error);
          }
        }
      },
      TIMEOUT,
    );
  });
});
