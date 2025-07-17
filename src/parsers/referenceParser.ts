/**
 * Reference Parser
 * Parse Bible references into structured format
 */

export interface ParsedReference {
  book: string;
  chapter?: number;
  verse?: number;
  endVerse?: number;
  originalText: string;
  isValid: boolean;
}

/**
 * Parse a Bible reference string into structured data
 */
export function parseReference(referenceString: string): ParsedReference {
  const originalText = referenceString;

  if (!referenceString || typeof referenceString !== "string") {
    return {
      book: "",
      originalText,
      isValid: false,
    };
  }

  // Clean the input
  const cleaned = referenceString.trim();

  // Pattern to match: "Book Chapter:Verse" or "Book Chapter:Verse-EndVerse"
  const patterns = [
    // Full reference with verse range: "Genesis 1:1-3"
    /^(.+?)\s+(\d+):(\d+)-(\d+)$/,
    // Full reference single verse: "Genesis 1:1"
    /^(.+?)\s+(\d+):(\d+)$/,
    // Chapter only: "Genesis 1"
    /^(.+?)\s+(\d+)$/,
    // Book only: "Genesis"
    /^(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);

    if (match) {
      const [, book, chapter, verse, endVerse] = match;

      return {
        book: book.trim(),
        chapter: chapter ? parseInt(chapter, 10) : undefined,
        verse: verse ? parseInt(verse, 10) : undefined,
        endVerse: endVerse ? parseInt(endVerse, 10) : undefined,
        originalText,
        isValid: true,
      };
    }
  }

  // If no pattern matched, treat as book name only
  return {
    book: cleaned,
    originalText,
    isValid: Boolean(cleaned),
  };
}

/**
 * Validate if a parsed reference is well-formed
 */
export function isValidReference(ref: ParsedReference): boolean {
  if (!ref.book) return false;

  // Chapter should be positive if present
  if (ref.chapter !== undefined && ref.chapter <= 0) return false;

  // Verse should be positive if present
  if (ref.verse !== undefined && ref.verse <= 0) return false;

  // End verse should be >= start verse if present
  if (ref.endVerse !== undefined && ref.verse !== undefined && ref.endVerse < ref.verse) {
    return false;
  }

  return true;
}

/**
 * Normalize a reference to a standard format
 */
export function normalizeReference(ref: ParsedReference): string {
  if (!ref.book) return "";

  let normalized = ref.book;

  if (ref.chapter) {
    normalized += ` ${ref.chapter}`;

    if (ref.verse) {
      normalized += `:${ref.verse}`;

      if (ref.endVerse && ref.endVerse !== ref.verse) {
        normalized += `-${ref.endVerse}`;
      }
    }
  }

  return normalized;
}
