/**
 * ZIP-based Resource Fetcher V2
 * Uses ingredients from catalog to map file paths correctly!
 *
 * KISS: Download ZIP once, use ingredients to find files
 * DRY: All resources use the same pattern
 */

import { cache } from "../functions/cache.js";
import { EdgeXRayTracer, trackedFetch } from "../functions/edge-xray.js";
import { getKVCache } from "../functions/kv-cache.js";
import type { ParsedReference } from "../parsers/referenceParser.js";
import { logger } from "../utils/logger.js";

interface CatalogResource {
  name: string;
  repo: string;
  owner: string;
  ingredients: Array<{
    identifier: string;
    path: string;
    title?: string;
  }>;
}

export class ZipResourceFetcher2 {
  private tracer: EdgeXRayTracer;
  private kvCache = getKVCache();

  constructor(tracer?: EdgeXRayTracer) {
    this.tracer =
      tracer || new EdgeXRayTracer(`zip-${Date.now()}`, "ZipResourceFetcher2");
  }

  /**
   * Get scripture for a reference using catalog + ZIP approach
   */
  async getScripture(
    reference: ParsedReference,
    language: string,
    organization: string,
    version?: string,
  ): Promise<Array<{ text: string; translation: string }>> {
    console.log("🚀 getScripture called with:", {
      reference,
      language,
      organization,
      version,
    });

    try {
      // 1. Get catalog to find resources AND their ingredients
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?lang=${language}&owner=${organization}&type=text&subject=Bible,Aligned%20Bible`;

      logger.info(`Fetching catalog: ${catalogUrl}`);
      console.log("📡 About to fetch catalog...");
      const catalogResponse = await trackedFetch(this.tracer, catalogUrl);

      if (!catalogResponse.ok) {
        logger.error(`Catalog fetch failed: ${catalogResponse.status}`);
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: CatalogResource[];
      };
      const resources = catalogData.data || [];

      logger.info(`Found ${resources.length} Bible resources`);
      console.log(
        `📚 Catalog resources:`,
        resources.map((r) => r.name),
      );

      const results = [];

      // 2. Process each resource
      for (const resource of resources) {
        console.log(`🔄 Processing resource: ${resource.name}`);

        // Skip if version specified and doesn't match
        if (version && !resource.name.includes(`_${version}`)) {
          console.log(
            `⏭️ Skipping ${resource.name} - doesn't match version ${version}`,
          );
          continue;
        }

        // Skip non-Bible resources
        if (
          resource.name.includes("_tn") ||
          resource.name.includes("_tq") ||
          resource.name.includes("_tw") ||
          resource.name.includes("_twl")
        ) {
          continue;
        }

        // 3. Find the ingredient for this book
        const bookCode = this.getBookCode(reference.book);
        const ingredient = resource.ingredients?.find(
          (ing) =>
            ing.identifier === bookCode ||
            ing.identifier === reference.book.toUpperCase() ||
            ing.identifier === reference.book.toLowerCase(),
        );

        if (!ingredient || !ingredient.path) {
          logger.debug(
            `No ingredient found for ${reference.book} in ${resource.name}`,
          );
          continue;
        }

        logger.info(
          `Found ingredient path: ${ingredient.path} for ${reference.book}`,
        );

        // 4. Get the ZIP and extract using the ingredient path
        const zipData = await this.getOrDownloadZip(
          resource.owner,
          resource.name,
        );
        if (!zipData) continue;

        const fileContent = await this.extractFileFromZip(
          zipData,
          ingredient.path,
          resource.name,
        );

        if (!fileContent) continue;

        // 5. Extract the verse
        const verseText = this.extractVerseFromUSFM(fileContent, reference);
        console.log(
          `📝 Extracted verse text length: ${verseText?.length || 0}`,
        );

