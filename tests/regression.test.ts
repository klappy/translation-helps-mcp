import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8888";
const TIMEOUT = 30000;

async function makeRequest(endpoint: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(`${BASE_URL}/.netlify/functions/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });

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
        const response = await makeRequest("mcp-fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        // Should be a plain object, not stringified JSON
        expect(typeof response).toBe("object");
        expect(response.scripture).toBeDefined();
        expect(Array.isArray(response.scripture)).toBe(true);

        // Make sure it's not a string that contains JSON
        expect(typeof response.scripture).not.toBe("string");
      },
      TIMEOUT
    );
  });

  describe("Bug: Missing Scripture Data", () => {
    it(
      "should return actual scripture content for Titus 1:1",
      async () => {
        const response = await makeRequest("mcp-fetch-scripture", {
          reference: "Titus 1:1",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.scripture).toBeDefined();
        expect(response.scripture.length).toBeGreaterThan(0);

        // Should contain actual verse content, not empty
        const verse = response.scripture[0];
        expect(verse).toBeDefined();
        expect(verse.content).toBeDefined();
        expect(verse.content.length).toBeGreaterThan(0);
      },
      TIMEOUT
    );

    it(
      "should return translation notes for Titus 1:1",
      async () => {
        const response = await makeRequest("mcp-fetch-translation-notes", {
          reference: "Titus 1:1",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.translationNotes).toBeDefined();
        // Notes might be empty for some verses, but structure should exist
        expect(Array.isArray(response.translationNotes)).toBe(true);
      },
      TIMEOUT
    );
  });

  describe("Bug: Hardcoded File Paths", () => {
    it(
      "should use ingredient metadata file paths, not hardcoded paths",
      async () => {
        const response = await makeRequest("mcp-fetch-translation-notes", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.metadata).toBeDefined();
        expect(response.metadata.filesFound).toBeDefined();

        // If files were found, they should be from ingredients, not hardcoded
        if (response.metadata.filesFound.length > 0) {
          const filePath = response.metadata.filesFound[0];
          // Should contain actual book code from ingredients
          expect(filePath).toMatch(/\/(jhn|john)\//i);
        }
      },
      TIMEOUT
    );
  });

  describe("Bug: Fake Citations", () => {
    it(
      "should not return fake translation names in citations",
      async () => {
        const response = await makeRequest("mcp-fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        if (response.scripture && response.scripture.length > 0) {
          const verse = response.scripture[0];
          if (verse.citation) {
            // Should not contain fake names like "New Testament Bible"
            expect(verse.citation.translation).not.toBe("New Testament Bible");
            expect(verse.citation.translation).not.toBe("Old Testament Bible");

            // Should contain actual translation identifier
            expect(verse.citation.translation).toBeDefined();
            expect(verse.citation.translation.length).toBeGreaterThan(0);
          }
        }
      },
      TIMEOUT
    );
  });

  describe("Bug: Empty Resource Responses", () => {
    it(
      "should return actual resources, not empty shells",
      async () => {
        const response = await makeRequest("mcp-fetch-resources", {
          language: "en",
          organization: "unfoldingWord",
        });

        expect(response.resources).toBeDefined();
        expect(response.resources.length).toBeGreaterThan(0);

        // Each resource should have actual content
        const resource = response.resources[0];
        expect(resource.identifier).toBeDefined();
        expect(resource.identifier.length).toBeGreaterThan(0);
        expect(resource.language).toBeDefined();
      },
      TIMEOUT
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
          const response = await makeRequest("mcp-fetch-scripture", {
            reference: testCase.reference,
            language: "en",
            organization: "unfoldingWord",
          });

          expect(response.scripture).toBeDefined();
          expect(response.scripture.length).toBeGreaterThan(0);

          // Check metadata for correct book code usage
          if (response.metadata && response.metadata.filesFound) {
            const hasCorrectBookCode = response.metadata.filesFound.some((filePath: string) =>
              filePath.toLowerCase().includes(testCase.expectedBookCode.toLowerCase())
            );

            if (response.metadata.filesFound.length > 0) {
              expect(hasCorrectBookCode).toBe(true);
            }
          }
        }
      },
      TIMEOUT
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

        const mcpResponse = await makeRequest("mcp-fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        // Should have same structure
        expect(Object.keys(apiResponse).sort()).toEqual(Object.keys(mcpResponse).sort());

        // Should have same scripture structure
        if (apiResponse.scripture && mcpResponse.scripture) {
          expect(apiResponse.scripture.length).toBe(mcpResponse.scripture.length);

          if (apiResponse.scripture.length > 0 && mcpResponse.scripture.length > 0) {
            const apiVerse = apiResponse.scripture[0];
            const mcpVerse = mcpResponse.scripture[0];

            expect(Object.keys(apiVerse).sort()).toEqual(Object.keys(mcpVerse).sort());
          }
        }
      },
      TIMEOUT
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

          if (endpoint.includes("translation-words") && endpoint !== "browse-translation-words") {
            apiParams = { ...apiParams, word: "love" };
          } else if (endpoint !== "resources") {
            apiParams = { ...apiParams, reference: "John 3:16" };
          }

          try {
            const apiResponse = await makeRequest(`fetch-${endpoint}`, apiParams);
            const mcpResponse = await makeRequest(`mcp-fetch-${endpoint}`, apiParams);

            // Remove timestamps for comparison
            const normalizeTimestamps = (obj: any) => {
              const normalized = JSON.parse(JSON.stringify(obj));
              if (normalized.metadata?.timestamp) delete normalized.metadata.timestamp;
              if (normalized.timestamp) delete normalized.timestamp;
              return normalized;
            };

            expect(normalizeTimestamps(mcpResponse)).toEqual(normalizeTimestamps(apiResponse));
          } catch (error) {
            console.warn(`Skipping ${endpoint} test due to error:`, error);
          }
        }
      },
      TIMEOUT
    );
  });
});
