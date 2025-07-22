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
    return cleanUSFMText(verseContent);
  } catch (error) {
    console.error(`Error extracting verse ${chapter}:${verse}:`, error);
    return "";
  }
}

/**
 * Extract clean text for a specific verse from USFM WITH verse numbers
 */
export function extractVerseTextWithNumbers(usfm: string, chapter: number, verse: number): string {
  const text = extractVerseText(usfm, chapter, verse);
  return text ? `${verse} ${text}` : "";
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

    // Find start verse
    const startVersePattern = new RegExp(`\\\\v\\s+${startVerse}\\b`);
    const startVerseSplit = chapterContent.split(startVersePattern);

    if (startVerseSplit.length < 2) {
      console.warn(`Start verse ${startVerse} not found in chapter ${chapter}`);
      return "";
    }

    // Get content starting from start verse
    let rangeContent = startVerseSplit[1];

    // Find end verse + 1 to limit scope
    const endVersePattern = new RegExp(`\\\\v\\s+${endVerse + 1}\\b`);
    const endVerseMatch = rangeContent.match(endVersePattern);
    if (endVerseMatch) {
      rangeContent = rangeContent.substring(0, endVerseMatch.index);
    }

    // Clean the text
    return cleanUSFMText(rangeContent);
  } catch (error) {
    console.error(`Error extracting verse range ${chapter}:${startVerse}-${endVerse}:`, error);
    return "";
  }
}

/**
 * Extract clean text for a verse range from USFM WITH verse numbers
 */
export function extractVerseRangeWithNumbers(
  usfm: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  const verses: string[] = [];
  for (let v = startVerse; v <= endVerse; v++) {
    const verseText = extractVerseText(usfm, chapter, v);
    if (verseText) {
      verses.push(`${v} ${verseText}`);
    }
  }

  return verses.join(" ");
}

/**
 * Extract clean text for a full chapter from USFM
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

    // Clean the text
    return cleanUSFMText(chapterContent);
  } catch (error) {
    console.error(`Error extracting chapter ${chapter}:`, error);
    return "";
  }
}

/**
 * Extract clean text for a full chapter from USFM WITH verse numbers
 */
export function extractChapterTextWithNumbers(usfm: string, chapter: number): string {
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

    // Extract verses with numbers
    const verses: string[] = [];
    const verseMatches = chapterContent.matchAll(/\\v\s+(\d+)\s*(.*?)(?=\\v\s+\d+|$)/gs);

    for (const match of verseMatches) {
      const verseNumber = match[1];
      const verseContent = match[2];
      const cleanText = cleanUSFMText(verseContent);
      if (cleanText.trim()) {
        verses.push(`${verseNumber} ${cleanText}`);
      }
    }

    return verses.join(" ");
  } catch (error) {
    console.error(`Error extracting chapter ${chapter} with numbers:`, error);
    return "";
  }
}

/**
 * Extract clean text for a chapter range from USFM
 */
export function extractChapterRange(
  usfm: string,
  startChapter: number,
  endChapter: number
): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  const chapters: string[] = [];
  for (let c = startChapter; c <= endChapter; c++) {
    const chapterText = extractChapterText(usfm, c);
    if (chapterText) {
      chapters.push(chapterText);
    }
  }

  return chapters.join(" ");
}

/**
 * Extract clean text for a chapter range from USFM WITH verse numbers
 */
export function extractChapterRangeWithNumbers(
  usfm: string,
  startChapter: number,
  endChapter: number
): string {
  if (!usfm || typeof usfm !== "string") {
    return "";
  }

  const chapters: string[] = [];
  for (let c = startChapter; c <= endChapter; c++) {
    const chapterText = extractChapterTextWithNumbers(usfm, c);
    if (chapterText) {
      chapters.push(chapterText);
    }
  }

  return chapters.join(" ");
}

/**
 * Clean USFM text by removing all markup
 */
function cleanUSFMText(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove alignment data (zaln markers and content) - more comprehensive
  cleaned = cleaned.replace(/\\zaln-s[^\\]*\\zaln-e\*/g, " ");
  cleaned = cleaned.replace(/\\zaln-s[^\\]*$/g, " "); // Handle unclosed zaln-s at end
  cleaned = cleaned.replace(/\\zaln-e\*/g, " "); // Handle orphaned zaln-e

  // Remove word alignment markers - these are the -s \ and -e\ patterns
  cleaned = cleaned.replace(/-s\s*\\/g, "");
  cleaned = cleaned.replace(/-e\\/g, "");
  cleaned = cleaned.replace(/-s\s/g, "");
  cleaned = cleaned.replace(/-e\s/g, "");

  // Remove USFM markers with backslashes
  cleaned = cleaned.replace(/\\[a-z]+[0-9]*\*?/g, " ");
  cleaned = cleaned.replace(/\\[a-z]+[0-9]*\s*/g, " ");

  // Remove word alignment data
  cleaned = cleaned.replace(/\|x-[^|\\]+/g, "");
  cleaned = cleaned.replace(/\|lemma="[^"]*"/g, "");
  cleaned = cleaned.replace(/\|strong="[^"]*"/g, "");
  cleaned = cleaned.replace(/\|x-morph="[^"]*"/g, "");
  cleaned = cleaned.replace(/\|x-occurrence="[^"]*"/g, "");
  cleaned = cleaned.replace(/\|x-occurrences="[^"]*"/g, "");

  // Remove any remaining pipes and asterisks from alignment
  cleaned = cleaned.replace(/\|/g, "");
  cleaned = cleaned.replace(/\*/g, "");

  // Remove any remaining backslashes that got through
  cleaned = cleaned.replace(/\\/g, "");

  // Clean up whitespace and punctuation artifacts
  cleaned = cleaned.replace(/\s*,\s*-\s*/g, ", "); // Fix comma spacing
  cleaned = cleaned.replace(/\s*\.\s*-\s*/g, ". "); // Fix period spacing
  cleaned = cleaned.replace(/\s+/g, " "); // Normalize whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Parse verse range strings like "1-5" or "1,3,5-7"
 */
export function parseVerseRange(rangeStr: string): VerseRange[] {
  if (!rangeStr) return [];

  const ranges: VerseRange[] = [];
  const parts = rangeStr.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        ranges.push({ start, end });
      }
    } else {
      const verse = parseInt(trimmed, 10);
      if (!isNaN(verse)) {
        ranges.push({ start: verse, end: verse });
      }
    }
  }

  return ranges;
}

/**
 * Validate that text is properly cleaned USFM (no remaining markup)
 */
export function validateCleanUSFM(text: string): boolean {
  if (!text) return true;

  // Patterns that should NOT be in clean USFM text
  const usfmPatterns = [
    /\\zaln-[se]/, // Alignment markers
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
