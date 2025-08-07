/**
 * USFM 3.0 Alignment Parser
 * Extracts word-level alignment data from USFM text with embedded alignment markers
 * Implements the foundation of the unfoldingWord translation ecosystem
 *
 * Based on: UW_TRANSLATION_RESOURCES_GUIDE.md specifications
 * Reference: https://github.com/unfoldingWord/translationCore/wiki/USFM-3.0-Alignment-Specification
 */

import { AlignmentData, AlignmentType } from "../constants/terminology.js";

// ===== USFM ALIGNMENT MARKER PATTERNS =====
const USFM_PATTERNS = {
  // Alignment markers: \zaln-s |attributes|\* ... \zaln-e\*
  ZALN_START: /\\zaln-s\s*\|([^|]*)\|\*/g,
  ZALN_END: /\\zaln-e\\\*/g,

  // Word markers: \w text|attributes\w*
  WORD: /\\w\s+([^|\\]+)\|([^\\]*?)\\w\*/g,

  // Verse markers: \v 1
  VERSE: /\\v\s+(\d+)/g,

  // Chapter markers: \c 1
  CHAPTER: /\\c\s+(\d+)/g,

  // Book ID: \id GEN
  BOOK_ID: /\\id\s+([A-Z0-9]{3})/g,
} as const;

// ===== ALIGNMENT ATTRIBUTES =====
interface AlignmentAttributes {
  "x-strong"?: string; // Strong's number (e.g., "G35880")
  "x-lemma"?: string; // Lemma form (e.g., "ὁ")
  "x-morph"?: string; // Morphological data (e.g., "Gr,EA,,,,NMS,")
  "x-occurrence"?: string; // Occurrence number (e.g., "1")
  "x-occurrences"?: string; // Total occurrences (e.g., "1")
  "x-content"?: string; // Original language content (e.g., "ὁ")
  "x-tw"?: string; // Translation Words identifier
  "x-note"?: string; // Associated note identifier
}

interface WordAlignment {
  id: string;
  sourceWord: string; // Original language word
  targetWord: string; // Strategic/Heart language word
  position: {
    start: number;
    end: number;
    verse: number;
    chapter: number;
  };
  attributes: AlignmentAttributes;
  confidence: number; // Alignment confidence (0-1)
  type: AlignmentType;
}

interface AlignmentGroup {
  id: string;
  sourceWords: string[];
  targetWords: WordAlignment[];
  attributes: AlignmentAttributes;
  span: {
    startPosition: number;
    endPosition: number;
    verse: number;
    chapter: number;
  };
}

interface ParsedUSFM {
  book: string;
  chapter: number;
  verse: number;
  alignments: WordAlignment[];
  groups: AlignmentGroup[];
  text: string; // Clean text without markers
  originalText: string; // Text with all USFM markers
  metadata: {
    totalAlignments: number;
    averageConfidence: number;
    hasCompleteAlignment: boolean;
    parseTime: number;
  };
}

// ===== ATTRIBUTE PARSER =====
function parseAttributes(attributeString: string): AlignmentAttributes {
  const attributes: AlignmentAttributes = {};

  // Split by spaces and parse key="value" pairs
  const pairs = attributeString.match(/(\w+(?:-\w+)*)="([^"]*)"/g) || [];

  for (const pair of pairs) {
    const [, key, value] = pair.match(/(\w+(?:-\w+)*)="([^"]*)"/) || [];
    if (key && value) {
      attributes[key as keyof AlignmentAttributes] = value;
    }
  }

  return attributes;
}

