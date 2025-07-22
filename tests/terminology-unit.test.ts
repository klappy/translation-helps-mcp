/**
 * Terminology Unit Tests
 *
 * Unit tests for UW terminology compliance that can run without a server.
 * These tests focus on constants, types, and client code validation.
 *
 * Based on: docs/UW_TRANSLATION_RESOURCES_GUIDE.md
 * Separated from integration tests for CI/CD reliability
 */

/* eslint-disable no-restricted-syntax */

import { describe, expect, test } from "vitest";
import {
  LanguageRoles,
  ResourceDescriptions,
  ResourceType,
  UserTypes,
} from "../src/constants/terminology";
import { DCSApiClient } from "../src/services/DCSApiClient";

describe("UW Terminology Compliance (Unit Tests)", () => {
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

      // Check Translation Questions description
      expect(ResourceDescriptions[ResourceType.TQ]).toContain("Community checking");
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
      expect(rolesJson).toContain("ORIGINAL");
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

      // TA should reference methodology
      expect(ResourceDescriptions[ResourceType.TA]).toContain("methodology");
    });
  });

  describe("Code Integration Compliance", () => {
    test("DCS API client uses updated terminology", () => {
      // This tests that our client doesn't accidentally use old terms
      const clientMethods = Object.getOwnPropertyNames(DCSApiClient.prototype);

      // Should not have methods with "gateway" in the name
      const gatewayMethods = clientMethods.filter((name) => name.toLowerCase().includes("gateway"));
      expect(gatewayMethods).toHaveLength(0);
    });

    test("Type definitions are UW-compliant", () => {
      // Verify our constants are properly typed
      expect(typeof ResourceType.ULT).toBe("string");
      expect(typeof ResourceDescriptions).toBe("object");
      expect(typeof UserTypes.MTT).toBe("string");
      expect(typeof LanguageRoles.STRATEGIC).toBe("string");
    });

    test("Constants do not contain deprecated terms", () => {
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

  describe("Resource Hierarchy Validation", () => {
    test("All resource types are properly defined", () => {
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

      allTypes.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
        expect(ResourceDescriptions[type]).toBeDefined();
        expect(ResourceDescriptions[type].length).toBeGreaterThan(0);
      });
    });

    test("Resource descriptions match UW ecosystem concepts", () => {
      // ULT/GLT should emphasize form and structure
      expect(ResourceDescriptions[ResourceType.ULT]).toContain("Form-centric");
      expect(ResourceDescriptions[ResourceType.GLT]).toContain("source language structure");

      // UST/GST should emphasize meaning and clarity
      expect(ResourceDescriptions[ResourceType.UST]).toContain("Meaning-based");
      expect(ResourceDescriptions[ResourceType.GST]).toContain("natural expression");

      // All scripture resources should mention word alignment
      [ResourceType.ULT, ResourceType.UST].forEach((type) => {
        expect(ResourceDescriptions[type]).toContain("word alignment");
      });

      // Translation helps should focus on guidance
      expect(ResourceDescriptions[ResourceType.TN]).toContain("guidance");
      expect(ResourceDescriptions[ResourceType.TW]).toContain("definitions");
      expect(ResourceDescriptions[ResourceType.TQ]).toContain("checking");
      expect(ResourceDescriptions[ResourceType.TA]).toContain("methodology");
    });
  });
});

/**
 * Helper function to validate that a string contains UW-approved terminology
 * and doesn't contain deprecated terms
 */
export function validateUWTerminology(text: string): { valid: boolean; issues: string[] } {
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
export function validateResourceHierarchy(): boolean {
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
