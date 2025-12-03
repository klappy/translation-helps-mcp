/**
 * Index Worker Logic
 *
 * Processes extracted files from R2 and writes chunks to the search index bucket.
 * Each invocation processes ONE file for memory efficiency.
 *
 * Called by the main pipeline (index.ts) when extracted file events are received.
 */

import type { Message } from "@cloudflare/workers-types";
import type {
  Env,
  IndexChunk,
  R2EventNotification,
  ResourceType,
  ScriptureMetadata,
  TranslationAcademyMetadata,
  TranslationNotesMetadata,
  TranslationQuestionsMetadata,
  TranslationWordsMetadata,
} from "./types.js";
import { triggerAISearchReindex } from "./utils/ai-search-trigger.js";
import { generateMarkdownWithFrontmatter } from "./utils/markdown-generator.js";

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
  tn: "Translation Notes",
  tw: "Translation Words",
  ta: "Translation Academy",
  tq: "Translation Questions",
  twl: "Translation Word Links",
};

/**
 * Parsed information from an extracted file's R2 key
 */
interface ParsedExtractedKey {
  language: string;
  organization: string;
  repository: string;
  resourceType: ResourceType;
  resourceName: string;
  version: string;
  filePath: string;
  fileName: string;
  extension: string;
}

/**
 * Result of processing a single extracted file
 */
interface IndexingResult {
  key: string;
  resourceType: ResourceType;
  chunkWritten: boolean;
  error?: string;
  durationMs: number;
}

/**
 * Parse an extracted file key to extract resource information
 *
 * Extracted file R2 keys follow the pattern:
 * by-url/git.door43.org/{org}/{repo}/archive/{version}.zip/files/{filepath}
 */
function parseExtractedKey(key: string): ParsedExtractedKey | null {
  // Match pattern: by-url/git.door43.org/{org}/{repo}/archive/{version}.zip/files/{filepath}
  const match = key.match(
    /^by-url\/git\.door43\.org\/([^/]+)\/([^/]+)\/archive\/([^/]+)\.zip\/files\/(.+)$/,
  );

  if (!match) {
    console.log(`[Index Worker] Could not parse extracted file key: ${key}`);
    return null;
  }

  const [, organization, repository, version, filePath] = match;

  // Parse repository name to extract language and resource
  const repoMatch = repository.match(/^([a-z]{2,3}(?:-[a-zA-Z0-9-]+)?)_(.+)$/i);

  if (!repoMatch) {
    console.log(
      `[Index Worker] Could not parse repository name: ${repository}`,
    );
    return null;
  }

  const [, language, resourceName] = repoMatch;
  const resourceType = determineResourceType(resourceName);
  const fileName = filePath.split("/").pop() || filePath;
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  return {
    language: language.toLowerCase(),
    organization,
    repository,
    resourceType,
    resourceName,
    version,
    filePath,
    fileName,
    extension,
  };
}

/**
 * Determine resource type from resource name
 */
function determineResourceType(resourceName: string): ResourceType {
  const name = resourceName.toLowerCase();

  if (
    name.includes("ult") ||
    name.includes("ust") ||
    name.includes("ueb") ||
    name.includes("t4t")
  ) {
    return "scripture";
  }
  if (name === "tn" || name.includes("_tn")) return "tn";
  if (name === "tw" || name.includes("_tw")) return "tw";
  if (name === "ta" || name.includes("_ta")) return "ta";
  if (name === "tq" || name.includes("_tq")) return "tq";
  if (name === "twl" || name.includes("_twl")) return "twl";
  if (name === "obs" || name.includes("_obs")) return "obs";

  return "scripture";
}

/**
 * Clean USFM content by removing alignment markers and formatting
 */
