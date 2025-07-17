/**
 * USFM Text Extraction Utilities
 *
 * Based on translation-helps patterns for clean text extraction
 * Removes all USFM markers, alignment data, and formatting
 */

// Simple verse range parser
interface VerseRange {
  start: number;
  end: number;
}

/**
 * Extract clean text for a specific verse from USFM
 */
export function extractVerseText(usfm: string, chapter: number, verse: number): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  try {
    // Find chapter
    const chapterPattern = new RegExp(`\\\\c\\s+${chapter}\\b`);
    const chapterSplit = usfm.split(chapterPattern);

    if (chapterSplit.length < 2) {
      console.warn(`Chapter ${chapter} not found`);
      return "";
    }

    // Get content after chapter marker
    let chapterContent = chapterSplit[1];

    // Find next chapter to limit scope
    const nextChapterMatch = chapterContent.match(/\\c\s+\d+/);
    if (nextChapterMatch) {
      chapterContent = chapterContent.substring(0, nextChapterMatch.index);
    }

    // Find verse
    const versePattern = new RegExp(`\\\\v\\s+${verse}\\b`);
    const verseSplit = chapterContent.split(versePattern);

    if (verseSplit.length < 2) {
      console.warn(`Verse ${verse} not found in chapter ${chapter}`);
      return "";
    }

    // Get content after verse marker
    let verseContent = verseSplit[1];

    // Find next verse to limit scope
    const nextVerseMatch = verseContent.match(/\\v\s+\d+/);
    if (nextVerseMatch) {
      verseContent = verseContent.substring(0, nextVerseMatch.index);
    }

    // Clean the text
    const cleanText = cleanUSFMText(verseContent);
    return `${verse} ${cleanText}`;
  } catch (error) {
    console.error("USFM verse extraction failed:", error);
    return "";
  }
}

/**
 * Extract clean text for a verse range from USFM
 */
export function extractVerseRange(
  usfm: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string {
  const verses: string[] = [];

  for (let v = startVerse; v <= endVerse; v++) {
    const verseText = extractVerseText(usfm, chapter, v);

    if (verseText) {
      // For continuity, remove verse numbers except the first
      if (v === startVerse) {
        verses.push(verseText);
      } else {
        const textWithoutNumber = verseText.replace(/^\d+\s+/, "");
        verses.push(textWithoutNumber);
      }
    }
  }

  return verses.join(" ");
}

/**
 * Extract clean text for an entire chapter from USFM
 */
export function extractChapterText(usfm: string, chapter: number): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  try {
    // Find chapter
    const chapterPattern = new RegExp(`\\\\c\\s+${chapter}\\b`);
    const chapterSplit = usfm.split(chapterPattern);

    if (chapterSplit.length < 2) {
      console.warn(`Chapter ${chapter} not found`);
      return "";
    }

    // Get content after chapter marker
    let chapterContent = chapterSplit[1];

    // Find next chapter to limit scope
    const nextChapterMatch = chapterContent.match(/\\c\s+\d+/);
    if (nextChapterMatch) {
      chapterContent = chapterContent.substring(0, nextChapterMatch.index);
    }

    // Find all verses
    const verseMatches = chapterContent.matchAll(/\\v\s+(\d+)\s+([^\\]*(?:\\(?!v)[^\\]*)*)/g);
    const verses: string[] = [];

    for (const match of verseMatches) {
      const verseNum = match[1];
      const verseContent = match[2];
      const cleanText = cleanUSFMText(verseContent);

      if (cleanText) {
        verses.push(`${verseNum} ${cleanText}`);
      }
    }

    return verses.join(" ");
  } catch (error) {
    console.error("USFM chapter extraction failed:", error);
    return "";
  }
}

/**
 * Clean USFM text by removing all markup
 */
function cleanUSFMText(text: string): string {
  let clean = text;

  // Remove alignment markers
  clean = clean.replace(/\\zaln-s\s*\|[^\\]*\\\*/g, "");
  clean = clean.replace(/\\zaln-e\\\*/g, "");

  // Extract text from word markup: \w word|alignment\w* -> word
  clean = clean.replace(/\\w\s+([^|\\]+)\|[^\\]*\\w\*/g, "$1");
  clean = clean.replace(/\\w\s+([^\\]+)\\w\*/g, "$1");

  // Remove any remaining USFM markers
  clean = clean.replace(/\\[a-z-]+\*/g, "");
  clean = clean.replace(/\\[a-z-]+\s*/g, "");

  // Clean up attributes and pipes
  clean = clean.replace(/\|[^|]*\|/g, "");
  clean = clean.replace(/\|[^\\]*/g, "");

  // Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}

/**
 * Validate that extracted text is clean (no USFM markup remaining)
 */
export function validateCleanText(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  // Check for common USFM markup patterns
  const usfmPatterns = [
    /\\zaln-[se]/, // Alignment markup
    /\\w\s+[^|]*\|/, // Word markup with pipes
    /\\w\*/, // Word end markers
    /\|x-strong=/, // Strong's numbers
    /\|x-lemma=/, // Lemma data
    /\|x-morph=/, // Morphology data
    /\|x-occurrence=/, // Occurrence data
    /\\[a-z]+/, // Any USFM markers
  ];

  for (const pattern of usfmPatterns) {
    if (pattern.test(text)) {
      console.warn(`USFM validation failed - detected markup: ${pattern}`);
      return false;
    }
  }

  return true;
}
