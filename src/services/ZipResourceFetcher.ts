/**
 * ZIP-based Resource Fetcher
 * Downloads entire repositories as ZIP files for efficient caching and offline support
 *
 * KISS: One download per resource instead of hundreds
 * DRY: All resources use the same fetch/cache/extract pattern
 */

// Deprecated legacy fetcher; avoid direct cache imports here
import { EdgeXRayTracer, trackedFetch } from "../functions/edge-xray.js";
import type { ParsedReference } from "../parsers/referenceParser.js";
import { logger } from "../utils/logger.js";

interface ZipResource {
  organization: string;
  repository: string;
  language: string;
  resourceType: string; // 'bible', 'tn', 'tq', 'tw', 'twl', 'ta'
}

export class ZipResourceFetcher {
  private tracer: EdgeXRayTracer;

  constructor(tracer?: EdgeXRayTracer) {
    this.tracer = tracer || new EdgeXRayTracer(`zip-${Date.now()}`, "ZipResourceFetcher");
  }

  /**
   * Get a file from a resource repository
   * Downloads the entire ZIP if not cached, then extracts the requested file
   */
  async getResourceFile(
    resource: ZipResource,
    filePath: string
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // 1. Check if we have the ZIP cached
      // Legacy caching removed in favor of KV cache in ZipResourceFetcher2
      const cachedZip = null;

      if (cachedZip) {
        logger.info(`Using cached ZIP for ${resource.repository}`);
        return this.extractFileFromZip(cachedZip, filePath, resource.repository);
      }

      // 2. Download the ZIP
      const zipUrl = `https://git.door43.org/${resource.organization}/${resource.repository}/archive/master.zip`;
      logger.info(`Downloading ZIP: ${zipUrl}`);
      console.log(`🔽 Downloading ZIP: ${zipUrl}`);

      const response = await trackedFetch(zipUrl, this.tracer);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download ZIP: ${response.status}`,
        };
      }

      // 3. Get the ZIP data
      const zipBuffer = await response.arrayBuffer();

      // 4. Cache it (30 days - these don't change often)
      // Skip legacy cache write

      // 5. Extract the requested file
      return this.extractFileFromZip(zipBuffer, filePath, resource.repository);
    } catch (error) {
      logger.error("Error fetching resource:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Extract a file from a ZIP buffer
   * Uses the edge-compatible ZIP library
   */
  private async extractFileFromZip(
    zipData: ArrayBuffer,
    filePath: string,
    repository: string
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // Import dynamically to ensure edge compatibility
      const { unzipSync } = await import("fflate");

      // Convert ArrayBuffer to Uint8Array
      const uint8Data = new Uint8Array(zipData);

      // Unzip the data
      const unzipped = unzipSync(uint8Data);

      // ZIP files often have a root directory, try different paths
      const possiblePaths = [
        filePath,
        `${repository}-master/${filePath}`, // GitHub/Gitea adds repo-branch prefix
        `${repository}/${filePath}`, // Sometimes without -master
      ];

      // Find the file in the ZIP
      let fileData: Uint8Array | undefined;
      let foundPath: string | undefined;

      for (const path of possiblePaths) {
        if (unzipped[path]) {
          fileData = unzipped[path];
          foundPath = path;
          break;
        }
      }

      if (!fileData) {
        // List available files for debugging
        const availableFiles = Object.keys(unzipped).slice(0, 10);
        logger.warn(`File ${filePath} not found in ZIP. Available files:`, availableFiles);

        return {
          success: false,
          error: `File not found in ZIP: ${filePath}`,
        };
      }

      // Convert to string
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(fileData);

      logger.info(`Successfully extracted ${foundPath} from ZIP`);

      return {
        success: true,
        data: text,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract file: ${error}`,
      };
    }
  }

  /**
   * Get scripture text for a reference
   * Much simpler than the current approach!
   */
  async getScripture(
    reference: ParsedReference,
    resource: ZipResource
  ): Promise<{ text: string; translation: string } | null> {
    // Deprecated: hardcoded file maps. Use ZipResourceFetcher2 with ingredients instead.
    const bookFile = "";

    const result = await this.getResourceFile(resource, bookFile);

    if (!result.success || !result.data) {
      return null;
    }

    // Extract the verse(s) from the USFM
    // This part stays the same as current implementation
    const text = this.extractVerseFromUSFM(result.data, reference);

    return text
      ? {
          text,
          translation: resource.repository.replace("en_", "").toUpperCase(),
        }
      : null;
  }

  /**
   * Get TSV data (for TN, TQ, TWL)
   * One download gets ALL the data!
   */
  async getTSVData(
    reference: ParsedReference,
    resource: ZipResource
  ): Promise<Record<string, unknown>[]> {
    // Map book to TSV file
    const tsvFile = this.getTSVFileName(reference.book, resource.resourceType);

    const result = await this.getResourceFile(resource, tsvFile);

    if (!result.success || !result.data) {
      return [];
    }

    // Parse and filter TSV - reuse existing logic
    return this.parseTSVForReference(result.data, reference);
  }

  private getBookFileName(book: string): string {
    // Complete book mapping
    // Deprecated map; kept for legacy interface but unused
    const bookMap: Record<string, string> = {
      // Old Testament
      Genesis: "01-GEN.usfm",
      Exodus: "02-EXO.usfm",
      Leviticus: "03-LEV.usfm",
      Numbers: "04-NUM.usfm",
      Deuteronomy: "05-DEU.usfm",
      Joshua: "06-JOS.usfm",
      Judges: "07-JDG.usfm",
      Ruth: "08-RUT.usfm",
      "1 Samuel": "09-1SA.usfm",
      "2 Samuel": "10-2SA.usfm",
      "1 Kings": "11-1KI.usfm",
      "2 Kings": "12-2KI.usfm",
      "1 Chronicles": "13-1CH.usfm",
      "2 Chronicles": "14-2CH.usfm",
      Ezra: "15-EZR.usfm",
      Nehemiah: "16-NEH.usfm",
      Esther: "17-EST.usfm",
      Job: "18-JOB.usfm",
      Psalms: "19-PSA.usfm",
      Psalm: "19-PSA.usfm",
      Proverbs: "20-PRO.usfm",
      Ecclesiastes: "21-ECC.usfm",
      "Song of Solomon": "22-SNG.usfm",
      "Song of Songs": "22-SNG.usfm",
      Isaiah: "23-ISA.usfm",
      Jeremiah: "24-JER.usfm",
      Lamentations: "25-LAM.usfm",
      Ezekiel: "26-EZK.usfm",
      Daniel: "27-DAN.usfm",
      Hosea: "28-HOS.usfm",
      Joel: "29-JOL.usfm",
      Amos: "30-AMO.usfm",
      Obadiah: "31-OBA.usfm",
      Jonah: "32-JON.usfm",
      Micah: "33-MIC.usfm",
      Nahum: "34-NAM.usfm",
      Habakkuk: "35-HAB.usfm",
      Zephaniah: "36-ZEP.usfm",
      Haggai: "37-HAG.usfm",
      Zechariah: "38-ZEC.usfm",
      Malachi: "39-MAL.usfm",
      // New Testament
      Matthew: "41-MAT.usfm",
      Mark: "42-MRK.usfm",
      Luke: "43-LUK.usfm",
      John: "44-JHN.usfm",
      Acts: "45-ACT.usfm",
      Romans: "46-ROM.usfm",
      "1 Corinthians": "47-1CO.usfm",
      "2 Corinthians": "48-2CO.usfm",
      Galatians: "49-GAL.usfm",
      Ephesians: "50-EPH.usfm",
      Philippians: "51-PHP.usfm",
      Colossians: "52-COL.usfm",
      "1 Thessalonians": "53-1TH.usfm",
      "2 Thessalonians": "54-2TH.usfm",
      "1 Timothy": "55-1TI.usfm",
      "2 Timothy": "56-2TI.usfm",
      Titus: "57-TIT.usfm",
      Philemon: "58-PHM.usfm",
      Hebrews: "59-HEB.usfm",
      James: "60-JAS.usfm",
      "1 Peter": "61-1PE.usfm",
      "2 Peter": "62-2PE.usfm",
      "1 John": "63-1JN.usfm",
      "2 John": "64-2JN.usfm",
      "3 John": "65-3JN.usfm",
      Jude: "66-JUD.usfm",
      Revelation: "67-REV.usfm",
    };
    return bookMap[book] || "";
  }

  private getTSVFileName(book: string, resourceType: string): string {
    // Get the book file info
    const bookFile = this.getBookFileName(book);
    if (!bookFile) return "";

    // Extract number and code from filename (e.g., "44-JHN.usfm" -> "44-JHN")
    const baseName = bookFile.replace(".usfm", "");

    // Deprecated pattern; do not use hardcoded TSV names
    return "";
  }

  private getBookCode(book: string): string {
    // Map to 3-letter codes
    const bookFile = this.getBookFileName(book);
    if (!bookFile) return book.substring(0, 3).toLowerCase();

    // Extract code from filename (e.g., "44-JHN.usfm" -> "JHN")
    const match = bookFile.match(/\d+-([A-Z]+)\.usfm/);
    return match ? match[1].toLowerCase() : book.substring(0, 3).toLowerCase();
  }

  private extractVerseFromUSFM(usfm: string, reference: ParsedReference): string {
    // Import existing extraction logic
    if (!reference.chapter || !reference.verse) return "";

    try {
      // Find chapter
      const chapterPattern = new RegExp(`\\\\c\\s+${reference.chapter}\\b`);
      const chapterMatch = usfm.match(chapterPattern);
      if (!chapterMatch) return "";

      const chapterStart = chapterMatch.index! + chapterMatch[0].length;

      // Find next chapter to limit scope
      const nextChapterMatch = usfm.substring(chapterStart).match(/\\c\s+\d+/);
      const chapterEnd = nextChapterMatch ? chapterStart + nextChapterMatch.index! : usfm.length;

      const chapterContent = usfm.substring(chapterStart, chapterEnd);

      // Find verse
      const versePattern = new RegExp(`\\\\v\\s+${reference.verse}\\b`);
      const verseMatch = chapterContent.match(versePattern);
      if (!verseMatch) return "";

      const verseStart = verseMatch.index! + verseMatch[0].length;

      // Find next verse or end
      const nextVerseMatch = chapterContent.substring(verseStart).match(/\\v\s+\d+/);
      const verseEnd = nextVerseMatch ? verseStart + nextVerseMatch.index! : chapterContent.length;

      let verseText = chapterContent.substring(verseStart, verseEnd);

      // Clean USFM markers
      verseText = verseText
        .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1") // Word markers
        .replace(/\\zaln-[se]\|[^\\]+\\*/g, "") // Alignment markers
        .replace(/\\[a-z]+\s*/g, "") // Other markers
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      return verseText;
    } catch (error) {
      logger.error("Error extracting verse:", error);
      return "";
    }
  }

  private parseTSVForReference(tsv: string, reference: ParsedReference): Record<string, unknown>[] {
    try {
      const lines = tsv.split("\n");
      if (lines.length < 2) return [];

      // Parse header
      const headers = lines[0].split("\t");

      // Parse data rows
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split("\t");
        if (values.length !== headers.length) continue;

        // Build object from headers and values
        const row: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Check if this row matches our reference
        const ref = row.Reference || row.reference;
        if (!ref) continue;

        // Simple reference matching
        if (reference.verse) {
          if (ref.includes(`${reference.chapter}:${reference.verse}`)) {
            results.push(row);
          }
        } else {
          if (ref.includes(`${reference.chapter}:`)) {
            results.push(row);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error("Error parsing TSV:", error);
      return [];
    }
  }

  getTrace() {
    return this.tracer.getTrace();
  }
}
