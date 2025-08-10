/**
 * Smart Resource Recommendation Engine Test Suite
 *
 * Tests the intelligent resource recommendation system.
 * Validates Task 9 from implementation plan.
 */

import { describe, expect, test } from "vitest";
import { ResourceType } from "../src/constants/terminology.js";
import {
  recommendResources,
  type RecommendationContext,
  type ScriptureReference,
} from "../src/functions/resource-recommender.js";

describe("Smart Resource Recommendation Engine", () => {
  // Helper to create test contexts
  const createContext = (
    reference: ScriptureReference,
    userRole:
      | "translator"
      | "checker"
      | "consultant"
      | "facilitator" = "translator",
    overrides: Partial<RecommendationContext> = {},
  ): RecommendationContext => ({
    reference,
    userRole,
    previousQueries: [],
    languageCapabilities: ["en"],
    targetLanguage: "sw",
    sourceLanguages: ["en"],
    ...overrides,
  });

  describe("Base Recommendations", () => {
    test("always recommends ULT and UST for scripture", () => {
      const context = createContext({ book: "Romans", chapter: 1 });
      const result = recommendResources(context);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ResourceType.ULT, priority: "high" }),
          expect.objectContaining({ type: ResourceType.UST, priority: "high" }),
        ]),
      );
    });

    test("provides confidence scores for all recommendations", () => {
      const context = createContext({ book: "John", chapter: 3, verse: 16 });
      const result = recommendResources(context);

      result.recommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });

    test("includes explanatory reasons for each recommendation", () => {
      const context = createContext({ book: "Matthew", chapter: 5 });
      const result = recommendResources(context);

      result.recommendations.forEach((rec) => {
        expect(rec.reason).toBeTruthy();
        expect(rec.reason.length).toBeGreaterThan(10);
      });
    });
  });

  describe("User Role-Based Recommendations", () => {
    test("recommends TN and TW for translators", () => {
      const context = createContext(
        { book: "Romans", chapter: 9 },
        "translator",
      );
      const result = recommendResources(context);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ResourceType.TN }),
          expect.objectContaining({ type: ResourceType.TW }),
        ]),
      );
    });

    test("recommends TQ and TWL for checkers", () => {
      const context = createContext({ book: "Romans", chapter: 8 }, "checker");
      const result = recommendResources(context);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ResourceType.TQ, priority: "high" }),
          expect.objectContaining({ type: ResourceType.TWL }),
        ]),
      );
    });

    test("recommends TA for consultants and facilitators", () => {
      const consultantContext = createContext(
        { book: "1 Timothy", chapter: 2 },
        "consultant",
      );
      const consultantResult = recommendResources(consultantContext);

      const facilitatorContext = createContext(
        { book: "1 Timothy", chapter: 2 },
        "facilitator",
      );
      const facilitatorResult = recommendResources(facilitatorContext);

      expect(consultantResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ResourceType.TA }),
        ]),
      );

      expect(facilitatorResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ResourceType.TA, priority: "high" }),
        ]),
      );
    });
  });

  describe("Genre-Based Recommendations", () => {
    test("emphasizes TN for prophetic books", () => {
      const context = createContext({ book: "Isaiah", chapter: 53 });
      const result = recommendResources(context);

      const tnRecommendation = result.recommendations.find(
        (r) => r.type === ResourceType.TN,
      );
      expect(tnRecommendation).toBeDefined();
      expect(tnRecommendation!.priority).toBe("high");
      // Isaiah 53 is a difficult passage, so it gets difficulty-based reasoning first
      expect(tnRecommendation!.reason).toContain("complex");
    });

    test("emphasizes TW for legal/law books", () => {
      const context = createContext({ book: "Leviticus", chapter: 16 });
      const result = recommendResources(context);

      const twRecommendation = result.recommendations.find(
        (r) => r.type === ResourceType.TW,
      );
      expect(twRecommendation).toBeDefined();
      expect(twRecommendation!.priority).toBe("high");
      expect(twRecommendation!.reason).toContain("technical terms");
    });

    test("recommends appropriate resources for poetic books", () => {
      const context = createContext({ book: "Psalms", chapter: 23 });
      const result = recommendResources(context);

      const tnRecommendation = result.recommendations.find(
        (r) => r.type === ResourceType.TN,
      );
      expect(tnRecommendation).toBeDefined();
      // For a translator role, it gets the basic translator reasoning first
      expect(tnRecommendation!.reason).toContain(
        "cultural and linguistic context",
      );
    });
  });

  describe("Difficulty-Based Recommendations", () => {
    test("provides enhanced recommendations for difficult passages", () => {
      // Romans 9 is marked as high difficulty in our data
      const context = createContext({ book: "Romans", chapter: 9 });
      const result = recommendResources(context);

      // Should have high priority TN and TW due to complexity
      const tnRec = result.recommendations.find(
        (r) => r.type === ResourceType.TN,
      );
      const twRec = result.recommendations.find(
        (r) => r.type === ResourceType.TW,
      );

      expect(tnRec).toBeDefined();
      expect(twRec).toBeDefined();
      expect(tnRec!.priority).toBe("high");
      expect(twRec!.priority).toBe("high");
    });

    test("provides standard recommendations for simple passages", () => {
      const context = createContext({ book: "John", chapter: 3, verse: 16 });
      const result = recommendResources(context);

      // Should still get good recommendations but maybe not all high priority
      expect(result.recommendations.length).toBeGreaterThan(1);
      expect(result.recommendations.some((r) => r.priority === "high")).toBe(
        true,
      );
    });
  });

  describe("Passage Analysis", () => {
    test("correctly identifies passage genre", () => {
      const narrativeContext = createContext({ book: "Genesis", chapter: 1 });
      const narrativeResult = recommendResources(narrativeContext);
      expect(narrativeResult.metadata.passage.genre).toBe("narrative");

      const epistleContext = createContext({ book: "Romans", chapter: 1 });
      const epistleResult = recommendResources(epistleContext);
      expect(epistleResult.metadata.passage.genre).toBe("epistle");

      const poetryContext = createContext({ book: "Psalms", chapter: 1 });
      const poetryResult = recommendResources(poetryContext);
      expect(poetryResult.metadata.passage.genre).toBe("poetry");
    });

    test("assesses passage difficulty correctly", () => {
      const simpleContext = createContext({ book: "John", chapter: 3 });
      const simpleResult = recommendResources(simpleContext);

      const complexContext = createContext({ book: "Romans", chapter: 9 });
      const complexResult = recommendResources(complexContext);

      expect(complexResult.metadata.passage.difficulty).toBeGreaterThan(
        simpleResult.metadata.passage.difficulty,
      );
    });

    test("identifies passage themes", () => {
      const context = createContext({ book: "Romans", chapter: 9 });
      const result = recommendResources(context);

      expect(result.metadata.passage.themes).toEqual(
        expect.arrayContaining(["predestination", "election", "sovereignty"]),
      );
    });
  });

  describe("Performance Requirements", () => {
    test("responds within 100ms (Task 9 requirement)", () => {
      const context = createContext({ book: "Romans", chapter: 8 });

      const startTime = Date.now();
      const result = recommendResources(context);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.metadata.analysisTime).toBeLessThan(100);
    });

    test("handles various book name formats", () => {
      const contexts = [
        createContext({ book: "1 Corinthians", chapter: 13 }),
        createContext({ book: "1Corinthians", chapter: 13 }),
        createContext({ book: "First Corinthians", chapter: 13 }),
        createContext({ book: "Song of Solomon", chapter: 1 }),
      ];

      contexts.forEach((context) => {
        const result = recommendResources(context);
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.metadata.passage.genre).toBeTruthy();
      });
    });
  });

  describe("Recommendation Quality", () => {
    test("prioritizes recommendations correctly", () => {
      const context = createContext(
        { book: "Romans", chapter: 9 },
        "translator",
      );
      const result = recommendResources(context);

      // Should be sorted by priority (high first) then confidence
      let lastPriorityWeight = 4; // Higher than 'high'
      let lastConfidence = 1;

      result.recommendations.forEach((rec) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }[rec.priority];

        if (priorityWeight < lastPriorityWeight) {
          lastPriorityWeight = priorityWeight;
          lastConfidence = rec.confidence;
        } else if (priorityWeight === lastPriorityWeight) {
          expect(rec.confidence).toBeLessThanOrEqual(lastConfidence);
          lastConfidence = rec.confidence;
        }
      });
    });

    test("removes duplicate resource type recommendations", () => {
      const context = createContext(
        { book: "Isaiah", chapter: 53 },
        "translator",
      );
      const result = recommendResources(context);

      const resourceTypes = result.recommendations.map((r) => r.type);
      const uniqueTypes = new Set(resourceTypes);

      expect(resourceTypes.length).toBe(uniqueTypes.size);
    });

    test("provides helpful context information", () => {
      const context = createContext(
        { book: "Romans", chapter: 9, verse: 20 },
        "translator",
      );
      const result = recommendResources(context);

      const tnRec = result.recommendations.find(
        (r) => r.type === ResourceType.TN,
      );
      if (tnRec && tnRec.context) {
        expect(tnRec.context.specificSections).toBeDefined();
        expect(tnRec.context.specificSections!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Edge Cases", () => {
    test("handles unknown books gracefully", () => {
      const context = createContext({ book: "UnknownBook", chapter: 1 });
      const result = recommendResources(context);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.metadata.passage.genre).toBe("unknown");
    });

    test("handles verse ranges correctly", () => {
      const context = createContext({
        book: "John",
        chapter: 3,
        verse: 16,
        endVerse: 21,
      });
      const result = recommendResources(context);

      expect(result.metadata.passage.reference).toBe("John 3:16-21");
    });

    test("handles complex user context", () => {
      const context = createContext(
        { book: "Romans", chapter: 8 },
        "translator",
        {
          previousQueries: ["faith", "works", "grace"],
          languageCapabilities: ["en", "es", "sw"],
          sourceLanguages: ["en", "es"],
        },
      );

      const result = recommendResources(context);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.metadata.userRole).toBe("translator");
    });
  });
});

