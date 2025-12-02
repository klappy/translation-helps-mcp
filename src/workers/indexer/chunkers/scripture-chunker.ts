/**
 * Scripture Chunker
 *
 * Processes scripture ZIP files and generates multi-level chunks:
 * - Verse level: Individual verses for precise lookups
 * - Passage level: Pericopes (story units) for thematic search
 * - Chapter level: Full chapters with summaries
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  ScriptureMetadata,
  ChunkLevel,
} from "../types.js";
import { extractAllFiles } from "../utils/zip-handler.js";

// Book code to full name mapping
const BOOK_NAMES: Record<string, string> = {
  GEN: "Genesis",
  EXO: "Exodus",
  LEV: "Leviticus",
  NUM: "Numbers",
  DEU: "Deuteronomy",
  JOS: "Joshua",
  JDG: "Judges",
  RUT: "Ruth",
  "1SA": "1 Samuel",
  "2SA": "2 Samuel",
  "1KI": "1 Kings",
  "2KI": "2 Kings",
  "1CH": "1 Chronicles",
  "2CH": "2 Chronicles",
  EZR: "Ezra",
  NEH: "Nehemiah",
  EST: "Esther",
  JOB: "Job",
  PSA: "Psalms",
  PRO: "Proverbs",
  ECC: "Ecclesiastes",
  SNG: "Song of Solomon",
  ISA: "Isaiah",
  JER: "Jeremiah",
  LAM: "Lamentations",
  EZK: "Ezekiel",
  DAN: "Daniel",
  HOS: "Hosea",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obadiah",
  JON: "Jonah",
  MIC: "Micah",
  NAM: "Nahum",
  HAB: "Habakkuk",
  ZEP: "Zephaniah",
  HAG: "Haggai",
  ZEC: "Zechariah",
  MAL: "Malachi",
  MAT: "Matthew",
  MRK: "Mark",
  LUK: "Luke",
  JHN: "John",
  ACT: "Acts",
  ROM: "Romans",
  "1CO": "1 Corinthians",
  "2CO": "2 Corinthians",
  GAL: "Galatians",
  EPH: "Ephesians",
  PHP: "Philippians",
  COL: "Colossians",
  "1TH": "1 Thessalonians",
  "2TH": "2 Thessalonians",
  "1TI": "1 Timothy",
  "2TI": "2 Timothy",
  TIT: "Titus",
  PHM: "Philemon",
  HEB: "Hebrews",
  JAS: "James",
  "1PE": "1 Peter",
  "2PE": "2 Peter",
  "1JN": "1 John",
  "2JN": "2 John",
  "3JN": "3 John",
  JUD: "Jude",
  REV: "Revelation",
};

// Resource name to display name
const RESOURCE_NAMES: Record<string, string> = {
  ult: "Unfoldingword Literal Text",
  ust: "Unfoldingword Simplified Text",
  ueb: "Unfoldingword Easy-to-Read Bible",
};

/**
 * Parse a verse from USFM content
 */
interface ParsedVerse {
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Parse a section/passage from USFM content
 */
interface ParsedSection {
  title: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  text: string;
  verses: ParsedVerse[];
}

/**
 * Clean USFM content by removing alignment markers
 * Produces clean, readable text
 */
function cleanUSFM(usfm: string): string {
  let cleaned = usfm;

  // Remove alignment blocks: \zaln-s |...| \*...\zaln-e\*
  cleaned = cleaned.replace(
    /\\zaln-s\s*\|[^|]*\|\s*\\?\*[^\\]*\\zaln-e\\\*/g,
    " ",
  );

  // Clean orphaned zaln markers
  cleaned = cleaned.replace(/\\zaln-[se]\s*\|[^|]*\|\s*\\?\*/g, " ");
  cleaned = cleaned.replace(/\\zaln-[se]\\\*/g, " ");

  // Extract words from \w word|data\w* patterns
  cleaned = cleaned.replace(/\\w\s+([^|\\]+)\|[^\\]*\\w\*/g, "$1 ");
  cleaned = cleaned.replace(/\\w\s+([^\\]+?)\\w\*/g, "$1 ");

  // Remove USFM markers but keep verse/chapter structure info
  cleaned = cleaned.replace(/\\[a-zA-Z][a-zA-Z0-9-]*\*?/g, " ");
  cleaned = cleaned.replace(/\\[a-zA-Z-]+\s*/g, " ");

  // Remove attribute data
  cleaned = cleaned.replace(/\|[^|\\]*\|/g, " ");
  cleaned = cleaned.replace(/\|[^\\]*(?=\\|\s|$)/g, " ");

  // Remove special characters
  cleaned = cleaned.replace(/[|*\\]/g, " ");

  // Fix punctuation spacing
  cleaned = cleaned.replace(/\s*([,.;:!?])\s*/g, "$1 ");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned.trim();
}

/**
 * Parse USFM content to extract verses
 */
function parseUSFMVerses(usfm: string): ParsedVerse[] {
  const verses: ParsedVerse[] = [];
  let currentChapter = 0;

  // Split by verse markers
  const parts = usfm.split(/\\v\s+(\d+)\s*/);

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parseInt(parts[i], 10);
    let verseText = parts[i + 1] || "";

    // Check for chapter marker in the text
    const chapterMatch = verseText.match(/\\c\s+(\d+)/);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      verseText = verseText.replace(/\\c\s+\d+/, "");
    }

