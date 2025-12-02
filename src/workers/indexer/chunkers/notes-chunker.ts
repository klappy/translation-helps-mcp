/**
 * Translation Notes Chunker
 *
 * Processes Translation Notes ZIP files and generates note-level chunks.
 * Each note is stored as a separate .md file with rich metadata.
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
  book: string;
  chapter: number;
  verse: number;
  noteId: string;
  supportReference: string;
  phrase: string;
  note: string;
}

/**
 * Parse TSV content to extract notes
 * TSV format: Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
 */
function parseTSV(tsv: string, book: string): ParsedNote[] {
  const notes: ParsedNote[] = [];
  const lines = tsv.split("\n");

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue;

    const [reference, id, _tags, supportReference, quote, _occurrence, note] =
      columns;

    // Parse reference (e.g., "3:16" or "front:intro")
    const refMatch = reference.match(/^(\d+):(\d+)$/);
    if (!refMatch) continue;

    const chapter = parseInt(refMatch[1], 10);
    const verse = parseInt(refMatch[2], 10);

    if (isNaN(chapter) || isNaN(verse)) continue;

    notes.push({
      book: book.toUpperCase(),
      chapter,
      verse,
      noteId: id || `note-${i}`,
      supportReference: supportReference || "",
      phrase: quote || "",
      note: cleanNoteContent(note || ""),
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
 * Process a Translation Notes ZIP file and generate chunks
 */
export async function processTranslationNotes(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Notes Chunker] Processing ${files.length} files from ZIP`);

  // Find TSV files
  const tsvFiles = files.filter((f) => f.path.endsWith(".tsv"));

  console.log(`[Notes Chunker] Found ${tsvFiles.length} TSV files`);

  for (const file of tsvFiles) {
    // Extract book code from path
    const book = extractBookFromPath(file.path);
    if (!book) {
      console.log(`[Notes Chunker] Could not extract book from: ${file.path}`);
      continue;
    }

    // Skip intro/front matter files
    if (book.toLowerCase() === "front" || file.path.includes("front")) {
      continue;
    }

    console.log(`[Notes Chunker] Processing notes for: ${book}`);

    const notes = parseTSV(file.content, book);
    console.log(`[Notes Chunker] Parsed ${notes.length} notes from ${book}`);

    for (const note of notes) {
      const basePath = `${parsed.language}/${parsed.organization}/tn/${parsed.version}/${note.book}/${note.chapter}`;

      const metadata: TranslationNotesMetadata = {
        language: parsed.language,
        language_name: parsed.language === "en" ? "English" : parsed.language,
        organization: parsed.organization,
        resource: "tn",
        resource_name: "Translation Notes",
        version: parsed.version,
        chunk_level: "note",
        indexed_at: new Date().toISOString(),
        book: note.book,
        book_name: BOOK_NAMES[note.book] || note.book,
        chapter: note.chapter,
        verse: note.verse,
        phrase: note.phrase,
        note_id: note.noteId,
        support_reference: note.supportReference || undefined,
      };

      // Create content with phrase context
      let content = "";
      if (note.phrase) {
        content += `**"${note.phrase}"**\n\n`;
      }
      content += note.note;

      chunks.push({
        path: `${basePath}/${note.verse}-${note.noteId}.md`,
        content,
        metadata,
      });
    }
  }

  console.log(`[Notes Chunker] Generated ${chunks.length} total chunks`);
  return chunks;
}
