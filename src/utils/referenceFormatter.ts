/**
 * Reference Formatter Utility
 * Format Bible reference citations
 */

export interface Reference {
  book: string;
  chapter?: number;
  verse?: number;
  endVerse?: number;
}

export interface Citation {
  reference: string;
  translation: string;
  organization: string;
  language: string;
  timestamp: string;
}

/**
 * Format a citation for a Bible reference
 */
export function formatCitation(
  reference: Reference,
  translation: string,
  organization: string = "unfoldingWord",
  language: string = "en",
): Citation {
  const formattedRef = formatReference(reference);

  return {
    reference: formattedRef,
    translation,
    organization,
    language,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a reference object into a readable string
 */
export function formatReference(ref: Reference): string {
  if (!ref.book) return "";

  let formatted = ref.book;

  if (ref.chapter) {
    formatted += ` ${ref.chapter}`;

    if (ref.verse) {
      formatted += `:${ref.verse}`;

      if (ref.endVerse && ref.endVerse !== ref.verse) {
        formatted += `-${ref.endVerse}`;
      }
    }
  }

  return formatted;
}

/**
 * Parse a reference string into components
 */
export function parseReferenceString(refString: string): Reference | null {
  if (!refString) return null;

  // Simple regex to parse "Book Chapter:Verse" format
  const match = refString.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);

  if (!match) {
    // Just book name
    return { book: refString.trim() };
  }

  const [, book, chapter, verse, endVerse] = match;

  return {
    book: book.trim(),
    chapter: parseInt(chapter, 10),
    verse: verse ? parseInt(verse, 10) : undefined,
    endVerse: endVerse ? parseInt(endVerse, 10) : undefined,
  };
}
