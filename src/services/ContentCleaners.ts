/**
 * Content Cleaners for AI Search Indexing
 *
 * KISS: Simple, focused cleaning functions for different content types
 * DRY: Single place for all content cleaning logic
 *
 * These functions prepare raw content for AI Search indexing by:
 * - Stripping USFM alignment markers from Bible content
 * - Converting TSV to searchable text
 * - Cleaning markdown for better search results
 *
 * Enhanced version returns both cleaned text AND extracted metadata
 * for proper AI Search filtering and contextual results.
 */

import { logger } from "../utils/logger.js";
import {
  type ContentMetadata,
  type CleanResult,
  extractMetadata,
} from "../utils/metadata-extractors.js";

export type ResourceType =
  | "bible"
  | "notes"
  | "words"
  | "academy"
  | "questions"
  | "obs";

// Re-export types for convenience
export type { ContentMetadata, CleanResult };

/**
 * Clean USFM Bible content by removing alignment markers
 * Reduces content size by ~30x (3MB -> 106KB for John)
 */
export function cleanUSFMContent(usfm: string): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  let cleaned = usfm;

  // STEP 1: Remove alignment blocks completely: \zaln-s |...| \*...\zaln-e\*
  cleaned = cleaned.replace(
    /\\zaln-s\s*\|[^|]*\|\s*\\?\*[^\\]*\\zaln-e\\\*/g,
    " ",
  );

  // STEP 2: Clean up any orphaned zaln markers
  cleaned = cleaned.replace(/\\zaln-[se]\s*\|[^|]*\|\s*\\?\*/g, " ");
  cleaned = cleaned.replace(/\\zaln-[se]\\\*/g, " ");

  // STEP 3: Extract words from \w word|data\w* patterns
  cleaned = cleaned.replace(/\\w\s+([^|\\]+)\|[^\\]*\\w\*/g, "$1 ");
  cleaned = cleaned.replace(/\\w\s+([^\\]+?)\\w\*/g, "$1 ");

  // STEP 4: Keep verse markers with numbers: \v 16 -> 16
  cleaned = cleaned.replace(/\\v\s+(\d+)\s*/g, "$1 ");

  // STEP 5: Keep chapter markers: \c 3 -> [Chapter 3]
  cleaned = cleaned.replace(/\\c\s+(\d+)\s*/g, "\n[Chapter $1]\n");

  // STEP 6: Remove any remaining USFM markers
  cleaned = cleaned.replace(/\\[a-zA-Z][a-zA-Z0-9-]*\*?/g, " ");
  cleaned = cleaned.replace(/\\[a-zA-Z-]+\s*/g, " ");

  // STEP 7: Remove any attribute data
  cleaned = cleaned.replace(/\|[^|\\]*\|/g, " ");
  cleaned = cleaned.replace(/\|[^\\]*(?=\\|\s|$)/g, " ");

  // STEP 8: Remove remaining special characters from markup
  cleaned = cleaned.replace(/[|*\\]/g, " ");

  // STEP 9: Fix spacing around punctuation
  cleaned = cleaned.replace(/\s*([,.;:!?])\s*/g, "$1 ");

  // STEP 10: Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Clean TSV content into searchable text
 * Converts TSV rows into newline-separated searchable entries
 */
export function cleanTSVContent(tsv: string): string {
  if (!tsv || typeof tsv !== "string") {
    return "";
  }

  const lines = tsv.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return "";
  }

  // Skip header row (first line), process data rows
  const cleanedLines: string[] = [];

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    // Join non-empty cells with spaces
    const content = cells
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
      .join(" ");

    if (content) {
      cleanedLines.push(content);
    }
  }

  return cleanedLines.join("\n");
}

/**
 * Clean Markdown content for search
 * Keeps structure but removes excessive formatting
 */
