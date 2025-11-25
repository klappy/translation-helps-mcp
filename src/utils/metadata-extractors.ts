/**
 * Metadata Extractors for AI Search Indexing
 *
 * Extracts rich metadata from file paths and content for proper
 * AI Search filtering and contextual results.
 *
 * Supports:
 * - Scripture: book, chapter, verse extraction from USFM
 * - Translation Helps: article IDs and titles from markdown
 * - Path-based extraction for all resource types
 */

import { logger } from "./logger.js";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Metadata extracted from content and paths
 */
export interface ContentMetadata {
  // Location identifiers
  language: string;
  organization: string;
  resource: string; // e.g., "ult", "tn", "tw", "ta", "tq"
  version: string;

  // Scripture-specific (bible, notes, questions)
  book?: string; // 3-letter code: "GEN", "MAT", "JHN"
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;

  // Article-specific (words, academy)
  articleId?: string; // e.g., "grace", "figs-metaphor"
  articleCategory?: string; // e.g., "kt", "names", "other" for TW; "translate", "checking" for TA
  title?: string; // Human-readable title

  // Content info
  originalPath: string;
  cleanPath: string;
  processedAt: string;
}

/**
 * Result from cleaning content - includes both text and metadata
 */
export interface CleanResult {
  text: string;
  metadata: ContentMetadata;
}

/**
 * Search result with rich contextual information
 */
export interface SearchHit {
  // Reference info
  reference: string; // "John 3:16" or "Grace (kt/grace.md)"

  // Content
  preview: string; // Matching snippet with highlights
  context: string; // Surrounding paragraph/verse for context

  // Metadata for filtering
  resource: string;
  language: string;
  organization: string;

  // Reference details
  book?: string;
  chapter?: number;
  verse?: number;
  articleId?: string;
  articleCategory?: string;

  // Scoring
  score: number;
  highlights: string[]; // Matched terms
}

// =============================================================================
// BOOK CODE MAPPINGS
// =============================================================================

/**
 * Map of book names/abbreviations to 3-letter codes
 */
export const BOOK_CODES: Record<string, string> = {
  // Old Testament
  gen: "GEN",
  genesis: "GEN",
  exo: "EXO",
  exod: "EXO",
  exodus: "EXO",
  lev: "LEV",
  leviticus: "LEV",
  num: "NUM",
  numbers: "NUM",
  deu: "DEU",
  deut: "DEU",
  deuteronomy: "DEU",
  jos: "JOS",
  josh: "JOS",
  joshua: "JOS",
  jdg: "JDG",
  judg: "JDG",
  judges: "JDG",
  rut: "RUT",
  ruth: "RUT",
  "1sa": "1SA",
  "1sam": "1SA",
  "1samuel": "1SA",
  "2sa": "2SA",
  "2sam": "2SA",
  "2samuel": "2SA",
  "1ki": "1KI",
  "1kgs": "1KI",
  "1kings": "1KI",
  "2ki": "2KI",
  "2kgs": "2KI",
  "2kings": "2KI",
  "1ch": "1CH",
  "1chr": "1CH",
  "1chronicles": "1CH",
  "2ch": "2CH",
  "2chr": "2CH",
  "2chronicles": "2CH",
  ezr: "EZR",
  ezra: "EZR",
  neh: "NEH",
  nehemiah: "NEH",
  est: "EST",
  esth: "EST",
  esther: "EST",
  job: "JOB",
  psa: "PSA",
  ps: "PSA",
  psalm: "PSA",
  psalms: "PSA",
  pro: "PRO",
  prov: "PRO",
  proverbs: "PRO",
  ecc: "ECC",
  eccl: "ECC",
  ecclesiastes: "ECC",
  sng: "SNG",
  song: "SNG",
  songofsolomon: "SNG",
  sos: "SNG",
  isa: "ISA",
  isaiah: "ISA",
  jer: "JER",
  jeremiah: "JER",
  lam: "LAM",
  lamentations: "LAM",
  ezk: "EZK",
  ezek: "EZK",
  ezekiel: "EZK",
  dan: "DAN",
  daniel: "DAN",
  hos: "HOS",
  hosea: "HOS",
  jol: "JOL",
  joel: "JOL",
  amo: "AMO",
  amos: "AMO",
  oba: "OBA",
  obad: "OBA",
  obadiah: "OBA",
  jon: "JON",
  jonah: "JON",
  mic: "MIC",
  micah: "MIC",
  nam: "NAM",
  nah: "NAM",
  nahum: "NAM",
  hab: "HAB",
  habakkuk: "HAB",
  zep: "ZEP",
  zeph: "ZEP",
  zephaniah: "ZEP",
  hag: "HAG",
  haggai: "HAG",
  zec: "ZEC",
  zech: "ZEC",
  zechariah: "ZEC",
  mal: "MAL",
  malachi: "MAL",
  // New Testament
  mat: "MAT",
  matt: "MAT",
  matthew: "MAT",
  mrk: "MRK",
  mark: "MRK",
  luk: "LUK",
  luke: "LUK",
  jhn: "JHN",
  john: "JHN",
  act: "ACT",
  acts: "ACT",
  rom: "ROM",
  romans: "ROM",
  "1co": "1CO",
  "1cor": "1CO",
  "1corinthians": "1CO",
  "2co": "2CO",
  "2cor": "2CO",
  "2corinthians": "2CO",
  gal: "GAL",
  galatians: "GAL",
  eph: "EPH",
  ephesians: "EPH",
  php: "PHP",
  phil: "PHP",
  philippians: "PHP",
  col: "COL",
  colossians: "COL",
  "1th": "1TH",
  "1thess": "1TH",
  "1thessalonians": "1TH",
  "2th": "2TH",
  "2thess": "2TH",
  "2thessalonians": "2TH",
  "1ti": "1TI",
  "1tim": "1TI",
  "1timothy": "1TI",
  "2ti": "2TI",
  "2tim": "2TI",
  "2timothy": "2TI",
  tit: "TIT",
  titus: "TIT",
  phm: "PHM",
  phlm: "PHM",
  philemon: "PHM",
  heb: "HEB",
  hebrews: "HEB",
  jas: "JAS",
  james: "JAS",
  "1pe": "1PE",
  "1pet": "1PE",
  "1peter": "1PE",
  "2pe": "2PE",
  "2pet": "2PE",
  "2peter": "2PE",
  "1jn": "1JN",
  "1john": "1JN",
  "2jn": "2JN",
  "2john": "2JN",
  "3jn": "3JN",
  "3john": "3JN",
  jud: "JUD",
  jude: "JUD",
  rev: "REV",
  revelation: "REV",
};

