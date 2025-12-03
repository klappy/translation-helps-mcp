/**
 * Scripture Chunker (Book-Level)
 *
 * Processes scripture ZIP files and generates ONE chunk per book.
 * Each book is a single markdown file with C:V format for self-documenting snippets.
 *
 * Output format:
 * ```markdown
 * # Genesis
 *
 * ## Chapter 1
 *
 * 1:1 In the beginning God created the heavens and the earth.
 * 1:2 The earth was formless and empty...
 * ```
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  ScriptureMetadata,
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
  t4t: "Translation for Translators",
};

/**
 * Parsed verse from USFM
 */
interface ParsedVerse {
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Clean USFM content by removing alignment markers and formatting
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
 * Extract section titles from USFM \s markers
 */
function extractSections(usfm: string): string[] {
  const sections: string[] = [];
  const sectionMatches = [...usfm.matchAll(/\\s\d?\s+([^\n\\]+)/g)];

  for (const match of sectionMatches) {
    const title = match[1].trim();
    if (title && !sections.includes(title)) {
      sections.push(title);
    }
  }

  return sections;
}

/**
 * Generate markdown content for a book with C:V format
 */
function generateBookMarkdown(bookName: string, verses: ParsedVerse[]): string {
  const lines: string[] = [];
  lines.push(`# ${bookName}`);
  lines.push("");

  // Group verses by chapter
  const chapterMap = new Map<number, ParsedVerse[]>();
  for (const verse of verses) {
    if (!chapterMap.has(verse.chapter)) {
      chapterMap.set(verse.chapter, []);
    }
    chapterMap.get(verse.chapter)!.push(verse);
  }

  // Sort chapters
  const sortedChapters = [...chapterMap.keys()].sort((a, b) => a - b);

  for (const chapter of sortedChapters) {
    lines.push(`## Chapter ${chapter}`);
    lines.push("");

    const chapterVerses = chapterMap.get(chapter)!;
    // Sort verses within chapter
    chapterVerses.sort((a, b) => a.verse - b.verse);

    for (const verse of chapterVerses) {
      // C:V format for self-documenting snippets
      lines.push(`${chapter}:${verse.verse} ${verse.text}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Process a scripture ZIP file and generate book-level chunks
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
    const bookName = BOOK_NAMES[book] || book;
    console.log(`[Scripture Chunker] Processing book: ${book} (${bookName})`);

    // Parse verses from USFM
    const verses = parseUSFMVerses(file.content);
    console.log(
      `[Scripture Chunker] Parsed ${verses.length} verses from ${book}`,
    );

    if (verses.length === 0) {
      console.log(`[Scripture Chunker] Skipping ${book} - no verses found`);
      continue;
    }

    // Extract sections from USFM \s markers
    const sections = extractSections(file.content);

    // Count unique chapters
    const chapters = new Set(verses.map((v) => v.chapter));

    // Generate markdown content
    const content = generateBookMarkdown(bookName, verses);

    // Create metadata
    const metadata: ScriptureMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: parsed.resourceName,
      resource_name:
        RESOURCE_NAMES[parsed.resourceName.toLowerCase()] ||
        parsed.resourceName,
      version: parsed.version,
      chunk_level: "book",
      indexed_at: new Date().toISOString(),
      book: book,
      book_name: bookName,
      verse_count: verses.length,
      chapter_count: chapters.size,
      sections: sections.length > 0 ? sections : undefined,
    };

    // Create chunk path: lang/org/resource/version/BOOK.md
    const chunkPath = `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}.md`;

    chunks.push({
      path: chunkPath,
      content,
      metadata,
    });
  }

  console.log(`[Scripture Chunker] Generated ${chunks.length} book chunks`);
  return chunks;
}
