/**
 * Resource Detector Test Suite
 *
 * Tests the UW resource type detection system.
 * Created for Task 7 validation
 */

import { describe, expect, test } from "vitest";
import { ResourceType } from "../src/constants/terminology";
import type { ResourceContext } from "../src/functions/resource-detector";
import {
  detectResourceType,
  detectResourcesFromCatalog,
} from "../src/functions/resource-detector";

// Helper to create ResourceContext objects for testing
const createResourceContext = (
  identifier: string,
  subject: string,
  organization = "unfoldingWord",
  language = "en",
  description?: string,
): ResourceContext => ({
  identifier,
  subject,
  organization,
  language,
  name: identifier,
  title: description || `Test ${identifier}`,
  description: description || `Test resource for ${identifier}`,
});

// Helper to create catalog response objects (like what comes from DCS catalog API)
const createCatalogResource = (
  name: string,
  subject: string,
  organization = "unfoldingWord",
  language = "en",
  description?: string,
) => ({
  name,
  subject,
  organization,
  language,
  title: description || `Test ${name}`,
  description: description || `Test resource for ${name}`,
  owner: {
    login: organization,
  },
});

describe("Resource Type Detection", () => {
  test("detects ULT resources correctly", () => {
    const context = createResourceContext("en_ult", "Bible");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.ULT);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.reasoning.join(" ")).toMatch(/ult/i);
  });

  test("detects UST resources correctly", () => {
    const context = createResourceContext("en_ust", "Bible");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.UST);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.reasoning.join(" ")).toMatch(/ust/i);
  });

  test("detects Translation Notes correctly", () => {
    const context = createResourceContext("en_tn", "Translation Notes");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.TN);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reasoning.join(" ")).toMatch(/tn/i);
  });

  test("detects Translation Words correctly", () => {
    const context = createResourceContext("en_tw", "Translation Words");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.TW);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reasoning.join(" ")).toMatch(/tw/i);
  });

  test("detects Translation Questions correctly", () => {
    const context = createResourceContext("en_tq", "Translation Questions");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.TQ);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reasoning.join(" ")).toMatch(/tq/i);
  });

  test("returns low confidence for unrecognized resources", () => {
    const context = createResourceContext(
      "xyz123_impossible",
      "Quantum Physics Textbook",
    );
    const result = detectResourceType(context);

    // Algorithm may classify anything, but should have very low confidence for obviously wrong things
    if (result.type !== null) {
      expect(result.confidence).toBeLessThan(0.3);
    } else {
      expect(result.confidence).toBe(0);
    }
  });

  test("handles case insensitive matching", () => {
    const context = createResourceContext("EN_ULT", "BIBLE");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.ULT);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("prioritizes identifier over description matches", () => {
    const context = createResourceContext(
      "en_ult",
      "Bible",
      "unfoldingWord",
      "en",
      "Contains translation notes",
    );
    const result = detectResourceType(context);

    // Should detect as ULT based on identifier, not TN based on description
    expect(result.type).toBe(ResourceType.ULT);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("detects GLT resources correctly", () => {
    const context = createResourceContext("es_glt", "Bible");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.GLT);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("detects GST resources correctly", () => {
    const context = createResourceContext("es_gst", "Bible");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.GST);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("detects TWL resources correctly", () => {
    const context = createResourceContext("en_twl", "Translation Words Links");
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.TWL);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("provides confidence scores and reasoning", () => {
    const context = createResourceContext("en_ult", "Bible");
    const result = detectResourceType(context);

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasoning).toBeInstanceOf(Array);
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.alternatives).toBeInstanceOf(Array);
  });
});

describe("Catalog Resource Detection", () => {
  test("detects multiple resources from catalog data", () => {
    const catalogData = [
      createCatalogResource("en_ult", "Bible"),
      createCatalogResource("en_ust", "Bible"),
      createCatalogResource("en_tn", "Translation Notes"),
      createCatalogResource("xyz123_impossible", "Quantum Physics Textbook"),
    ];

    const results = detectResourcesFromCatalog(catalogData);

    expect(results).toHaveLength(4);
    expect(results[0].detection.type).toBe(ResourceType.ULT);
    expect(results[1].detection.type).toBe(ResourceType.UST);
    expect(results[2].detection.type).toBe(ResourceType.TN);

    // Fourth result should either be null or have very low confidence
    if (results[3].detection.type !== null) {
      expect(results[3].detection.confidence).toBeLessThan(0.3);
    } else {
      expect(results[3].detection.confidence).toBe(0);
    }
  });

  test("includes original resource data in results", () => {
    const catalogData = [createCatalogResource("en_ult", "Bible")];
    const results = detectResourcesFromCatalog(catalogData);

    expect(results[0].resource).toEqual(catalogData[0]);
    expect(results[0].detection.type).toBe(ResourceType.ULT);
  });
});

describe("Edge Cases", () => {
  test("handles missing fields gracefully", () => {
    const context: ResourceContext = {
      identifier: "",
      subject: "",
      organization: "",
      language: "",
    };

    const result = detectResourceType(context);
    expect(result.type).toBe(null);
    expect(result.confidence).toBe(0);
  });

  test("handles language variations", () => {
    const context = createResourceContext(
      "es_ult",
      "Bible",
      "unfoldingWord",
      "es",
    );
    const result = detectResourceType(context);

    expect(result.type).toBe(ResourceType.ULT);
    // Confidence might be reduced for non-English ULT
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test("detects original language texts", () => {
    const uhbContext = createResourceContext("uhb", "Hebrew Bible");
    const uhbResult = detectResourceType(uhbContext);

    expect(uhbResult.type).toBe(ResourceType.UHB);
    expect(uhbResult.confidence).toBeGreaterThan(0.8);

    const ugntContext = createResourceContext("ugnt", "Greek New Testament");
    const ugntResult = detectResourceType(ugntContext);

    expect(ugntResult.type).toBe(ResourceType.UGNT);
    expect(ugntResult.confidence).toBeGreaterThan(0.8);
  });
});
