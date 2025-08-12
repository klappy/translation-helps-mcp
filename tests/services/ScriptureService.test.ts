import { describe, it, expect, beforeEach } from "vitest";
import { ScriptureService } from "../../src/services/ScriptureService";

describe("ScriptureService", () => {
  let service: ScriptureService;

  beforeEach(() => {
    service = new ScriptureService();
  });

  describe("getScripture", () => {
    it("fetches John 3:16 in English", async () => {
      const result = await service.getScripture({
        reference: "John 3:16",
        language: "en",
      });

      // Should return multiple translations
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check first translation structure
      const first = result[0];
      expect(first).toHaveProperty("text");
      expect(first).toHaveProperty("reference", "John 3:16");
      expect(first).toHaveProperty("resource");
      expect(first).toHaveProperty("language", "en");
      expect(first).toHaveProperty("citation");
      expect(first).toHaveProperty("organization", "unfoldingWord");

      // Text should contain actual scripture
      expect(first.text).toContain("God");
      expect(first.text.length).toBeGreaterThan(50);
    }, 10000); // Allow 10 seconds for network requests

    it("handles multi-verse references", async () => {
      const result = await service.getScripture({
        reference: "Psalm 23:1-4",
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Should contain multiple verses
      const first = result[0];
      expect(first.text).toContain("shepherd");
      expect(first.reference).toBe("Psalm 23:1-4");
    }, 10000);

    it("throws error for invalid reference", async () => {
      await expect(
        service.getScripture({ reference: "Invalid Reference" }),
      ).rejects.toThrow("Invalid reference");
    });

    it("respects language parameter", async () => {
      const result = await service.getScripture({
        reference: "John 3:16",
        language: "es",
      });

      if (result.length > 0) {
        // If Spanish is available, check it
        expect(result[0].language).toBe("es");
        expect(result[0].text).toContain("Dios"); // Spanish for God
      }
    }, 10000);

    it("respects organization parameter", async () => {
      const result = await service.getScripture({
        reference: "John 3:16",
        organization: "unfoldingWord",
      });

      expect(result).toBeDefined();
      expect(result[0].organization).toBe("unfoldingWord");
    }, 10000);
  });

  describe("reference parsing", () => {
    // These will test the private parseReference method indirectly
    const testCases = [
      { ref: "John 3:16", valid: true },
      { ref: "1 John 3:16", valid: true },
      { ref: "Genesis 1:1-3", valid: true },
      { ref: "Psalm 23", valid: true },
      { ref: "Invalid", valid: false },
      { ref: "John", valid: false },
      { ref: "3:16", valid: false },
    ];

    testCases.forEach(({ ref, valid }) => {
      it(`${valid ? "parses" : "rejects"} "${ref}"`, async () => {
        if (valid) {
          const result = await service.getScripture({ reference: ref });
          expect(result).toBeDefined();
        } else {
          await expect(
            service.getScripture({ reference: ref }),
          ).rejects.toThrow();
        }
      });
    });
  });
});