// ===== ALIGNMENT CONFIDENCE CALCULATOR =====
function calculateAlignmentConfidence(
  attributes: AlignmentAttributes,
  context: {
    hasStrongNumber: boolean;
    hasLemma: boolean;
    hasMorph: boolean;
    occurrenceMatch: boolean;
  }
): number {
  let confidence = 0.5; // Base confidence

  // Strong's numbers provide high confidence
  if (context.hasStrongNumber) confidence += 0.3;

  // Lemma provides medium confidence
  if (context.hasLemma) confidence += 0.15;

  // Morphological data provides additional confidence
  if (context.hasMorph) confidence += 0.1;

  // Occurrence matching is crucial
  if (context.occurrenceMatch) confidence += 0.25;

  // Translation Words connections add confidence
  if (attributes["x-tw"]) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

// ===== MAIN PARSER CLASS =====
export class USFMAlignmentParser {
  private currentBook = "";
  private currentChapter = 0;
  private currentVerse = 0;
  private alignmentCounter = 0;

  /**
   * Parse USFM text and extract alignment data
   */
  public parseUSFM(usfmText: string): ParsedUSFM {
    const startTime = Date.now();

    // Reset state
    this.alignmentCounter = 0;
    this.currentBook = "";
    this.currentChapter = 0;
    this.currentVerse = 0;

    // Extract book, chapter, verse info
    this.extractBookInfo(usfmText);

    // Parse alignment groups
    const groups = this.extractAlignmentGroups(usfmText);

    // Parse individual word alignments
    const alignments = this.extractWordAlignments(usfmText, groups);

    // Generate clean text
    const text = this.generateCleanText(usfmText);

    // Calculate metadata
    const metadata = this.calculateMetadata(alignments, startTime);

    return {
      book: this.currentBook,
      chapter: this.currentChapter,
      verse: this.currentVerse,
      alignments,
      groups,
      text,
      originalText: usfmText,
      metadata,
    };
  }

  /**
   * Extract book, chapter, verse information
   */
  private extractBookInfo(usfmText: string): void {
    // Extract book ID
    const bookMatch = usfmText.match(USFM_PATTERNS.BOOK_ID);
    if (bookMatch) {
      this.currentBook = bookMatch[1];
    }

    // Extract chapter (get the last/current chapter)
    const chapterMatches = Array.from(usfmText.matchAll(USFM_PATTERNS.CHAPTER));
    if (chapterMatches.length > 0) {
      this.currentChapter = parseInt(chapterMatches[chapterMatches.length - 1][1]);
    }

    // Extract verse (get the last/current verse)
    const verseMatches = Array.from(usfmText.matchAll(USFM_PATTERNS.VERSE));
    if (verseMatches.length > 0) {
      this.currentVerse = parseInt(verseMatches[verseMatches.length - 1][1]);
    }
  }

  /**
   * Extract alignment groups (zaln-s ... zaln-e blocks)
   */
  private extractAlignmentGroups(usfmText: string): AlignmentGroup[] {
    const groups: AlignmentGroup[] = [];
    let position = 0;

    while (position < usfmText.length) {
      // Find next zaln-s marker
      const startMatch = USFM_PATTERNS.ZALN_START.exec(usfmText.slice(position));
      if (!startMatch) break;

      const startPosition = position + startMatch.index!;
      const attributes = parseAttributes(startMatch[1]);

      // Find corresponding zaln-e marker
      const remainingText = usfmText.slice(startPosition + startMatch[0].length);
      const endMatch = USFM_PATTERNS.ZALN_END.exec(remainingText);

      if (!endMatch) {
        console.warn("Unclosed zaln-s marker found");
        position = startPosition + startMatch[0].length;
        continue;
      }

      const endPosition =
        startPosition + startMatch[0].length + endMatch.index! + endMatch[0].length;
      const groupContent = usfmText.slice(
        startPosition + startMatch[0].length,
        endPosition - endMatch[0].length
      );

      // Extract words within this group
      const sourceWords = this.extractSourceWords(attributes);
      const groupId = `group_${++this.alignmentCounter}`;

      groups.push({
        id: groupId,
        sourceWords,
        targetWords: [], // Will be populated later
        attributes,
        span: {
          startPosition,
          endPosition,
          verse: this.currentVerse,
          chapter: this.currentChapter,
        },
      });

      position = endPosition;
    }

    return groups;
  }

  /**
   * Extract individual word alignments
   */
  private extractWordAlignments(usfmText: string, groups: AlignmentGroup[]): WordAlignment[] {
    const alignments: WordAlignment[] = [];

    for (const group of groups) {
      const groupContent = usfmText.slice(group.span.startPosition, group.span.endPosition);
      const wordMatches = Array.from(groupContent.matchAll(USFM_PATTERNS.WORD));

      for (const wordMatch of wordMatches) {
        const [, targetWord, attributeString] = wordMatch;
        const wordAttributes = parseAttributes(attributeString);

        // Merge group and word attributes
        const combinedAttributes = { ...group.attributes, ...wordAttributes };

        // Calculate confidence
        const confidence = calculateAlignmentConfidence(combinedAttributes, {
          hasStrongNumber: !!combinedAttributes["x-strong"],
          hasLemma: !!combinedAttributes["x-lemma"],
          hasMorph: !!combinedAttributes["x-morph"],
          occurrenceMatch: this.validateOccurrence(combinedAttributes),
        });

        const alignment: WordAlignment = {
          id: `word_${++this.alignmentCounter}`,
          sourceWord: combinedAttributes["x-content"] || "",
          targetWord: targetWord.trim(),
          position: {
            start: group.span.startPosition + wordMatch.index!,
            end: group.span.startPosition + wordMatch.index! + wordMatch[0].length,
            verse: this.currentVerse,
            chapter: this.currentChapter,
          },
          attributes: combinedAttributes,
          confidence,
          type: AlignmentType.WORD_LEVEL,
        };

        alignments.push(alignment);
        group.targetWords.push(alignment);
      }
    }

    return alignments;
  }

  /**
   * Extract source words from alignment attributes
   */
  private extractSourceWords(attributes: AlignmentAttributes): string[] {
    const sourceWords: string[] = [];

    // Primary source: x-content
    if (attributes["x-content"]) {
      sourceWords.push(attributes["x-content"]);
    }

    // Secondary source: x-lemma
    if (attributes["x-lemma"] && attributes["x-lemma"] !== attributes["x-content"]) {
      sourceWords.push(attributes["x-lemma"]);
    }

    return sourceWords;
  }

  /**
   * Validate occurrence numbers
   */
  private validateOccurrence(attributes: AlignmentAttributes): boolean {
    const occurrence = parseInt(attributes["x-occurrence"] || "0");
    const occurrences = parseInt(attributes["x-occurrences"] || "0");

    return occurrence > 0 && occurrences > 0 && occurrence <= occurrences;
  }

  /**
   * Generate clean text without USFM markers
   */
  private generateCleanText(usfmText: string): string {
    let cleanText = usfmText;

    // Remove alignment markers
    cleanText = cleanText.replace(/\\zaln-s[^*]*\*/g, "");
    cleanText = cleanText.replace(/\\zaln-e\\\*/g, "");

    // Remove word markers but keep the text
    cleanText = cleanText.replace(/\\w\s+([^|\\]+)\|[^\\]*?\\w\*/g, "$1");

    // Remove other USFM markers
    cleanText = cleanText.replace(/\\[cv]\s+\d+/g, "");
    cleanText = cleanText.replace(/\\id\s+[A-Z0-9]{3}/g, "");
    cleanText = cleanText.replace(/\\[a-z]+\*/g, "");
    cleanText = cleanText.replace(/\\[a-z]+\s/g, "");

    // Clean up whitespace
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    return cleanText;
  }

  /**
   * Calculate parsing metadata
   */
  private calculateMetadata(alignments: WordAlignment[], startTime: number) {
    const totalAlignments = alignments.length;
    const averageConfidence =
      totalAlignments > 0
        ? alignments.reduce((sum, a) => sum + a.confidence, 0) / totalAlignments
        : 0;
    const hasCompleteAlignment = averageConfidence > 0.8 && totalAlignments > 0;
    const parseTime = Date.now() - startTime;

    return {
      totalAlignments,
      averageConfidence,
      hasCompleteAlignment,
      parseTime,
    };
  }

  /**
   * Find alignments by Strong's number
   */
  public findAlignmentsByStrong(
    alignments: WordAlignment[],
    strongNumber: string
  ): WordAlignment[] {
    return alignments.filter((a) => a.attributes["x-strong"] === strongNumber);
  }

  /**
   * Find alignments by lemma
   */
  public findAlignmentsByLemma(alignments: WordAlignment[], lemma: string): WordAlignment[] {
    return alignments.filter((a) => a.attributes["x-lemma"] === lemma);
  }

  /**
   * Get alignment statistics
   */
  public getAlignmentStats(alignments: WordAlignment[]) {
    const stats = {
      total: alignments.length,
      withStrong: alignments.filter((a) => a.attributes["x-strong"]).length,
      withLemma: alignments.filter((a) => a.attributes["x-lemma"]).length,
      withMorph: alignments.filter((a) => a.attributes["x-morph"]).length,
      withTW: alignments.filter((a) => a.attributes["x-tw"]).length,
      averageConfidence: 0,
      confidenceDistribution: {
        high: 0, // > 0.8
        medium: 0, // 0.5 - 0.8
        low: 0, // < 0.5
      },
    };

    if (stats.total > 0) {
      stats.averageConfidence = alignments.reduce((sum, a) => sum + a.confidence, 0) / stats.total;

      stats.confidenceDistribution.high = alignments.filter((a) => a.confidence > 0.8).length;
      stats.confidenceDistribution.medium = alignments.filter(
        (a) => a.confidence >= 0.5 && a.confidence <= 0.8
      ).length;
      stats.confidenceDistribution.low = alignments.filter((a) => a.confidence < 0.5).length;
    }

    return stats;
  }

  /**
   * Convert alignments to standard AlignmentData format
   */
  public toAlignmentData(alignments: WordAlignment[]): AlignmentData[] {
    return alignments.map((alignment) => ({
      type: alignment.type,
      source: {
        text: alignment.sourceWord,
        position: alignment.position.start,
        length: alignment.sourceWord.length,
      },
      target: {
        text: alignment.targetWord,
        position: alignment.position.start,
        length: alignment.targetWord.length,
      },
      confidence: alignment.confidence,
      metadata: {
        ...alignment.attributes,
        verse: alignment.position.verse,
        chapter: alignment.position.chapter,
        id: alignment.id,
      },
    }));
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Parse USFM text and return alignment data
 */
export function parseUSFMAlignment(usfmText: string): ParsedUSFM {
  const parser = new USFMAlignmentParser();
  return parser.parseUSFM(usfmText);
}

/**
 * Extract just the alignment data in standard format
 */
export function extractAlignmentData(usfmText: string): AlignmentData[] {
  const parser = new USFMAlignmentParser();
  const parsed = parser.parseUSFM(usfmText);
  return parser.toAlignmentData(parsed.alignments);
}

/**
 * Validate USFM alignment format
 */
export function validateUSFMAlignment(usfmText: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic USFM structure
  if (!usfmText.includes("\\zaln-s")) {
    errors.push("No alignment markers found (\\zaln-s)");
  }

  if (!usfmText.includes("\\zaln-e")) {
    errors.push("No alignment end markers found (\\zaln-e)");
  }

  // Check for balanced markers
  const startCount = (usfmText.match(/\\zaln-s/g) || []).length;
  const endCount = (usfmText.match(/\\zaln-e/g) || []).length;

  if (startCount !== endCount) {
    errors.push(`Unbalanced alignment markers: ${startCount} start, ${endCount} end`);
  }

  // Check for word markers
  if (!usfmText.includes("\\w ")) {
    warnings.push("No word markers found (\\w)");
  }

  // Try parsing and catch any errors
  try {
    const parser = new USFMAlignmentParser();
    const result = parser.parseUSFM(usfmText);

    if (result.alignments.length === 0) {
      warnings.push("No word alignments extracted");
    }

    if (result.metadata.averageConfidence < 0.5) {
      warnings.push("Low average alignment confidence");
    }
  } catch (error) {
    errors.push(`Parsing error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Export types for external use
export type { AlignmentAttributes, AlignmentGroup, ParsedUSFM, WordAlignment };
