import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8888";
const TIMEOUT = 30000; // 30 seconds for API calls

// Test data sets
const TEST_CASES = {
  scripture: [
    { reference: "John 3:16", language: "en", organization: "unfoldingWord" },
    { reference: "Titus 1:1", language: "en", organization: "unfoldingWord" },
    { reference: "Genesis 1:1", language: "en", organization: "unfoldingWord" },
    { reference: "Revelation 22:21", language: "en", organization: "unfoldingWord" },
  ],
  translationNotes: [
    { reference: "John 3:16", language: "en", organization: "unfoldingWord" },
    { reference: "Titus 1:1", language: "en", organization: "unfoldingWord" },
    { reference: "Genesis 1:1", language: "en", organization: "unfoldingWord" },
  ],
  translationQuestions: [
    { reference: "John 3:16", language: "en", organization: "unfoldingWord" },
    { reference: "Titus 1:1", language: "en", organization: "unfoldingWord" },
    { reference: "Genesis 1:1", language: "en", organization: "unfoldingWord" },
  ],
  translationWordLinks: [
    { reference: "John 3:16", language: "en", organization: "unfoldingWord" },
    { reference: "Titus 1:1", language: "en", organization: "unfoldingWord" },
  ],
  translationWords: [
    { word: "love", language: "en", organization: "unfoldingWord" },
    { word: "grace", language: "en", organization: "unfoldingWord" },
    { word: "faith", language: "en", organization: "unfoldingWord" },
  ],
  resources: [
    { language: "en", organization: "unfoldingWord" },
    { language: "en", organization: "unfoldingWord", resourceType: "bible" },
  ],
  languages: [{ organization: "unfoldingWord" }],
  extractReferences: [
    { text: "See John 3:16 and Genesis 1:1 for more details" },
    { text: "Check out Matthew 5:3-12 and Romans 8:28" },
  ],
  browseTranslationWords: [
    { language: "en", organization: "unfoldingWord" },
    { language: "en", organization: "unfoldingWord", category: "kt" },
  ],
};

// Helper functions
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

function normalizeResponse(data: any) {
  // Remove timestamps and other dynamic fields for comparison
  const normalized = JSON.parse(JSON.stringify(data));

  if (normalized.metadata?.timestamp) {
    delete normalized.metadata.timestamp;
  }

  if (normalized.timestamp) {
    delete normalized.timestamp;
  }

  return normalized;
}

function validateResponseStructure(data: any, expectedFields: string[]) {
  expectedFields.forEach((field) => {
    expect(data).toHaveProperty(field);
  });
}