export function cleanMarkdownContent(md: string): string {
  if (!md || typeof md !== "string") {
    return "";
  }

  let cleaned = md;

  // Remove code blocks but keep content
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");

  // Remove inline code markers
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Convert headers to plain text
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove links but keep text: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove image syntax
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Remove blockquote markers
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Get the appropriate cleaner for a resource type
 */
export function getContentCleaner(
  resourceType: ResourceType,
): (content: string) => string {
  switch (resourceType) {
    case "bible":
    case "obs":
      return cleanUSFMContent;
    case "notes":
    case "questions":
      return cleanTSVContent;
    case "words":
    case "academy":
      return cleanMarkdownContent;
    default:
      logger.warn(`Unknown resource type: ${resourceType}, using passthrough`);
      return (content: string) => content;
  }
}

/**
 * Clean content based on resource type
 * This is the main entry point for content cleaning
 */
export function cleanContent(
  content: string,
  resourceType: ResourceType,
): string {
  const cleaner = getContentCleaner(resourceType);
  const cleaned = cleaner(content);

  logger.debug(`Cleaned ${resourceType} content`, {
    originalSize: content.length,
    cleanedSize: cleaned.length,
    reduction: `${Math.round((1 - cleaned.length / content.length) * 100)}%`,
  });

  return cleaned;
}

/**
 * Content Cleaners object for direct access
 */
export const ContentCleaners = {
  bible: cleanUSFMContent,
  notes: cleanTSVContent,
  words: cleanMarkdownContent,
  academy: cleanMarkdownContent,
  questions: cleanTSVContent,
  obs: cleanUSFMContent,
};

// =============================================================================
// ENHANCED CLEANING WITH METADATA
// =============================================================================

/**
 * Clean content and extract metadata in one operation
 * This is the enhanced entry point for AI Search indexing
 *
 * @param content - Raw content to clean
 * @param resourceType - Type of resource (bible, notes, words, etc.)
 * @param filePath - Original file path for path-based extraction
 * @param repository - Repository name (e.g., "en_ult")
 * @param zipUrl - ZIP URL for version extraction
 * @returns CleanResult with cleaned text and extracted metadata
 */
export function cleanContentWithMetadata(
  content: string,
  resourceType: ResourceType,
  filePath: string,
  repository: string,
  zipUrl: string,
): CleanResult {
  // Clean the content
  const cleaner = getContentCleaner(resourceType);

  let cleanedText: string;
  try {
    cleanedText = cleaner(content);
  } catch (error) {
    logger.error("[cleanContentWithMetadata] Cleaner FAILED", {
      error: String(error),
      resourceType,
    });
    throw error;
  }

  // Extract metadata from path and content
  const metadata = extractMetadata(
    filePath,
    repository,
    zipUrl,
    resourceType,
    content, // Pass raw content for content-based extraction
  );

  logger.debug(`[cleanContentWithMetadata] Completed`, {
    originalSize: content.length,
    cleanedSize: cleanedText.length,
    reduction: `${Math.round((1 - cleanedText.length / content.length) * 100)}%`,
  });

  return {
    text: cleanedText,
    metadata,
  };
}

/**
 * Convert metadata to R2-compatible custom metadata object
 * All values must be strings for R2 custom metadata
 */
export function metadataToR2Metadata(
  metadata: ContentMetadata,
): Record<string, string> {
  const r2Meta: Record<string, string> = {
    language: metadata.language,
    organization: metadata.organization,
    resource: metadata.resource,
    version: metadata.version,
    original_path: metadata.originalPath,
    clean_path: metadata.cleanPath,
    processed_at: metadata.processedAt,
  };

  // Add optional fields if present
  if (metadata.book) r2Meta.book = metadata.book;
  if (metadata.chapter !== undefined) r2Meta.chapter = String(metadata.chapter);
  if (metadata.verseStart !== undefined)
    r2Meta.verse_start = String(metadata.verseStart);
  if (metadata.verseEnd !== undefined)
    r2Meta.verse_end = String(metadata.verseEnd);
  if (metadata.articleId) r2Meta.article_id = metadata.articleId;
  if (metadata.articleCategory)
    r2Meta.article_category = metadata.articleCategory;
  if (metadata.title) r2Meta.title = metadata.title;

  return r2Meta;
}