    // Also check before the verse marker
    if (i === 1) {
      const preMatch = parts[0].match(/\\c\s+(\d+)/);
      if (preMatch) {
        currentChapter = parseInt(preMatch[1], 10);
      }
    }

    const cleanText = cleanUSFM(verseText);
    if (cleanText && currentChapter > 0) {
      verses.push({
        chapter: currentChapter,
        verse: verseNum,
        text: cleanText,
      });
    }
  }

  return verses;
}

/**
 * Parse USFM content to extract sections (passages)
 * Uses \s markers and paragraph breaks as boundaries
 */
function parseUSFMSections(
  usfm: string,
  verses: ParsedVerse[],
): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Find section markers: \s, \s1, \s2
  const sectionMatches = [...usfm.matchAll(/\\s\d?\s+([^\n\\]+)/g)];

  if (sectionMatches.length === 0) {
    // No section markers - group by ~10 verses
    return groupVersesIntoPassages(verses, 10);
  }

  // Build sections from markers
  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const title = match[1].trim();
    const startIndex = match.index!;
    const endIndex = sectionMatches[i + 1]?.index ?? usfm.length;

    // Find verses in this section
    const sectionText = usfm.slice(startIndex, endIndex);
    const sectionVerses: ParsedVerse[] = [];

    // Get verse references from the section text
    const verseRefs = [...sectionText.matchAll(/\\c\s+(\d+)|\\v\s+(\d+)/g)];
    let currentChapter = 0;

    for (const ref of verseRefs) {
      if (ref[1]) {
        currentChapter = parseInt(ref[1], 10);
      } else if (ref[2] && currentChapter > 0) {
        const verseNum = parseInt(ref[2], 10);
        const verse = verses.find(
          (v) => v.chapter === currentChapter && v.verse === verseNum,
        );
        if (verse) {
          sectionVerses.push(verse);
        }
      }
    }

    if (sectionVerses.length > 0) {
      sections.push({
        title,
        startChapter: sectionVerses[0].chapter,
        startVerse: sectionVerses[0].verse,
        endChapter: sectionVerses[sectionVerses.length - 1].chapter,
        endVerse: sectionVerses[sectionVerses.length - 1].verse,
        text: sectionVerses.map((v) => v.text).join(" "),
        verses: sectionVerses,
      });
    }
  }

  return sections;
}

/**
 * Group verses into passages when no section markers exist
 */
function groupVersesIntoPassages(
  verses: ParsedVerse[],
  targetSize: number,
): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentSection: ParsedVerse[] = [];

  for (const verse of verses) {
    currentSection.push(verse);

    if (currentSection.length >= targetSize) {
      sections.push(versesToSection(currentSection));
      currentSection = [];
    }
  }

  if (currentSection.length > 0) {
    sections.push(versesToSection(currentSection));
  }

  return sections;
}

/**
 * Convert an array of verses to a section
 */
function versesToSection(verses: ParsedVerse[]): ParsedSection {
  return {
    title: `${verses[0].chapter}:${verses[0].verse}-${verses[verses.length - 1].verse}`,
    startChapter: verses[0].chapter,
    startVerse: verses[0].verse,
    endChapter: verses[verses.length - 1].chapter,
    endVerse: verses[verses.length - 1].verse,
    text: verses.map((v) => v.text).join(" "),
    verses,
  };
}

/**
 * Create common metadata for scripture
 */
function createScriptureMetadata(
  parsed: ParsedZipKey,
  book: string,
  chapter: number,
  chunkLevel: ChunkLevel,
): Omit<
  ScriptureMetadata,
  | "verse"
  | "verse_start"
  | "verse_end"
  | "passage_title"
  | "themes"
  | "summary"
  | "passages_in_chapter"
