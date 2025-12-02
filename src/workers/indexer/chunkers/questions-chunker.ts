/**
 * Translation Questions Chunker
 *
 * Processes Translation Questions ZIP files and generates question-level chunks.
 * Each Q&A pair is stored as a separate .md file.
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
  book: string;
  chapter: number;
  verse: number;
  questionId: string;
  questionText: string;
  answerText: string;
}

/**
 * Parse TSV content to extract questions
 * TSV format: Reference, ID, Tags, Quote, Occurrence, Question, Answer
 */
function parseTSV(tsv: string, book: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = tsv.split("\n");

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue;

    const [reference, id, _tags, _quote, _occurrence, question, answer] =
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
      book: book.toUpperCase(),
      chapter,
      verse,
      questionId: id || `q${i}`,
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
 * Process a Translation Questions ZIP file and generate chunks
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

  for (const file of tsvFiles) {
    // Extract book code from path
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

    console.log(`[Questions Chunker] Processing questions for: ${book}`);

    const questions = parseTSV(file.content, book);
    console.log(
      `[Questions Chunker] Parsed ${questions.length} questions from ${book}`,
    );

    // Track question number per verse for unique IDs
    const verseQuestionCount = new Map<string, number>();

    for (const q of questions) {
      const verseKey = `${q.chapter}:${q.verse}`;
      const qNum = (verseQuestionCount.get(verseKey) || 0) + 1;
      verseQuestionCount.set(verseKey, qNum);

      const basePath = `${parsed.language}/${parsed.organization}/tq/${parsed.version}/${q.book}/${q.chapter}`;

      const metadata: TranslationQuestionsMetadata = {
        language: parsed.language,
        language_name: parsed.language === "en" ? "English" : parsed.language,
        organization: parsed.organization,
        resource: "tq",
        resource_name: "Translation Questions",
        version: parsed.version,
        chunk_level: "question",
        indexed_at: new Date().toISOString(),
        book: q.book,
        book_name: BOOK_NAMES[q.book] || q.book,
        chapter: q.chapter,
        verse: q.verse,
        question_id: q.questionId,
        question_text: q.questionText,
        answer_text: q.answerText,
      };

      // Format as Q&A
      const content = `**Question:** ${q.questionText}\n\n**Answer:** ${q.answerText}`;

      chunks.push({
        path: `${basePath}/${q.verse}-q${qNum}.md`,
        content,
        metadata,
      });
    }
  }

  console.log(`[Questions Chunker] Generated ${chunks.length} total chunks`);
  return chunks;
}