/**
 * Book number to code mapping (for USFM filenames like 43-JHN.usfm)
 */
export const BOOK_NUMBER_TO_CODE: Record<number, string> = {
  1: "GEN",
  2: "EXO",
  3: "LEV",
  4: "NUM",
  5: "DEU",
  6: "JOS",
  7: "JDG",
  8: "RUT",
  9: "1SA",
  10: "2SA",
  11: "1KI",
  12: "2KI",
  13: "1CH",
  14: "2CH",
  15: "EZR",
  16: "NEH",
  17: "EST",
  18: "JOB",
  19: "PSA",
  20: "PRO",
  21: "ECC",
  22: "SNG",
  23: "ISA",
  24: "JER",
  25: "LAM",
  26: "EZK",
  27: "DAN",
  28: "HOS",
  29: "JOL",
  30: "AMO",
  31: "OBA",
  32: "JON",
  33: "MIC",
  34: "NAM",
  35: "HAB",
  36: "ZEP",
  37: "HAG",
  38: "ZEC",
  39: "MAL",
  40: "MAT",
  41: "MRK",
  42: "LUK",
  43: "JHN",
  44: "ACT",
  45: "ROM",
  46: "1CO",
  47: "2CO",
  48: "GAL",
  49: "EPH",
  50: "PHP",
  51: "COL",
  52: "1TH",
  53: "2TH",
  54: "1TI",
  55: "2TI",
  56: "TIT",
  57: "PHM",
  58: "HEB",
  59: "JAS",
  60: "1PE",
  61: "2PE",
  62: "1JN",
  63: "2JN",
  64: "3JN",
  65: "JUD",
  66: "REV",
};

/**
 * Book code to full name mapping
 */