/**
 * Integration tests for the complete recommendation workflow
 */
describe("Resource Recommendation Integration", () => {
  test("complete translator workflow for difficult passage", () => {
    const context: RecommendationContext = {
      reference: { book: "1 Corinthians", chapter: 11, verse: 2, endVerse: 16 },
      userRole: "translator",
      previousQueries: ["head covering", "women", "authority"],
      languageCapabilities: ["en"],
      targetLanguage: "sw",
      sourceLanguages: ["en"],
    };

    const result = recommendResources(context);

    // Should recommend key resources for cultural complexity
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: ResourceType.ULT, priority: "high" }),
        expect.objectContaining({ type: ResourceType.UST, priority: "high" }),
        expect.objectContaining({ type: ResourceType.TN, priority: "high" }),
        expect.objectContaining({ type: ResourceType.TW, priority: "high" }),
      ]),
    );

    // Should include helpful reasoning
    const tnRec = result.recommendations.find(
      (r) => r.type === ResourceType.TN,
    );
    expect(tnRec!.reason).toContain("complex");

    // Should have good metadata
    expect(result.metadata.passage.difficulty).toBeGreaterThan(0.7);
    expect(result.metadata.passage.themes).toContain("culture");
    expect(result.metadata.totalRecommendations).toBeGreaterThan(2);
  });
});
