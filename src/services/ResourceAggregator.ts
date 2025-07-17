/**
 * Resource Aggregator Service
 * Aggregate Bible translation resources from various sources using DCS API
 */

import { ParsedReference } from "../parsers/referenceParser.js";
import { DCSApiClient } from "./DCSApiClient.js";
import { logger } from "../utils/logger.js";
import {
  extractVerseText,
  extractVerseRange,
  extractChapterText,
  validateCleanText,
} from "../utils/usfmExtractor.js";

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
  scriptures?: Scripture[]; // Added for multiple scriptures
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

    // Fetch all resources in parallel
    const promises: Promise<void>[] = [];

    if (options.resources.includes("scripture")) {
      promises.push(
        this.fetchScripture(reference, options).then((scriptures) => {
          if (scriptures && scriptures.length > 0) {
            // Return all translations as an array
            result.scriptures = scriptures;
            // Keep backward compatibility with single scripture
            result.scripture = scriptures[0];
          }
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
   * Fetch scripture text from DCS using INGREDIENTS PATTERN
   */
  private async fetchScripture(
    reference: ParsedReference,
    options: ResourceOptions
  ): Promise<Scripture[] | undefined> {
    try {
      // STEP 1: Get resource metadata from catalog
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?lang=${options.language}&owner=${options.organization}&type=text&subject=Bible,Aligned%20Bible`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn("Failed to search catalog for Bible resources");
        return undefined;
      }

      const searchData = (await searchResponse.json()) as { data?: any[] };
      const bibleResources = searchData.data || [];

      logger.debug(`Found ${bibleResources.length} Bible resources in catalog`);

      const allTranslations: Scripture[] = [];

      // STEP 2: Try each Bible resource using INGREDIENTS
      for (const resource of bibleResources) {
        const resourceName = resource.name;

        // Skip translation helps resources
        if (
          resourceName.includes("_tn") ||
          resourceName.includes("_tq") ||
          resourceName.includes("_tw") ||
          resourceName.includes("_twl")
        ) {
          continue;
        }

        logger.debug(`Trying Bible resource: ${resourceName}`);

        // STEP 3: USE THE INGREDIENTS ARRAY!!! (The #1 Discovery)
        const bookId = reference.book.toLowerCase();
        const ingredient = resource.ingredients?.find(
          (ing: any) =>
            ing.identifier === bookId ||
            ing.identifier === reference.book.toUpperCase() ||
            ing.identifier === reference.book
        );

        if (!ingredient || !ingredient.path) {
          logger.debug(`No ingredient found for ${bookId} in ${resourceName}`);
          continue;
        }

        logger.debug(`Found ingredient path: ${ingredient.path}`);

        // STEP 4: Fetch the actual USFM file using the ingredient path
        const response = await this.dcsClient.getRawFileContent(
          options.organization,
          resourceName,
          ingredient.path
        );

        if (response.success && response.data) {
          // Extract the requested portion
          let extractedText = "";

          if (reference.endVerse && reference.endVerse !== reference.verse) {
            // Handle verse range
            extractedText = this.extractVerseRange(response.data, reference);
          } else if (!reference.verse || reference.verse === 0) {
            // Handle full chapter
            extractedText = this.extractChapterText(response.data, reference);
          } else {
            // Single verse extraction
            const verseText = this.extractVerseFromUSFM(response.data, reference);
            extractedText = verseText || "";
          }

          if (extractedText) {
            logger.info(`Successfully extracted scripture from ${resourceName}`);
            allTranslations.push({
              text: extractedText,
              translation: resourceName.replace(/^[a-z]+_/, "").toUpperCase(),
            });
          }
        }
      }

      if (allTranslations.length === 0) {
        logger.warn("No scripture found after trying all available Bible resources", {
          reference: this.formatReference(reference),
          language: options.language,
          organization: options.organization,
          availableResources: bibleResources.map((r: any) => r.name),
        });
        return undefined;
      }

      return allTranslations;
    } catch (error) {
      logger.error("Error fetching scripture", {
        error,
        reference: this.formatReference(reference),
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
      "1TH": "53", // Fixed - was 52
      "2TH": "54", // Fixed - was 53
      "1TI": "55", // Fixed - was 54
      "2TI": "56", // Fixed - was 55
      TIT: "57", // Confirmed on DCS
      PHM: "58", // Fixed - was 57
      HEB: "59", // Fixed - was 58
      JAS: "60", // Fixed - was 59
      "1PE": "61", // Fixed - was 60
      "2PE": "62", // Fixed - was 61
      "1JN": "63", // Fixed - was 62
      "2JN": "64", // Fixed - was 63
      "3JN": "65", // Fixed - was 64
      JUD: "66", // Fixed - was 65
      REV: "67", // Fixed - was 66
    };
    return bookNumbers[book.toUpperCase()] || "01";
  }

  /**
   * Extract verse from USFM content using clean extraction approach
   */
  private extractVerseFromUSFM(usfm: string, reference: ParsedReference): string | null {
    if (!reference.chapter || !reference.verse || !usfm) {
      return null;
    }

    try {
      // Use our USFM extractor utility
      const cleanText = extractVerseText(usfm, reference.chapter, reference.verse);

      if (cleanText && validateCleanText(cleanText)) {
        console.log(`✅ Clean verse text extracted: ${cleanText.substring(0, 100)}...`);
        return cleanText;
      } else {
        console.warn(
          `⚠️ USFM extraction failed validation for ${reference.chapter}:${reference.verse}`
        );
        return null;
      }
    } catch (error) {
      logger.error("Error extracting verse from USFM", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Extract a verse range from USFM content
   */
  private extractVerseRange(usfm: string, reference: ParsedReference): string {
    if (!reference.chapter || !reference.verse || !reference.endVerse) {
      return "";
    }

    try {
      // Use our USFM extractor utility for verse range extraction
      const cleanText = extractVerseRange(
        usfm,
        reference.chapter,
        reference.verse,
        reference.endVerse
      );

      if (cleanText && validateCleanText(cleanText)) {
        console.log(
          `✅ Clean verse range text extracted: ${reference.chapter}:${reference.verse}-${reference.endVerse}`
        );
        return cleanText;
      } else {
        console.warn(`⚠️ USFM range extraction failed validation`);
        return "";
      }
    } catch (error) {
      logger.error("Error extracting verse range from USFM", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return "";
    }
  }

  /**
   * Extract chapter text from USFM content
   */
  private extractChapterText(usfm: string, reference: ParsedReference): string {
    if (!reference.chapter) {
      return "";
    }

    try {
      // Use our USFM extractor utility for chapter extraction
      const cleanText = extractChapterText(usfm, reference.chapter);

      if (cleanText && validateCleanText(cleanText)) {
        console.log(`✅ Clean chapter text extracted for chapter ${reference.chapter}`);
        return cleanText;
      } else {
        console.warn(
          `⚠️ USFM chapter extraction failed validation for chapter ${reference.chapter}`
        );
        return "";
      }
    } catch (error) {
      logger.error("Error extracting chapter text from USFM", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return "";
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
