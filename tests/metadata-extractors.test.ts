/**
 * Tests for metadata extraction utilities
 *
 * These tests verify that metadata is correctly extracted from:
 * - File paths (book codes, article IDs)
 * - USFM content (chapters, verses)
 * - Markdown content (titles)
 * - TSV content (references)
 */

import { describe, it, expect } from "vitest";
import {
  extractBookFromPath,
  extractTWArticleFromPath,
  extractTAArticleFromPath,
  extractLanguageFromRepo,
  extractResourceFromRepo,
  extractVersionFromUrl,
  extractUSFMMetadata,
  extractMarkdownTitle,
  extractTSVReferences,
  formatScriptureReference,
  formatTWReference,
  formatTAReference,
  BOOK_CODES,
  BOOK_NUMBER_TO_CODE,
} from "../src/utils/metadata-extractors.js";

describe("Metadata Extractors", () => {
  describe("Path Extraction", () => {
    describe("extractBookFromPath", () => {
      it("should extract book from numbered format (43-JHN.usfm)", () => {
        expect(extractBookFromPath("43-JHN.usfm")).toBe("JHN");
        expect(extractBookFromPath("01-GEN.usfm")).toBe("GEN");
        expect(extractBookFromPath("66-REV.usfm")).toBe("REV");
      });

      it("should extract book from 3-letter code format", () => {
        expect(extractBookFromPath("JHN.usfm")).toBe("JHN");
        expect(extractBookFromPath("GEN.usfm")).toBe("GEN");
      });

      it("should extract book from full name format", () => {
        expect(extractBookFromPath("john.usfm")).toBe("JHN");
        expect(extractBookFromPath("genesis.usfm")).toBe("GEN");
      });

      it("should return undefined for invalid paths", () => {
        expect(extractBookFromPath("invalid.txt")).toBeUndefined();
        expect(extractBookFromPath("")).toBeUndefined();
      });
    });

    describe("extractTWArticleFromPath", () => {
      it("should extract TW article info from bible/kt path", () => {
        const result = extractTWArticleFromPath("bible/kt/grace.md");
        expect(result).toEqual({ category: "kt", articleId: "grace" });
      });

      it("should extract TW article info from bible/names path", () => {
        const result = extractTWArticleFromPath("bible/names/paul.md");
        expect(result).toEqual({ category: "names", articleId: "paul" });
      });

      it("should extract TW article info from bible/other path", () => {
        const result = extractTWArticleFromPath("bible/other/bread.md");
        expect(result).toEqual({ category: "other", articleId: "bread" });
      });

      it("should return undefined for non-TW paths", () => {
        expect(
          extractTWArticleFromPath("translate/figs-metaphor/01.md"),
        ).toBeUndefined();
      });
    });

    describe("extractTAArticleFromPath", () => {
      it("should extract TA article info from translate path", () => {
        const result = extractTAArticleFromPath(
          "translate/figs-metaphor/01.md",
        );
        expect(result).toEqual({
          category: "translate",
          articleId: "figs-metaphor",
        });
      });

      it("should extract TA article info from checking path", () => {
        const result = extractTAArticleFromPath("checking/vol1-checking/01.md");
        expect(result).toEqual({
          category: "checking",
          articleId: "vol1-checking",
        });
      });

      it("should return undefined for non-TA paths", () => {
        expect(extractTAArticleFromPath("bible/kt/grace.md")).toBeUndefined();
      });
    });

    describe("extractLanguageFromRepo", () => {
      it("should extract 2-letter language code", () => {
        expect(extractLanguageFromRepo("en_ult")).toBe("en");
        expect(extractLanguageFromRepo("es_ulb")).toBe("es");
      });

      it("should extract language with region code", () => {
        expect(extractLanguageFromRepo("es-419_ulb")).toBe("es-419");
        expect(extractLanguageFromRepo("pt-br_ult")).toBe("pt-br");
      });

      it("should return unknown for invalid repos", () => {
        expect(extractLanguageFromRepo("")).toBe("unknown");
      });
    });

    describe("extractResourceFromRepo", () => {
      it("should extract resource type from repo name", () => {
        expect(extractResourceFromRepo("en_ult")).toBe("ult");
        expect(extractResourceFromRepo("en_tn")).toBe("tn");
        expect(extractResourceFromRepo("en_tw")).toBe("tw");
      });
    });

    describe("extractVersionFromUrl", () => {
      it("should extract version from ZIP URL", () => {
        expect(extractVersionFromUrl("/archive/v85.zip")).toBe("v85");
        expect(
          extractVersionFromUrl(
            "https://git.door43.org/unfoldingWord/en_ult/archive/v86.zip",
          ),
        ).toBe("v86");
      });

      it("should return latest for invalid URLs", () => {
        expect(extractVersionFromUrl("invalid")).toBe("latest");
      });
    });
  });

  describe("Content Extraction", () => {
    describe("extractUSFMMetadata", () => {
      it("should extract chapters from USFM", () => {
        const usfm = `\\c 1\n\\v 1 In the beginning...\n\\c 2\n\\v 1 And on the seventh day...`;
        const result = extractUSFMMetadata(usfm);
        expect(result.chapters).toEqual([1, 2]);
      });

      it("should extract verse range from USFM", () => {
        const usfm = `\\c 3\n\\v 1 First verse\n\\v 16 For God so loved...\n\\v 17 Another verse`;
        const result = extractUSFMMetadata(usfm);
        expect(result.verseRange).toEqual({ start: 1, end: 17 });
      });

      it("should handle verse ranges like \\v 1-3", () => {
        const usfm = `\\c 1\n\\v 1-3 Three verses together`;
        const result = extractUSFMMetadata(usfm);
        expect(result.verseRange).toEqual({ start: 1, end: 3 });
      });
    });

    describe("extractMarkdownTitle", () => {
      it("should extract H1 title from markdown", () => {
        const md = `# Grace\n\nGrace is unmerited favor...`;
        expect(extractMarkdownTitle(md)).toBe("Grace");
      });

      it("should extract first line if no H1", () => {
        const md = `Grace is unmerited favor from God.`;
        expect(extractMarkdownTitle(md)).toBe(
          "Grace is unmerited favor from God.",
        );
      });

      it("should skip frontmatter", () => {
        const md = `---\nid: grace\n---\n# Grace\n\nContent here`;
        // Should skip the ---
        const title = extractMarkdownTitle(md);
        expect(title).toBe("Grace");
      });
    });

    describe("extractTSVReferences", () => {
      it("should extract references from TSV with Reference column", () => {
        const tsv = `Reference\tNote\n3:16\tFor God so loved\n3:17\tFor God did not send`;
        const refs = extractTSVReferences(tsv);
        expect(refs).toHaveLength(2);
        expect(refs[0]).toEqual({ chapter: 3, verseStart: 16 });
        expect(refs[1]).toEqual({ chapter: 3, verseStart: 17 });
      });

      it("should handle verse ranges in references", () => {
        const tsv = `Reference\tNote\n1:1-3\tFirst few verses`;
        const refs = extractTSVReferences(tsv);
        expect(refs[0]).toEqual({ chapter: 1, verseStart: 1, verseEnd: 3 });
      });
    });
  });

  describe("Reference Formatting", () => {
    describe("formatScriptureReference", () => {
      it("should format book only", () => {
        expect(formatScriptureReference("JHN")).toBe("John");
        expect(formatScriptureReference("GEN")).toBe("Genesis");
      });

      it("should format book and chapter", () => {
        expect(formatScriptureReference("JHN", 3)).toBe("John 3");
      });

      it("should format full reference", () => {
        expect(formatScriptureReference("JHN", 3, 16)).toBe("John 3:16");
      });

      it("should format verse range", () => {
        expect(formatScriptureReference("JHN", 3, 16, 17)).toBe("John 3:16-17");
      });
    });

    describe("formatTWReference", () => {
      it("should format with title and category", () => {
        expect(formatTWReference("grace", "kt", "Grace")).toBe(
          "Grace (Key Term)",
        );
        expect(formatTWReference("paul", "names", "Paul")).toBe("Paul (Name)");
      });

      it("should capitalize article ID if no title", () => {
        expect(formatTWReference("grace")).toBe("Grace");
      });
    });

    describe("formatTAReference", () => {
      it("should format with category", () => {
        expect(formatTAReference("figs-metaphor", "translate")).toBe(
          "Figs Metaphor (translate)",
        );
      });

      it("should use title if provided", () => {
        expect(
          formatTAReference("figs-metaphor", "translate", "Metaphor"),
        ).toBe("Metaphor (translate)");
      });
    });
  });

  describe("Book Code Mappings", () => {
    it("should map book names to codes correctly", () => {
      expect(BOOK_CODES["genesis"]).toBe("GEN");
      expect(BOOK_CODES["john"]).toBe("JHN");
      expect(BOOK_CODES["revelation"]).toBe("REV");
    });

    it("should map book numbers to codes correctly", () => {
      expect(BOOK_NUMBER_TO_CODE[1]).toBe("GEN");
      expect(BOOK_NUMBER_TO_CODE[43]).toBe("JHN");
      expect(BOOK_NUMBER_TO_CODE[66]).toBe("REV");
    });

    it("should have all 66 books", () => {
      expect(Object.keys(BOOK_NUMBER_TO_CODE).length).toBe(66);
    });
  });
});
