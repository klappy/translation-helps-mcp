import { describe, it, expect } from "vitest";
import { ResourceAggregator } from "../src/services/ResourceAggregator";
import { parseReference } from "../src/parsers/referenceParser";
import { fetchWordLinks } from "../src/functions/word-links-service";

describe("Translation Word Links Integration", () => {
  it("should return TWL data via ResourceAggregator", async () => {
    const aggregator = new ResourceAggregator("en", "unfoldingWord");
    const reference = parseReference("Titus 1");

    const result = await aggregator.aggregateResources(reference, {
      language: "en",
      organization: "unfoldingWord",
      resources: ["links"],
    });

    // Should have translation word links
    expect(result.translationWordLinks).toBeDefined();
    expect(Array.isArray(result.translationWordLinks)).toBe(true);
    expect(result.translationWordLinks.length).toBeGreaterThan(0);

    // Verify structure of first link
    const firstLink = result.translationWordLinks[0];
    expect(firstLink).toHaveProperty("Reference");
    expect(firstLink).toHaveProperty("ID");
    expect(firstLink).toHaveProperty("Tags");
    expect(firstLink).toHaveProperty("OrigWords");
    expect(firstLink).toHaveProperty("Occurrence");
    expect(firstLink).toHaveProperty("TWLink");
  });

  it("should return TWL data via word-links-service", async () => {
    const result = await fetchWordLinks({
      reference: "Titus 1",
      language: "en",
      organization: "unfoldingWord",
    });

    // Should have links
    expect(result.links).toBeDefined();
    expect(Array.isArray(result.links)).toBe(true);
    expect(result.links.length).toBeGreaterThan(0);

    // Verify structure
    const firstLink = result.links[0];
    expect(firstLink).toHaveProperty("Reference");
    // Note: word-links-service returns raw TSV format which has "TIT 1:1" format
    expect(firstLink.Reference).toMatch(/^TIT 1:/);
  });

  it("should filter TWL correctly for chapter reference", async () => {
    const aggregator = new ResourceAggregator("en", "unfoldingWord");
    const reference = parseReference("Titus 1");

    const result = await aggregator.aggregateResources(reference, {
      language: "en",
      organization: "unfoldingWord",
      resources: ["links"],
    });

    // All links should be from Titus chapter 1
    result.translationWordLinks.forEach((link: any) => {
      expect(link.Reference).toMatch(/^Titus 1:/);
    });
  });

  it("should handle verse-specific TWL requests", async () => {
    const aggregator = new ResourceAggregator("en", "unfoldingWord");
    const reference = parseReference("Titus 1:1");

    const result = await aggregator.aggregateResources(reference, {
      language: "en",
      organization: "unfoldingWord",
      resources: ["links"],
    });

    // Should have links for verse 1
    expect(result.translationWordLinks.length).toBeGreaterThan(0);

    // All links should be from Titus 1:1
    result.translationWordLinks.forEach((link: any) => {
      expect(link.Reference).toBe("Titus 1:1");
    });
  });
});