function cleanUSFM(usfm: string): string {
  let cleaned = usfm;

  cleaned = cleaned.replace(
    /\\zaln-s\s*\|[^|]*\|\s*\\?\*[^\\]*\\zaln-e\\\*/g,
    " ",
  );
  cleaned = cleaned.replace(/\\zaln-[se]\s*\|[^|]*\|\s*\\?\*/g, " ");
  cleaned = cleaned.replace(/\\zaln-[se]\\\*/g, " ");
  cleaned = cleaned.replace(/\\w\s+([^|\\]+)\|[^\\]*\\w\*/g, "$1 ");
  cleaned = cleaned.replace(/\\w\s+([^\\]+?)\\w\*/g, "$1 ");
  cleaned = cleaned.replace(/\\[a-zA-Z][a-zA-Z0-9-]*\*?/g, " ");
  cleaned = cleaned.replace(/\\[a-zA-Z-]+\s*/g, " ");
  cleaned = cleaned.replace(/\|[^|\\]*\|/g, " ");
  cleaned = cleaned.replace(/\|[^\\]*(?=\\|\s|$)/g, " ");
  cleaned = cleaned.replace(/[|*\\]/g, " ");
  cleaned = cleaned.replace(/\s*([,.;:!?])\s*/g, "$1 ");
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned.trim();
}

/**
 * Parse USFM verses and format as markdown
 */
function processUSFMToMarkdown(
  usfm: string,
  bookName: string,
): { markdown: string; verseCount: number; chapterCount: number } {
  const lines: string[] = [`# ${bookName}`, ""];

  let currentChapter = 0;
  const chapters = new Set<number>();
  let verseCount = 0;

  const parts = usfm.split(/\\v\s+(\d+)\s*/);

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parseInt(parts[i], 10);
    let verseText = parts[i + 1] || "";

    const chapterMatch = verseText.match(/\\c\s+(\d+)/);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
      verseText = verseText.replace(/\\c\s+\d+/, "");
    }

    if (i === 1) {
      const preMatch = parts[0].match(/\\c\s+(\d+)/);
      if (preMatch) currentChapter = parseInt(preMatch[1], 10);
    }

    const cleanText = cleanUSFM(verseText);
    if (cleanText && currentChapter > 0) {
      if (!chapters.has(currentChapter)) {
        if (chapters.size > 0) lines.push("");
        lines.push(`## Chapter ${currentChapter}`);
        lines.push("");
        chapters.add(currentChapter);
      }
      lines.push(`${currentChapter}:${verseNum} ${cleanText}`);
      verseCount++;
    }
  }

  return {
    markdown: lines.join("\n"),
    verseCount,
    chapterCount: chapters.size,
  };
}

/**
 * Process a single USFM file into a search index chunk
 */
function processScriptureFile(
  content: string,
  parsed: ParsedExtractedKey,
): IndexChunk | null {
  const bookMatch = parsed.fileName.match(/(\d{2})-?([A-Z1-3]{3})\.usfm/i);
  if (!bookMatch) {
    console.log(
      `[Index Worker] Could not extract book code from: ${parsed.fileName}`,
    );
    return null;
  }

  const book = bookMatch[2].toUpperCase();
  const bookName = BOOK_NAMES[book] || book;

  const { markdown, verseCount, chapterCount } = processUSFMToMarkdown(
    content,
    bookName,
  );

  if (verseCount === 0) {
    console.log(`[Index Worker] No verses found in ${parsed.fileName}`);
    return null;
  }

  const metadata: ScriptureMetadata = {
    language: parsed.language,
    language_name: parsed.language === "en" ? "English" : parsed.language,
    organization: parsed.organization,
    resource: parsed.resourceName,
    resource_name:
      RESOURCE_NAMES[parsed.resourceName.toLowerCase()] || parsed.resourceName,
    version: parsed.version,
    chunk_level: "book",
    indexed_at: new Date().toISOString(),
    book,
    book_name: bookName,
    verse_count: verseCount,
    chapter_count: chapterCount,
  };

  return {
    path: `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}.md`,
    content: markdown,
    metadata,
  };
}

/**
 * Process a TSV file (TN, TQ, TWL) into a search index chunk
 */
