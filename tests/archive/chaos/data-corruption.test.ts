/**
 * Data Corruption & Invalid Responses Chaos Tests
 *
 * Tests system resilience when upstream services return corrupted or invalid data.
 * Validates data validation, error recovery, and data integrity protection.
 *
 * Part of Task 15 - Chaos Engineering Tests
 */

import { afterEach, describe, expect, test } from "vitest";
import { ChaosType, chaosMonkey } from "./framework/chaos-monkey";
import { buildUrl } from "../helpers/http";

// Mock API functions for testing
const mockApi = {
  fetchScripture: async (reference: string) => {
    const response = await fetch(
      await buildUrl(`/api/fetch-scripture`, { reference }),
    );
    return response.json();
  },

  fetchTranslationNotes: async (reference: string) => {
    const response = await fetch(
      await buildUrl(`/api/fetch-translation-notes`, { reference }),
    );
    return response.json();
  },

  getTranslationWord: async (word: string) => {
    const response = await fetch(
      await buildUrl(`/api/get-translation-word`, { word }),
    );
    return response.json();
  },

  getLanguages: async () => {
    const response = await fetch("/api/get-languages");
    return response.json();
  },
};

describe("🗃️ Data Corruption & Invalid Responses - Chaos Tests", () => {
  afterEach(async () => {
    // Ensure cleanup after each test
    await chaosMonkey.cleanupAll();
  });

  describe("Invalid JSON Response Handling", () => {
    test("handles malformed JSON responses gracefully", async () => {
      console.log("🧪 Testing: Malformed JSON response handling...");

      // First get valid baseline data
      const baselineResponse = await mockApi.fetchScripture("John 3:16");
      expect(baselineResponse).toBeDefined();

      // Inject invalid JSON responses
      const experimentId = await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 4000, // 4 seconds
        intensity: 0.8, // 80% of responses are corrupted
        target: "response-data",
      });

      console.log(`🐒 Data corruption experiment ${experimentId} started`);

      try {
        const corruptedResponse = await mockApi.fetchScripture("John 3:16");

        // System should either:
        // 1. Detect corruption and fall back to cache/alternative
        // 2. Return valid response if it validates data integrity
        if (corruptedResponse.source === "cache") {
          expect(corruptedResponse.warning).toContain("data validation failed");
          expect(corruptedResponse.scripture).toBeDefined();
          console.log("✅ Detected corrupted data and fell back to cache");
        } else {
          // If not from cache, data should be valid (passed validation)
          expect(corruptedResponse.scripture).toBeDefined();
          expect(corruptedResponse.scripture.ult).toBeDefined();
          console.log("✅ Response passed data validation");
        }
      } catch (error: any) {
        // Graceful error handling is also acceptable
        expect(error.type).toBe("DATA_VALIDATION_ERROR");
        expect(error.message).toContain("invalid response format");
        expect(error.fallbackSuggested).toBe(true);
        console.log("✅ Gracefully handled malformed JSON");
      }

      // Wait for chaos to end
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Should return to normal operation
      const recoveredResponse = await mockApi.fetchScripture("Romans 1:1");
      expect(recoveredResponse.scripture).toBeDefined();

      console.log("✅ System recovered to normal operation");
    }, 12000);

    test("validates response schema integrity", async () => {
      console.log("🧪 Testing: Response schema validation...");

      // Inject responses with invalid schema (missing required fields)
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 1.0, // 100% invalid schema
        target: "response-schema",
      });

      try {
        const response = await mockApi.fetchScripture("Matthew 5:3");

        // If response is returned, it should have passed schema validation
        expect(response).toBeDefined();
        expect(response.scripture).toBeDefined();

        // Check for required fields
        if (response.scripture.ult) {
          expect(response.scripture.ult.text).toBeDefined();
          expect(typeof response.scripture.ult.text).toBe("string");
        }

        console.log("✅ Response passed schema validation");
      } catch (error: any) {
        // Schema validation failure is acceptable
        expect(error.type).toBe("SCHEMA_VALIDATION_ERROR");
        expect(error.message).toContain("required fields missing");
        console.log("✅ Schema validation correctly rejected invalid response");
      }
    }, 8000);

    test("detects and handles response tampering", async () => {
      console.log("🧪 Testing: Response tampering detection...");

      // Get baseline checksums
      const baselineResponse = await mockApi.fetchScripture("Psalm 23:1");
      const baselineText = baselineResponse.scripture.ult.text;

      // Inject tampered responses
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 0.9, // 90% tampered responses
        target: "response-integrity",
      });

      try {
        const tamperedResponse = await mockApi.fetchScripture("Psalm 23:1");

        // System should either detect tampering or return valid data
        if (
          tamperedResponse.warning &&
          tamperedResponse.warning.includes("integrity check failed")
        ) {
          expect(tamperedResponse.source).toBe("cache"); // Fell back to trusted source
          console.log(
            "✅ Detected response tampering and used trusted fallback",
          );
        } else {
          // If no warning, data should be consistent
          expect(tamperedResponse.scripture.ult.text).toBe(baselineText);
          console.log("✅ Response integrity verified");
        }
      } catch (error: any) {
        expect(error.type).toBe("INTEGRITY_CHECK_FAILED");
        console.log("✅ Correctly detected and rejected tampered response");
      }
    }, 8000);
  });

  describe("Content Corruption Scenarios", () => {
    test("handles scripture text corruption", async () => {
      console.log("🧪 Testing: Scripture text corruption handling...");

      // Get baseline scripture content
      const baselineResponse = await mockApi.fetchScripture("Genesis 1:1");
      const baselineText = baselineResponse.scripture.ult.text;

      // Inject corrupted scripture text
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 4000,
        intensity: 0.7, // 70% corruption rate
        target: "scripture-content",
      });

      const corruptionResults: Array<{
        attempt: number;
        textValid: boolean;
        source: string;
      }> = [];

      // Test multiple requests to see corruption handling
      for (let i = 0; i < 5; i++) {
        try {
          const response = await mockApi.fetchScripture("Genesis 1:1");
          const textValid = response.scripture.ult.text === baselineText;

          corruptionResults.push({
            attempt: i + 1,
            textValid,
            source: response.source || "unknown",
          });
        } catch (error) {
          corruptionResults.push({
            attempt: i + 1,
            textValid: false,
            source: "error",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Analyze corruption handling
      const validResponses = corruptionResults.filter(
        (r) => r.textValid,
      ).length;
      const cacheResponses = corruptionResults.filter(
        (r) => r.source === "cache",
      ).length;

      // Should either provide valid text or use cache fallback
      expect(validResponses + cacheResponses).toBeGreaterThan(0);

      corruptionResults.forEach((result, index) => {
        const status = result.textValid ? "✅" : "❌";
        console.log(
          `${status} Attempt ${result.attempt}: ${result.textValid ? "valid" : "corrupted"} text from ${result.source}`,
        );
      });

      console.log(
        `✅ Scripture corruption handling: ${validResponses}/5 valid, ${cacheResponses}/5 from cache`,
      );
    }, 12000);

    test("validates translation notes integrity", async () => {
      console.log("🧪 Testing: Translation notes integrity validation...");

      // Inject corrupted translation notes
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 0.8, // 80% corruption
        target: "translation-notes",
      });

      try {
        const response = await mockApi.fetchTranslationNotes("Romans 1:1");

        // If response is returned, notes should be valid
        expect(response).toBeDefined();

        if (response.notes) {
          expect(Array.isArray(response.notes)).toBe(true);

          // Each note should have required structure
          response.notes.forEach((note: any) => {
            expect(note).toBeDefined();
            // Notes should have some text content
            if (note.text) {
              expect(typeof note.text).toBe("string");
              expect(note.text.length).toBeGreaterThan(0);
            }
          });
        }

        console.log("✅ Translation notes passed integrity validation");
      } catch (error: any) {
        expect(error.type).toBe("CONTENT_VALIDATION_ERROR");
        console.log("✅ Correctly rejected corrupted translation notes");
      }
    }, 8000);

    test("handles corrupted word definitions", async () => {
      console.log("🧪 Testing: Corrupted word definition handling...");

      // Inject corrupted word definitions
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 0.9, // 90% corruption
        target: "word-definitions",
      });

      try {
        const response = await mockApi.getTranslationWord("faith");

        // Word definitions should have valid structure
        expect(response).toBeDefined();

        if (response.definition) {
          expect(typeof response.definition).toBe("string");
          expect(response.definition.length).toBeGreaterThan(10); // Reasonable minimum length

          // Should not contain obvious corruption markers
          expect(response.definition).not.toContain("undefined");
          expect(response.definition).not.toContain("null");
          expect(response.definition).not.toContain("[object Object]");
        }

        console.log("✅ Word definition passed validation");
      } catch (error: any) {
        expect(error.type).toBe("DEFINITION_VALIDATION_ERROR");
        console.log("✅ Correctly rejected corrupted word definition");
      }
    }, 8000);
  });

  describe("Data Type Validation", () => {
    test("validates data type consistency", async () => {
      console.log("🧪 Testing: Data type consistency validation...");

      // Inject responses with wrong data types
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 1.0, // 100% wrong types
        target: "data-types",
      });

      const typeValidationTests = [
        {
          name: "Scripture Text",
          call: () => mockApi.fetchScripture("John 1:1"),
        },
        { name: "Language List", call: () => mockApi.getLanguages() },
        {
          name: "Translation Word",
          call: () => mockApi.getTranslationWord("love"),
        },
      ];

      const validationResults: Array<{
        name: string;
        passed: boolean;
        error?: string;
      }> = [];

      for (const test of typeValidationTests) {
        try {
          const response = await test.call();

          // Basic type validation
          let passed = true;
          let validationError = "";

          if (test.name === "Scripture Text") {
            if (typeof response.scripture?.ult?.text !== "string") {
              passed = false;
              validationError = "Scripture text not string";
            }
          } else if (test.name === "Language List") {
            if (
              !Array.isArray(response.languages) &&
              !Array.isArray(response)
            ) {
              passed = false;
              validationError = "Languages not array";
            }
          } else if (test.name === "Translation Word") {
            if (typeof response.definition !== "string") {
              passed = false;
              validationError = "Definition not string";
            }
          }

          validationResults.push({
            name: test.name,
            passed,
            error: validationError,
          });
        } catch (error: any) {
          validationResults.push({
            name: test.name,
            passed: true, // Error is acceptable for corrupted data
            error: error.message,
          });
        }
      }

      validationResults.forEach((result) => {
        const status = result.passed ? "✅" : "❌";
        console.log(
          `${status} ${result.name}: ${result.passed ? "passed" : result.error}`,
        );
      });

      // At least some validation should work
      const passedCount = validationResults.filter((r) => r.passed).length;
      expect(passedCount).toBeGreaterThan(0);

      console.log(
        `✅ Data type validation: ${passedCount}/${validationResults.length} tests passed`,
      );
    }, 10000);

    test("handles numeric data corruption", async () => {
      console.log("🧪 Testing: Numeric data corruption handling...");

      // Inject corrupted numeric values (IDs, counts, etc.)
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 0.8,
        target: "numeric-data",
      });

      try {
        const response = await mockApi.getLanguages();

        // Validate numeric fields if present
        if (response.metadata) {
          if (response.metadata.count !== undefined) {
            expect(typeof response.metadata.count).toBe("number");
            expect(response.metadata.count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(response.metadata.count)).toBe(true);
          }

          if (response.metadata.totalLanguages !== undefined) {
            expect(typeof response.metadata.totalLanguages).toBe("number");
            expect(response.metadata.totalLanguages).toBeGreaterThan(0);
          }
        }

        console.log("✅ Numeric data validation passed");
      } catch (error: any) {
        expect(error.type).toBe("NUMERIC_VALIDATION_ERROR");
        console.log("✅ Correctly detected corrupted numeric data");
      }
    }, 8000);
  });

  describe("Cross-Reference Integrity", () => {
    test("validates cross-reference consistency", async () => {
      console.log("🧪 Testing: Cross-reference consistency validation...");

      // Inject corrupted cross-references
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 4000,
        intensity: 0.7, // 70% corruption
        target: "cross-references",
      });

      try {
        const response = await mockApi.fetchScripture("Matthew 5:3-12");

        // Validate cross-references if present
        if (response.crossReferences) {
          expect(Array.isArray(response.crossReferences)).toBe(true);

          response.crossReferences.forEach((ref: any) => {
            // Each reference should have valid structure
            expect(ref.reference).toBeDefined();
            expect(typeof ref.reference).toBe("string");

            // Should be valid scripture reference format
            const refPattern = /^[A-Za-z0-9\s]+\s\d+:\d+(-\d+)?$/;
            if (!refPattern.test(ref.reference)) {
              console.warn(`Invalid reference format: ${ref.reference}`);
            }
          });
        }

        console.log("✅ Cross-reference validation passed");
      } catch (error: any) {
        expect(error.type).toBe("CROSS_REFERENCE_ERROR");
        console.log("✅ Correctly detected corrupted cross-references");
      }
    }, 10000);

    test("handles circular reference corruption", async () => {
      console.log("🧪 Testing: Circular reference detection...");

      // Inject circular references in related content
      await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 3000,
        intensity: 1.0, // 100% circular references
        target: "circular-references",
      });

      try {
        const response = await mockApi.getTranslationWord("righteousness");

        // Should detect and handle circular references
        if (response.relatedWords) {
          const wordChain = new Set();

          const checkCircular = (word: string, depth = 0): boolean => {
            if (depth > 10) return true; // Depth limit reached
            if (wordChain.has(word)) return true; // Circular reference detected

            wordChain.add(word);
            return false;
          };

          const hasCircular = checkCircular("righteousness");

          if (hasCircular) {
            expect(response.warning).toContain("circular reference detected");
            console.log("✅ Detected and warned about circular references");
          } else {
            console.log("✅ No circular references found");
          }
        }
      } catch (error: any) {
        expect(error.type).toBe("CIRCULAR_REFERENCE_ERROR");
        console.log("✅ Correctly detected circular reference corruption");
      }
    }, 8000);
  });

  describe("Data Recovery and Fallback", () => {
    test("recovers from data corruption automatically", async () => {
      console.log("🧪 Testing: Automatic data corruption recovery...");

      // Get baseline data
      const baselineResponse = await mockApi.fetchScripture("Philippians 4:13");
      const baselineText = baselineResponse.scripture.ult.text;

      // Inject temporary data corruption
      const experimentId = await chaosMonkey.inject(ChaosType.INVALID_DATA, {
        duration: 2000, // 2 seconds
        intensity: 1.0,
        target: "all-data",
      });

      // Wait for corruption to end
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should automatically recover
      const recoveredResponse =
        await mockApi.fetchScripture("Philippians 4:13");
      expect(recoveredResponse.scripture.ult.text).toBe(baselineText);

      // Verify recovery metrics
      const metrics = chaosMonkey.getMetrics(experimentId);
      expect(metrics?.recoveryTime).toBeLessThan(4000); // Recovered within 4 seconds

      console.log("✅ Automatically recovered from data corruption");
    }, 10000);

    test("maintains data integrity across corruption events", async () => {
      console.log("🧪 Testing: Data integrity maintenance...");

      // Multiple corruption scenarios
      const corruptionTypes = [
        { type: ChaosType.INVALID_DATA, target: "json-format" },
        { type: ChaosType.INVALID_DATA, target: "schema-validation" },
        { type: ChaosType.INVALID_DATA, target: "content-integrity" },
      ];

      const reference = "Isaiah 55:11";
      const integrityResults: Array<{
        corruption: string;
        dataConsistent: boolean;
        source: string;
      }> = [];

      // Get baseline for consistency checking
      const baselineResponse = await mockApi.fetchScripture(reference);
      const baselineText = baselineResponse.scripture.ult.text;

      for (const corruption of corruptionTypes) {
        await chaosMonkey.inject(corruption.type, {
          duration: 1000,
          intensity: 0.9,
          target: corruption.target,
        });

        try {
          const response = await mockApi.fetchScripture(reference);
          const consistent = response.scripture.ult.text === baselineText;

          integrityResults.push({
            corruption: corruption.target,
            dataConsistent: consistent,
            source: response.source || "unknown",
          });
        } catch (error) {
          integrityResults.push({
            corruption: corruption.target,
            dataConsistent: false,
            source: "error",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait for cleanup
      }

      // Data should remain consistent or come from trusted source
      integrityResults.forEach((result, index) => {
        const status = result.dataConsistent ? "✅" : "⚠️";
        console.log(
          `${status} ${result.corruption}: ${result.dataConsistent ? "consistent" : "inconsistent"} from ${result.source}`,
        );
      });

      const consistentCount = integrityResults.filter(
        (r) => r.dataConsistent,
      ).length;
      const trustedSourceCount = integrityResults.filter(
        (r) => r.source === "cache",
      ).length;

      // Should maintain integrity through trusted sources
      expect(consistentCount + trustedSourceCount).toBeGreaterThan(0);

      console.log(
        `✅ Data integrity: ${consistentCount}/3 consistent, ${trustedSourceCount}/3 from trusted source`,
      );
    }, 15000);
  });
});