> {
  return {
    language: parsed.language,
    language_name: parsed.language === "en" ? "English" : parsed.language,
    organization: parsed.organization,
    resource: parsed.resourceName,
    resource_name:
      RESOURCE_NAMES[parsed.resourceName.toLowerCase()] || parsed.resourceName,
    version: parsed.version,
    chunk_level: chunkLevel,
    indexed_at: new Date().toISOString(),
    book: book.toUpperCase(),
    book_name: BOOK_NAMES[book.toUpperCase()] || book,
    chapter,
  };
}

/**
 * Process a scripture ZIP file and generate chunks
 */
export async function processScripture(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Scripture Chunker] Processing ${files.length} files from ZIP`);

  // Find USFM files
  const usfmFiles = files.filter(
    (f) => f.path.endsWith(".usfm") || f.path.endsWith(".USFM"),
  );

  console.log(`[Scripture Chunker] Found ${usfmFiles.length} USFM files`);

  for (const file of usfmFiles) {
    // Extract book code from filename (e.g., "43-JHN.usfm" -> "JHN")
    const bookMatch = file.path.match(/(\d{2})-?([A-Z1-3]{3})\.usfm/i);
    if (!bookMatch) {
      console.log(
        `[Scripture Chunker] Could not extract book from: ${file.path}`,
      );
      continue;
    }

    const book = bookMatch[2].toUpperCase();
    console.log(`[Scripture Chunker] Processing book: ${book}`);

    // Parse verses
    const verses = parseUSFMVerses(file.content);
    console.log(
      `[Scripture Chunker] Parsed ${verses.length} verses from ${book}`,
    );

    // Parse sections/passages
    const sections = parseUSFMSections(file.content, verses);
    console.log(
      `[Scripture Chunker] Parsed ${sections.length} sections from ${book}`,
    );

    // Group by chapter
    const chapterMap = new Map<number, ParsedVerse[]>();
    for (const verse of verses) {
      if (!chapterMap.has(verse.chapter)) {
        chapterMap.set(verse.chapter, []);
      }
      chapterMap.get(verse.chapter)!.push(verse);
    }

    // Generate verse-level chunks
    for (const verse of verses) {
      const basePath = `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}/${verse.chapter}/verses`;

      // Get context (previous and next verse text)
      const verseIndex = verses.indexOf(verse);
      const contextBefore =
        verseIndex > 0 ? verses[verseIndex - 1].text.slice(0, 100) : undefined;
      const contextAfter =
        verseIndex < verses.length - 1
          ? verses[verseIndex + 1].text.slice(0, 100)
          : undefined;

      const metadata: ScriptureMetadata = {
        ...createScriptureMetadata(parsed, book, verse.chapter, "verse"),
        verse: verse.verse,
        context_before: contextBefore,
        context_after: contextAfter,
      };

      chunks.push({
        path: `${basePath}/${verse.verse}.md`,
        content: verse.text,
        metadata,
      });
    }

    // Generate passage-level chunks
    for (const section of sections) {
      const basePath = `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}/${section.startChapter}/passages`;

      const metadata: ScriptureMetadata = {
        ...createScriptureMetadata(
          parsed,
          book,
          section.startChapter,
          "passage",
        ),
        verse_start: section.startVerse,
        verse_end: section.endVerse,
        passage_title: section.title,
        themes: [], // TODO: Extract themes from section heading
      };

      const fileName =
        section.startChapter === section.endChapter
          ? `${section.startVerse}-${section.endVerse}.md`
          : `${section.startChapter}_${section.startVerse}-${section.endChapter}_${section.endVerse}.md`;

      chunks.push({
        path: `${basePath}/${fileName}`,
        content: section.text,
        metadata,
      });
    }

    // Generate chapter-level chunks
    for (const [chapter, chapterVerses] of chapterMap) {
      const basePath = `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}/${chapter}`;

      // Find passages in this chapter
      const chapterSections = sections.filter(
        (s) => s.startChapter === chapter || s.endChapter === chapter,
      );

      const metadata: ScriptureMetadata = {
        ...createScriptureMetadata(parsed, book, chapter, "chapter"),
        passages_in_chapter: chapterSections.map((s) => s.title),
        summary: `${BOOK_NAMES[book] || book} Chapter ${chapter} - ${chapterVerses.length} verses`,
      };

      const chapterText = chapterVerses
        .map((v) => `${v.verse} ${v.text}`)
        .join("\n");

      chunks.push({
        path: `${basePath}/chapter.md`,
        content: chapterText,
        metadata,
      });
    }
  }

  console.log(`[Scripture Chunker] Generated ${chunks.length} total chunks`);
  return chunks;
}
