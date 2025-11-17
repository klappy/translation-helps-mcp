/**
 * HTTP Response Transformers
 *
 * Utilities to transform core service results into HTTP endpoint response format.
 * This allows HTTP endpoints to use core services while maintaining HTTP-specific response shapes.
 */

import type { ScriptureResult } from "../functions/scripture-service.js";
import type { TranslationNotesResult } from "../functions/translation-notes-service.js";
import type { TranslationQuestionsResult } from "../functions/translation-questions-service.js";
import { normalizeReference } from "../parsers/referenceParser.js";
import { parseReference } from "../functions/reference-parser.js";
import { logger } from "./logger.js";

/**
 * Transform scripture service result to HTTP endpoint format
 */
export function transformScriptureResultToHTTP(
  result: ScriptureResult,
  reference: string,
  params: {
    language?: string;
    organization?: string;
  },
): Array<{
  text: string;
  reference: string;
  resource: string;
  language: string;
  citation: string;
  organization: string;
}> {
  // Extract scriptures array (service may return .scripture or .scriptures[])
  const scriptures =
    result.scriptures || (result.scripture ? [result.scripture] : []);

  if (scriptures.length === 0) {
    return [];
  }

  // Normalize reference string for display
  // Parse and normalize the reference to ensure consistent formatting
  const parsedRef = parseReference(reference);
  let referenceStr = reference;

  if (parsedRef) {
    // Determine if this is a chapter range (verseEnd but no verse means chapter range)
    const isChapterRange = parsedRef.verseEnd && !parsedRef.verse;

    const normalizeInput = {
      book: parsedRef.bookName || parsedRef.book,
      chapter: parsedRef.chapter,
      verse: parsedRef.verse,
      endChapter: isChapterRange ? parsedRef.verseEnd : undefined,
      endVerse: isChapterRange ? undefined : parsedRef.verseEnd,
      originalText: parsedRef.original || "",
      isValid: true,
    };

    try {
      referenceStr = normalizeReference(
        normalizeInput as unknown as import("../parsers/referenceParser.js").ParsedReference,
      );
    } catch {
      // If normalization fails, use original reference
      referenceStr = reference;
    }
  }

  // Transform each scripture to HTTP format
  // Deduplicate by resource (translation) to avoid duplicates
  const seenResources = new Set<string>();
  const transformed: Array<{
    text: string;
    reference: string;
    resource: string;
    language: string;
    citation: string;
    organization: string;
  }> = [];

  for (const scripture of scriptures) {
    // Map translation -> resource for consistency
    const resource = scripture.translation || "ULT";

    // Skip if we've already seen this resource (deduplication)
    if (seenResources.has(resource)) {
      continue;
    }
    seenResources.add(resource);

    // Build citation string
    const citation = `${referenceStr} (${resource})`;

    transformed.push({
      text: scripture.text,
      reference: referenceStr,
      resource,
      language: params.language || "en",
      citation,
      organization:
        scripture.citation?.organization ||
        params.organization ||
        "unfoldingWord",
    });
  }

  return transformed;
}

/**
 * Transform translation notes service result to HTTP endpoint format
 */
export function transformTranslationNotesResultToHTTP(
  result: TranslationNotesResult,
  params: {
    language?: string;
    organization?: string;
  },
): {
  verseNotes: TranslationNotesResult["verseNotes"];
  contextNotes: TranslationNotesResult["contextNotes"];
  citation: TranslationNotesResult["citation"];
  _metadata: {
    language: string;
    organization: string;
    reference: string;
    count: number;
    verseNotesCount: number;
    contextNotesCount: number;
  };
} {
  return {
    verseNotes: result.verseNotes,
    contextNotes: result.contextNotes,
    citation: result.citation,
    _metadata: {
      language: params.language || "en",
      organization: params.organization || "unfoldingWord",
      reference: result.citation.url || "",
      count: result.metadata.sourceNotesCount,
      verseNotesCount: result.metadata.verseNotesCount,
      contextNotesCount: result.metadata.contextNotesCount,
    },
  };
}

/**
 * Transform translation questions service result to HTTP endpoint format
 */
export function transformTranslationQuestionsResultToHTTP(
  result: TranslationQuestionsResult,
  params: {
    language?: string;
    organization?: string;
    reference?: string;
  },
): {
  questions: TranslationQuestionsResult["translationQuestions"];
  _metadata: {
    language: string;
    organization: string;
    reference: string;
    count: number;
  };
} {
  return {
    questions: result.translationQuestions,
    _metadata: {
      language: params.language || "en",
      organization: params.organization || "unfoldingWord",
      reference: params.reference || result.citation.url || "",
      count: result.metadata.questionsFound,
    },
  };
}

// Re-export error utilities for convenience
export {
  extractErrorMessage,
  extractErrorStatus,
} from "./mcp-error-handler.js";
