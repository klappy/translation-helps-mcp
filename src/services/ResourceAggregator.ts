/**
 * Resource Aggregator Service
 * Aggregate Bible translation resources from various sources using DCS API
 */

import { ParsedReference } from "../parsers/referenceParser.js";
import { DCSApiClient } from "./DCSApiClient.js";
import { logger } from "../utils/logger.js";

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
  word: string;
  definition: string;
  references: string[];
}

export interface TranslationWordLink {
  word: string;
  link: string;
  occurrences: number;
}

export interface AggregatedResources {
  reference: string;
  language: string;
  organization: string;
  scripture?: Scripture;
  translationNotes?: TranslationNote[];
  translationQuestions?: TranslationQuestion[];
  translationWords?: TranslationWord[];
  translationWordLinks?: TranslationWordLink[];
  timestamp: string;
}

export class ResourceAggregator {
  private dcsClient: DCSApiClient;

  constructor(
    private language: string = "en",
    private organization: string = "unfoldingWord"
  ) {
    this.dcsClient = new DCSApiClient();
  }

  /**
   * Aggregate all requested resources for a reference
   */
  async aggregateResources(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<AggregatedResources> {
    const referenceStr = this.formatReference(reference);

    logger.info("Aggregating resources", {
      reference: referenceStr,
      language: options.language,
      organization: options.organization,
      resources: options.resources,
    });

    const result: AggregatedResources = {
      reference: referenceStr,
      language: options.language,
      organization: options.organization,
      timestamp: new Date().toISOString(),
    };

    // Process each requested resource type in parallel for performance
    const promises: Promise<void>[] = [];

    if (options.resources.includes("scripture")) {
      promises.push(
        this.fetchScripture(reference, options).then((scripture) => {
          result.scripture = scripture;
        })
      );
    }

    if (options.resources.includes("notes")) {
      promises.push(
        this.fetchTranslationNotes(reference, options).then((notes) => {
          result.translationNotes = notes;
        })
      );
    }

    if (options.resources.includes("questions")) {
      promises.push(
        this.fetchTranslationQuestions(reference, options).then((questions) => {
          result.translationQuestions = questions;
        })
      );
    }

    if (options.resources.includes("words")) {
      promises.push(
        this.fetchTranslationWords(reference, options).then((words) => {
          result.translationWords = words;
        })
      );
    }

    if (options.resources.includes("links")) {
      promises.push(
        this.fetchTranslationWordLinks(reference, options).then((links) => {
          result.translationWordLinks = links;
        })
      );
    }

    // Wait for all resource fetches to complete
    await Promise.all(promises);

    logger.info("Resource aggregation completed", {
      reference: referenceStr,
      resourcesFound: {
        scripture: !!result.scripture,
        notes: result.translationNotes?.length || 0,
        questions: result.translationQuestions?.length || 0,
        words: result.translationWords?.length || 0,
        links: result.translationWordLinks?.length || 0,
      },
    });

    return result;
  }

  /**
   * Fetch scripture text from DCS
   */
  private async fetchScripture(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<Scripture | undefined> {
    try {
      // Try different Bible translations in order of preference
      const translations = ["ult", "ust", "bible"];

      for (const translation of translations) {
        const repoName = `${options.language}_${translation}`;
        const filePath = this.getBookFileName(reference.book, "usfm");

        logger.debug("Fetching scripture", {
          organization: options.organization,
          repo: repoName,
          file: filePath,
          translation,
        });

        const response = await this.dcsClient.getRawFileContent(
          options.organization,
          repoName,
          filePath
        );

        if (response.success && response.data) {
          const cleanText = this.extractVerseFromUSFM(response.data, reference);

          if (cleanText) {
            return {
              text: cleanText,
              rawUsfm: response.data,
              translation: translation.toUpperCase(),
            };
          }
        }
      }

      logger.warn("No scripture found for reference", {
        reference: this.formatReference(reference),
        language: options.language,
        organization: options.organization,
      });

      return undefined;
    } catch (error) {
      logger.error("Error fetching scripture", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Fetch translation notes from DCS
   */
  private async fetchTranslationNotes(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<TranslationNote[]> {
    try {
      const repoName = `${options.language}_tn`;
      const filePath = `tn_${reference.book}.tsv`;

      logger.debug("Fetching translation notes", {
        organization: options.organization,
        repo: repoName,
        file: filePath,
      });

      const response = await this.dcsClient.getRawFileContent(
        options.organization,
        repoName,
        filePath
      );

      if (response.success && response.data) {
        return this.parseTNFromTSV(response.data, reference);
      }

      return [];
    } catch (error) {
      logger.error("Error fetching translation notes", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch translation questions from DCS
   */
  private async fetchTranslationQuestions(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<TranslationQuestion[]> {
    try {
      const repoName = `${options.language}_tq`;
      const filePath = `tq_${reference.book}.tsv`;

      logger.debug("Fetching translation questions", {
        organization: options.organization,
        repo: repoName,
        file: filePath,
      });

      const response = await this.dcsClient.getRawFileContent(
        options.organization,
        repoName,
        filePath
      );

      if (response.success && response.data) {
        return this.parseTQFromTSV(response.data, reference);
      }

      return [];
    } catch (error) {
      logger.error("Error fetching translation questions", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch translation words from DCS
   */
  private async fetchTranslationWords(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<TranslationWord[]> {
    try {
      const repoName = `${options.language}_tw`;
      const filePath = `tw_${reference.book}.tsv`;

      logger.debug("Fetching translation words", {
        organization: options.organization,
        repo: repoName,
        file: filePath,
      });

      const response = await this.dcsClient.getRawFileContent(
        options.organization,
        repoName,
        filePath
      );

      if (response.success && response.data) {
        return this.parseTWFromTSV(response.data, reference);
      }

      return [];
    } catch (error) {
      logger.error("Error fetching translation words", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch translation word links from DCS
   */
  private async fetchTranslationWordLinks(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<TranslationWordLink[]> {
    try {
      const repoName = `${options.language}_twl`;
      const filePath = `twl_${reference.book}.tsv`;

      logger.debug("Fetching translation word links", {
        organization: options.organization,
        repo: repoName,
        file: filePath,
      });

      const response = await this.dcsClient.getRawFileContent(
        options.organization,
        repoName,
        filePath
      );

      if (response.success && response.data) {
        return this.parseTWLFromTSV(response.data, reference);
      }

      return [];
    } catch (error) {
      logger.error("Error fetching translation word links", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Format reference for display
   */
  private formatReference(reference: ParsedReference): string {
    let result = reference.book;
    if (reference.chapter) {
      result += ` ${reference.chapter}`;
      if (reference.verse) {
        result += `:${reference.verse}`;
        if (reference.endVerse && reference.endVerse !== reference.verse) {
          result += `-${reference.endVerse}`;
        }
      }
    }
    return result;
  }

  /**
   * Get the filename for a book
   */
  private getBookFileName(book: string, extension: string = "usfm"): string {
    // Get book number for USFM files (assumes two-digit numbering)
    const bookNumber = this.getBookNumber(book);
    return `${bookNumber}-${book.toUpperCase()}.${extension}`;
  }

  /**
   * Get book number (placeholder - should use proper book ordering)
   */
  private getBookNumber(book: string): string {
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
      "1KI": "11",
      "2KI": "12",
      "1CH": "13",
      "2CH": "14",
      EZR: "15",
      NEH: "16",
      EST: "17",
      JOB: "18",
      PSA: "19",
      PRO: "20",
      ECC: "21",
      SNG: "22",
      ISA: "23",
      JER: "24",
      LAM: "25",
      EZK: "26",
      DAN: "27",
      HOS: "28",
      JOL: "29",
      AMO: "30",
      OBA: "31",
      JON: "32",
      MIC: "33",
      NAM: "34",
      HAB: "35",
      ZEP: "36",
      HAG: "37",
      ZEC: "38",
      MAL: "39",
      MAT: "40",
      MRK: "41",
      LUK: "42",
      JHN: "43",
      ACT: "44",
      ROM: "45",
      "1CO": "46",
      "2CO": "47",
      GAL: "48",
      EPH: "49",
      PHP: "50",
      COL: "51",
      "1TH": "52",
      "2TH": "53",
      "1TI": "54",
      "2TI": "55",
      TIT: "56",
      PHM: "57",
      HEB: "58",
      JAS: "59",
      "1PE": "60",
      "2PE": "61",
      "1JN": "62",
      "2JN": "63",
      "3JN": "64",
      JUD: "65",
      REV: "66",
    };
    return bookNumbers[book.toUpperCase()] || "01";
  }

  /**
   * Extract verse text from USFM content
   */
  private extractVerseFromUSFM(usfm: string, reference: ParsedReference): string | null {
    if (!reference.chapter || !reference.verse) {
      return null;
    }

    try {
      const lines = usfm.split("\n");
      let inChapter = false;
      let verseText = "";

      for (const line of lines) {
        // Check for chapter marker
        if (line.startsWith("\\c ")) {
          const chapterNum = parseInt(line.substring(3).trim());
          inChapter = chapterNum === reference.chapter;
          continue;
        }

        if (!inChapter) continue;

        // Check for verse marker
        if (line.includes(`\\v ${reference.verse} `)) {
          verseText = line.substring(
            line.indexOf(`\\v ${reference.verse} `) + `\\v ${reference.verse} `.length
          );
          // Remove USFM markup
          verseText = verseText.replace(/\\[a-z]+\*?/g, "").trim();
          break;
        }
      }

      return verseText || null;
    } catch (error) {
      logger.error("Error extracting verse from USFM", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Parse Translation Notes from TSV data
   */
  private parseTNFromTSV(tsvData: string, reference: ParsedReference): TranslationNote[] {
    const notes: TranslationNote[] = [];

    try {
      const lines = tsvData.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols = line.split("\t");
        if (cols.length < 9) continue;

        const chapter = parseInt(cols[1]);
        const verse = parseInt(cols[2]);

        // Filter for the requested reference
        if (reference.chapter && chapter !== reference.chapter) continue;
        if (reference.verse && verse !== reference.verse) continue;

        const note: TranslationNote = {
          reference: `${reference.book} ${chapter}:${verse}`,
          quote: cols[6] || "",
          note: cols[8] || "",
        };

        notes.push(note);
      }
    } catch (error) {
      logger.error("Error parsing TN TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return notes;
  }

  /**
   * Parse Translation Questions from TSV data
   */
  private parseTQFromTSV(tsvData: string, reference: ParsedReference): TranslationQuestion[] {
    const questions: TranslationQuestion[] = [];

    try {
      const lines = tsvData.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols = line.split("\t");
        if (cols.length < 5) continue;

        const chapter = parseInt(cols[1]);
        const verse = parseInt(cols[2]);

        // Filter for the requested reference
        if (reference.chapter && chapter !== reference.chapter) continue;
        if (reference.verse && verse !== reference.verse) continue;

        const question: TranslationQuestion = {
          reference: `${reference.book} ${chapter}:${verse}`,
          question: cols[3] || "",
          answer: cols[4] || undefined,
        };

        questions.push(question);
      }
    } catch (error) {
      logger.error("Error parsing TQ TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return questions;
  }

  /**
   * Parse Translation Words from TSV data
   */
  private parseTWFromTSV(tsvData: string, reference: ParsedReference): TranslationWord[] {
    const words: TranslationWord[] = [];

    try {
      const lines = tsvData.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols = line.split("\t");
        if (cols.length < 7) continue;

        const chapter = parseInt(cols[1]);
        const verse = parseInt(cols[2]);

        // Filter for the requested reference
        if (reference.chapter && chapter !== reference.chapter) continue;
        if (reference.verse && verse !== reference.verse) continue;

        const word: TranslationWord = {
          word: cols[5] || "",
          definition: cols[6] || "",
          references: [`${reference.book} ${chapter}:${verse}`],
        };

        words.push(word);
      }
    } catch (error) {
      logger.error("Error parsing TW TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return words;
  }

  /**
   * Parse Translation Word Links from TSV data
   */
  private parseTWLFromTSV(tsvData: string, reference: ParsedReference): TranslationWordLink[] {
    const links: TranslationWordLink[] = [];

    try {
      const lines = tsvData.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols = line.split("\t");
        if (cols.length < 6) continue;

        const chapter = parseInt(cols[1]);
        const verse = parseInt(cols[2]);

        // Filter for the requested reference
        if (reference.chapter && chapter !== reference.chapter) continue;
        if (reference.verse && verse !== reference.verse) continue;

        const link: TranslationWordLink = {
          word: cols[4] || "",
          link: cols[5] || "",
          occurrences: 1, // Could be calculated from the data
        };

        links.push(link);
      }
    } catch (error) {
      logger.error("Error parsing TWL TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return links;
  }
}
