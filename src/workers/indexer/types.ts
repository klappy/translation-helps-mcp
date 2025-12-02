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
 * Chunk levels for multi-level indexing
 */
export type ChunkLevel =
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
 * Scripture-specific metadata
 */
export interface ScriptureMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  chapter: number;
  verse?: number;
  verse_start?: number;
  verse_end?: number;
  passage_title?: string;
  passage_type?: string;
  themes?: string[];
  context_before?: string;
  context_after?: string;
  summary?: string;
  passages_in_chapter?: string[];
}

/**
 * Translation Notes metadata
 */
export interface TranslationNotesMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  chapter: number;
  verse: number;
  phrase: string;
  note_id: string;
  support_reference?: string;
}

/**
 * Translation Words metadata
 */
export interface TranslationWordsMetadata extends CommonMetadata {
  article_id: string;
  category: "kt" | "names" | "other";
  title: string;
  related?: string[];
  bible_references?: string[];
}

/**
 * Translation Academy metadata
 */
export interface TranslationAcademyMetadata extends CommonMetadata {
  article_id: string;
  article_title: string;
  section?: number;
  section_title?: string;
  total_sections?: number;
  summary?: string;
}

/**
 * Translation Questions metadata
 */
export interface TranslationQuestionsMetadata extends CommonMetadata {
  book: string;
  book_name: string;
  chapter: number;
  verse: number;
  question_id: string;
  question_text: string;
  answer_text: string;
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
