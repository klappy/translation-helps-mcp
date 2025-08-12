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

import { describe, expect, test } from "vitest";
import {
  LanguageCategory,
  Organization,
  ResourceDescriptions,
  ResourceType,
  UserType,
  UserTypeDescriptions,
  getResourceDescription,
  getUserTypeDescription,
  isValidResourceType,
  isValidUserType,
} from "../src/constants/terminology";

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for API calls
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

describe("Terminology Compliance", () => {
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
      expect(ResourceDescriptions[ResourceType.ULT]).toContain(
        "structure and word order",
      );

      // Check GLT description
      expect(ResourceDescriptions[ResourceType.GLT]).toContain(
        "Strategic Languages",
      );
      expect(ResourceDescriptions[ResourceType.GLT]).not.toContain(
        "Gateway Language",
      );

      // Check UST description
      expect(ResourceDescriptions[ResourceType.UST]).toContain("Meaning-based");
      expect(ResourceDescriptions[ResourceType.UST]).toContain(
        "natural expression",
      );

      // Check GST description
      expect(ResourceDescriptions[ResourceType.GST]).toContain(
        "Strategic Languages",
      );
      expect(ResourceDescriptions[ResourceType.GST]).not.toContain(
        "Gateway Language",
      );

      // Check Translation Notes description
      expect(ResourceDescriptions[ResourceType.TN]).toContain("Verse-by-verse");

      // Check Translation Words description
      expect(ResourceDescriptions[ResourceType.TW]).toContain(
        "biblical term definitions",
      );
    });

    test("User types use correct UW terminology", () => {
      expect(UserType.MTT).toBe("mother-tongue-translator");
      expect(UserType.STRATEGIC_LANGUAGE).toBe("strategic-language");
      expect(UserType.HEART_LANGUAGE).toBe("heart-language");

      // Check descriptions
      expect(UserTypeDescriptions[UserType.MTT]).toContain(
        "Mother Tongue Translator",
      );
      expect(UserTypeDescriptions[UserType.STRATEGIC_LANGUAGE]).toContain(
        "Strategic Language",
      );
      expect(UserTypeDescriptions[UserType.HEART_LANGUAGE]).toContain(
        "Heart Language",
      );
    });

    test("Language categories avoid deprecated terminology", () => {
      const categoriesJson = JSON.stringify(LanguageCategory);
      expect(categoriesJson).not.toContain("Gateway");
      expect(categoriesJson).toContain("STRATEGIC");
      expect(categoriesJson).toContain("HEART");
    });
  });

  describe("Validation Functions", () => {
    test("Resource type validation works correctly", () => {
      expect(isValidResourceType("ult")).toBe(true);
      expect(isValidResourceType("ust")).toBe(true);
      expect(isValidResourceType("tn")).toBe(true);
      expect(isValidResourceType("invalid")).toBe(false);
    });

    test("User type validation works correctly", () => {
      expect(isValidUserType("mother-tongue-translator")).toBe(true);
      expect(isValidUserType("strategic-language")).toBe(true);
      expect(isValidUserType("invalid")).toBe(false);
    });

    test("Description getters work correctly", () => {
      const ultDescription = getResourceDescription(ResourceType.ULT);
      expect(ultDescription).toContain("Form-centric");

      const mttDescription = getUserTypeDescription(UserType.MTT);
      expect(mttDescription).toContain("Mother Tongue Translator");
    });
  });

  describe("Organization Constants", () => {
    test("Organization enum includes unfoldingWord", () => {
      expect(Organization.UNFOLDINGWORD).toBe("unfoldingWord");
      expect(Organization.DOOR43).toBe("Door43-Catalog");
    });
  });

  describe("Cross-Resource Relationships", () => {
    test("Resource types maintain UW ecosystem relationships", () => {
      // Verify that literal/simplified pairs are correctly identified
      const literalTypes = [ResourceType.ULT, ResourceType.GLT];
      const simplifiedTypes = [ResourceType.UST, ResourceType.GST];

      literalTypes.forEach((type) => {
        expect(ResourceDescriptions[type]).toMatch(/form-centric/i);
      });

      simplifiedTypes.forEach((type) => {
        expect(ResourceDescriptions[type]).toMatch(/meaning-based/i);
      });
    });

    test("Translation helps maintain proper relationships", () => {
      // TN should reference explanations
      expect(ResourceDescriptions[ResourceType.TN]).toMatch(
        /explanations|verse-by-verse/i,
      );

      // TW should reference definitions
      expect(ResourceDescriptions[ResourceType.TW]).toContain("definitions");

      // TQ should reference questions
      expect(ResourceDescriptions[ResourceType.TQ]).toMatch(
        /questions|validation/i,
      );
    });
  });

  describe("Integration with Existing Code", () => {
    test("Type definitions are UW-compliant", () => {
      // Verify our constants are properly typed
      expect(typeof ResourceType.ULT).toBe("string");
      expect(typeof ResourceDescriptions).toBe("object");
      expect(typeof UserType.MTT).toBe("string");
      expect(typeof UserTypeDescriptions).toBe("object");
    });
  });

  // API tests that don't require a running server
  describe("Terminology in Code (Unit Tests)", () => {
    test("No deprecated terminology in resource descriptions", () => {
      const allDescriptions = Object.values(ResourceDescriptions).join(" ");
      expect(allDescriptions).not.toContain("Gateway Language");
      expect(allDescriptions).not.toContain("gateway language");
    });

    test("No deprecated terminology in user type descriptions", () => {
      const allUserDescriptions = Object.values(UserTypeDescriptions).join(" ");
      expect(allUserDescriptions).not.toContain("Gateway Language");
      expect(allUserDescriptions).not.toContain("gateway language");
    });

    test("All resource types have descriptions", () => {
      Object.values(ResourceType).forEach((type) => {
        expect(ResourceDescriptions[type]).toBeDefined();
        expect(ResourceDescriptions[type].length).toBeGreaterThan(0);
      });
    });

    test("All user types have descriptions", () => {
      Object.values(UserType).forEach((type) => {
        expect(UserTypeDescriptions[type]).toBeDefined();
        expect(UserTypeDescriptions[type].length).toBeGreaterThan(0);
      });
    });
  });

  // Integration tests that require a running server - marked as optional
  describe("API Response Terminology (Integration)", () => {
    test.skip(
      "Health endpoint uses UW-specific description",
      async () => {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const healthData = await response.json();

        expect(healthData.description).toContain("unfoldingWord");
        expect(healthData.description).toContain("Mother Tongue Translators");
      },
      TEST_TIMEOUT,
    );

    test.skip(
      "List resources endpoint uses updated descriptions",
      async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/list-available-resources`,
        );
        const resourcesData = await response.json();

        expect(resourcesData.resources).toBeDefined();

        // Verify descriptions match our centralized terminology
        interface ResourceResponse {
          type: string;
          description: string;
        }

        const scriptureResource = resourcesData.resources.find(
          (r: ResourceResponse) =>
            r.type === ResourceType.ULT || r.type === "scripture",
        );
        if (scriptureResource) {
          // Should use descriptions from our terminology module
          expect(scriptureResource.description).toContain("ULT");
          expect(scriptureResource.description).not.toContain(
            "Gateway Language",
          );
        }
      },
      TEST_TIMEOUT,
    );

    test.skip(
      "Scripture responses follow UW standards",
      async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/fetch-scripture?reference=John 3:16`,
        );
        expect(response.ok).toBe(true);

        const scriptureData = await response.json();

        // Should have structure indicating UW approach
        expect(scriptureData).toHaveProperty("scripture");

        // Metadata should not contain deprecated terms
        if (scriptureData.metadata) {
          const metadataJson = JSON.stringify(scriptureData.metadata);
          expect(metadataJson).not.toContain("Gateway Language");
          expect(metadataJson).not.toContain("gateway language");
        }
      },
      TEST_TIMEOUT,
    );
  });
});

/**
 * Helper function to validate that a string contains UW-approved terminology
 * and doesn't contain deprecated terms
 */
function validateUWTerminology(text: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for deprecated terms
  const deprecatedTerms = [
    "Gateway Language",
    "gateway language",
    "isGatewayLanguage",
    "gatewayLanguage",
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
  const scriptureTypes = [
    ResourceType.ULT,
    ResourceType.GLT,
    ResourceType.UST,
    ResourceType.GST,
  ];

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
