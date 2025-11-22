/**
 * Search Integration Tests
 *
 * Tests for the ad-hoc search feature
 */

import { describe, it, expect } from "vitest";
import {
  SearchService,
  type SearchDocument,
} from "../src/services/SearchService.js";

describe("SearchService", () => {
  it("should index and search documents", async () => {
    const service = new SearchService();

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

    // Verify stats
    const stats = service.getStats();
    expect(stats.documentCount).toBe(3);
    expect(stats.termCount).toBeGreaterThan(0);

    // Search for "God"
    const results1 = await service.search("God");
    expect(results1.length).toBeGreaterThan(0);
    expect(results1[0].resource).toBe("en_ult");
    expect(results1[0].preview).toContain("God");

    // Search for "Jesus"
    const results2 = await service.search("Jesus");
    expect(results2.length).toBeGreaterThan(0);
    expect(results2[0].preview).toContain("Jesus");

    // Search for non-existent term
    const results3 = await service.search("nonexistent");
    expect(results3.length).toBe(0);
  });

  it("should handle fuzzy search", async () => {
    const service = new SearchService();

    const docs: SearchDocument[] = [
      {
        id: "1",
        content: "peace be with you",
        path: "test.usfm",
        resource: "test",
        type: "bible",
      },
    ];

    await service.indexDocuments(docs);

    // Fuzzy search with typo
    const results = await service.search("peac", { fuzzy: 0.2 });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should extract preview snippets correctly", async () => {
    const service = new SearchService();

    const content =
      "This is a long piece of text that contains the word Jesus multiple times. Jesus said many things. Jesus performed miracles.";
    const preview = service.extractPreview(content, "Jesus", 50);

    expect(preview).toContain("Jesus");
    expect(preview.length).toBeLessThanOrEqual(60); // Account for ellipsis
  });

  it("should handle empty documents gracefully", async () => {
    const service = new SearchService();

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

    const stats = service.getStats();
    expect(stats.documentCount).toBe(0); // Empty docs shouldn't be indexed
  });

  it("should support prefix search", async () => {
    const service = new SearchService();

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

    // Prefix search
    const results = await service.search("salv", { prefix: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].preview).toContain("salvation");
  });

  it("should limit results correctly", async () => {
    const service = new SearchService();

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

  it("should clear index", async () => {
    const service = new SearchService();

    const docs: SearchDocument[] = [
      {
        id: "1",
        content: "test content",
        path: "test.usfm",
        resource: "test",
        type: "bible",
      },
    ];

    await service.indexDocuments(docs);
    expect(service.getStats().documentCount).toBe(1);

    service.clear();
    expect(service.getStats().documentCount).toBe(0);
  });
});
