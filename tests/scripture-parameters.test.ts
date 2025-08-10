import { describe, expect, it } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5175";
const TIMEOUT = 30000;

async function fetchScripture(params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/api/fetch-scripture`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      "X-Cache-Bypass": "true",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

describe("Scripture API Parameter Tests", () => {
  describe("Format Parameter", () => {
    it(
      "should return different content for format=text vs format=usfm",
      async () => {
        const reference = "John 3:16";

        const textResponse = await fetchScripture({
          reference,
          format: "text",
        });

        const usfmResponse = await fetchScripture({
          reference,
          format: "usfm",
        });

        expect(textResponse.scripture.text).toBeDefined();
        expect(usfmResponse.scripture.text).toBeDefined();

        // Text format should NOT contain USFM markers
        expect(textResponse.scripture.text).not.toContain("\\");
        expect(textResponse.scripture.text).not.toContain("\\v");
        expect(textResponse.scripture.text).not.toContain("\\c");

        // USFM format SHOULD contain USFM markers
        expect(usfmResponse.scripture.text).toContain("\\");

        // Content should be different
        expect(textResponse.scripture.text).not.toBe(
          usfmResponse.scripture.text,
        );

        // Metadata should reflect the format
        expect(textResponse.metadata.format).toBe("text");
        expect(usfmResponse.metadata.format).toBe("usfm");
      },
      TIMEOUT,
    );
  });

  describe("Include Verse Numbers Parameter", () => {
    it(
      "should return different content for includeVerseNumbers=true vs false",
      async () => {
        const reference = "John 3:16";

        const withNumbers = await fetchScripture({
          reference,
          includeVerseNumbers: "true",
        });

        const withoutNumbers = await fetchScripture({
          reference,
          includeVerseNumbers: "false",
        });

        expect(withNumbers.scripture.text).toBeDefined();
        expect(withoutNumbers.scripture.text).toBeDefined();

        // With numbers should start with verse number
        expect(withNumbers.scripture.text).toMatch(/^16\s/);

        // Without numbers should NOT start with verse number
        expect(withoutNumbers.scripture.text).not.toMatch(/^16\s/);

        // Content should be different
        expect(withNumbers.scripture.text).not.toBe(
          withoutNumbers.scripture.text,
        );

        // Metadata should reflect the setting
        expect(withNumbers.metadata.includeVerseNumbers).toBe(true);
        expect(withoutNumbers.metadata.includeVerseNumbers).toBe(false);
      },
      TIMEOUT,
    );

    it(
      "should handle verse ranges with and without numbers",
      async () => {
        const reference = "John 3:16-17";

        const withNumbers = await fetchScripture({
          reference,
          includeVerseNumbers: "true",
        });

        const withoutNumbers = await fetchScripture({
          reference,
          includeVerseNumbers: "false",
        });

        // With numbers should contain both verse numbers
        expect(withNumbers.scripture.text).toContain("16 ");
        expect(withNumbers.scripture.text).toContain("17 ");

        // Without numbers should not start with numbers
        expect(withoutNumbers.scripture.text).not.toMatch(/^16\s/);
        expect(withoutNumbers.scripture.text).not.toMatch(/\s17\s/);
      },
      TIMEOUT,
    );
  });

  describe("Multiple Translations Parameter", () => {
    it(
      "should return single translation by default",
      async () => {
        const response = await fetchScripture({
          reference: "John 3:16",
        });

        expect(response.scripture).toBeDefined();
        expect(response.scriptures).toBeUndefined();
        expect(response.metadata.translationsFound).toBe(1);
      },
      TIMEOUT,
    );

    it(
      "should return multiple translations when requested",
      async () => {
        const response = await fetchScripture({
          reference: "John 3:16",
          includeMultipleTranslations: "true",
        });

        expect(response.scriptures).toBeDefined();
        expect(Array.isArray(response.scriptures)).toBe(true);
        expect(response.scriptures.length).toBeGreaterThan(0);
        expect(response.metadata.translationsFound).toBeGreaterThan(0);

        // Each translation should have required fields
        response.scriptures.forEach((scripture: any) => {
          expect(scripture.text).toBeDefined();
          expect(scripture.translation).toBeDefined();
          expect(scripture.citation).toBeDefined();
          expect(scripture.citation.resource).toBeDefined();
        });
      },
      TIMEOUT,
    );
  });

  describe("Parameter Combinations", () => {
    it(
      "should handle format=usfm with includeVerseNumbers=false",
      async () => {
        const response = await fetchScripture({
          reference: "John 3:16",
          format: "usfm",
          includeVerseNumbers: "false",
        });

        expect(response.scripture.text).toBeDefined();
        expect(response.scripture.text).toContain("\\");
        expect(response.metadata.format).toBe("usfm");
        expect(response.metadata.includeVerseNumbers).toBe(false);
      },
      TIMEOUT,
    );

    it(
      "should handle multiple translations with verse numbers",
      async () => {
        const response = await fetchScripture({
          reference: "John 3:16",
          includeMultipleTranslations: "true",
          includeVerseNumbers: "true",
        });

        expect(response.scriptures).toBeDefined();
        expect(Array.isArray(response.scriptures)).toBe(true);
        expect(response.metadata.includeVerseNumbers).toBe(true);

        // All translations should include verse numbers
        response.scriptures.forEach((scripture: any) => {
          expect(scripture.text).toMatch(/^16\s/);
        });
      },
      TIMEOUT,
    );
  });

  describe("Cache Key Differentiation", () => {
    it(
      "should use different cache keys for different parameter combinations",
      async () => {
        const baseParams = { reference: "John 3:16" };

        const responses = await Promise.all([
          fetchScripture({
            ...baseParams,
            format: "text",
            includeVerseNumbers: "false",
          }),
          fetchScripture({ ...baseParams, format: "usfm" }),
          fetchScripture({ ...baseParams, includeVerseNumbers: "true" }),
          fetchScripture({
            ...baseParams,
            includeVerseNumbers: "true",
            format: "usfm",
          }), // Different combo
          fetchScripture({
            ...baseParams,
            includeMultipleTranslations: "true",
          }),
        ]);

        // All responses should have different cache keys
        const cacheKeys = responses.map((r) => r.metadata.cacheKey);
        console.log("Cache keys:", cacheKeys);
        const uniqueCacheKeys = new Set(cacheKeys);

        expect(uniqueCacheKeys.size).toBe(cacheKeys.length);
      },
      TIMEOUT,
    );
  });

  describe("Error Handling", () => {
    it(
      "should handle invalid format parameter gracefully",
      async () => {
        const response = await fetchScripture({
          reference: "John 3:16",
          format: "invalid",
        });

        // Should default to text format
        expect(response.metadata.format).toBe("text");
        expect(response.scripture.text).not.toContain("\\");
      },
      TIMEOUT,
    );
  });
});
