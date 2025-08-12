/**
 * Resource Aggregator Service
 * Aggregate Bible translation resources from various sources using DCS API
 */

import { parseTSV } from "../config/RouteGenerator.js";
import type { ParsedReference } from "../parsers/referenceParser.js";
import { logger } from "../utils/logger.js";
import { proxyFetch } from "../utils/httpClient.js";
import {
  extractChapterText,
  extractVerseRange,
  extractVerseText,
  validateCleanText,
} from "../utils/usfmExtractor.js";
import { DCSApiClient } from "./DCSApiClient.js";

export interface ResourceOptions {
  language: string;
  organization: string;
  resources: string[];
  includeIntro?: boolean;
  includeContext?: boolean;
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

interface DCSResource {
  name: string;
  ingredients?: Array<{
    identifier: string;
    path: string;
  }>;
  owner?: string;
}

interface DCSSearchResponse {
  data?: DCSResource[];
}

interface DCSMetadataResponse {
  data?: DCSResource[];
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
    private organization: string = "unfoldingWord",
  ) {
    this.dcsClient = new DCSApiClient();
  }

  /**
   * Aggregate all requested resources for a reference
   */
  async aggregateResources(
    reference: ParsedReference,
    options: ResourceOptions,
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
        }),
      );
    }

    if (options.resources.includes("notes")) {
      promises.push(
        this.fetchTranslationNotes(reference, options).then((notes) => {
          result.translationNotes = notes;
        }),
      );
    }

    if (options.resources.includes("questions")) {
      promises.push(
        this.fetchTranslationQuestions(reference, options).then((questions) => {
          result.translationQuestions = questions;
        }),
      );
    }

    if (options.resources.includes("words")) {
      promises.push(
        this.fetchTranslationWords(reference, options).then((words) => {
          result.translationWords = words;
        }),
      );
    }

    if (options.resources.includes("links")) {
      promises.push(
        this.fetchTranslationWordLinks(reference, options)
          .then((links) => {
            logger.info(
              `📊 TWL: Found ${links.length} links for ${reference.book} ${reference.chapter}:${reference.verse || "*"}`,
            );
            result.translationWordLinks =
              links as unknown as TranslationWordLink[];
          })
          .catch((error) => {
            logger.error(`❌ TWL Error:`, error);
            result.translationWordLinks = [];
          }),
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
    options: ResourceOptions,
  ): Promise<Scripture[] | undefined> {
    try {
      // STEP 1: Get resource metadata from catalog
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?lang=${options.language}&owner=${options.organization}&type=text&subject=Bible,Aligned%20Bible&metadataType=rc&includeMetadata=true`;
      logger.debug(`Fetching Bible catalog: ${searchUrl}`);
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn("Failed to search catalog for Bible resources");
        return undefined;
      }

      const searchData = (await searchResponse.json()) as DCSSearchResponse;
      const bibleResources = searchData.data || [];

      logger.debug(`Found ${bibleResources.length} Bible resources in catalog`);
      logger.debug(`Bible resources found`, {
        names: bibleResources.map((r) => r.name),
      });

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
        const bookCode = this.getBookCode(reference.book);
        const ingredient = resource.ingredients?.find(
          (ing: { identifier: string }) =>
            ing.identifier === bookCode ||
            ing.identifier === reference.book.toUpperCase() ||
            ing.identifier === reference.book,
        );

        if (!ingredient || !ingredient.path) {
          logger.debug(
            `No ingredient found for ${bookCode} in ${resourceName}`,
          );
          continue;
        }

        logger.debug(`Found ingredient path: ${ingredient.path}`);

        // STEP 4: Fetch the actual USFM file using the ingredient path
        const response = await this.dcsClient.getRawFileContent(
          options.organization,
          resourceName,
          ingredient.path,
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
            const verseText = this.extractVerseFromUSFM(
              response.data,
              reference,
            );
            extractedText = verseText || "";
          }

          if (extractedText) {
            logger.info(`Successfully extracted scripture`, {
              resource: resourceName,
            });
            allTranslations.push({
              text: extractedText,
              translation: resourceName.replace(/^[a-z]+_/, "").toUpperCase(),
            });
          }
        }
      }

      if (allTranslations.length === 0) {
        logger.warn(
          "No scripture found after trying all available Bible resources",
          {
            reference: this.formatReference(reference),
            language: options.language,
            organization: options.organization,
            availableResources: bibleResources.map((r) => r.name),
          },
        );
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
   * Fetch translation notes from DCS using INGREDIENTS PATTERN
   */
  private async fetchTranslationNotes(
    reference: ParsedReference,
    options: ResourceOptions,
  ): Promise<TranslationNote[]> {
    try {
      // STEP 1: Get resource metadata from catalog
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?lang=${options.language}&owner=${options.organization}&type=text&subject=TSV%20Translation%20Notes&metadataType=rc&includeMetadata=true`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn("Failed to search catalog for translation notes resources");
        return [];
      }

      const searchData = (await searchResponse.json()) as DCSSearchResponse;
      const tnResources = searchData.data || [];

      logger.debug(
        `Found ${tnResources.length} translation notes resources in catalog`,
      );

      // STEP 2: Try each translation notes resource using INGREDIENTS
      for (const resource of tnResources) {
        const resourceName = resource.name;

        // Skip non-translation notes resources
        if (!resourceName.includes("_tn")) {
          continue;
        }

        logger.debug(`Trying translation notes resource: ${resourceName}`);

        // STEP 3: Get the ingredients array from resource metadata
        const metadataUrl = `https://git.door43.org/api/v1/catalog/search?metadataType=rc&lang=${options.language}&owner=${options.organization}&name=${resourceName}`;
        const metadataResponse = await fetch(metadataUrl);

        if (!metadataResponse.ok) {
          logger.warn(`Failed to get metadata for ${resourceName}`);
          continue;
        }

        const metadataData =
          (await metadataResponse.json()) as DCSMetadataResponse;
        const resourceMetadata = metadataData.data?.[0];

        if (!resourceMetadata || !resourceMetadata.ingredients) {
          logger.warn(`No ingredients found for ${resourceName}`);
          continue;
        }

        // STEP 4: Find the TSV file for the specific book by looking through ingredients
        const bookCode = this.getBookCode(reference.book);

        let targetFile = null;
        for (const ingredient of resourceMetadata.ingredients) {
          // Look for any file that contains the book code (flexible matching)
          const path = ingredient.path.toLowerCase();
          if (path.includes(bookCode.toLowerCase()) && path.includes(".tsv")) {
            targetFile = ingredient;
            logger.debug(
              `Found translation notes file: ${ingredient.path} for book ${reference.book}`,
            );
            break;
          }
        }

        if (!targetFile) {
          logger.debug(
            `No translation notes file found for ${reference.book} in ${resourceName}`,
          );
          continue;
        }

        // STEP 5: Fetch the TSV file content
        const fileUrl = `https://git.door43.org/api/v1/repos/${options.organization}/${resourceName}/raw/master/${targetFile.path}`;
        const fileResponse = await proxyFetch(fileUrl);

        if (!fileResponse.ok) {
          logger.warn(
            `Failed to fetch translation notes file: ${targetFile.path}`,
          );
          continue;
        }

        const tsvData = await fileResponse.text();

        if (tsvData) {
          const notes = this.parseTNFromTSV(
            tsvData,
            reference,
            options.includeIntro,
          );
          if (notes.length > 0) {
            logger.info(
              `Successfully fetched ${notes.length} translation notes from ${resourceName}`,
            );
            return notes;
          }
        }
      }

      logger.warn("No translation notes found for reference", {
        reference: this.formatReference(reference),
        language: options.language,
        organization: options.organization,
      });

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
   * Fetch translation questions from DCS using catalog search and ingredients
   */
  private async fetchTranslationQuestions(
    reference: ParsedReference,
    options: ResourceOptions,
  ): Promise<TranslationQuestion[]> {
    try {
      // Use catalog search with ingredients pattern
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=${options.language}&owner=${options.organization}&metadataType=rc&includeMetadata=true`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn("Failed to search catalog for translation questions");
        return [];
      }

      const searchData = (await searchResponse.json()) as {
        data?: {
          name: string;
          ingredients?: { identifier?: string; path?: string }[];
        }[];
      };
      const tqResources = searchData.data || [];

      for (const resource of tqResources) {
        const bookCode = this.getBookCode(reference.book);
        const ingredient = resource.ingredients?.find(
          (ing: { identifier?: string; path?: string }) =>
            ing.identifier === bookCode ||
            ing.identifier === reference.book.toUpperCase() ||
            ing.identifier === reference.book.toLowerCase(),
        );

        if (!ingredient || !ingredient.path) {
          continue;
        }

        const response = await this.dcsClient.getRawFileContent(
          options.organization,
          resource.name,
          ingredient.path,
        );

        if (response.success && response.data) {
          return this.parseTQFromTSV(response.data, reference);
        }
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
   * Fetch translation words from DCS using INGREDIENTS PATTERN
   */
  private async fetchTranslationWords(
    reference: ParsedReference,
    options: ResourceOptions,
  ): Promise<TranslationWord[]> {
    try {
      // STEP 1: Get resource metadata from catalog
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?lang=${options.language}&owner=${options.organization}&type=text&subject=TSV%20Translation%20Words&metadataType=rc&includeMetadata=true`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn("Failed to search catalog for translation words resources");
        return [];
      }

      const searchData = (await searchResponse.json()) as DCSSearchResponse;
      const twResources = searchData.data || [];

      logger.debug(
        `Found ${twResources.length} translation words resources in catalog`,
      );

      // STEP 2: Try each translation words resource using INGREDIENTS
      for (const resource of twResources) {
        const resourceName = resource.name;

        // Skip non-translation words resources
        if (!resourceName.includes("_tw")) {
          continue;
        }

        logger.debug(`Trying translation words resource: ${resourceName}`);

        // STEP 3: Get the ingredients array from resource metadata
        const metadataUrl = `https://git.door43.org/api/v1/catalog/search?metadataType=rc&lang=${options.language}&owner=${options.organization}&name=${resourceName}`;
        const metadataResponse = await fetch(metadataUrl);

        if (!metadataResponse.ok) {
          logger.warn(`Failed to get metadata for ${resourceName}`);
          continue;
        }

        const metadataData =
          (await metadataResponse.json()) as DCSMetadataResponse;
        const resourceMetadata = metadataData.data?.[0];

        if (!resourceMetadata || !resourceMetadata.ingredients) {
          logger.warn(`No ingredients found for ${resourceName}`);
          continue;
        }

        // STEP 4: Find the TSV file for the specific book by looking through ingredients
        const bookCode = this.getBookCode(reference.book);

        let targetFile = null;
        for (const ingredient of resourceMetadata.ingredients) {
          // Look for any file that contains the book code (flexible matching)
          const path = ingredient.path.toLowerCase();
          if (path.includes(bookCode.toLowerCase()) && path.includes(".tsv")) {
            targetFile = ingredient;
            logger.debug(
              `Found translation words file: ${ingredient.path} for book ${reference.book}`,
            );
            break;
          }
        }

        if (!targetFile) {
          logger.debug(
            `No translation words file found for ${reference.book} in ${resourceName}`,
          );
          continue;
        }

        // STEP 5: Fetch the TSV file content
        const fileUrl = `https://git.door43.org/api/v1/repos/${options.organization}/${resourceName}/raw/master/${targetFile.path}`;
        const fileResponse = await proxyFetch(fileUrl);

        if (!fileResponse.ok) {
          logger.warn(
            `Failed to fetch translation words file: ${targetFile.path}`,
          );
          continue;
        }

        const tsvData = await fileResponse.text();

        if (tsvData) {
          const words = this.parseTWFromTSV(tsvData, reference);
          if (words.length > 0) {
            logger.info(
              `Successfully fetched ${words.length} translation words from ${resourceName}`,
            );
            return words;
          }
        }
      }

      logger.warn("No translation words found for reference", {
        reference: this.formatReference(reference),
        language: options.language,
        organization: options.organization,
      });

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
   * Fetch translation word links from DCS using INGREDIENTS PATTERN
   */
  private async fetchTranslationWordLinks(
    reference: ParsedReference,
    options: ResourceOptions,
  ): Promise<Record<string, unknown>[]> {
    try {
      // STEP 1: Get resource metadata from catalog
      const searchUrl = `https://git.door43.org/api/v1/catalog/search?lang=${options.language}&owner=${options.organization}&type=text&subject=TSV%20Translation%20Words%20Links&metadataType=rc&includeMetadata=true`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        logger.warn(
          "Failed to search catalog for translation word links resources",
        );
        return [];
      }

      const searchData = (await searchResponse.json()) as DCSSearchResponse;
      const twlResources = searchData.data || [];

      logger.debug(
        `Found ${twlResources.length} translation word links resources in catalog`,
      );

      // STEP 2: Try each translation word links resource using INGREDIENTS
      for (const resource of twlResources) {
        const resourceName = resource.name;

        // Skip non-translation word links resources
        if (!resourceName.includes("_twl")) {
          continue;
        }

        logger.debug(`Trying translation word links resource: ${resourceName}`);

        // STEP 3: Use ingredients directly from the resource (TWL resources have them)
        const ingredients = resource.ingredients;

        if (!ingredients || ingredients.length === 0) {
          logger.warn(`No ingredients found for ${resourceName}`);
          continue;
        }

        // STEP 4: Find the TSV file for the specific book by looking through ingredients
        const bookCode = this.getBookCode(reference.book);

        let targetFile = null;
        for (const ingredient of ingredients) {
          // Look for any file that contains the book code (flexible matching)
          const path = ingredient.path.toLowerCase();
          if (path.includes(bookCode.toLowerCase()) && path.includes(".tsv")) {
            targetFile = ingredient;
            logger.debug(
              `Found translation word links file: ${ingredient.path} for book ${reference.book}`,
            );
            break;
          }
        }

        if (!targetFile) {
          logger.debug(
            `No translation word links file found for ${reference.book} in ${resourceName}`,
          );
          continue;
        }

        // STEP 5: Fetch the TSV file content
        const fileUrl = `https://git.door43.org/api/v1/repos/${options.organization}/${resourceName}/raw/master/${targetFile.path}`;
        const fileResponse = await proxyFetch(fileUrl);

        if (!fileResponse.ok) {
          logger.warn(
            `Failed to fetch translation word links file: ${targetFile.path}`,
          );
          continue;
        }

        const tsvData = await fileResponse.text();

        if (tsvData) {
          const links = this.parseTWLFromTSV(tsvData, reference);
          if (links.length > 0) {
            logger.info(
              `Successfully fetched ${links.length} translation word links from ${resourceName}`,
            );
            return links;
          }
        }
      }

      logger.warn("No translation word links found for reference", {
        reference: this.formatReference(reference),
        language: options.language,
        organization: options.organization,
      });

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
   * Convert book name to 3-letter code for ingredient lookup
   */
  private getBookCode(book: string): string {
    const bookCodes: Record<string, string> = {
      Genesis: "gen",
      Exodus: "exo",
      Leviticus: "lev",
      Numbers: "num",
      Deuteronomy: "deu",
      Joshua: "jos",
      Judges: "jdg",
      Ruth: "rut",
      "1 Samuel": "1sa",
      "2 Samuel": "2sa",
      "1 Kings": "1ki",
      "2 Kings": "2ki",
      "1 Chronicles": "1ch",
      "2 Chronicles": "2ch",
      Ezra: "ezr",
      Nehemiah: "neh",
      Esther: "est",
      Job: "job",
      Psalms: "psa",
      Proverbs: "pro",
      Ecclesiastes: "ecc",
      "Song of Solomon": "sng",
      Isaiah: "isa",
      Jeremiah: "jer",
      Lamentations: "lam",
      Ezekiel: "ezk",
      Daniel: "dan",
      Hosea: "hos",
      Joel: "jol",
      Amos: "amo",
      Obadiah: "oba",
      Jonah: "jon",
      Micah: "mic",
      Nahum: "nam",
      Habakkuk: "hab",
      Zephaniah: "zep",
      Haggai: "hag",
      Zechariah: "zec",
      Malachi: "mal",
      Matthew: "mat",
      Mark: "mrk",
      Luke: "luk",
      John: "jhn",
      Acts: "act",
      Romans: "rom",
      "1 Corinthians": "1co",
      "2 Corinthians": "2co",
      Galatians: "gal",
      Ephesians: "eph",
      Philippians: "php",
      Colossians: "col",
      "1 Thessalonians": "1th",
      "2 Thessalonians": "2th",
      "1 Timothy": "1ti",
      "2 Timothy": "2ti",
      Titus: "tit",
      Philemon: "phm",
      Hebrews: "heb",
      James: "jas",
      "1 Peter": "1pe",
      "2 Peter": "2pe",
      "1 John": "1jn",
      "2 John": "2jn",
      "3 John": "3jn",
      Jude: "jud",
      Revelation: "rev",
    };
    return bookCodes[book] || book.toLowerCase();
  }

  /**
   * Extract verse from USFM content using clean extraction approach
   */
  private extractVerseFromUSFM(
    usfm: string,
    reference: ParsedReference,
  ): string | null {
    if (!reference.chapter || !reference.verse || !usfm) {
      return null;
    }

    try {
      // Use our USFM extractor utility
      const cleanText = extractVerseText(
        usfm,
        reference.chapter,
        reference.verse,
      );

      if (cleanText && validateCleanText(cleanText)) {
        logger.debug(`Clean verse text extracted`, {
          sample: cleanText.substring(0, 100),
        });
        return cleanText;
      } else {
        logger.warn(`USFM extraction failed validation`, {
          chapter: reference.chapter,
          verse: reference.verse,
        });
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
        reference.endVerse,
      );

      if (cleanText && validateCleanText(cleanText)) {
        logger.debug(`Clean verse range text extracted`, {
          chapter: reference.chapter,
          verse: reference.verse,
          endVerse: reference.endVerse,
        });
        return cleanText;
      } else {
        logger.warn(`USFM range extraction failed validation`);
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
        logger.debug(`Clean chapter text extracted`, {
          chapter: reference.chapter,
        });
        return cleanText;
      } else {
        logger.warn(`USFM chapter extraction failed validation`, {
          chapter: reference.chapter,
        });
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
  private parseTNFromTSV(
    tsvData: string,
    reference: ParsedReference,
    includeIntro: boolean = true,
  ): TranslationNote[] {
    try {
      // Preserve original structure, then filter
      const rows = parseTSV(tsvData) as Array<Record<string, string>>;
      const filtered = rows.filter((row) => {
        const ref = row.Reference || "";
        if (!ref) return false;

        if (ref.includes("front:intro") || ref.endsWith(":intro")) {
          return includeIntro;
        }

        const m = ref.match(/(\d+):(\d+)/);
        if (!m) return false;
        const ch = parseInt(m[1]);
        const vs = parseInt(m[2]);
        if (reference.verse)
          return ch === reference.chapter && vs === reference.verse;
        return ch === reference.chapter;
      });

      return filtered.map((row) => ({
        reference: `${reference.book} ${row.Reference}`,
        quote: row.Quote || "",
        note: row.Note || "",
      }));
    } catch (error) {
      logger.error("Error parsing TN TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Parse Translation Questions from TSV data
   */
  private parseTQFromTSV(
    tsvData: string,
    reference: ParsedReference,
  ): TranslationQuestion[] {
    const questions: TranslationQuestion[] = [];

    try {
      const lines = tsvData.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols = line.split("\t");
        if (cols.length < 7) continue;

        // Correct structure: Reference | ID | Tags | Quote | Occurrence | Question | Response
        const [ref, , , , , question, response] = cols;

        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapter = parseInt(refMatch[1]);
        const verse = parseInt(refMatch[2]);

        if (reference.chapter && chapter !== reference.chapter) continue;
        if (reference.verse && verse !== reference.verse) continue;

        questions.push({
          reference: `${reference.book} ${chapter}:${verse}`,
          question: question?.trim() || "",
          answer: response?.trim() || undefined,
        });
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
  private parseTWFromTSV(
    tsvData: string,
    reference: ParsedReference,
  ): TranslationWord[] {
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
   * Parse Translation Word Links from TSV data - using automatic parsing
   */
  private parseTWLFromTSV(
    tsvData: string,
    reference: ParsedReference,
  ): Record<string, unknown>[] {
    try {
      // Use the generic parseTSV to preserve exact structure
      const allRows = parseTSV(tsvData);

      // Filter rows based on reference
      return allRows
        .filter((row) => {
          const ref = row.Reference;
          if (!ref) return false;

          const refMatch = ref.match(/(\d+):(\d+)/);
          if (!refMatch) return false;

          const chapterNum = parseInt(refMatch[1]);
          const verseNum = parseInt(refMatch[2]);

          // Check if this word link is in our range
          if (reference.endVerse && reference.endVerse !== reference.verse) {
            // Verse range within same chapter
            return (
              chapterNum === reference.chapter &&
              verseNum >= reference.verse! &&
              verseNum <= reference.endVerse
            );
          } else if (reference.verse) {
            // Single verse
            return (
              chapterNum === reference.chapter && verseNum === reference.verse
            );
          } else {
            // Full chapter
            return chapterNum === reference.chapter;
          }
        })
        .map((row) => ({
          ...row,
          // Keep original Reference as-is and add normalized fields for consumers/tests
          reference: String(row.Reference || ""),
          originalWords: String(row.OrigWords || ""),
        }));
    } catch (error) {
      logger.error("Error parsing TWL TSV", {
        reference: this.formatReference(reference),
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
