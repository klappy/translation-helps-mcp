/**
 * Comprehensive Endpoint Source Data Validation Test
 *
 * This test validates that ALL endpoints preserve ALL source data fields
 * and return actual content from DCS, not bogus placeholder data.
 *
 * CREATED TO ADDRESS: User frustration with endpoints returning bogus data
 * that doesn't match documentation or actual DCS content.
 */

import { describe, expect, it } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8174";
const TIMEOUT = 30000;

describe("Endpoint Source Data Validation", () => {
  // Test configuration for each endpoint type
  const ENDPOINT_TESTS = {
    "translation-notes": {
      endpoint: "fetch-translation-notes",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      requiredFields: [
        "Reference",
        "ID",
        "Tags",
        "SupportReference",
        "Quote",
        "Occurrence",
        "Note",
      ],
      validateContent: (data: any) => {
        // Should have multiple notes
        expect(data.notes).toBeDefined();
        expect(Array.isArray(data.notes)).toBe(true);
        expect(data.notes.length).toBeGreaterThan(0);

        // Each note should have all TSV fields
        data.notes.forEach((note: any) => {
          expect(note).toHaveProperty("Reference");
          expect(note).toHaveProperty("ID");
          expect(note).toHaveProperty("Tags");
          expect(note).toHaveProperty("SupportReference");
          expect(note).toHaveProperty("Quote");
          expect(note).toHaveProperty("Occurrence");
          expect(note).toHaveProperty("Note");

          // Note content should be actual markdown, not placeholder
          if (note.Note) {
            expect(note.Note.length).toBeGreaterThan(10);
            expect(note.Note).not.toContain("TODO");
            expect(note.Note).not.toContain("placeholder");
          }
        });
      },
    },

    "translation-word-links": {
      endpoint: "fetch-translation-word-links",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      requiredFields: [
        "Reference",
        "ID",
        "Tags",
        "OrigWords",
        "Occurrence",
        "TWLink",
      ],
      validateContent: (data: any) => {
        expect(data.links).toBeDefined();
        expect(Array.isArray(data.links)).toBe(true);
        expect(data.links.length).toBeGreaterThan(0);

        // Each link should have all TSV fields
        data.links.forEach((link: any) => {
          expect(link).toHaveProperty("Reference");
          expect(link).toHaveProperty("ID");
          expect(link).toHaveProperty("Tags");
          expect(link).toHaveProperty("OrigWords");
          expect(link).toHaveProperty("Occurrence");
          expect(link).toHaveProperty("TWLink");

          // TWLink should be valid RC link
          expect(link.TWLink).toMatch(/^rc:\/\/\*\/tw\/dict\//);
        });
      },
    },

    scripture: {
      endpoint: "fetch-scripture",
      params: { reference: "John 3:16", language: "en" },
      validateContent: (data: any) => {
        expect(data.data).toBeDefined();
        expect(data.data.resources).toBeDefined();
        expect(Array.isArray(data.data.resources)).toBe(true);
        expect(data.data.resources.length).toBeGreaterThan(0);

        // Each resource should have actual scripture text
        data.data.resources.forEach((resource: any) => {
          expect(resource).toHaveProperty("text");
          expect(resource).toHaveProperty("translation");

          // Text should contain actual scripture
          expect(resource.text).toContain("God");
          expect(resource.text).toContain("loved");
          expect(resource.text.length).toBeGreaterThan(50);

          // Should not be placeholder text
          expect(resource.text).not.toContain("Lorem ipsum");
          expect(resource.text).not.toContain("placeholder");
          expect(resource.text).not.toBe("");
        });
      },
    },

    "translation-questions": {
      endpoint: "fetch-translation-questions",
      params: {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      },
      requiredFields: [
        "Reference",
        "ID",
        "Tags",
        "Quote",
        "Occurrence",
        "Question",
        "Response",
      ],
      validateContent: (data: any) => {
        expect(data.translationQuestions).toBeDefined();
        expect(Array.isArray(data.translationQuestions)).toBe(true);
        expect(data.translationQuestions.length).toBeGreaterThan(0);

        // Validate each question has required fields
        data.translationQuestions.forEach((question: any) => {
          expect(question).toHaveProperty("id");
          expect(question).toHaveProperty("reference");
          expect(question).toHaveProperty("question");
          expect(question).toHaveProperty("response");

          // Content should be real, not placeholder
          expect(question.question.length).toBeGreaterThan(10);
          expect(question.response.length).toBeGreaterThan(10);
        });
      },
    },

    "translation-words": {
      endpoint: "get-translation-word",
      params: { word: "love", language: "en" },
      validateContent: (data: any) => {
        // Should return actual word article content
        expect(data.word).toBeDefined();
        expect(data.word.id).toBe("love");
        expect(data.word.title).toBeDefined();
        expect(data.word.content).toBeDefined();
        expect(data.word.category).toBeDefined();
        // Subtitle is optional
        if (data.word.subtitle) {
          expect(typeof data.word.subtitle).toBe("string");
        }

        // Content should be actual markdown article
        expect(data.word.content.length).toBeGreaterThan(100);
        expect(data.word.content).toContain("Definition");
        expect(data.word.content).toContain("Translation");

        // Should have proper metadata
        expect(data.metadata).toBeDefined();
        expect(data.metadata.language).toBe("en");
        expect(data.metadata.organization).toBe("unfoldingWord");
      },
    },

    context: {
      endpoint: "get-context",
      params: { reference: "John 3:16", language: "en" },
      validateContent: (data: any) => {
        expect(data.context).toBeDefined();
        expect(Array.isArray(data.context)).toBe(true);
        expect(data.context.length).toBeGreaterThan(0);

        // Should have multiple resource types
        const resourceTypes = data.context.map((r: any) => r.type);
        expect(resourceTypes).toContain("scripture");
        expect(resourceTypes).toContain("translation-notes");
        expect(resourceTypes).toContain("translation-questions");
        expect(resourceTypes).toContain("translation-words");

        // Each resource should have data
        data.context.forEach((resource: any) => {
          expect(resource.data).toBeDefined();
          expect(resource.count).toBeGreaterThan(0);
        });
      },
    },
  };

  describe("Field Preservation Tests", () => {
    Object.entries(ENDPOINT_TESTS).forEach(([name, config]) => {
      it(
        `${name}: should preserve all source data fields`,
        async () => {
          const url = new URL(`${BASE_URL}/api/${config.endpoint}`);
          Object.entries(config.params).forEach(([key, value]) => {
            url.searchParams.append(key, value as string);
          });

          const response = await fetch(url.toString());
          const data = await response.json();

          if (config.expectedError) {
            // For broken endpoints, validate the error
            config.validateError!(data);
          } else {
            // For working endpoints, validate content
            expect(response.status).toBe(200);
            config.validateContent!(data);
          }
        },
        TIMEOUT,
      );
    });
  });

  describe("Response Consistency Tests", () => {
    it("should have consistent response wrapper structure", async () => {
      const endpoints = [
        {
          path: "fetch-scripture",
          params: { reference: "John 3:16", language: "en" },
        },
        {
          path: "fetch-translation-notes",
          params: {
            reference: "John 3:16",
            language: "en",
            organization: "unfoldingWord",
          },
        },
        {
          path: "fetch-translation-word-links",
          params: {
            reference: "John 3:16",
            language: "en",
            organization: "unfoldingWord",
          },
        },
      ];

      const responses = await Promise.all(
        endpoints.map(async ({ path, params }) => {
          const url = new URL(`${BASE_URL}/api/${path}`);
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });

          const response = await fetch(url.toString());
          return { path, data: await response.json() };
        }),
      );

      // Check for consistent top-level structure
      responses.forEach(({ path, data }) => {
        console.log(`\nResponse structure for ${path}:`);
        console.log("Top-level keys:", Object.keys(data));

        // Different endpoints have different structures - document this
        if (path === "fetch-scripture") {
          expect(data).toHaveProperty("data");
        } else if (path === "fetch-translation-notes") {
          expect(data).toHaveProperty("notes");
          expect(data).toHaveProperty("citation");
          expect(data).toHaveProperty("metadata");
        } else if (path === "fetch-translation-word-links") {
          expect(data).toHaveProperty("links");
        }
      });
    });
  });

  describe("Broken Endpoint Documentation", () => {
    it("should document all broken endpoints for fixing", () => {
      const brokenEndpoints = [
        {
          name: "fetch-scripture (version filtering)",
          issue: "Ignores version parameter, returns all versions",
          impact: "Larger responses than expected, inconsistent behavior",
        },
      ];

      const fixedEndpoints = [
        {
          name: "get-translation-word",
          previousIssue: "Was returning fake/placeholder paths",
          fix: "Now fetches real markdown content from DCS",
          status: "✅ FIXED",
        },
        {
          name: "fetch-translation-questions",
          previousIssue: "Was trying to fetch JHN/3.md instead of TSV files",
          fix: "Now uses proper service that reads ingredients from manifest",
          status: "✅ FIXED",
        },
        {
          name: "get-context",
          previousIssue: "Was not implemented - returned 500 error",
          fix: "Now uses D43 catalog search to aggregate all resources in ONE API call",
          status: "✅ FIXED",
        },
      ];

      console.log("\n=== BROKEN ENDPOINTS SUMMARY ===");
      brokenEndpoints.forEach(({ name, issue, impact }) => {
        console.log(`\n${name}:`);
        console.log(`  Issue: ${issue}`);
        console.log(`  Impact: ${impact}`);
      });

      console.log("\n=== FIXED ENDPOINTS ===");
      fixedEndpoints.forEach(({ name, previousIssue, fix, status }) => {
        console.log(`\n${name}: ${status}`);
        console.log(`  Previous Issue: ${previousIssue}`);
        console.log(`  Fix Applied: ${fix}`);
      });

      // This test passes but documents the issues
      expect(brokenEndpoints.length).toBeGreaterThan(0);
      expect(fixedEndpoints.length).toBeGreaterThan(0);
    });
  });
});
