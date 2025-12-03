/**
 * Translation Questions Chunker (Book-Level)
 *
 * Processes Translation Questions ZIP files and generates ONE chunk per book.
 * Each book is a single markdown file with C:V headers for Q&A pairs.
 *
 * Output format:
 * ```markdown
 * # Translation Questions: Genesis
 *
 * ## Chapter 1
 *
 * ### 1:1
 * **Q:** What did God create in the beginning?
 * **A:** God created the heavens and the earth.
 *
 * ### 1:2
 * **Q:** What was the state of the earth?
 * **A:** The earth was formless and empty.
 * ```
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationQuestionsMetadata,
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
 * Parsed question from TSV
 */
interface ParsedQuestion {
  chapter: number;
  verse: number;
  questionText: string;
  answerText: string;
}

/**
 * Parse TSV content to extract questions
 * TSV format: Reference, ID, Tags, Quote, Occurrence, Question, Answer
 */
function parseTSV(tsv: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = tsv.split("\n");

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue;

    const [reference, _id, _tags, _quote, _occurrence, question, answer] =
      columns;

    // Parse reference (e.g., "3:16")
    const refMatch = reference.match(/^(\d+):(\d+)$/);
    if (!refMatch) continue;

    const chapter = parseInt(refMatch[1], 10);
    const verse = parseInt(refMatch[2], 10);

    if (isNaN(chapter) || isNaN(verse)) continue;

    // Skip if missing question or answer
    if (!question || !answer) continue;

    questions.push({
      chapter,
      verse,
      questionText: cleanText(question),
      answerText: cleanText(answer),
    });
  }

  return questions;
}

/**
 * Clean text content
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract book code from file path
 * Patterns: tq_JHN.tsv, 43-JHN.tsv, JHN/tq_JHN.tsv
 */
function extractBookFromPath(path: string): string | null {
  // Pattern: tq_XXX.tsv or XX-XXX.tsv
  const match = path.match(/(?:tq_|(\d{2})-?)([A-Z1-3]{3})\.tsv/i);
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
 * Generate markdown content for a book's questions with C:V format
 */
function generateQuestionsMarkdown(
  bookName: string,
  questions: ParsedQuestion[],
): string {
  const lines: string[] = [];
  lines.push(`# Translation Questions: ${bookName}`);
  lines.push("");

  // Group questions by chapter, then verse
  const chapterMap = new Map<number, Map<number, ParsedQuestion[]>>();
  for (const question of questions) {
    if (!chapterMap.has(question.chapter)) {
      chapterMap.set(question.chapter, new Map());
    }
    const verseMap = chapterMap.get(question.chapter)!;
    if (!verseMap.has(question.verse)) {
      verseMap.set(question.verse, []);
    }
    verseMap.get(question.verse)!.push(question);
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

      const verseQuestions = verseMap.get(verse)!;
      for (const q of verseQuestions) {
        lines.push(`**Q:** ${q.questionText}`);
        lines.push(`**A:** ${q.answerText}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Process a Translation Questions ZIP file and generate book-level chunks
 */
export async function processTranslationQuestions(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Questions Chunker] Processing ${files.length} files from ZIP`);

  // Find TSV files
  const tsvFiles = files.filter((f) => f.path.endsWith(".tsv"));
  console.log(`[Questions Chunker] Found ${tsvFiles.length} TSV files`);

  // Group files by book
  const bookFiles = new Map<string, typeof tsvFiles>();
  for (const file of tsvFiles) {
    const book = extractBookFromPath(file.path);
    if (!book) {
      console.log(
        `[Questions Chunker] Could not extract book from: ${file.path}`,
      );
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

  console.log(`[Questions Chunker] Found ${bookFiles.size} books`);

  for (const [book, files] of bookFiles) {
    const bookName = BOOK_NAMES[book] || book;
    console.log(`[Questions Chunker] Processing book: ${book} (${bookName})`);

    // Combine questions from all files for this book
    const allQuestions: ParsedQuestion[] = [];
    for (const file of files) {
      const questions = parseTSV(file.content);
      allQuestions.push(...questions);
    }

    console.log(
      `[Questions Chunker] Parsed ${allQuestions.length} questions from ${book}`,
    );

    if (allQuestions.length === 0) {
      console.log(`[Questions Chunker] Skipping ${book} - no questions found`);
      continue;
    }

    // Collect unique chapters
    const chapters = [...new Set(allQuestions.map((q) => q.chapter))].sort(
      (a, b) => a - b,
    );

    // Generate markdown content
    const content = generateQuestionsMarkdown(bookName, allQuestions);

    // Create metadata
    const metadata: TranslationQuestionsMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: "tq",
      resource_name: "Translation Questions",
      version: parsed.version,
      chunk_level: "book",
      indexed_at: new Date().toISOString(),
      book: book,
      book_name: bookName,
      question_count: allQuestions.length,
      chapters_covered: chapters,
    };

    // Create chunk path: lang/org/tq/version/BOOK.md
    const chunkPath = `${parsed.language}/${parsed.organization}/tq/${parsed.version}/${book}.md`;

    chunks.push({
      path: chunkPath,
      content,
      metadata,
    });
  }

  console.log(`[Questions Chunker] Generated ${chunks.length} book chunks`);
  return chunks;
}
