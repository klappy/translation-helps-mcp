/**
 * Search Integration Tests
 *
 * Tests for the search service (now using simple string matching)
 * Note: MiniSearch has been replaced with Cloudflare AI Search for production
 * This tests the simple fallback search used for in-memory filtering
 */

import { describe, it, expect } from "vitest";
import {
  createSearchService,
  applySearch,
  type SearchDocument,
} from "../src/services/SearchServiceFactory.js";

describe("SearchService (Simple String Matching)", () => {
  it("should index and search documents", async () => {
    const service = createSearchService("scripture");

    // Create test documents
    const docs: SearchDocument[] = [
      {
        id: "1",
        content: "In the beginning God created the heavens and the earth",
        path: "01-GEN.usfm",
        resource: "en_ult",
        type: "bible",
      },
      {
        id: "2",
        content: "Jesus said I am the way the truth and the life",
        path: "43-JHN.usfm",
        resource: "en_ult",
        type: "bible",
      },
      {
        id: "3",
        content: "For God so loved the world that he gave his only Son",
        path: "43-JHN.usfm",
        resource: "en_ult",
        type: "bible",
      },
    ];

    // Index documents
    await service.indexDocuments(docs);

    // Search for "God"
    const results1 = await service.search("God");
    expect(results1.length).toBeGreaterThan(0);

    // Search for "Jesus"
    const results2 = await service.search("Jesus");
    expect(results2.length).toBeGreaterThan(0);

    // Search for non-existent term
    const results3 = await service.search("nonexistent");
    expect(results3.length).toBe(0);
  });

  it("should handle prefix-like search (partial word matching)", async () => {
    const service = createSearchService("scripture");

    const docs: SearchDocument[] = [
      {
        id: "1",
        content: "salvation is a gift from God",
        path: "test.usfm",
        resource: "test",
        type: "bible",
      },
    ];

    await service.indexDocuments(docs);

    // Partial word search (simple string matching includes partial matches)
    const results = await service.search("salvat");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should handle empty documents gracefully", async () => {
    const service = createSearchService("scripture");

    const docs: SearchDocument[] = [
      {
        id: "1",
        content: "",
        path: "empty.usfm",
        resource: "test",
        type: "bible",
      },
      {
        id: "2",
        content: "   ",
        path: "whitespace.usfm",
        resource: "test",
        type: "bible",
      },
    ];

    // Should not throw
    await service.indexDocuments(docs);

    // Empty docs won't match anything
    const results = await service.search("test");
    expect(results.length).toBe(0);
  });

  it("should limit results correctly", async () => {
    const service = createSearchService("scripture");

    // Create many documents
    const docs: SearchDocument[] = [];
    for (let i = 0; i < 100; i++) {
      docs.push({
        id: String(i),
        content: `Document ${i} contains the word God`,
        path: `doc${i}.usfm`,
        resource: "test",
        type: "bible",
      });
    }

    await service.indexDocuments(docs);

    // Search with limit
    const results = await service.search("God", { maxResults: 10 });
    expect(results.length).toBeLessThanOrEqual(10);
  });
});

describe("applySearch (Filter Already-Fetched Data)", () => {
  it("should filter data based on search query", async () => {
    const data = [
      { id: "1", text: "God created the heavens", book: "Genesis" },
      { id: "2", text: "Jesus is the way", book: "John" },
      { id: "3", text: "Love your neighbor", book: "Matthew" },
    ];

    const results = await applySearch(
      data,
      "God",
      "scripture",
      (item, index) => ({
        id: item.id,
        content: item.text,
        path: `book-${index}.usfm`,
        resource: "test",
        type: "bible",
      }),
    );

    expect(results.length).toBe(1);
    expect(results[0].text).toContain("God");
    expect(results[0].searchScore).toBeDefined();
    expect(results[0].searchScore).toBeGreaterThan(0);
  });

  it("should return all data when no search query provided", async () => {
    const data = [
      { id: "1", text: "First item" },
      { id: "2", text: "Second item" },
    ];

    const results = await applySearch(
      data,
      "", // empty search
      "scripture",
      (item, index) => ({
        id: item.id,
        content: item.text,
        path: `item-${index}.txt`,
        resource: "test",
        type: "bible",
      }),
    );

    expect(results.length).toBe(2);
  });

  it("should return empty array when no matches found", async () => {
    const data = [
      { id: "1", text: "Apple" },
      { id: "2", text: "Banana" },
    ];

    const results = await applySearch(
      data,
      "nonexistent",
      "scripture",
      (item, index) => ({
        id: item.id,
        content: item.text,
        path: `fruit-${index}.txt`,
        resource: "test",
        type: "bible",
      }),
    );

    expect(results.length).toBe(0);
  });

  it("should sort results by relevance score", async () => {
    const data = [
      { id: "1", text: "God created everything" },
      { id: "2", text: "God is love, God is good, God is great" }, // More matches
      { id: "3", text: "God said" },
    ];

    const results = await applySearch(
      data,
      "God",
      "scripture",
      (item, index) => ({
        id: item.id,
        content: item.text,
        path: `doc-${index}.txt`,
        resource: "test",
        type: "bible",
      }),
    );

    expect(results.length).toBe(3);
    // Item with most matches should be first
    expect(results[0].id).toBe("2");
    expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore!);
  });
});
