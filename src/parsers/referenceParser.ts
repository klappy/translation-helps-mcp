/**
 * Reference Parser
 * Parse Bible references into structured format
 */

export interface ParsedReference {
  book: string;
  chapter?: number;
  verse?: number;
  endChapter?: number;
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

  // Pattern to match various reference formats
  const patterns = [
    // Cross-chapter verse range: "Genesis 1:1-2:3"
    /^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/,
    // Full reference with verse range: "Genesis 1:1-3"
    /^(.+?)\s+(\d+):(\d+)-(\d+)$/,
    // Full reference single verse: "Genesis 1:1"
    /^(.+?)\s+(\d+):(\d+)$/,
    // Chapter range: "Genesis 1-3"
    /^(.+?)\s+(\d+)-(\d+)$/,
    // Chapter only: "Genesis 1"
    /^(.+?)\s+(\d+)$/,
    // Book only: "Genesis"
    /^(.+)$/,
  ];

  let result: ParsedReference | null = null;

  // Cross-chapter verse range
  const crossChapterMatch = cleaned.match(patterns[0]);
  if (crossChapterMatch) {
    const [, book, startChapter, startVerse, endChapter, endVerse] = crossChapterMatch;
    result = {
      book: book.trim(),
      chapter: parseInt(startChapter, 10),
      verse: parseInt(startVerse, 10),
      endChapter: parseInt(endChapter, 10),
      endVerse: parseInt(endVerse, 10),
      originalText,
      isValid: true,
    };
  }

  // Try other patterns if no cross-chapter match
  if (!result) {
    for (let i = 1; i < patterns.length; i++) {
      const match = cleaned.match(patterns[i]);
      if (match) {
        if (i === 1) {
          // Verse range within same chapter
          const [, book, chapter, verse, endVerse] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse, 10),
            endVerse: parseInt(endVerse, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 2) {
          // Single verse
          const [, book, chapter, verse] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 3) {
          // Chapter range
          const [, book, startChapter, endChapter] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(startChapter, 10),
            endChapter: parseInt(endChapter, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 4) {
          // Single chapter
          const [, book, chapter] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            originalText,
            isValid: true,
          };
        } else {
          // Book only
          const [, book] = match;
          result = {
            book: book.trim(),
            originalText,
            isValid: true,
          };
        }
        break;
      }
    }
  }

  // Return the result or default
  return result || {
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
