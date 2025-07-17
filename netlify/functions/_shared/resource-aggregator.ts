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
          const bookNumber = this.getBookNumber(reference.book);
          const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_${translation}/raw/${bookNumber}-${reference.book}.usfm`;

          console.log(`🔍 Trying to fetch scripture from: ${url}`);

          const response = await fetch(url);
          console.log(`📡 Response status: ${response.status} for ${translation}`);

          if (response.ok) {
            const usfm = await response.text();
            console.log(`📜 Got USFM text (${usfm.length} chars) for ${translation}`);

            const cleanText = this.extractVerseFromUSFM(usfm, reference);
            console.log(
              `✨ Extracted text: ${cleanText ? cleanText.substring(0, 100) + "..." : "NOTHING"}`
            );

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

      console.log(`❌ No scripture found for ${reference.citation} after trying all translations`);
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
      console.log(`📚 Fetching translation notes for ${reference.citation}`);

      // Search catalog for Translation Notes
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Notes&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        console.warn(`❌ Catalog search failed for translation notes`);
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      const resource = catalogData.data?.[0];

      if (!resource) {
        console.warn(`❌ No translation notes resource found for ${options.language}`);
        return [];
      }

      // Find the correct file from ingredients array - THIS IS THE KEY!
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier === reference.book.toLowerCase()
      );

      if (!ingredient) {
        console.warn(`❌ No ingredient found for book ${reference.book}`);
        return [];
      }

      console.log(`✅ Found ingredient: ${ingredient.path} for ${reference.book}`);

      // Build the URL using the ingredient path
      const fileName = ingredient.path.replace("./", "");
      const url = `${this.baseUrl}/repos/${options.organization}/${resource.name}/raw/${fileName}`;
      console.log(`📥 Fetching notes from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`❌ Failed to fetch notes: ${response.status}`);
        return [];
      }

      const tsvData = await response.text();
      console.log(`📝 Got TSV data (${tsvData.length} chars)`);
      return this.parseTNFromTSV(tsvData, reference);
    } catch (error) {
      console.error("Error fetching translation notes:", error);
      return [];
    }
  }

  private async fetchTranslationQuestions(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationQuestion[]> {
    try {
      console.log(`❓ Fetching translation questions for ${reference.citation}`);

      // Search catalog for Translation Questions
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        console.warn(`❌ Catalog search failed for translation questions`);
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      const resource = catalogData.data?.[0];

      if (!resource) {
        console.warn(`❌ No translation questions resource found for ${options.language}`);
        return [];
      }

      // Find the correct file from ingredients array
      const ingredient = resource.ingredients?.find(
        (ing) => ing.identifier === reference.book.toLowerCase()
      );

      if (!ingredient) {
        console.warn(`❌ No ingredient found for book ${reference.book}`);
        return [];
      }

      console.log(`✅ Found ingredient: ${ingredient.path} for ${reference.book}`);

      // Build the URL using the ingredient path
      const fileName = ingredient.path.replace("./", "");
      const url = `${this.baseUrl}/repos/${options.organization}/${resource.name}/raw/${fileName}`;
      console.log(`📥 Fetching questions from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`❌ Failed to fetch questions: ${response.status}`);
        return [];
      }

      const tsvData = await response.text();
      console.log(`❓ Got TSV data (${tsvData.length} chars)`);
      return this.parseTQFromTSV(tsvData, reference);
    } catch (error) {
      console.error("Error fetching translation questions:", error);
      return [];
    }
  }

  private async fetchTranslationWords(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWord[]> {
    try {
      console.log(`📖 Fetching translation words for ${reference.citation}`);

      // First, get the Translation Words Links to find which words are in this verse
      const twlCatalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Words%20Links&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog for TWL: ${twlCatalogUrl}`);

      const twlCatalogResponse = await fetch(twlCatalogUrl);
      if (!twlCatalogResponse.ok) {
        console.warn(`❌ Catalog search failed for translation word links`);
        return [];
      }

      const twlCatalogData = (await twlCatalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      const twlResource = twlCatalogData.data?.[0];

      if (!twlResource) {
        console.warn(`❌ No translation word links resource found for ${options.language}`);
        return [];
      }

      // Find the correct TWL file from ingredients array
      const twlIngredient = twlResource.ingredients?.find(
        (ing) => ing.identifier === reference.book.toLowerCase()
      );

      if (!twlIngredient) {
        console.warn(`❌ No TWL ingredient found for book ${reference.book}`);
        return [];
      }

      console.log(`✅ Found TWL ingredient: ${twlIngredient.path} for ${reference.book}`);

      // Fetch the TWL file
      const twlFileName = twlIngredient.path.replace("./", "");
      const twlUrl = `${this.baseUrl}/repos/${options.organization}/${twlResource.name}/raw/${twlFileName}`;
      console.log(`📥 Fetching word links from: ${twlUrl}`);

      const twResponse = await fetch(twlUrl);
      if (!twResponse.ok) {
        console.warn(`❌ Failed to fetch word links: ${twResponse.status}`);
        return [];
      }

      const twData = await twResponse.text();
      console.log(`🔗 Got TWL data (${twData.length} chars)`);

      // Parse TWL data to get word links for this reference
      const wordLinks = this.parseTWLFromTSV(twData, reference);

      // Now fetch the actual Translation Words resource
      const twCatalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Words&lang=${options.language}&owner=${options.organization}`;
      const twCatalogResponse = await fetch(twCatalogUrl);

      if (!twCatalogResponse.ok) {
        console.warn(`❌ Catalog search failed for translation words`);
        // Convert word links to basic translation words
        return wordLinks.map((link) => ({
          term: link.word,
          definition: `Translation word: ${link.word}`,
        }));
      }

      const twCatalogData = (await twCatalogResponse.json()) as { data?: Array<{ name: string }> };
      const twResourceData = twCatalogData.data?.[0];

      if (!twResourceData) {
        console.warn(`❌ No translation words resource found`);
        // Convert word links to basic translation words
        return wordLinks.map((link) => ({
          term: link.word,
          definition: `Translation word: ${link.word}`,
        }));
      }

      // For each word link, fetch the actual word content
      const words: TranslationWord[] = [];
      for (const link of wordLinks) {
        try {
          const wordId = link.twlid?.split("/").pop()?.replace(".md", "") || link.word;
          const wordUrl = `${this.baseUrl}/repos/${options.organization}/${twResourceData.name}/raw/bible/kt/${wordId}.md`;
          const wordResponse = await fetch(wordUrl);

          if (wordResponse.ok) {
            const content = await wordResponse.text();
            words.push({
              term: link.word,
              definition: content.split("\n")[0] || content, // First line as definition
              content,
            });
          } else {
            // Try other paths (other/ folder)
            const otherUrl = `${this.baseUrl}/repos/${options.organization}/${twResourceData.name}/raw/bible/other/${wordId}.md`;
            const otherResponse = await fetch(otherUrl);

            if (otherResponse.ok) {
              const content = await otherResponse.text();
              words.push({
                term: link.word,
                definition: content.split("\n")[0] || content, // First line as definition
                content,
              });
            } else {
              // Just create a basic word entry without content
              words.push({
                term: link.word,
                definition: `Translation word: ${link.word}`,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch word content for ${link.word}:`, error);
          words.push({
            term: link.word,
            definition: `Translation word: ${link.word}`,
          });
        }
      }

      console.log(`📚 Found ${words.length} translation words`);
      return words;
    } catch (error) {
      console.error("Error fetching translation words:", error);
      return [];
    }
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
    const lines = tsvData.split("\n");
    const links: TranslationWordLink[] = [];

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 9) continue;

      const [chapterStr, verseStr, , , , twlid] = parts;
      const chapter = parseInt(chapterStr);
      const verse = parseInt(verseStr);

      if (chapter === reference.chapter && verse === reference.verse) {
        // Parse the TWL ID to get the word
        const word = twlid?.split("/").pop()?.replace(".md", "") || twlid || "";

        links.push({
          word,
          occurrences: 1,
          twlid,
        });
      }
    }

    return links;
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
      TIT: "57", // Titus
      PHM: "58", // Philemon
      HEB: "59", // Hebrews
      JAS: "60", // James
      "1PE": "61", // 1 Peter
      "2PE": "62", // 2 Peter
      "1JN": "63", // 1 John
      "2JN": "64", // 2 John
      "3JN": "65", // 3 John
      JUD: "66", // Jude
      REV: "67", // Revelation
    };

    return bookNumbers[bookCode] || "01";
  }
}
