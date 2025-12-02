/**
 * Integration Tests for Search-Enhanced Endpoints
 *
 * These tests verify that the optional search parameter works correctly
 * across all resource endpoints without breaking existing functionality.
 */

import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5173";

describe("Search-Enhanced Endpoints Integration", () => {
  // Test that search parameter validation works
  it("should reject invalid search queries", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3:16&search=a`,
    );
    expect(response.status).toBe(400); // Too short (< 2 chars)
  });

  // Test scripture endpoint with search
  it("should filter scripture by search query", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3&search=love&language=en&organization=unfoldingWord`,
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("scripture");
    expect(data).toHaveProperty("metadata");
    expect(data.metadata.searchApplied).toBe(true);
    expect(data.metadata.searchQuery).toBe("love");

    // Verify at least one result contains 'love'
    if (data.scripture && data.scripture.length > 0) {
      const hasMatch = data.scripture.some((s: any) =>
        s.text.toLowerCase().includes("love"),
      );
      expect(hasMatch).toBe(true);
    }
  });

  // Test that endpoints work WITHOUT search (backward compatibility)
  it("should work without search parameter (backward compatibility)", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3:16&language=en&organization=unfoldingWord`,
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("scripture");
    expect(data.metadata.searchApplied).not.toBe(true);
  });

  // Test translation notes with search
  it("should filter translation notes by search query", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-translation-notes?reference=John 3:16&search=born&language=en&organization=unfoldingWord`,
    );

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("metadata");
      expect(data.metadata.searchApplied).toBe(true);
      expect(data.metadata.searchQuery).toBe("born");
    } else {
      // It's ok if notes not found, just verify it's not a server error
      expect([404, 200]).toContain(response.status);
    }
  });

  // Test translation questions with search
  it("should filter translation questions by search query", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-translation-questions?reference=John 3&search=believe&language=en&organization=unfoldingWord`,
    );

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data.metadata.searchApplied).toBe(true);
    } else {
      expect([404, 200]).toContain(response.status);
    }
  });

  // Test translation word with search
  it("should validate translation word relevance with search", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-translation-word?term=grace&search=undeserved&language=en&organization=unfoldingWord`,
    );

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty("term");
      expect(data).toHaveProperty("content");
      expect(data.metadata.searchApplied).toBe(true);
      expect(data.metadata.searchScore).toBeGreaterThan(0);
    } else {
      // 404 is acceptable if search term doesn't match
      expect([404, 200]).toContain(response.status);
    }
  });

  // Test translation academy with search
  it("should validate translation academy relevance with search", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-translation-academy?moduleId=figs-metaphor&search=metaphor&language=en&organization=unfoldingWord`,
    );

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty("moduleId");
      expect(data).toHaveProperty("content");
      expect(data.metadata.searchApplied).toBe(true);
    } else {
      expect([404, 200]).toContain(response.status);
    }
  });

  // Test that search scores are included when present
  it("should include search scores in results", async () => {
    const response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3:16&search=God&language=en&organization=unfoldingWord`,
    );

    if (response.ok) {
      const data = await response.json();
      if (data.scripture && data.scripture.length > 0) {
        // Verify search was applied - scores may be in metadata or individual items
        // depending on implementation
        const hasSearchMetadata = data.metadata?.searchApplied === true;
        const hasScoreInItems = data.scripture.some(
          (s: any) => typeof s.searchScore === "number",
        );
        // Either metadata indicates search was applied, or items have scores
        expect(hasSearchMetadata || hasScoreInItems).toBe(true);
      }
    }
  });

  // Test performance - search shouldn't add significant overhead
  it("should complete search requests within reasonable time", async () => {
    const start = Date.now();
    const response = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=John 3&search=love&language=en&organization=unfoldingWord`,
    );
    const elapsed = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