describe("API/MCP Endpoint Parity Tests", () => {
  describe("Scripture Endpoints", () => {
    TEST_CASES.scripture.forEach((testCase, index) => {
      it(
        `should return identical responses for scripture test case ${index + 1}: ${testCase.reference}`,
        async () => {
          const apiResponse = await makeRequest("fetch-scripture", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-scripture", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["scripture", "metadata"]);
          validateResponseStructure(mcpResponse, ["scripture", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate scripture is not empty
          expect(apiResponse.scripture).toBeDefined();
          expect(apiResponse.scripture.length).toBeGreaterThan(0);
          expect(mcpResponse.scripture).toBeDefined();
          expect(mcpResponse.scripture.length).toBeGreaterThan(0);
        },
        TIMEOUT
      );
    });
  });

  describe("Translation Notes Endpoints", () => {
    TEST_CASES.translationNotes.forEach((testCase, index) => {
      it(
        `should return identical responses for translation notes test case ${index + 1}: ${testCase.reference}`,
        async () => {
          const apiResponse = await makeRequest("fetch-translation-notes", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-translation-notes", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["translationNotes", "metadata"]);
          validateResponseStructure(mcpResponse, ["translationNotes", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate notes structure
          expect(apiResponse.translationNotes).toBeDefined();
          expect(mcpResponse.translationNotes).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  describe("Translation Questions Endpoints", () => {
    TEST_CASES.translationQuestions.forEach((testCase, index) => {
      it(
        `should return identical responses for translation questions test case ${index + 1}: ${testCase.reference}`,
        async () => {
          const apiResponse = await makeRequest("fetch-translation-questions", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-translation-questions", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["translationQuestions", "metadata"]);
          validateResponseStructure(mcpResponse, ["translationQuestions", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate questions structure
          expect(apiResponse.translationQuestions).toBeDefined();
          expect(mcpResponse.translationQuestions).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  describe("Translation Word Links Endpoints", () => {
    TEST_CASES.translationWordLinks.forEach((testCase, index) => {
      it(
        `should return identical responses for translation word links test case ${index + 1}: ${testCase.reference}`,
        async () => {
          const apiResponse = await makeRequest("fetch-translation-word-links", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-translation-word-links", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["translationWordLinks", "metadata"]);
          validateResponseStructure(mcpResponse, ["translationWordLinks", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate word links structure
          expect(apiResponse.translationWordLinks).toBeDefined();
          expect(mcpResponse.translationWordLinks).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  describe("Translation Words Endpoints", () => {
    TEST_CASES.translationWords.forEach((testCase, index) => {
      it(
        `should return identical responses for translation words test case ${index + 1}: ${testCase.word}`,
        async () => {
          const apiResponse = await makeRequest("fetch-translation-words", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-translation-words", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["translationWords", "metadata"]);
          validateResponseStructure(mcpResponse, ["translationWords", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate words structure
          expect(apiResponse.translationWords).toBeDefined();
          expect(mcpResponse.translationWords).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  describe("Resources Endpoints", () => {
    TEST_CASES.resources.forEach((testCase, index) => {
      it(
        `should return identical responses for resources test case ${index + 1}`,
        async () => {
          const apiResponse = await makeRequest("fetch-resources", testCase);
          const mcpResponse = await makeRequest("mcp-fetch-resources", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["resources", "metadata"]);
          validateResponseStructure(mcpResponse, ["resources", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate resources are not empty
          expect(apiResponse.resources).toBeDefined();
          expect(apiResponse.resources.length).toBeGreaterThan(0);
          expect(mcpResponse.resources).toBeDefined();
          expect(mcpResponse.resources.length).toBeGreaterThan(0);
        },
        TIMEOUT
      );
    });
  });

  describe("Languages Endpoints", () => {
    TEST_CASES.languages.forEach((testCase, index) => {
      it(
        `should return identical responses for languages test case ${index + 1}`,
        async () => {
          const apiResponse = await makeRequest("get-languages", testCase);
          const mcpResponse = await makeRequest("mcp-get-languages", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["languages", "metadata"]);
          validateResponseStructure(mcpResponse, ["languages", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate languages are not empty
          expect(apiResponse.languages).toBeDefined();
          expect(apiResponse.languages.length).toBeGreaterThan(0);
          expect(mcpResponse.languages).toBeDefined();
          expect(mcpResponse.languages.length).toBeGreaterThan(0);
        },
        TIMEOUT
      );
    });
  });

  describe("Extract References Endpoints", () => {
    TEST_CASES.extractReferences.forEach((testCase, index) => {
      it(
        `should return identical responses for extract references test case ${index + 1}`,
        async () => {
          const apiResponse = await makeRequest("extract-references", testCase);
          const mcpResponse = await makeRequest("mcp-extract-references", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["references", "metadata"]);
          validateResponseStructure(mcpResponse, ["references", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate references structure
          expect(apiResponse.references).toBeDefined();
          expect(mcpResponse.references).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  describe("Browse Translation Words Endpoints", () => {
    TEST_CASES.browseTranslationWords.forEach((testCase, index) => {
      it(
        `should return identical responses for browse translation words test case ${index + 1}`,
        async () => {
          const apiResponse = await makeRequest("browse-translation-words", testCase);
          const mcpResponse = await makeRequest("mcp-browse-translation-words", testCase);

          // Validate response structure
          validateResponseStructure(apiResponse, ["translationWords", "metadata"]);
          validateResponseStructure(mcpResponse, ["translationWords", "metadata"]);

          // Normalize and compare
          const normalizedApi = normalizeResponse(apiResponse);
          const normalizedMcp = normalizeResponse(mcpResponse);

          expect(normalizedMcp).toEqual(normalizedApi);

          // Validate browse results structure
          expect(apiResponse.translationWords).toBeDefined();
          expect(mcpResponse.translationWords).toBeDefined();
        },
        TIMEOUT
      );
    });
  });

  // Cross-endpoint validation tests
  describe("Cross-Endpoint Validation", () => {
    it(
      "should return consistent scripture data across different references",
      async () => {
        const john316 = await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        const genesis11 = await makeRequest("fetch-scripture", {
          reference: "Genesis 1:1",
          language: "en",
          organization: "unfoldingWord",
        });

        // Both should have scripture content
        expect(john316.scripture).toBeDefined();
        expect(john316.scripture.length).toBeGreaterThan(0);
        expect(genesis11.scripture).toBeDefined();
        expect(genesis11.scripture.length).toBeGreaterThan(0);

        // They should be different content
        expect(john316.scripture).not.toEqual(genesis11.scripture);
      },
      TIMEOUT
    );

    it(
      "should return consistent language data",
      async () => {
        const languages = await makeRequest("get-languages", { organization: "unfoldingWord" });

        expect(languages.languages).toBeDefined();
        expect(languages.languages.length).toBeGreaterThan(0);

        // Should contain English
        const english = languages.languages.find((lang: any) => lang.language_code === "en");
        expect(english).toBeDefined();
      },
      TIMEOUT
    );

    it(
      "should return valid references when extracting from text",
      async () => {
        const extracted = await makeRequest("extract-references", {
          text: "See John 3:16 and Genesis 1:1 for more details",
        });

        expect(extracted.references).toBeDefined();
        expect(extracted.references.length).toBeGreaterThan(0);

        // Should contain John 3:16
        const johnRef = extracted.references.find(
          (ref: any) => ref.book === "John" || ref.book === "JHN"
        );
        expect(johnRef).toBeDefined();
      },
      TIMEOUT
    );
  });

  // Performance tests
  describe("Performance Tests", () => {
    it(
      "should respond within reasonable time limits",
      async () => {
        const startTime = Date.now();

        await makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should respond within 10 seconds
        expect(duration).toBeLessThan(10000);
      },
      TIMEOUT
    );

    it(
      "should handle concurrent requests properly",
      async () => {
        const requests = [
          makeRequest("fetch-scripture", {
            reference: "John 3:16",
            language: "en",
            organization: "unfoldingWord",
          }),
          makeRequest("fetch-translation-notes", {
            reference: "John 3:16",
            language: "en",
            organization: "unfoldingWord",
          }),
          makeRequest("fetch-translation-questions", {
            reference: "John 3:16",
            language: "en",
            organization: "unfoldingWord",
          }),
        ];

        const results = await Promise.all(requests);

        results.forEach((result, index) => {
          expect(result).toBeDefined();
          expect(result.metadata).toBeDefined();
        });
      },
      TIMEOUT
    );
  });

  // Error handling tests
  describe("Error Handling", () => {
    it("should handle invalid references gracefully", async () => {
      try {
        await makeRequest("fetch-scripture", {
          reference: "InvalidBook 999:999",
          language: "en",
          organization: "unfoldingWord",
        });
      } catch (error: any) {
        expect(error.message).toContain("400");
      }
    });

    it("should handle missing parameters gracefully", async () => {
      try {
        await makeRequest("fetch-scripture", {});
      } catch (error: any) {
        expect(error.message).toContain("400");
      }
    });

    it("should handle invalid organization gracefully", async () => {
      const response = await makeRequest("fetch-scripture", {
        reference: "John 3:16",
        language: "en",
        organization: "InvalidOrg",
      });

      // Should return empty result or error, not crash
      expect(response).toBeDefined();
    });
  });
});
