/**
 * Contract Tests for v2 Endpoints
 *
 * These tests capture the exact behavior of our v2 endpoints.
 * They serve as a contract that must not be broken when we
 * connect real data sources.
 */

import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:8174/api/v2";

// Helper to make requests
async function fetchEndpoint(
  path: string,
  params: Record<string, string> = {},
) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  return {
    status: response.status,
    data: await response.json(),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

describe("Scripture Endpoints Contract", () => {
  describe("fetch-scripture", () => {
    it("returns multiple translations for a reference", async () => {
      const result = await fetchEndpoint("/fetch-scripture", {
        reference: "John 3:16",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("fetch-scripture-john-3-16");

      // Verify structure
      expect(result.data).toHaveProperty("scripture");
      expect(result.data).toHaveProperty("metadata");
      expect(result.data.scripture).toBeInstanceOf(Array);
      expect(result.data.scripture.length).toBeGreaterThan(0);

      // Verify each scripture item
      result.data.scripture.forEach((item: any) => {
        expect(item).toHaveProperty("text");
        expect(item).toHaveProperty("reference");
        expect(item).toHaveProperty("resource");
        expect(item).toHaveProperty("citation");
      });
    });

    it("filters by specific resource", async () => {
      const result = await fetchEndpoint("/fetch-scripture", {
        reference: "Genesis 1:1",
        resource: "ult",
      });

      expect(result.status).toBe(200);
      expect(result.data.scripture).toHaveLength(1);
      expect(result.data.scripture[0].resource).toBe("ult");
    });

    it("returns 404 for unknown reference", async () => {
      const result = await fetchEndpoint("/fetch-scripture", {
        reference: "Unknown 99:99",
      });

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty("error");
    });
  });

  describe("fetch-ult-scripture", () => {
    it("returns only ULT translation", async () => {
      const result = await fetchEndpoint("/fetch-ult-scripture", {
        reference: "Psalm 23:1",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("fetch-ult-psalm-23-1");
      expect(result.data.scripture).toHaveLength(1);
      expect(result.data.scripture[0].resource).toBe("ult");
      expect(result.data.scripture[0].version).toBe("ULT");
    });
  });

  describe("fetch-ust-scripture", () => {
    it("returns only UST translation", async () => {
      const result = await fetchEndpoint("/fetch-ust-scripture", {
        reference: "Romans 8:28",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("fetch-ust-romans-8-28");
      expect(result.data.scripture).toHaveLength(1);
      expect(result.data.scripture[0].resource).toBe("ust");
      expect(result.data.scripture[0].version).toBe("UST");
    });
  });
});

describe("Translation Helps Endpoints Contract", () => {
  describe("translation-notes", () => {
    it("returns notes for a reference", async () => {
      const result = await fetchEndpoint("/translation-notes", {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("translation-notes-john-3-16");
      expect(result.data).toHaveProperty("items");
      expect(result.data.items).toBeInstanceOf(Array);
    });
  });

  describe("translation-words", () => {
    it("returns word definitions for a reference", async () => {
      const result = await fetchEndpoint("/fetch-translation-words", {
        reference: "Genesis 1:1",
        language: "en",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("translation-words-genesis-1-1");
      expect(result.data).toHaveProperty("items");
      expect(result.data.items).toBeInstanceOf(Array);
    });
  });
});

describe("Discovery Endpoints Contract", () => {
  describe("simple-languages", () => {
    it("returns list of available languages", async () => {
      const result = await fetchEndpoint("/simple-languages");

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("languages-list");
      expect(result.data).toHaveProperty("items");
      expect(result.data.items).toBeInstanceOf(Array);
      expect(result.data.items.length).toBeGreaterThan(0);
    });
  });

  describe("get-available-books", () => {
    it("returns list of Bible books", async () => {
      const result = await fetchEndpoint("/get-available-books", {
        language: "en",
        organization: "unfoldingWord",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("available-books-en");
      expect(result.data).toHaveProperty("items");
      expect(result.data.items).toBeInstanceOf(Array);
    });
  });
});

describe("Complex Endpoints Contract", () => {
  describe("get-context", () => {
    it("aggregates all resources for a reference", async () => {
      const result = await fetchEndpoint("/get-context", {
        reference: "John 3:16",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("get-context-john-3-16");

      // Should have all resource types
      expect(result.data).toHaveProperty("scripture");
      expect(result.data).toHaveProperty("translationNotes");
      expect(result.data).toHaveProperty("translationWords");
      expect(result.data).toHaveProperty("translationQuestions");
      expect(result.data).toHaveProperty("translationAcademy");
      expect(result.data).toHaveProperty("crossReferences");
    });
  });

  describe("resource-recommendations", () => {
    it("provides intelligent recommendations", async () => {
      const result = await fetchEndpoint("/resource-recommendations", {
        reference: "John 3:16",
        userRole: "translator",
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot(
        "recommendations-john-3-16-translator",
      );
      expect(result.data).toHaveProperty("items");
      expect(result.data.items).toBeInstanceOf(Array);

      // Each recommendation should have required fields
      result.data.items.forEach((item: any) => {
        expect(item).toHaveProperty("resourceType");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("reason");
        expect(item).toHaveProperty("confidence");
        expect(item).toHaveProperty("rank");
      });
    });
  });
});

describe("Error Handling Contract", () => {
  it("returns consistent error format for missing parameters", async () => {
    const result = await fetchEndpoint("/fetch-scripture", {});

    expect(result.status).toBe(400);
    expect(result.data).toHaveProperty("error");
    expect(result.data).toMatchSnapshot("error-missing-reference");
  });

  it("returns consistent error format for invalid parameters", async () => {
    const result = await fetchEndpoint("/fetch-scripture", {
      reference: "Not a valid reference!",
    });

    expect(result.status).toBe(400);
    expect(result.data).toHaveProperty("error");
    expect(result.data).toMatchSnapshot("error-invalid-reference");
  });
});

describe("Response Consistency Contract", () => {
  it("all endpoints return consistent metadata structure", async () => {
    const endpoints = [
      { path: "/fetch-scripture", params: { reference: "John 3:16" } },
      { path: "/translation-notes", params: { reference: "John 3:16" } },
      { path: "/simple-languages", params: {} },
      { path: "/get-available-books", params: { language: "en" } },
    ];

    for (const endpoint of endpoints) {
      const result = await fetchEndpoint(endpoint.path, endpoint.params);

      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty("metadata");

      const metadata = result.data.metadata;
      expect(metadata).toHaveProperty("totalCount");

      // No diagnostic data in response body
      expect(metadata).not.toHaveProperty("xrayTrace");
      expect(metadata).not.toHaveProperty("_diagnostics");
      expect(metadata).not.toHaveProperty("_internal");
    }
  });
});
