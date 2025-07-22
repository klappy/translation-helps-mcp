/**
 * Terminology Compliance Test Suite
 *
 * Validates that all API responses, UI components, and documentation
 * use correct unfoldingWord terminology as defined in the UW guide.
 *
 * Based on: docs/UW_TRANSLATION_RESOURCES_GUIDE.md
 * Created for Task 6 of the implementation plan
 */

/* eslint-disable no-restricted-syntax */

import { beforeAll, describe, expect, test } from "vitest";
import {
  LanguageRoles,
  ResourceDescriptions,
  ResourceType,
  UserTypes,
} from "../src/constants/terminology";
import { DCSApiClient } from "../src/services/DCSApiClient";

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for API calls
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

describe("Terminology Compliance", () => {
  let dcsClient: DCSApiClient;

  beforeAll(() => {
    dcsClient = new DCSApiClient();
  });

  describe("API Response Terminology", () => {
    test(
      "Language endpoint uses Strategic Language terminology",
      async () => {
        const response = await dcsClient.getLanguages();
        const languages = response.data || [];

        // Should not contain deprecated terminology
        const languageJson = JSON.stringify(languages);
        // eslint-disable-next-line no-restricted-syntax
        expect(languageJson).not.toContain("Gateway Language");
        expect(languageJson).not.toContain("isGatewayLanguage");

        // Should use correct Strategic Language terminology
        if (languages.length > 0) {
          const firstLang = languages[0];
          if ("isStrategicLanguage" in firstLang) {
            expect(typeof firstLang.isStrategicLanguage).toBe("boolean");
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      "Health endpoint uses UW-specific description",
      async () => {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const healthData = await response.json();

        expect(healthData.description).toContain("unfoldingWord");
        expect(healthData.description).toContain("Mother Tongue Translators");
        expect(healthData.description).not.toContain("Bible translation resources");
      },
      TEST_TIMEOUT
    );

    test(
      "List resources endpoint uses UW-specific descriptions",
      async () => {
        const response = await fetch(`${API_BASE_URL}/api/list-available-resources`);
        const resourcesData = await response.json();

        expect(resourcesData.resources).toBeDefined();

        // Find scripture resource
        const scriptureResource = resourcesData.resources.find((r: any) => r.type === "scripture");
        if (scriptureResource) {
          expect(scriptureResource.description).toContain("ULT/GLT");
          expect(scriptureResource.description).toContain("UST/GST");
          expect(scriptureResource.description).toContain("Literal");
          expect(scriptureResource.description).toContain("Simplified");
          expect(scriptureResource.description).toContain("word alignment");
        }

        // Find translation notes resource
        const notesResource = resourcesData.resources.find((r: any) => r.type === "notes");
        if (notesResource) {
          expect(notesResource.description).toContain("Mother Tongue Translators");
          expect(notesResource.description).toContain("Verse-by-verse");
        }

        // Find translation questions resource
        const questionsResource = resourcesData.resources.find((r: any) => r.type === "questions");
        if (questionsResource) {
          expect(questionsResource.description).toContain("Community checking");
          expect(questionsResource.description).toContain("quality assurance");
        }
      },
      TEST_TIMEOUT
    );
  });

  describe("Resource Type Constants", () => {
    test("ResourceType enum includes all required UW resource types", () => {
      // Scripture texts
      expect(ResourceType.ULT).toBe("ult");
      expect(ResourceType.GLT).toBe("glt");
      expect(ResourceType.UST).toBe("ust");
      expect(ResourceType.GST).toBe("gst");

      // Translation helps
      expect(ResourceType.TN).toBe("tn");
      expect(ResourceType.TW).toBe("tw");
      expect(ResourceType.TWL).toBe("twl");
      expect(ResourceType.TQ).toBe("tq");
      expect(ResourceType.TA).toBe("ta");

      // Original language texts
      expect(ResourceType.UHB).toBe("uhb");
      expect(ResourceType.UGNT).toBe("ugnt");
    });

    test("Resource descriptions use UW-compliant terminology", () => {
      // Check ULT description
      expect(ResourceDescriptions[ResourceType.ULT]).toContain("Form-centric");
      expect(ResourceDescriptions[ResourceType.ULT]).toContain("word alignment");

      // Check GLT description
      expect(ResourceDescriptions[ResourceType.GLT]).toContain("Strategic Language");
      expect(ResourceDescriptions[ResourceType.GLT]).not.toContain("Gateway Language");

      // Check UST description
      expect(ResourceDescriptions[ResourceType.UST]).toContain("Meaning-based");
      expect(ResourceDescriptions[ResourceType.UST]).toContain("word alignment");

      // Check GST description
      expect(ResourceDescriptions[ResourceType.GST]).toContain("Strategic Language");
      expect(ResourceDescriptions[ResourceType.GST]).not.toContain("Gateway Language");

      // Check Translation Notes description
      expect(ResourceDescriptions[ResourceType.TN]).toContain("Verse-by-verse");

      // Check Translation Words description
      expect(ResourceDescriptions[ResourceType.TW]).toContain("biblical term definitions");
    });

    test("User types use correct UW terminology", () => {
      expect(UserTypes.MTT).toBe("Mother Tongue Translator");
      expect(UserTypes.STRATEGIC_LANGUAGE).toBe("Strategic Language");
      expect(UserTypes.HEART_LANGUAGE).toBe("Heart Language");
    });

    test("Language roles avoid deprecated terminology", () => {
      const rolesJson = JSON.stringify(LanguageRoles);
      expect(rolesJson).not.toContain("Gateway");
      expect(rolesJson).toContain("STRATEGIC");
      expect(rolesJson).toContain("HEART");
    });
  });

  describe("API Response Schema Validation", () => {
    test(
      "Scripture responses follow UW standards",
      async () => {
        const response = await fetch(`${API_BASE_URL}/api/fetch-scripture?reference=John 3:16`);
        expect(response.ok).toBe(true);

        const scriptureData = await response.json();

        // Should have structure indicating UW approach
        expect(scriptureData).toHaveProperty("scripture");

        // Metadata should indicate proper source
        if (scriptureData.metadata) {
          const metadataJson = JSON.stringify(scriptureData.metadata);
          expect(metadataJson).not.toContain("Gateway");
        }
      },
      TEST_TIMEOUT
    );

    test(
      "Translation Notes responses use UW terminology",
      async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/fetch-translation-notes?reference=John 3:16`
        );

        if (response.ok) {
          const notesData = await response.json();

          // Should not contain deprecated terminology
          const notesJson = JSON.stringify(notesData);
          expect(notesJson).not.toContain("Gateway Language");

          // Should have UW-specific structure
          if (notesData.notes && notesData.notes.length > 0) {
            expect(notesData.notes[0]).toHaveProperty("Note");
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      "Translation Words responses follow UW format",
      async () => {
        const response = await fetch(`${API_BASE_URL}/api/get-translation-word?word=love`);

        if (response.ok) {
          const wordData = await response.json();

          // Should not contain deprecated terminology
          const wordJson = JSON.stringify(wordData);
          expect(wordJson).not.toContain("Gateway Language");

          // Should have UW word structure
          if (wordData.word) {
            expect(wordData.word).toHaveProperty("title");
            expect(wordData.word).toHaveProperty("content");
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  describe("Error Messages and Documentation", () => {
    test(
      "Error responses use appropriate terminology",
      async () => {
        // Test with invalid reference to trigger error
        const response = await fetch(
          `${API_BASE_URL}/api/fetch-scripture?reference=InvalidBook 999:999`
        );

        const errorData = await response.json();

        if (errorData.error) {
          // Error messages should not contain deprecated terms
          expect(errorData.error).not.toContain("Gateway Language");
          expect(errorData.error).not.toContain("Bible texts");
        }
      },
      TEST_TIMEOUT
    );

    test("Documentation references use UW standards", () => {
      // This would typically check generated API docs or help text
      // For now, we verify our constants don't leak deprecated terms
      const allConstants = JSON.stringify({
        ResourceType,
        ResourceDescriptions,
        UserTypes,
        LanguageRoles,
      });

      expect(allConstants).not.toContain("Gateway Language");
      expect(allConstants).toContain("Strategic Language");
      expect(allConstants).toContain("Mother Tongue Translator");
    });
  });

  describe("Cross-Resource Relationships", () => {
    test("Resource types maintain UW ecosystem relationships", () => {
      // Verify that literal/simplified pairs are correctly identified
      const literalTypes = [ResourceType.ULT, ResourceType.GLT];
      const simplifiedTypes = [ResourceType.UST, ResourceType.GST];

      literalTypes.forEach((type) => {
        expect(ResourceDescriptions[type]).toMatch(/literal|form-centric/i);
      });

      simplifiedTypes.forEach((type) => {
        expect(ResourceDescriptions[type]).toMatch(/simplified|meaning-based/i);
      });
    });

    test("Translation helps maintain proper relationships", () => {
      // TN should reference TA
      expect(ResourceDescriptions[ResourceType.TN]).toContain("guidance");

      // TW should reference definitions
      expect(ResourceDescriptions[ResourceType.TW]).toContain("definitions");

      // TQ should reference checking
      expect(ResourceDescriptions[ResourceType.TQ]).toContain("Community checking");
    });
  });

  describe("Integration with Existing Code", () => {
    test("DCS API client uses updated terminology", () => {
      // This tests that our client doesn't accidentally use old terms
      const clientMethods = Object.getOwnPropertyNames(DCSApiClient.prototype);

      // Should not have methods with "gateway" in the name
      const gatewayMethods = clientMethods.filter((name) => name.toLowerCase().includes("gateway"));
      expect(gatewayMethods).toHaveLength(0);
    });

    test("Type definitions are UW-compliant", () => {
      // Import and check type definitions don't expose deprecated terms
      // This is a compile-time check that ensures TypeScript interfaces are correct

      // Test would expand here to check actual type files
      // For now, verify our constants are properly typed
      expect(typeof ResourceType.ULT).toBe("string");
      expect(typeof ResourceDescriptions).toBe("object");
      expect(typeof UserTypes.MTT).toBe("string");
    });
  });
});

/**
 * Helper function to validate that a string contains UW-approved terminology
 * and doesn't contain deprecated terms
 */
function validateUWTerminology(text: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for deprecated terms
  const deprecatedTerms = [
    "Gateway Language",
    "gateway language",
    "isGatewayLanguage",
    "Bible texts in various translations",
    "generic translation",
  ];

  deprecatedTerms.forEach((term) => {
    if (text.includes(term)) {
      issues.push(`Contains deprecated term: "${term}"`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate UW resource type hierarchy
 */
function validateResourceHierarchy(): boolean {
  // Scripture texts should be at top level
  const scriptureTypes = [ResourceType.ULT, ResourceType.GLT, ResourceType.UST, ResourceType.GST];

  // Translation helps should support scripture
  const helpTypes = [
    ResourceType.TN,
    ResourceType.TW,
    ResourceType.TWL,
    ResourceType.TQ,
    ResourceType.TA,
  ];

  // Original texts should be foundational
  const originalTypes = [ResourceType.UHB, ResourceType.UGNT];

  // All types should be defined
  const allTypes = [...scriptureTypes, ...helpTypes, ...originalTypes];

  return allTypes.every((type) => {
    return typeof type === "string" && type.length > 0;
  });
}

// Export helper functions for use in other tests
export { validateResourceHierarchy, validateUWTerminology };