        if (verseText) {
          results.push({
            text: verseText,
            translation: resource.name
              .replace(`${language}_`, "")
              .toUpperCase(),
          });
          console.log(`✅ Added result for ${resource.name}`);
        } else {
          console.log(`❌ No verse text extracted for ${resource.name}`);
        }
      }

      return results;
    } catch (error) {
      console.error("💥 Error in getScripture:", error);
      logger.error("Error in getScripture:", error);
      return [];
    }
  }

  /**
   * Get TSV data (TN, TQ, TWL) using ingredients
   */
  async getTSVData(
    reference: ParsedReference,
    language: string,
    organization: string,
    resourceType: "tn" | "tq" | "twl",
  ): Promise<unknown[]> {
    try {
      // 1. Get catalog to find the resource
      const subject =
        resourceType === "twl"
          ? "TSV%20Translation%20Words%20Links"
          : resourceType === "tq"
            ? "TSV%20Translation%20Questions"
            : "TSV%20Translation%20Notes";

      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?lang=${language}&owner=${organization}&subject=${subject}`;

      const catalogResponse = await trackedFetch(this.tracer, catalogUrl);
      if (!catalogResponse.ok) return [];

      const catalogData = (await catalogResponse.json()) as {
        data?: CatalogResource[];
      };
      const resources = catalogData.data || [];

      // 2. Find the right resource
      const resource = resources.find((r) =>
        r.name.includes(`_${resourceType}`),
      );
      if (!resource) return [];

      // 3. Find the ingredient for this book
      const bookCode = this.getBookCode(reference.book);
      let targetIngredient = null;

      // TSV files might be named differently, check various patterns
      for (const ingredient of resource.ingredients || []) {
        const path = ingredient.path.toLowerCase();
        if (path.includes(bookCode.toLowerCase()) && path.endsWith(".tsv")) {
          targetIngredient = ingredient;
          break;
        }
      }

      if (!targetIngredient) {
        logger.debug(
          `No TSV ingredient found for ${reference.book} in ${resource.name}`,
        );
        return [];
      }

      // 4. Get ZIP and extract
      const zipData = await this.getOrDownloadZip(
        resource.owner,
        resource.name,
      );
      if (!zipData) return [];

      const tsvContent = await this.extractFileFromZip(
        zipData,
        targetIngredient.path,
        resource.name,
      );

      if (!tsvContent) return [];

      // 5. Parse TSV and filter by reference
      return this.parseTSVForReference(tsvContent, reference);
    } catch (error) {
      logger.error("Error in getTSVData:", error);
      return [];
    }
  }

  /**
   * Get or download a ZIP file
   */
  private async getOrDownloadZip(
    organization: string,
    repository: string,
  ): Promise<Uint8Array | null> {
    try {
      const cacheKey = `zip:${organization}/${repository}`;

      // Try KV cache first (includes memory cache)
      const cached = await this.kvCache.get(cacheKey);
      console.log(
        `🔍 KV/Memory cache check for ${cacheKey}:`,
        cached ? "HIT" : "MISS",
      );

      if (cached instanceof ArrayBuffer) {
        logger.info(`Using cached ZIP for ${repository}`);
        console.log(
          `✅ Using cached ZIP (${(cached.byteLength / 1024 / 1024).toFixed(2)} MB)`,
        );
        return new Uint8Array(cached);
      }

      // Fallback to regular cache if KV missed
      const memoryCached = await cache.get(cacheKey);
      if (memoryCached instanceof ArrayBuffer) {
        logger.info(`Using memory-only cached ZIP for ${repository}`);
        // Warm KV cache with the value
        await this.kvCache.set(cacheKey, memoryCached, 30 * 24 * 60 * 60); // 30 days
        return new Uint8Array(memoryCached);
      }

      // Download the ZIP
      const zipUrl = `https://git.door43.org/${organization}/${repository}/archive/master.zip`;
      logger.info(`Downloading ZIP: ${zipUrl}`);

      const response = await trackedFetch(this.tracer, zipUrl);
      if (!response.ok) {
        logger.error(`Failed to download ZIP: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);

      // Cache in both places for 30 days
      await cache.set(cacheKey, buffer, "resource", 30 * 24 * 60 * 60 * 1000);
      await this.kvCache.set(cacheKey, buffer, 30 * 24 * 60 * 60); // 30 days

      console.log(
        `📦 Cached ZIP (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB) in both memory and KV`,
      );
      return data;
    } catch (error) {
      logger.error("Error downloading ZIP:", error);
      return null;
    }
  }

  /**
   * Extract a file from ZIP using the exact path from ingredients
   */
  private async extractFileFromZip(
    zipData: Uint8Array,
    filePath: string,
    repository: string,
  ): Promise<string | null> {
    try {
      const { unzipSync } = await import("fflate");
      const unzipped = unzipSync(zipData);

      // Remove leading ./ if present
      const cleanPath = filePath.replace(/^\.\//, "");

      // Try different path variations
      const possiblePaths = [
        cleanPath,
        `./${cleanPath}`,
        `${repository}-master/${cleanPath}`,
        `${repository}/${cleanPath}`,
      ];

      for (const path of possiblePaths) {
        if (unzipped[path]) {
          const decoder = new TextDecoder("utf-8");
          return decoder.decode(unzipped[path]);
        }
      }

      // Debug: show what's in the ZIP
      const availablePaths = Object.keys(unzipped).slice(0, 10);
      logger.warn(`File not found. Tried: ${possiblePaths.join(", ")}`);
      logger.warn(`Available in ZIP: ${availablePaths.join(", ")}`);

      return null;
    } catch (error) {
      logger.error("Error extracting from ZIP:", error);
      return null;
    }
  }

  private getBookCode(book: string): string {
    // Standard 3-letter book codes
    const codes: Record<string, string> = {
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
      Psalm: "psa",
      Proverbs: "pro",
      Ecclesiastes: "ecc",
      "Song of Solomon": "sng",
      "Song of Songs": "sng",
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
      // New Testament
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

    return codes[book] || book.substring(0, 3).toLowerCase();
  }

  private extractVerseFromUSFM(
    usfm: string,
    reference: ParsedReference,
  ): string {
    if (!reference.chapter || !reference.verse) return "";

    try {
      // Find chapter
      const chapterPattern = new RegExp(`\\\\c\\s+${reference.chapter}\\b`);
      const chapterMatch = usfm.match(chapterPattern);
      if (!chapterMatch) return "";

      const chapterStart = chapterMatch.index! + chapterMatch[0].length;

      // Find next chapter to limit scope
      const nextChapterMatch = usfm.substring(chapterStart).match(/\\c\s+\d+/);
      const chapterEnd = nextChapterMatch
        ? chapterStart + nextChapterMatch.index!
        : usfm.length;

      const chapterContent = usfm.substring(chapterStart, chapterEnd);

      // Find verse
      const versePattern = new RegExp(`\\\\v\\s+${reference.verse}\\b`);
      const verseMatch = chapterContent.match(versePattern);
      if (!verseMatch) return "";

      const verseStart = verseMatch.index! + verseMatch[0].length;

      // Find next verse or end
      const nextVerseMatch = chapterContent
        .substring(verseStart)
        .match(/\\v\s+\d+/);
      const verseEnd = nextVerseMatch
        ? verseStart + nextVerseMatch.index!
        : chapterContent.length;

      let verseText = chapterContent.substring(verseStart, verseEnd);

      // Clean USFM markers more thoroughly
      verseText = verseText
        .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "") // Start alignment markers
        .replace(/\\zaln-e\\*/g, "") // End alignment markers
        .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1") // Word markers
        .replace(/\\-s\s*\|[^\\]+\\*/g, "") // Start markers
        .replace(/\\-e\\*/g, "") // End markers
        .replace(/\\[a-z]+\s*/g, "") // Other markers
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      return verseText;
    } catch (error) {
      logger.error("Error extracting verse:", error);
      return "";
    }
  }

  private parseTSVForReference(
    tsv: string,
    reference: ParsedReference,
  ): unknown[] {
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
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Check if this row matches our reference
        const ref = row.Reference || row.reference;
        if (!ref) continue;

        // Match reference
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