export const BOOK_CODE_TO_NAME: Record<string, string> = {
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

// =============================================================================
// PATH EXTRACTION
// =============================================================================

/**
 * Extract book code from USFM filename
 * Handles formats like: "43-JHN.usfm", "JHN.usfm", "john.usfm"
 */
export function extractBookFromPath(filePath: string): string | undefined {
  const filename = filePath.split("/").pop() || "";

  // Try numbered format first: "43-JHN.usfm"
  const numberedMatch = filename.match(/^(\d{2})-([A-Z0-9]{3})\./i);
  if (numberedMatch) {
    const bookNum = parseInt(numberedMatch[1], 10);
    const codeFromNum = BOOK_NUMBER_TO_CODE[bookNum];
    if (codeFromNum) return codeFromNum;

    // Fallback to the code in the filename
    return numberedMatch[2].toUpperCase();
  }

  // Try 3-letter code format: "JHN.usfm"
  const codeMatch = filename.match(/^([A-Z0-9]{3})\./i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    if (BOOK_CODE_TO_NAME[code]) return code;
  }

  // Try full name format: "john.usfm"
  const nameMatch = filename.match(/^([a-z0-9]+)\./i);
  if (nameMatch) {
    const name = nameMatch[1].toLowerCase();
    const code = BOOK_CODES[name];
    if (code) return code;
  }

  return undefined;
}

/**
 * Extract article ID and category from Translation Words path
 * Handles formats like: "bible/kt/grace.md", "bible/names/paul.md"
 */
export function extractTWArticleFromPath(
  filePath: string,
): { articleId: string; category: string } | undefined {
  // Pattern: bible/{category}/{article}.md
  const match = filePath.match(/bible\/(kt|names|other)\/([^/]+)\.md$/i);
  if (match) {
    return {
      category: match[1].toLowerCase(),
      articleId: match[2].toLowerCase(),
    };
  }
  return undefined;
}

/**
 * Extract article ID and category from Translation Academy path
 * Handles formats like: "translate/figs-metaphor/01.md", "checking/vol1-checking/01.md"
 */
export function extractTAArticleFromPath(
  filePath: string,
): { articleId: string; category: string } | undefined {
  // Pattern: {category}/{article}/...
  const match = filePath.match(
    /(translate|checking|process|intro)\/([^/]+)\/.*\.md$/i,
  );
  if (match) {
    return {
      category: match[1].toLowerCase(),
      articleId: match[2].toLowerCase(),
    };
  }
  return undefined;
}

/**
 * Extract language from repository name
 * Handles formats like: "en_ult", "es-419_ulb"
 */
export function extractLanguageFromRepo(repository: string): string {
  const match = repository.match(/^([a-z]{2,3}(?:-[a-z0-9]+)?)/i);
  return match ? match[1].toLowerCase() : "unknown";
}

/**
 * Extract resource type from repository name
 * Handles formats like: "en_ult" -> "ult", "en_tn" -> "tn"
 */
export function extractResourceFromRepo(repository: string): string {
  const parts = repository.split("_");
  if (parts.length >= 2) {
    return parts.slice(1).join("_").toLowerCase();
  }
  return repository.toLowerCase();
}

/**
 * Extract version from ZIP URL
 * Handles formats like: "/archive/v85.zip" -> "v85"
 */
export function extractVersionFromUrl(zipUrl: string): string {
  const match = zipUrl.match(/\/archive\/([^/.]+)\.(zip|tar\.gz)/i);
  return match ? match[1] : "latest";
}

/**
 * Extract organization from repository path or URL
 */
export function extractOrganization(repoPathOrUrl: string): string {
  // Try URL format: https://git.door43.org/unfoldingWord/en_ult/...
  const urlMatch = repoPathOrUrl.match(/git\.door43\.org\/([^/]+)\//i);
  if (urlMatch) return urlMatch[1];

  // Try path format: unfoldingWord/en_ult
  const pathMatch = repoPathOrUrl.match(/^([^/]+)\//);
  if (pathMatch) return pathMatch[1];

  return "unfoldingWord"; // Default
}

// =============================================================================
// CONTENT EXTRACTION
// =============================================================================

/**
 * Extract chapter and verse information from USFM content
 */
export function extractUSFMMetadata(content: string): {
  chapters: number[];
  verseRange?: { start: number; end: number };
} {
  const chapters: number[] = [];
  let minVerse = Infinity;
  let maxVerse = 0;

  // Find all chapter markers
  const chapterMatches = content.matchAll(/\\c\s+(\d+)/g);
  for (const match of chapterMatches) {
    chapters.push(parseInt(match[1], 10));
  }

  // Find all verse markers
  const verseMatches = content.matchAll(/\\v\s+(\d+)(?:-(\d+))?/g);
  for (const match of verseMatches) {
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;

    if (start < minVerse) minVerse = start;
    if (end > maxVerse) maxVerse = end;
  }

  return {
    chapters: [...new Set(chapters)].sort((a, b) => a - b),
    verseRange:
      minVerse !== Infinity ? { start: minVerse, end: maxVerse } : undefined,
  };
}

/**
 * Extract title from Markdown content
 * Looks for H1 heading or first non-empty line
 */
export function extractMarkdownTitle(content: string): string | undefined {
  // Try H1 heading first
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // Try first non-empty line
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
      return trimmed.substring(0, 100); // Limit length
    }
  }

  return undefined;
}

/**
 * Extract reference info from TSV notes content
 * TSV format typically has Reference column: "1:1", "3:16", etc.
 */
export function extractTSVReferences(
  content: string,
): { chapter?: number; verseStart?: number; verseEnd?: number }[] {
  const refs: { chapter?: number; verseStart?: number; verseEnd?: number }[] =
    [];
  const lines = content.split("\n");

  // Find Reference column index from header
  const header = lines[0]?.split("\t") || [];
  const refIdx = header.findIndex((h) => h.toLowerCase().includes("reference"));

  if (refIdx === -1) return refs;

  // Extract references from data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    const refCell = cells[refIdx];
    if (!refCell) continue;

    // Parse reference: "3:16", "1:1-3", etc.
    const match = refCell.match(/(\d+):(\d+)(?:-(\d+))?/);
    if (match) {
      refs.push({
        chapter: parseInt(match[1], 10),
        verseStart: parseInt(match[2], 10),
        verseEnd: match[3] ? parseInt(match[3], 10) : undefined,
      });
    }
  }

  return refs;
}

