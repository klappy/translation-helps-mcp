/**
 * References Service
 * Shared core implementation for extracting Bible references from text
 * Used by both Netlify functions and MCP tools for consistency
 */

import { logger } from "../utils/logger.js";
import { parseReference } from "./reference-parser";

export interface ExtractReferencesOptions {
  text: string;
  includeContext?: boolean;
}

export interface ExtractedReference {
  reference: string;
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  context?: {
    before: string;
    after: string;
  };
  position: {
    start: number;
    end: number;
  };
}

export interface ExtractReferencesResult {
  references: ExtractedReference[];
  metadata: {
    responseTime: number;
    timestamp: string;
    referencesFound: number;
    originalText: string;
  };
}

/**
 * Core reference extraction logic
 */
export async function extractReferences(
  options: ExtractReferencesOptions,
): Promise<ExtractReferencesResult> {
  const startTime = Date.now();
  const { text, includeContext = false } = options;

  logger.info(`References service called`, {
    textLength: text.length,
    includeContext,
  });

  const references: ExtractedReference[] = [];

  // Bible reference patterns
  const patterns = [
    // Book Chapter:Verse-Verse (e.g., "John 3:16-17", "Genesis 1:1-5")
    /\b(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
    // Book Chapter (e.g., "John 3", "Genesis 1")
    /\b(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?!\s*:)\b/g,
  ];

  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex

    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, bookStr, chapterStr, verseStr, verseEndStr] = match;

      // Parse the reference to validate it
      const parsedRef = parseReference(fullMatch);
      if (!parsedRef) continue;

      const extractedRef: ExtractedReference = {
        reference: fullMatch,
        book: parsedRef.book,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        verseEnd: parsedRef.verseEnd,
        position: {
          start: match.index,
          end: match.index + fullMatch.length,
        },
      };

      // Add context if requested
      if (includeContext) {
        const contextRadius = 50;
        const beforeStart = Math.max(0, match.index - contextRadius);
        const afterEnd = Math.min(
          text.length,
          match.index + fullMatch.length + contextRadius,
        );

        extractedRef.context = {
          before: text.substring(beforeStart, match.index).trim(),
          after: text
            .substring(match.index + fullMatch.length, afterEnd)
            .trim(),
        };
      }

      references.push(extractedRef);
    }
  }

  // Remove duplicates based on reference string
  const uniqueReferences = references.filter(
    (ref, index, arr) =>
      arr.findIndex((r) => r.reference === ref.reference) === index,
  );

  logger.info(`Extracted references`, { count: uniqueReferences.length });

  return {
    references: uniqueReferences,
    metadata: {
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      referencesFound: uniqueReferences.length,
      originalText: text,
    },
  };
}
