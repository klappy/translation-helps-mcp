/**
 * Type definitions for the Search Indexer Worker
 */

import type { R2Bucket } from "@cloudflare/workers-types";

/**
 * Environment bindings for the Indexer Worker
 */
export interface Env {
  // R2 Buckets
  SOURCE_BUCKET: R2Bucket;
  SEARCH_INDEX_BUCKET: R2Bucket;

  // Environment variables
  CF_ACCOUNT_ID: string;
  AI_SEARCH_INDEX_ID: string;

  // Secrets
  CF_API_TOKEN: string;
}

/**
 * R2 Event Notification message format
 * Sent when objects are created in the source bucket
 */
export interface R2EventNotification {
  account: string;
  bucket: string;
  object: {
    key: string;
    size: number;
    eTag: string;
  };
  eventTime: string;
  action: "PutObject" | "CopyObject" | "CompleteMultipartUpload";
}

/**
 * Resource types that can be indexed
 */
export type ResourceType =
  | "scripture"
  | "tn"
  | "tw"
  | "ta"
  | "tq"
  | "twl"
  | "obs";

/**
 * Chunk levels for indexing
 * - book: Full book content (primary for scripture, notes, questions)
 * - article: Single article (TW, TA)
 * - verse/passage/chapter/note/section/question: Legacy granular levels
 */
export type ChunkLevel =
  | "book"
  | "verse"
  | "passage"
  | "chapter"
  | "note"
  | "article"
  | "section"
  | "question";

/**
 * Common metadata for all indexed content
 */
export interface CommonMetadata {
  language: string;
  language_name: string;
  organization: string;
  resource: string;
  resource_name: string;
  version: string;
  chunk_level: ChunkLevel;
  indexed_at: string;
}

/**
 * Scripture-specific metadata (book-level)
 */
export interface ScriptureMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  /** Chapter number (for chapter-level indexing) */
  chapter?: number;
  /** Total verses in the chunk (chapter or book) */
  verse_count: number;
  /** Total chapters (1 for chapter-level, N for book-level) */
  chapter_count: number;
  /** Section titles extracted from USFM \s markers */
  sections?: string[];
}

/**
 * Translation Notes metadata (book-level)
 */
export interface TranslationNotesMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  /** Total notes in the book */
  note_count: number;
  /** Chapters that have notes */
  chapters_covered: number[];
  /** Unique Translation Academy modules referenced */
  ta_references?: string[];
}

/**
 * Translation Words metadata (article-level)
 */
export interface TranslationWordsMetadata extends CommonMetadata {
  article_id: string;
  category: "kt" | "names" | "other";
  title: string;
  related?: string[];
  bible_references?: string[];
}

/**
 * Translation Academy metadata (article-level)
 */
export interface TranslationAcademyMetadata extends CommonMetadata {
  article_id: string;
  article_title: string;
  /** Category of the article: translate, checking, process, intro */
  category?: "translate" | "checking" | "process" | "intro" | "other";
  /** Number of sections in the article */
  section_count?: number;
  summary?: string;
}

/**
 * Translation Questions metadata (book-level)
 */
export interface TranslationQuestionsMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  /** Total questions in the book */
  question_count: number;
  /** Chapters that have questions */
  chapters_covered: number[];
}

/**
 * Union type for all metadata types
 */
export type IndexedMetadata =
  | ScriptureMetadata
  | TranslationNotesMetadata
  | TranslationWordsMetadata
  | TranslationAcademyMetadata
  | TranslationQuestionsMetadata;

/**
 * Result of parsing a ZIP key to extract resource info
 */
export interface ParsedZipKey {
  language: string;
  organization: string;
  resource: ResourceType;
  resourceName: string;
  version: string;
  filename: string;
}

/**
 * A single chunk ready to be written to the search index
 */
export interface IndexChunk {
  /** Path in the search index bucket */
  path: string;
  /** Cleaned content */
  content: string;
  /** Metadata for YAML frontmatter */
  metadata: IndexedMetadata;
}

/**
 * Result of processing a single ZIP file
 */
export interface IndexingResult {
  zipKey: string;
  resourceType: ResourceType;
  chunksWritten: number;
  errors: string[];
  durationMs: number;
}