// =============================================================================
// REFERENCE FORMATTING
// =============================================================================

/**
 * Format a scripture reference for display
 */
export function formatScriptureReference(
  book: string,
  chapter?: number,
  verseStart?: number,
  verseEnd?: number,
): string {
  const bookName = BOOK_CODE_TO_NAME[book] || book;

  if (!chapter) return bookName;
  if (!verseStart) return `${bookName} ${chapter}`;
  if (!verseEnd || verseEnd === verseStart) {
    return `${bookName} ${chapter}:${verseStart}`;
  }
  return `${bookName} ${chapter}:${verseStart}-${verseEnd}`;
}

/**
 * Format a Translation Words article reference
 */
export function formatTWReference(
  articleId: string,
  category?: string,
  title?: string,
): string {
  const displayTitle =
    title || articleId.charAt(0).toUpperCase() + articleId.slice(1);
  if (category) {
    const categoryLabel =
      category === "kt" ? "Key Term" : category === "names" ? "Name" : "Other";
    return `${displayTitle} (${categoryLabel})`;
  }
  return displayTitle;
}

/**
 * Format a Translation Academy article reference
 */
export function formatTAReference(
  articleId: string,
  category?: string,
  title?: string,
): string {
  const displayTitle =
    title ||
    articleId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (category) {
    return `${displayTitle} (${category})`;
  }
  return displayTitle;
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract all metadata from a file path and optional content
 */
export function extractMetadata(
  filePath: string,
  repository: string,
  zipUrl: string,
  resourceType: string,
  content?: string,
): ContentMetadata {
  const cleanPath = filePath.replace(/^(\.\/|\/)+/, "");

  const metadata: ContentMetadata = {
    language: extractLanguageFromRepo(repository),
    organization: extractOrganization(zipUrl) || "unfoldingWord",
    resource: extractResourceFromRepo(repository),
    version: extractVersionFromUrl(zipUrl),
    originalPath: cleanPath,
    cleanPath: `clean/${extractLanguageFromRepo(repository)}/${repository}/${extractVersionFromUrl(zipUrl)}/${cleanPath}.txt`,
    processedAt: new Date().toISOString(),
  };

  // Resource-specific extraction
  switch (resourceType) {
    case "bible":
    case "obs": {
      metadata.book = extractBookFromPath(filePath);
      if (content) {
        const usfmMeta = extractUSFMMetadata(content);
        if (usfmMeta.chapters.length > 0) {
          metadata.chapter = usfmMeta.chapters[0]; // Primary chapter for full-book files
        }
        if (usfmMeta.verseRange) {
          metadata.verseStart = usfmMeta.verseRange.start;
          metadata.verseEnd = usfmMeta.verseRange.end;
        }
      }
      break;
    }

    case "notes":
    case "questions": {
      metadata.book = extractBookFromPath(filePath);
      if (content) {
        const refs = extractTSVReferences(content);
        if (refs.length > 0) {
          metadata.chapter = refs[0].chapter;
          metadata.verseStart = refs[0].verseStart;
          metadata.verseEnd =
            refs[refs.length - 1].verseEnd || refs[refs.length - 1].verseStart;
        }
      }
      break;
    }

    case "words": {
      const twArticle = extractTWArticleFromPath(filePath);
      if (twArticle) {
        metadata.articleId = twArticle.articleId;
        metadata.articleCategory = twArticle.category;
      }
      if (content) {
        metadata.title = extractMarkdownTitle(content);
      }
      break;
    }

    case "academy": {
      const taArticle = extractTAArticleFromPath(filePath);
      if (taArticle) {
        metadata.articleId = taArticle.articleId;
        metadata.articleCategory = taArticle.category;
      }
      if (content) {
        metadata.title = extractMarkdownTitle(content);
      }
      break;
    }
  }

  logger.debug("[MetadataExtractor] Extracted metadata", {
    filePath,
    resourceType,
    book: metadata.book,
    chapter: metadata.chapter,
    articleId: metadata.articleId,
  });

  return metadata;
}