function processTSVFile(
  content: string,
  parsed: ParsedExtractedKey,
): IndexChunk | null {
  const bookMatch = parsed.fileName.match(/(?:tn|tq|twl)_([A-Z1-3]{3})\.tsv/i);
  if (!bookMatch) {
    console.log(
      `[Index Worker] Could not extract book code from TSV: ${parsed.fileName}`,
    );
    return null;
  }

  const book = bookMatch[1].toUpperCase();
  const bookName = BOOK_NAMES[book] || book;

  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const header = lines[0].split("\t");
  const noteIdx = header.findIndex((h) => /note|occurrencenote/i.test(h));
  const questionIdx = header.findIndex((h) => /question/i.test(h));
  const answerIdx = header.findIndex((h) => /answer/i.test(h));
  const refIdx = header.findIndex((h) => /reference/i.test(h));

  const markdownLines: string[] = [
    `# ${bookName} - ${parsed.resourceType.toUpperCase()}`,
    "",
  ];

  let itemCount = 0;
  const chaptersSet = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const ref = (refIdx >= 0 ? cols[refIdx] : "") ?? "";
    const chapterMatch = ref.match(/^(\d+):/);
    if (chapterMatch) chaptersSet.add(parseInt(chapterMatch[1], 10));

    if (parsed.resourceType === "tq") {
      const question = questionIdx >= 0 ? cols[questionIdx]?.trim() : "";
      const answer = answerIdx >= 0 ? cols[answerIdx]?.trim() : "";
      if (question) {
        markdownLines.push(`**${ref}** ${question}`);
        if (answer) markdownLines.push(`> ${answer}`);
        markdownLines.push("");
        itemCount++;
      }
    } else {
      const note = noteIdx >= 0 ? cols[noteIdx]?.trim() : "";
      if (note) {
        markdownLines.push(`**${ref}** ${note}`);
        markdownLines.push("");
        itemCount++;
      }
    }
  }

  if (itemCount === 0) return null;

  const resourceDisplayName =
    parsed.resourceType === "tn"
      ? "Translation Notes"
      : parsed.resourceType === "tq"
        ? "Translation Questions"
        : "Translation Word Links";

  const baseMetadata = {
    language: parsed.language,
    language_name: parsed.language === "en" ? "English" : parsed.language,
    organization: parsed.organization,
    resource: parsed.resourceName,
    resource_name: resourceDisplayName,
    version: parsed.version,
    chunk_level: "book" as const,
    indexed_at: new Date().toISOString(),
    book,
    book_name: bookName,
  };

  const metadata: TranslationNotesMetadata | TranslationQuestionsMetadata =
    parsed.resourceType === "tq"
      ? ({
          ...baseMetadata,
          question_count: itemCount,
          chapters_covered: [...chaptersSet].sort((a, b) => a - b),
        } as TranslationQuestionsMetadata)
      : ({
          ...baseMetadata,
          note_count: itemCount,
          chapters_covered: [...chaptersSet].sort((a, b) => a - b),
        } as TranslationNotesMetadata);

  return {
    path: `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${book}.md`,
    content: markdownLines.join("\n"),
    metadata,
  };
}

/**
 * Process a markdown file (TW, TA) into a search index chunk
 */
function processMarkdownFile(
  content: string,
  parsed: ParsedExtractedKey,
): IndexChunk | null {
  if (
    parsed.fileName === "toc.yaml" ||
    parsed.fileName === "manifest.yaml" ||
    parsed.fileName.startsWith(".")
  ) {
    return null;
  }

  const pathParts = parsed.filePath.split("/");
  const articleId =
    pathParts[pathParts.length - 1].replace(/\.md$/i, "") ||
    pathParts[pathParts.length - 2];

  let category: "kt" | "names" | "other" = "other";
  if (parsed.filePath.includes("/kt/")) category = "kt";
  else if (parsed.filePath.includes("/names/")) category = "names";

  const cleanedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanedContent) return null;

  const titleMatch = cleanedContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : articleId;

  const baseMetadata = {
    language: parsed.language,
    language_name: parsed.language === "en" ? "English" : parsed.language,
    organization: parsed.organization,
    resource: parsed.resourceName,
    resource_name:
      parsed.resourceType === "tw"
        ? "Translation Words"
        : "Translation Academy",
    version: parsed.version,
    chunk_level: "article" as const,
    indexed_at: new Date().toISOString(),
  };

  const metadata: TranslationWordsMetadata | TranslationAcademyMetadata =
    parsed.resourceType === "tw"
      ? ({
          ...baseMetadata,
          article_id: articleId,
          category,
          title,
        } as TranslationWordsMetadata)
      : ({
          ...baseMetadata,
          article_id: articleId,
          article_title: title,
        } as TranslationAcademyMetadata);

  // Use proper path structure: category/articleId for TW, articleId for TA
  const relativePath =
    parsed.resourceType === "tw"
      ? `${category}/${articleId}.md`
      : `${articleId}.md`;

  return {
    path: `${parsed.language}/${parsed.organization}/${parsed.resourceName}/${parsed.version}/${relativePath}`,
    content: cleanedContent,
    metadata,
  };
}

