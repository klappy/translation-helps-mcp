/**
 * Resource Aggregator
 * Fetches Bible translation resources from DCS API
 */

import { Reference } from "./reference-parser";

export interface ResourceOptions {
  language: string;
  organization: string;
  resources: string[];
}

export interface Scripture {
  text: string;
  rawUsfm?: string;
  translation: string;
}

export interface TranslationNote {
  reference: string;
  quote: string;
  note: string;
}

export interface TranslationQuestion {
  reference: string;
  question: string;
  answer?: string;
}

export interface TranslationWord {
  term: string;
  definition: string;
  content?: string;
}

export interface TranslationWordLink {
  word: string;
  occurrences: number;
  twlid?: string;
}

export interface ResourceData {
  scripture?: Scripture;
  translationNotes?: TranslationNote[];
  translationQuestions?: TranslationQuestion[];
  translationWords?: TranslationWord[];
  translationWordLinks?: TranslationWordLink[];
}

export class ResourceAggregator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.DCS_API_URL || "https://git.door43.org/api/v1";
  }

  async fetchResources(reference: Reference, options: ResourceOptions): Promise<ResourceData> {
    const results: ResourceData = {};

    // Create promises for parallel fetching
    const promises = [];

    if (options.resources.includes("scripture")) {
      promises.push(this.fetchScripture(reference, options));
    }

    if (options.resources.includes("notes")) {
      promises.push(this.fetchTranslationNotes(reference, options));
    }

    if (options.resources.includes("questions")) {
      promises.push(this.fetchTranslationQuestions(reference, options));
    }

    if (options.resources.includes("words")) {
      promises.push(this.fetchTranslationWords(reference, options));
    }

    if (options.resources.includes("links")) {
      promises.push(this.fetchTranslationWordLinks(reference, options));
    }

    // Execute all fetches in parallel
    const settledResults = await Promise.allSettled(promises);

    // Process results
    let resultIndex = 0;

    if (options.resources.includes("scripture")) {
      const result = settledResults[resultIndex++];
      if (result.status === "fulfilled") {
        results.scripture = result.value as Scripture | undefined;
      }
    }

    if (options.resources.includes("notes")) {
      const result = settledResults[resultIndex++];
      if (result.status === "fulfilled") {
        results.translationNotes = result.value as TranslationNote[];
      }
    }

    if (options.resources.includes("questions")) {
      const result = settledResults[resultIndex++];
      if (result.status === "fulfilled") {
        results.translationQuestions = result.value as TranslationQuestion[];
      }
    }

    if (options.resources.includes("words")) {
      const result = settledResults[resultIndex++];
      if (result.status === "fulfilled") {
        results.translationWords = result.value as TranslationWord[];
      }
    }

    if (options.resources.includes("links")) {
      const result = settledResults[resultIndex++];
      if (result.status === "fulfilled") {
        results.translationWordLinks = result.value as TranslationWordLink[];
      }
    }

    return results;
  }

  private async fetchScripture(
    reference: Reference,
    options: ResourceOptions
  ): Promise<Scripture | undefined> {
    try {
      // Try to fetch ULT first, then fall back to other translations
      const translations = ["ult", "ust", "bible"];

      for (const translation of translations) {
        try {
          const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_${translation}/raw/${this.getBookNumber(reference.book)}-${reference.book}.usfm`;

          const response = await fetch(url);
          if (response.ok) {
            const usfm = await response.text();
            const cleanText = this.extractVerseFromUSFM(usfm, reference);

            if (cleanText) {
              return {
                text: cleanText,
                rawUsfm: usfm,
                translation: translation.toUpperCase(),
              };
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch ${translation} for ${reference.citation}:`, error);
          continue;
        }
      }

      return undefined;
    } catch (error) {
      console.error("Error fetching scripture:", error);
      return undefined;
    }
  }

  private async fetchTranslationNotes(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationNote[]> {
    try {
      const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_tn/raw/tn_${reference.book}.tsv`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const tsvData = await response.text();
      return this.parseTNFromTSV(tsvData, reference);
    } catch (error) {
      console.warn("Error fetching translation notes:", error);
      return [];
    }
  }

  private async fetchTranslationQuestions(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationQuestion[]> {
    try {
      const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_tq/raw/tq_${reference.book}.tsv`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const tsvData = await response.text();
      return this.parseTQFromTSV(tsvData, reference);
    } catch (error) {
      console.warn("Error fetching translation questions:", error);
      return [];
    }
  }

  private async fetchTranslationWords(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWord[]> {
    // For now, return empty array - this would require more complex logic
    // to determine which words are relevant for the specific verse
    return [];
  }

  private async fetchTranslationWordLinks(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWordLink[]> {
    try {
      const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_twl/raw/twl_${reference.book}.tsv`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const tsvData = await response.text();
      return this.parseTWLFromTSV(tsvData, reference);
    } catch (error) {
      console.warn("Error fetching translation word links:", error);
      return [];
    }
  }

  private extractVerseFromUSFM(usfm: string, reference: Reference): string {
    try {
      // Very basic USFM parsing - extract verse text
      const lines = usfm.split("\n");
      const chapterPattern = new RegExp(`\\\\c ${reference.chapter}\\b`);
      const versePattern = reference.verse ? new RegExp(`\\\\v ${reference.verse}\\b`) : null;

      let inChapter = false;
      let inVerse = !reference.verse; // If no verse specified, include whole chapter
      let text = "";

      for (const line of lines) {
        if (chapterPattern.test(line)) {
          inChapter = true;
          continue;
        }

        if (inChapter && versePattern && versePattern.test(line)) {
          inVerse = true;
          // Extract text after verse marker
          const verseText = line.replace(/\\v \d+\s*/, "");
          text += verseText + " ";
          continue;
        }

        if (inChapter && inVerse) {
          // Stop at next verse or chapter
          if (/\\v \d+/.test(line) || /\\c \d+/.test(line)) {
            if (reference.verse) break; // Stop if we were looking for specific verse
          }

          // Clean USFM markers and add text
          const cleanLine = line
            .replace(/\\[a-z]+[*]?\s*/g, "") // Remove USFM markers
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();

          if (cleanLine) {
            text += cleanLine + " ";
          }
        }
      }

      return text.trim();
    } catch (error) {
      console.error("Error extracting verse from USFM:", error);
      return "";
    }
  }

  private parseTNFromTSV(tsvData: string, reference: Reference): TranslationNote[] {
    try {
      const lines = tsvData.split("\n");
      const notes: TranslationNote[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 9) continue; // Expected TN format

        const [
          book,
          chapter,
          verse,
          id,
          supportReference,
          originalQuote,
          occurrence,
          glQuote,
          tnText,
        ] = columns;

        // Filter by reference
        if (book !== reference.book) continue;
        if (parseInt(chapter) !== reference.chapter) continue;
        if (reference.verse && parseInt(verse) !== reference.verse) continue;

        notes.push({
          reference: `${book} ${chapter}:${verse}`,
          quote: originalQuote || glQuote || "",
          note: tnText || "",
        });
      }

      return notes;
    } catch (error) {
      console.error("Error parsing TN TSV:", error);
      return [];
    }
  }

  private parseTQFromTSV(tsvData: string, reference: Reference): TranslationQuestion[] {
    try {
      const lines = tsvData.split("\n");
      const questions: TranslationQuestion[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 5) continue; // Expected TQ format

        const [book, chapter, verse, id, question] = columns;

        // Filter by reference
        if (book !== reference.book) continue;
        if (parseInt(chapter) !== reference.chapter) continue;
        if (reference.verse && parseInt(verse) !== reference.verse) continue;

        questions.push({
          reference: `${book} ${chapter}:${verse}`,
          question: question || "",
        });
      }

      return questions;
    } catch (error) {
      console.error("Error parsing TQ TSV:", error);
      return [];
    }
  }

  private parseTWLFromTSV(tsvData: string, reference: Reference): TranslationWordLink[] {
    try {
      const lines = tsvData.split("\n");
      const links: TranslationWordLink[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 6) continue; // Expected TWL format

        const [book, chapter, verse, id, tags, originalWords] = columns;

        // Filter by reference
        if (book !== reference.book) continue;
        if (parseInt(chapter) !== reference.chapter) continue;
        if (reference.verse && parseInt(verse) !== reference.verse) continue;

        if (tags) {
          const words = tags.split(",").map((tag) => tag.trim());
          words.forEach((word) => {
            links.push({
              word: word,
              occurrences: 1,
              twlid: id,
            });
          });
        }
      }

      return links;
    } catch (error) {
      console.error("Error parsing TWL TSV:", error);
      return [];
    }
  }

  private getBookNumber(bookCode: string): string {
    // Map book codes to numbers used in filenames
    const bookNumbers: Record<string, string> = {
      GEN: "01",
      EXO: "02",
      LEV: "03",
      NUM: "04",
      DEU: "05",
      JOS: "06",
      JDG: "07",
      RUT: "08",
      "1SA": "09",
      "2SA": "10",
      PSA: "19",
      PRO: "20",
      ISA: "23",
      JER: "24",
      MAT: "41",
      MRK: "42",
      LUK: "43",
      JHN: "44",
      ACT: "45",
      ROM: "46",
      "1CO": "47",
      "2CO": "48",
      GAL: "49",
      EPH: "50",
      PHP: "51",
      COL: "52",
      "1TH": "53",
      "2TH": "54",
      "1TI": "55",
      "2TI": "56",
      HEB: "58",
      JAS: "59",
      "1PE": "60",
      "2PE": "61",
      "1JN": "62",
      "2JN": "63",
      "3JN": "64",
      REV: "66",
    };

    return bookNumbers[bookCode] || "01";
  }
}
