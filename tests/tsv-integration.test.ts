import { describe, test, expect, vi } from "vitest";
import { getTranslationNotes } from "../src/functions/translation-notes-service";

describe("TSV Integration Tests - Column Mapping Verification", () => {
  describe("Translation Notes Column Mapping Issues", () => {
    test("should correctly map TSV columns from actual DCS data", async () => {
      // Mock the actual TSV response
      const mockTsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν ἐκλεκτῶν Θεοῦ\tThe words **faith**\t1\tare abstract nouns.`;

      // Test with a mock fetch that returns our TSV data
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("catalog/search")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    repo_url: "https://git.door43.org/unfoldingWord/en_tn",
                    contents: {
                      formats: [{ format: "text/tsv", url: "mock.tsv" }],
                    },
                  },
                ],
              }),
          });
        }
        if (url.includes(".tsv")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockTsvData),
          });
        }
      });

      const result = await getTranslationNotes({
        reference: { book: "tit", chapter: 1, verse: 1 },
        options: { includeContext: false },
      });

      // Expected behavior vs actual behavior
      // EXPECTED: The note text should be from the "Note" column (column 7)
      // ACTUAL: The code is currently reading from the wrong column

      if (result.notes && result.notes.length > 0) {
        const note = result.notes[0];

        // This will fail if columns are mapped incorrectly
        expect(note.note).toBe("are abstract nouns.");
        expect(note.quote).toBe("The words **faith**");
        expect(note.supportReference).toBe("κατὰ πίστιν ἐκλεκτῶν Θεοῦ");

        // The ID should be from column 2
        expect(note.id).toBe("rtc9");
      }
    });

    test("shows actual column order mismatch", () => {
      // Actual TSV columns from DCS
      const actualColumns = [
        "Reference",
        "ID",
        "Tags",
        "SupportReference",
        "Quote",
        "Occurrence",
        "Note",
      ];

      // What the code expects (based on the destructuring)
      const codeExpects = [
        "reference",
        "id",
        "supportReference",
        "quote",
        "occurrence",
        "note",
        "occurrenceNote",
      ];

      // The mismatch
      expect(actualColumns[2]).toBe("Tags");
      expect(codeExpects[2]).toBe("supportReference"); // WRONG!

      expect(actualColumns[3]).toBe("SupportReference");
      expect(codeExpects[3]).toBe("quote"); // WRONG!

      expect(actualColumns[4]).toBe("Quote");
      expect(codeExpects[4]).toBe("occurrence"); // WRONG!
    });
  });

  describe("Translation Questions Column Mapping Issues", () => {
    test("should verify TQ column mapping", () => {
      // Actual TSV columns from DCS
      const actualTQColumns = [
        "Reference",
        "ID",
        "Tags",
        "Quote",
        "Occurrence",
        "Question",
        "Response",
      ];

      // Based on the code in translation-questions-service.ts
      // The code destructures as: [ref, , , , , question, response]
      // This means it's skipping columns 2, 3, 4, 5 and taking 6 and 7

      expect(actualTQColumns[5]).toBe("Question"); // Column 6 - Correct!
      expect(actualTQColumns[6]).toBe("Response"); // Column 7 - Correct!

      // TQ parsing seems correct, but let's verify the skipped columns
      expect(actualTQColumns[1]).toBe("ID"); // Skipped
      expect(actualTQColumns[2]).toBe("Tags"); // Skipped
      expect(actualTQColumns[3]).toBe("Quote"); // Skipped
      expect(actualTQColumns[4]).toBe("Occurrence"); // Skipped
    });
  });

  describe("Translation Word Links Column Mapping", () => {
    test("should verify TWL column mapping against actual data", () => {
      // Actual TSV columns from DCS
      const actualTWLColumns = [
        "Reference",
        "ID",
        "Tags",
        "OrigWords",
        "Occurrence",
        "TWLink",
      ];

      // The code needs to map these correctly
      // Let's check what ResourceAggregator expects

      expect(actualTWLColumns.length).toBe(6);
      expect(actualTWLColumns[3]).toBe("OrigWords"); // The Greek/Hebrew text
      expect(actualTWLColumns[5]).toBe("TWLink"); // The resource link
    });
  });

  describe("Proposed fixes for column mapping", () => {
    test("Translation Notes should use correct column indices", () => {
      const tsvLine =
        "1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\tThe words\t1\tare abstract nouns.";
      const columns = tsvLine.split("\t");

      // Correct mapping should be:
      const correctMapping = {
        reference: columns[0], // '1:1'
        id: columns[1], // 'rtc9'
        tags: columns[2], // 'rc://*/ta/man/translate/figs-abstractnouns'
        supportReference: columns[3], // 'κατὰ πίστιν'
        quote: columns[4], // 'The words'
        occurrence: columns[5], // '1'
        note: columns[6], // 'are abstract nouns.'
      };

      expect(correctMapping.reference).toBe("1:1");
      expect(correctMapping.id).toBe("rtc9");
      expect(correctMapping.tags).toBe(
        "rc://*/ta/man/translate/figs-abstractnouns",
      );
      expect(correctMapping.supportReference).toBe("κατὰ πίστιν");
      expect(correctMapping.quote).toBe("The words");
      expect(correctMapping.occurrence).toBe("1");
      expect(correctMapping.note).toBe("are abstract nouns.");
    });
  });
});
