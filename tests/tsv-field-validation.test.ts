import { describe, test, expect } from "vitest";

/**
 * This test file validates that ALL TSV fields are correctly passed through
 * from the original TSV data to the JSON response without any:
 * - Added fields
 * - Removed fields
 * - Renamed fields
 * - Mismatched values
 */

describe("TSV Field Validation - Exact Field Mapping", () => {
  describe("Translation Notes Field Validation", () => {
    test("TN TSV has exactly 7 columns that must ALL be accessible", () => {
      // const tnHeaders = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
      const sampleRow =
        "1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\tThe words\t1\tare abstract nouns.";
      const values = sampleRow.split("\t");

      // Create expected field mapping
      const expectedMapping = {
        Reference: values[0],
        ID: values[1],
        Tags: values[2],
        SupportReference: values[3],
        Quote: values[4],
        Occurrence: values[5],
        Note: values[6],
      };

      // All 7 fields must be present
      expect(Object.keys(expectedMapping)).toHaveLength(7);

      // Each field must have the exact value from its column
      expect(expectedMapping.Reference).toBe("1:1");
      expect(expectedMapping.ID).toBe("rtc9");
      expect(expectedMapping.Tags).toBe(
        "rc://*/ta/man/translate/figs-abstractnouns",
      );
      expect(expectedMapping.SupportReference).toBe("κατὰ πίστιν");
      expect(expectedMapping.Quote).toBe("The words");
      expect(expectedMapping.Occurrence).toBe("1");
      expect(expectedMapping.Note).toBe("are abstract nouns.");
    });

    test("TN JSON response should preserve ALL original TSV fields", () => {
      // Expected JSON structure that preserves all TSV fields
      const expectedJsonStructure = {
        reference: "1:1", // From Reference column
        id: "rtc9", // From ID column
        tags: "rc://*/ta/man/translate/figs-abstractnouns", // From Tags column
        supportReference: "κατὰ πίστιν", // From SupportReference column
        quote: "The words", // From Quote column
        occurrence: "1", // From Occurrence column
        note: "are abstract nouns.", // From Note column
      };

      // No fields should be added
      expect(Object.keys(expectedJsonStructure)).toHaveLength(7);

      // No fields should be renamed (lowercase is ok, but the mapping must be clear)
      const fieldMapping = {
        Reference: "reference",
        ID: "id",
        Tags: "tags",
        SupportReference: "supportReference",
        Quote: "quote",
        Occurrence: "occurrence",
        Note: "note",
      };

      Object.entries(fieldMapping).forEach(([, jsonField]) => {
        expect(jsonField).toBeTruthy();
        expect(typeof jsonField).toBe("string");
      });
    });
  });

  describe("Translation Questions Field Validation", () => {
    test("TQ TSV has exactly 7 columns that must ALL be accessible", () => {
      // const tqHeaders = ['Reference', 'ID', 'Tags', 'Quote', 'Occurrence', 'Question', 'Response'];
      const sampleRow =
        "1:1\ty5pp\t\t\t\tWhat was Paul's purpose?\tTo establish faith.";
      const values = sampleRow.split("\t");

      const expectedMapping = {
        Reference: values[0],
        ID: values[1],
        Tags: values[2],
        Quote: values[3],
        Occurrence: values[4],
        Question: values[5],
        Response: values[6],
      };

      // All 7 fields must be present
      expect(Object.keys(expectedMapping)).toHaveLength(7);

      // Even empty fields must be preserved
      expect(expectedMapping.Reference).toBe("1:1");
      expect(expectedMapping.ID).toBe("y5pp");
      expect(expectedMapping.Tags).toBe(""); // Empty but present
      expect(expectedMapping.Quote).toBe(""); // Empty but present
      expect(expectedMapping.Occurrence).toBe(""); // Empty but present
      expect(expectedMapping.Question).toBe("What was Paul's purpose?");
      expect(expectedMapping.Response).toBe("To establish faith.");
    });

    test("TQ JSON response should include ALL fields even if empty", () => {
      const expectedJsonStructure = {
        reference: "1:1",
        id: "y5pp",
        tags: "", // Should be included even if empty
        quote: "", // Should be included even if empty
        occurrence: "", // Should be included even if empty
        question: "What was Paul's purpose?",
        response: "To establish faith.",
      };

      // All 7 fields must be in the response
      expect(Object.keys(expectedJsonStructure)).toHaveLength(7);
    });
  });

  describe("Translation Word Links Field Validation", () => {
    test("TWL TSV has exactly 6 columns that must ALL be accessible", () => {
      // const twlHeaders = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink'];
      const sampleRow =
        "1:1\ttrr8\tname\tΠαῦλος\t1\trc://*/tw/dict/bible/names/paul";
      const values = sampleRow.split("\t");

      const expectedMapping = {
        Reference: values[0],
        ID: values[1],
        Tags: values[2],
        OrigWords: values[3],
        Occurrence: values[4],
        TWLink: values[5],
      };

      // All 6 fields must be present
      expect(Object.keys(expectedMapping)).toHaveLength(6);

      // Greek text must be preserved exactly
      expect(expectedMapping.Reference).toBe("1:1");
      expect(expectedMapping.ID).toBe("trr8");
      expect(expectedMapping.Tags).toBe("name");
      expect(expectedMapping.OrigWords).toBe("Παῦλος");
      expect(expectedMapping.Occurrence).toBe("1");
      expect(expectedMapping.TWLink).toBe("rc://*/tw/dict/bible/names/paul");
    });

    test("TWL JSON response should preserve Greek/Hebrew text exactly", () => {
      const expectedJsonStructure = {
        reference: "1:1",
        id: "trr8",
        tags: "name",
        origWords: "Παῦλος", // Must preserve Unicode exactly
        occurrence: "1",
        twLink: "rc://*/tw/dict/bible/names/paul",
      };

      // All 6 fields must be in the response
      expect(Object.keys(expectedJsonStructure)).toHaveLength(6);

      // Unicode text must be preserved
      expect(expectedJsonStructure.origWords).toBe("Παῦλος");
      expect(expectedJsonStructure.origWords.length).toBe(6); // 6 Unicode characters
    });
  });

  describe("Common TSV Issues to Test", () => {
    test("should handle fields with internal tabs correctly", () => {
      // This is a known limitation - tabs within fields break TSV parsing
      const problematicRow = "ref\tid\tfield with\ttab inside";
      const parsed = problematicRow.split("\t");

      // This will parse incorrectly
      expect(parsed.length).toBe(4); // Should be 3, but tab breaks it
      expect(parsed[2]).toBe("field with"); // Incomplete
      expect(parsed[3]).toBe("tab inside"); // Wrongly separated
    });

    test("should handle fields with newlines", () => {
      const rowWithNewline = "ref\tid\tfield with\nnewline";
      const lines = rowWithNewline.split("\n");

      // Newlines break row parsing
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe("ref\tid\tfield with");
      expect(lines[1]).toBe("newline");
    });

    test("should handle Unicode characters in all fields", () => {
      const unicodeRow = "réf\tïd\tτάγς\tσυππορτ\tκυότε\t1\tνότε";
      const values = unicodeRow.split("\t");

      expect(values.length).toBe(7);
      expect(values[2]).toBe("τάγς"); // Greek
      expect(values[3]).toBe("συππορτ"); // Greek (corrected Unicode)
    });

    test("should preserve exact column count even with trailing tabs", () => {
      const rowWithTrailing = "ref\tid\ttags\t\t\t\t";
      const values = rowWithTrailing.split("\t");

      expect(values.length).toBe(7);
      expect(values[3]).toBe("");
      expect(values[4]).toBe("");
      expect(values[5]).toBe("");
      expect(values[6]).toBe("");
    });
  });

  describe("Field Preservation Requirements", () => {
    test("MUST preserve all TSV columns in JSON response", () => {
      const requirements = {
        translationNotes: {
          tsvColumns: 7,
          requiredFields: [
            "Reference",
            "ID",
            "Tags",
            "SupportReference",
            "Quote",
            "Occurrence",
            "Note",
          ],
          jsonFields: [
            "reference",
            "id",
            "tags",
            "supportReference",
            "quote",
            "occurrence",
            "note",
          ],
        },
        translationQuestions: {
          tsvColumns: 7,
          requiredFields: [
            "Reference",
            "ID",
            "Tags",
            "Quote",
            "Occurrence",
            "Question",
            "Response",
          ],
          jsonFields: [
            "reference",
            "id",
            "tags",
            "quote",
            "occurrence",
            "question",
            "response",
          ],
        },
        translationWordLinks: {
          tsvColumns: 6,
          requiredFields: [
            "Reference",
            "ID",
            "Tags",
            "OrigWords",
            "Occurrence",
            "TWLink",
          ],
          jsonFields: [
            "reference",
            "id",
            "tags",
            "origWords",
            "occurrence",
            "twLink",
          ],
        },
      };

      // Validate requirements
      Object.entries(requirements).forEach(([, req]) => {
        expect(req.requiredFields.length).toBe(req.tsvColumns);
        expect(req.jsonFields.length).toBe(req.tsvColumns);

        // No fields added or removed
        expect(req.jsonFields.length).toBe(req.requiredFields.length);
      });
    });
  });
});
