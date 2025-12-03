/**
 * Translation Notes Chunker (Book-Level)
 *
 * Processes Translation Notes ZIP files and generates ONE chunk per book.
 * Each book is a single markdown file with C:V headers and inline TA references.
 *
 * Output format:
 * ```markdown
 * # Translation Notes: Genesis
 *
 * ## Chapter 1
 *
 * ### 1:1
 * **"In the beginning"** - This phrase refers to the start of creation. (See: figs-explicit)
 *
 * ### 1:2
 * **"formless and empty"** - This is a merism meaning completely without form. (See: figs-merism)
 * ```
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationNotesMetadata,
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

/**
 * Parsed note from TSV
 */
interface ParsedNote {
  chapter: number;
  verse: number;
  phrase: string;
  note: string;
  taReference?: string; // Translation Academy module ID
}

/**
 * Parse TSV content to extract notes
 * TSV format: Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
 */
function parseTSV(tsv: string): ParsedNote[] {
  const notes: ParsedNote[] = [];
  const lines = tsv.split("\n");

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue;

    const [reference, _id, _tags, supportReference, quote, _occurrence, note] =
      columns;

    // Parse reference (e.g., "3:16" or "front:intro")
    const refMatch = reference.match(/^(\d+):(\d+)$/);
    if (!refMatch) continue;

    const chapter = parseInt(refMatch[1], 10);
    const verse = parseInt(refMatch[2], 10);

    if (isNaN(chapter) || isNaN(verse)) continue;

    // Extract TA module from supportReference (e.g., "rc://*/ta/man/translate/figs-metaphor")
    let taReference: string | undefined;
    if (supportReference) {
      const taMatch = supportReference.match(/\/([^/]+)$/);
      if (taMatch) {
        taReference = taMatch[1];
      }
    }

    notes.push({
      chapter,
      verse,
      phrase: quote || "",
      note: cleanNoteContent(note || ""),
      taReference,
    });
  }

  return notes;
}

/**
 * Clean note content (remove markdown formatting, clean up text)
 */
function cleanNoteContent(note: string): string {
  let cleaned = note;

  // Convert markdown links to plain text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove rc:// links but keep the text
  cleaned = cleaned.replace(/rc:\/\/[^\s)]+/g, "");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Extract book code from file path
 * Patterns: tn_JHN.tsv, 43-JHN.tsv, JHN/tn_JHN.tsv
 */
function extractBookFromPath(path: string): string | null {
  // Pattern: tn_XXX.tsv or XX-XXX.tsv
  const match = path.match(/(?:tn_|(\d{2})-?)([A-Z1-3]{3})\.tsv/i);
  if (match) {
    return (match[2] || match[1]).toUpperCase();
  }

  // Pattern: XXX/...tsv (book folder)
  const folderMatch = path.match(/\/([A-Z1-3]{3})\//i);
  if (folderMatch) {
    return folderMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Generate markdown content for a book's notes with C:V format
 */
function generateNotesMarkdown(bookName: string, notes: ParsedNote[]): string {
  const lines: string[] = [];
  lines.push(`# Translation Notes: ${bookName}`);
  lines.push("");

  // Group notes by chapter, then verse
  const chapterMap = new Map<number, Map<number, ParsedNote[]>>();
  for (const note of notes) {
    if (!chapterMap.has(note.chapter)) {
      chapterMap.set(note.chapter, new Map());
    }
    const verseMap = chapterMap.get(note.chapter)!;
    if (!verseMap.has(note.verse)) {
      verseMap.set(note.verse, []);
    }
    verseMap.get(note.verse)!.push(note);
  }

  // Sort chapters
  const sortedChapters = [...chapterMap.keys()].sort((a, b) => a - b);

  for (const chapter of sortedChapters) {
    lines.push(`## Chapter ${chapter}`);
    lines.push("");

    const verseMap = chapterMap.get(chapter)!;
    const sortedVerses = [...verseMap.keys()].sort((a, b) => a - b);

    for (const verse of sortedVerses) {
      // C:V header for self-documenting snippets
      lines.push(`### ${chapter}:${verse}`);

      const verseNotes = verseMap.get(verse)!;
      for (const note of verseNotes) {
        // Format: **"phrase"** - note content (See: ta-module)
        let noteLine = "";
        if (note.phrase) {
          noteLine += `**"${note.phrase}"** - `;
        }
        noteLine += note.note;
        if (note.taReference) {
          noteLine += ` (See: ${note.taReference})`;
        }
        lines.push(noteLine);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Process a Translation Notes ZIP file and generate book-level chunks
 */
export async function processTranslationNotes(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Notes Chunker] Processing ${files.length} files from ZIP`);

  // Find TSV files and group by book
  const tsvFiles = files.filter((f) => f.path.endsWith(".tsv"));
  console.log(`[Notes Chunker] Found ${tsvFiles.length} TSV files`);

  // Group files by book
  const bookFiles = new Map<string, typeof tsvFiles>();
  for (const file of tsvFiles) {
    const book = extractBookFromPath(file.path);
    if (!book) {
      console.log(`[Notes Chunker] Could not extract book from: ${file.path}`);
      continue;
    }

    // Skip intro/front matter files
    if (book.toLowerCase() === "front" || file.path.includes("front")) {
      continue;
    }

    if (!bookFiles.has(book)) {
      bookFiles.set(book, []);
    }
    bookFiles.get(book)!.push(file);
  }

  console.log(`[Notes Chunker] Found ${bookFiles.size} books`);

  for (const [book, files] of bookFiles) {
    const bookName = BOOK_NAMES[book] || book;
    console.log(`[Notes Chunker] Processing book: ${book} (${bookName})`);

    // Combine notes from all files for this book
    const allNotes: ParsedNote[] = [];
    for (const file of files) {
      const notes = parseTSV(file.content);
      allNotes.push(...notes);
    }

    console.log(`[Notes Chunker] Parsed ${allNotes.length} notes from ${book}`);

    if (allNotes.length === 0) {
      console.log(`[Notes Chunker] Skipping ${book} - no notes found`);
      continue;
    }

    // Collect unique chapters and TA references
    const chapters = [...new Set(allNotes.map((n) => n.chapter))].sort(
      (a, b) => a - b,
    );
    const taReferences = [
      ...new Set(allNotes.map((n) => n.taReference).filter(Boolean)),
    ] as string[];

    // Generate markdown content
    const content = generateNotesMarkdown(bookName, allNotes);

    // Create metadata
    const metadata: TranslationNotesMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: "tn",
      resource_name: "Translation Notes",
      version: parsed.version,
      chunk_level: "book",
      indexed_at: new Date().toISOString(),
      book: book,
      book_name: bookName,
      note_count: allNotes.length,
      chapters_covered: chapters,
      ta_references: taReferences.length > 0 ? taReferences : undefined,
    };

    // Create chunk path: lang/org/tn/version/BOOK.md
    const chunkPath = `${parsed.language}/${parsed.organization}/tn/${parsed.version}/${book}.md`;

    chunks.push({
      path: chunkPath,
      content,
      metadata,
    });
  }

  console.log(`[Notes Chunker] Generated ${chunks.length} book chunks`);
  return chunks;
}