/**
 * Process a single extracted file and write to search index
 */
async function processExtractedFile(
  env: Env,
  notification: R2EventNotification,
): Promise<IndexingResult> {
  const startTime = Date.now();
  const { key } = notification.object;

  console.log(`[Index Worker] Processing: ${key}`);

  const parsed = parseExtractedKey(key);
  if (!parsed) {
    return {
      key,
      resourceType: "scripture",
      chunkWritten: false,
      error: `Could not parse key: ${key}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const fileObject = await env.SOURCE_BUCKET.get(key);
    if (!fileObject) {
      throw new Error(`File not found: ${key}`);
    }

    const content = await fileObject.text();
    console.log(`[Index Worker] Read ${content.length} bytes`);

    let chunk: IndexChunk | null = null;

    switch (parsed.extension) {
      case "usfm":
        chunk = processScriptureFile(content, parsed);
        break;
      case "tsv":
        chunk = processTSVFile(content, parsed);
        break;
      case "md":
        chunk = processMarkdownFile(content, parsed);
        break;
      default:
        console.log(`[Index Worker] Skipping: ${parsed.extension}`);
        return {
          key,
          resourceType: parsed.resourceType,
          chunkWritten: false,
          durationMs: Date.now() - startTime,
        };
    }

    if (!chunk) {
      return {
        key,
        resourceType: parsed.resourceType,
        chunkWritten: false,
        durationMs: Date.now() - startTime,
      };
    }

    const markdown = generateMarkdownWithFrontmatter(
      chunk.content,
      chunk.metadata,
    );
    await env.SEARCH_INDEX_BUCKET.put(chunk.path, markdown, {
      customMetadata: {
        language: chunk.metadata.language,
        organization: chunk.metadata.organization,
        resource: chunk.metadata.resource,
        chunk_level: chunk.metadata.chunk_level,
        version: chunk.metadata.version,
      },
    });

    console.log(`[Index Worker] Wrote chunk: ${chunk.path}`);

    return {
      key,
      resourceType: parsed.resourceType,
      chunkWritten: true,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Index Worker] Error: ${errorMsg}`);

    return {
      key,
      resourceType: parsed.resourceType,
      chunkWritten: false,
      error: errorMsg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Process a batch of extracted file messages
 * Called by the main pipeline router
 */
export async function processExtractedFiles(
  messages: Message<R2EventNotification>[],
  env: Env,
): Promise<void> {
  console.log(`[Index Worker] Processing ${messages.length} extracted files`);

  const results: IndexingResult[] = [];

  for (const message of messages) {
    const notification = message.body;

    try {
      const result = await processExtractedFile(env, notification);
      results.push(result);

      if (!result.error) {
        message.ack();
      } else {
        console.error(`[Index Worker] Error: ${result.error}`);
        message.retry();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Index Worker] FATAL: ${errorMsg}`);
      message.retry();
    }
  }

  // Trigger AI Search reindex if we wrote any chunks
  const chunksWritten = results.filter((r) => r.chunkWritten).length;
  if (chunksWritten > 0) {
    try {
      await triggerAISearchReindex(env);
      console.log(
        `[Index Worker] Triggered AI Search reindex (${chunksWritten} chunks)`,
      );
    } catch (err) {
      console.error(`[Index Worker] Failed to trigger reindex:`, err);
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`[Index Worker] Complete:`, {
    processed: messages.length,
    chunksWritten,
    errors: results.filter((r) => r.error).length,
    totalDurationMs: totalDuration,
  });
}
