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
  catalog?: {
    prod?: { branch_or_tag_name?: string; zipball_url?: string };
    preprod?: { branch_or_tag_name?: string; zipball_url?: string };
    latest?: { branch_or_tag_name?: string; zipball_url?: string };
  };
  subject?: string;
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
    this.tracer = tracer || new EdgeXRayTracer(`zip-${Date.now()}`, "ZipResourceFetcher2");
  }

  private resolveRefAndZip(resource: any): { refTag: string | null; zipballUrl: string | null } {
    const paths = [
      (r: any) => r.catalog?.prod,
      (r: any) => r.repo?.catalog?.prod,
      (r: any) => r.metadata?.catalog?.prod,
    ];
    for (const get of paths) {
      try {
        const prod = get(resource);
        if (prod && (prod.branch_or_tag_name || prod.zipball_url)) {
          return {
            refTag: prod.branch_or_tag_name || null,
            zipballUrl: prod.zipball_url || null,
          };
        }
      } catch {}
    }
    return { refTag: null, zipballUrl: null };
  }

  /**
   * Get scripture for a reference using catalog + ZIP approach
   */
  async getScripture(
    reference: ParsedReference,
    language: string,
    organization: string,
    version?: string
  ): Promise<Array<{ text: string; translation: string }>> {
    console.log("🚀 getScripture called with:", {
      reference,
      language,
      organization,
      version,
    });

    try {
      // 1. Get catalog to find resources AND their ingredients (single request, cached)
      const baseCatalog = `https://git.door43.org/api/v1/catalog/search`;
      const params = new URLSearchParams();
      params.set("lang", language);
      if (organization && organization !== "all") params.set("owner", organization);
      params.set("type", "text");
      params.set("stage", "prod");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // KV+memory cached catalog per (lang, org, stage=prod)
      const catalogCacheKey = `catalog:${language}:${organization}:prod`;
      let catalogData: { data?: CatalogResource[] } | null = null;
      const cachedCatalog = await this.kvCache.get(catalogCacheKey);
      if (cachedCatalog) {
        try {
          const json =
            typeof cachedCatalog === "string"
              ? cachedCatalog
              : new TextDecoder().decode(cachedCatalog as ArrayBuffer);
          catalogData = JSON.parse(json);
          // Log synthetic cache hit for X-Ray
          this.tracer.addApiCall({
            url: `internal://kv/catalog/${language}/${organization}`,
            duration: 0,
            status: 200,
            size: json.length,
            cached: true,
          });
        } catch {
          catalogData = null;
        }
      }
      if (!catalogData) {
        logger.info(`Fetching catalog: ${catalogUrl}`);
        const catalogResponse = await trackedFetch(this.tracer, catalogUrl);
        if (!catalogResponse.ok) {
          logger.error(`Catalog fetch failed: ${catalogResponse.status}`);
          return [];
        }
        catalogData = (await catalogResponse.json()) as { data?: CatalogResource[] };
        // Store in KV for 1 hour
        try {
          await this.kvCache.set(catalogCacheKey, JSON.stringify(catalogData), 3600);
        } catch {}
      }
      // Local subject filter (Bible / Aligned Bible) and de-duplicate by owner/name
      const seen = new Set<string>();
      const allowedSubjects = new Set(["Bible", "Aligned Bible"]);
      const resources = (catalogData.data || [])
        .filter((r) => !r.subject || allowedSubjects.has(r.subject))
        .filter((r) => {
          const key = `${r.owner}/${r.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      logger.info(`Found ${resources.length} Bible resources`);
      console.log(
        `📚 Catalog resources:`,
        resources.map((r) => r.name)
      );

      const results = [];

      // 2. Process each resource
      for (const resource of resources) {
        console.log(`🔄 Processing resource: ${resource.name}`);

        // Skip if version specified and doesn't match
        if (version && !resource.name.includes(`_${version}`)) {
          console.log(`⏭️ Skipping ${resource.name} - doesn't match version ${version}`);
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
        const normalize = (s: unknown) =>
          String(s || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        const bookKey = normalize(bookCode);
        const ingredient = resource.ingredients?.find(
          (ing) => normalize(ing.identifier) === bookKey
        );

        if (!ingredient || !ingredient.path) {
          logger.debug(`No ingredient found for ${reference.book} in ${resource.name}`);
          continue;
        }

        logger.info(`Found ingredient path: ${ingredient.path} for ${reference.book}`);

        // 4. Get the ZIP and extract using the ingredient path
        // Use prod tag ref/zipball when present for immutable caching
        const { refTag, zipballUrl } = this.resolveRefAndZip(resource as any);
        const zipData = await this.getOrDownloadZip(
          resource.owner,
          resource.name,
          refTag,
          zipballUrl
        );
        if (!zipData) continue;

        let fileContent = await this.extractFileFromZip(zipData, ingredient.path, resource.name);

        // If extraction failed, attempt a canonical NT fallback for JHN (e.g., 44-JHN.usfm)
        if (!fileContent && ingredient.identifier.toLowerCase() === "jhn") {
          const fallback = "44-JHN.usfm";
          logger.debug(`Fallback attempt for ${resource.name} JHN using ${fallback}`);
          fileContent = await this.extractFileFromZip(zipData, fallback, resource.name);
        }

        // Final fallback: direct raw fetch from DCS if ZIP path fails
        if (!fileContent) {
          try {
            const cleanPath = ingredient.path.replace(/^\.\//, "");
            const rawUrl = `https://git.door43.org/api/v1/repos/${resource.owner}/${resource.name}/raw/${encodeURIComponent(cleanPath)}?ref=master`;
            const rawResp = await trackedFetch(this.tracer, rawUrl);
            if (rawResp.ok) {
              fileContent = await rawResp.text();
            }
          } catch (e) {
            logger.debug(`Raw fetch fallback failed for ${resource.name}:${ingredient.path}`);
          }
        }

        if (!fileContent) continue;

        // 5. Extract the content based on reference type
        let verseText: string;
        if (!reference.chapter && !reference.verse) {
          // Full book request
          verseText = this.extractFullBookFromUSFM(fileContent);
        } else if (reference.endChapter && reference.endChapter !== reference.chapter) {
          // Multi-chapter request
          verseText = this.extractChapterRangeFromUSFM(fileContent, reference);
        } else {
          // Single chapter, verse, or verse range
          verseText = this.extractVerseFromUSFM(fileContent, reference);
        }
        console.log(`📝 Extracted text length: ${verseText?.length || 0}`);

        if (verseText) {
          // Normalize translation display to canonical codes
          const name = resource.name.replace(`${language}_`, "");
          const upper = name.toUpperCase();
          const normalized = upper.includes("ULT")
            ? "ULT"
            : upper.includes("UST")
              ? "UST"
              : upper.includes("T4T")
                ? "T4T"
                : upper.includes("UEB")
                  ? "UEB"
                  : upper;
          results.push({
            text: verseText,
            translation: normalized,
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
    resourceType: "tn" | "tq" | "twl"
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
      const resource = resources.find((r) => r.name.includes(`_${resourceType}`));
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
        logger.debug(`No TSV ingredient found for ${reference.book} in ${resource.name}`);
        return [];
      }

      // 4. Get ZIP and extract
      const zipData = await this.getOrDownloadZip(resource.owner, resource.name);
      if (!zipData) return [];

      const tsvContent = await this.extractFileFromZip(
        zipData,
        targetIngredient.path,
        resource.name
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
    ref?: string | null,
    zipballUrl?: string | null
  ): Promise<Uint8Array | null> {
    try {
      const cacheKey = `zip:${organization}/${repository}:${ref || "master"}`;

      // Try KV cache first (includes memory cache)
      const cached = await this.kvCache.get(cacheKey);
      console.log(`🔍 KV/Memory cache check for ${cacheKey}:`, cached ? "HIT" : "MISS");

      if (cached instanceof ArrayBuffer) {
        logger.info(`Using cached ZIP for ${repository}`);
        console.log(`✅ Using cached ZIP (${(cached.byteLength / 1024 / 1024).toFixed(2)} MB)`);
        // Log synthetic KV hit for X-Ray
        try {
          this.tracer.addApiCall({
            url: `internal://kv/zip/${organization}/${repository}:${ref || "master"}`,
            duration: 0,
            status: 200,
            size: cached.byteLength,
            cached: true,
          });
        } catch {}
        return new Uint8Array(cached);
      }

      // Fallback to regular cache if KV missed
      const memoryCached = await cache.get(cacheKey);
      if (memoryCached instanceof ArrayBuffer) {
        logger.info(`Using memory-only cached ZIP for ${repository}`);
        // Warm KV cache with the value
        await this.kvCache.set(cacheKey, memoryCached, 30 * 24 * 60 * 60); // 30 days
        // Log synthetic memory hit for X-Ray
        try {
          this.tracer.addApiCall({
            url: `internal://memory/zip/${organization}/${repository}:${ref || "master"}`,
            duration: 0,
            status: 200,
            size: memoryCached.byteLength,
            cached: true,
          });
        } catch {}
        return new Uint8Array(memoryCached);
      }

      // Download the ZIP (prefer provided zipball URL)
      const zipUrl =
        zipballUrl ||
        `https://git.door43.org/${organization}/${repository}/archive/${encodeURIComponent(
          ref || "master"
        )}.zip`;
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
        `📦 Cached ZIP (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB) in both memory and KV`
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
    repository: string
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

      // Fallback: search by suffix match anywhere in archive
      const candidate = Object.keys(unzipped).find(
        (key) => key.endsWith(cleanPath) || key.endsWith(`/${cleanPath}`)
      );
      if (candidate && unzipped[candidate]) {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(unzipped[candidate]);
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

  private extractVerseFromUSFM(usfm: string, reference: ParsedReference): string {
    if (!reference.chapter) return "";

    try {
      // Find chapter (allow optional whitespace after marker)
      const chapterPattern = new RegExp(`\\\\c\\s*${reference.chapter}\\b`);
      const chapterMatch = usfm.match(chapterPattern);
      if (!chapterMatch) return "";

      const chapterStart = chapterMatch.index! + chapterMatch[0].length;

      // Find next chapter to limit scope
      const nextChapterMatch = usfm.substring(chapterStart).match(/\\c\s+\d+/);
      const chapterEnd = nextChapterMatch ? chapterStart + nextChapterMatch.index! : usfm.length;

      const chapterContent = usfm.substring(chapterStart, chapterEnd);

      // Handle full chapter request
      if (!reference.verse) {
        // Get the entire chapter
        let verseText = chapterContent;

        // Clean USFM but preserve verse markers for full chapters
        verseText = verseText
          // First, preserve verse markers by converting them temporarily
          .replace(/\\v\s+(\d+)\s*/g, "[[VERSE:$1]]")

          // Remove alignment markers
          .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "") // Start alignment markers
          .replace(/\\zaln-e\\*/g, "") // End alignment markers

          // Remove word markers and extract clean text
          .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1") // Word markers

          // Remove other USFM markers
          .replace(/\\-s\s*\|[^\\]+\\*/g, "") // Start markers
          .replace(/\\-e\\*/g, "") // End markers
          .replace(/\\[a-z]+\d*\s*/g, "") // Other markers with optional numbers

          // Remove alignment asterisks and braces
          .replace(/\*+/g, "") // Remove all asterisks
          .replace(/\{([^}]+)\}/g, "$1") // Remove braces but keep content

          // Clean up whitespace
          .replace(/\s+/g, " ") // Normalize whitespace
          .replace(/\s+([.,;:!?])/g, "$1") // Remove space before punctuation

          // Restore verse markers with proper formatting
          .replace(/\[\[VERSE:(\d+)\]\]/g, "\n\n$1. ")
          .trim();

        return verseText;
      }

      // Find start verse (allow optional whitespace after marker)
      const versePattern = new RegExp(`\\\\v\\s*${reference.verse}\\b`);
      const verseMatch = chapterContent.match(versePattern);
      if (!verseMatch) return "";

      const verseStart = verseMatch.index! + verseMatch[0].length;

      // Determine end point based on whether we have an endVerse
      let verseEnd: number;
      if (reference.endVerse && reference.endVerse > reference.verse) {
        // Find the verse AFTER the endVerse to get the full range
        const afterEndVersePattern = new RegExp(`\\\\v\\s*${reference.endVerse + 1}\\b`);
        const afterEndMatch = chapterContent.match(afterEndVersePattern);

        if (afterEndMatch) {
          verseEnd = afterEndMatch.index!;
        } else {
          // No verse after endVerse, so go to end of chapter
          verseEnd = chapterContent.length;
        }
      } else {
        // Single verse - find next verse or end
        const nextVerseMatch = chapterContent.substring(verseStart).match(/\\v\s+\d+/);
        verseEnd = nextVerseMatch ? verseStart + nextVerseMatch.index! : chapterContent.length;
      }

      let verseText = chapterContent.substring(verseStart, verseEnd);

      // For verse ranges, keep verse numbers
      const isRange = reference.endVerse && reference.endVerse > reference.verse;

      if (isRange) {
        // Clean USFM but preserve verse markers for ranges
        verseText = verseText
          // First, preserve verse markers by converting them temporarily
          .replace(/\\v\s+(\d+)\s*/g, "[[VERSE:$1]]")

          // Remove alignment markers
          .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "") // Start alignment markers
          .replace(/\\zaln-e\\*/g, "") // End alignment markers

          // Remove word markers and extract clean text
          .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1") // Word markers

          // Remove other USFM markers
          .replace(/\\-s\s*\|[^\\]+\\*/g, "") // Start markers
          .replace(/\\-e\\*/g, "") // End markers
          .replace(/\\[a-z]+\d*\s*/g, "") // Other markers with optional numbers

          // Remove alignment asterisks and braces
          .replace(/\*+/g, "") // Remove all asterisks
          .replace(/\{([^}]+)\}/g, "$1") // Remove braces but keep content

          // Clean up whitespace
          .replace(/\s+/g, " ") // Normalize whitespace
          .replace(/\s+([.,;:!?])/g, "$1") // Remove space before punctuation

          // Restore verse markers with proper formatting
          .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1. ")
          .trim();

        // Add the first verse number if it's missing
        if (!verseText.match(/^\d+\./)) {
          verseText = `${reference.verse}. ${verseText}`;
        }
      } else {
        // Single verse - clean all markers including verse numbers
        verseText = verseText
          // Remove alignment markers
          .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "") // Start alignment markers
          .replace(/\\zaln-e\\*/g, "") // End alignment markers

          // Remove word markers and extract clean text
          .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1") // Word markers

          // Remove other USFM markers
          .replace(/\\-s\s*\|[^\\]+\\*/g, "") // Start markers
          .replace(/\\-e\\*/g, "") // End markers
          .replace(/\\[a-z]+\d*\s*/g, "") // Other markers with optional numbers

          // Remove alignment asterisks and braces
          .replace(/\*+/g, "") // Remove all asterisks
          .replace(/\{([^}]+)\}/g, "$1") // Remove braces but keep content

          // Clean up whitespace
          .replace(/\s+/g, " ") // Normalize whitespace
          .replace(/\s+([.,;:!?])/g, "$1") // Remove space before punctuation
          .trim();
      }

      return verseText;
    } catch (error) {
      logger.error("Error extracting verse:", error);
      return "";
    }
  }

  private extractFullBookFromUSFM(usfm: string): string {
    try {
      // Clean the entire book text, preserving chapter and verse structure
      let bookText = usfm
        // Preserve chapter markers
        .replace(/\\c\s+(\d+)/g, "[[CHAPTER:$1]]")
        // Preserve verse markers
        .replace(/\\v\s+(\d+)\s*/g, "[[VERSE:$1]]")
        
        // Remove alignment markers
        .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "")
        .replace(/\\zaln-e\\*/g, "")
        
        // Remove word markers
        .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1")
        
        // Remove other USFM markers
        .replace(/\\-s\s*\|[^\\]+\\*/g, "")
        .replace(/\\-e\\*/g, "")
        .replace(/\\[a-z]+\d*\s*/g, "")
        
        // Remove asterisks and braces
        .replace(/\*+/g, "")
        .replace(/\{([^}]+)\}/g, "$1")
        
        // Clean whitespace
        .replace(/\s+/g, " ")
        .replace(/\s+([.,;:!?])/g, "$1")
        
        // Format chapters and verses
        .replace(/\[\[CHAPTER:(\d+)\]\]/g, "\n\n## Chapter $1\n\n")
        .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1. ")
        .trim();
        
      return bookText;
    } catch (error) {
      logger.error("Error extracting full book:", error);
      return "";
    }
  }

  private extractChapterRangeFromUSFM(usfm: string, reference: ParsedReference): string {
    if (!reference.chapter || !reference.endChapter) return "";
    
    try {
      const startChapter = reference.chapter;
      const endChapter = reference.endChapter;
      
      // Find start chapter
      const startPattern = new RegExp(`\\\\c\\s*${startChapter}\\b`);
      const startMatch = usfm.match(startPattern);
      if (!startMatch) return "";
      
      // Include the chapter marker itself
      const contentStart = startMatch.index!;
      
      // Find the chapter after end chapter
      const afterEndPattern = new RegExp(`\\\\c\\s*${endChapter + 1}\\b`);
      const afterEndMatch = usfm.substring(contentStart).match(afterEndPattern);
      
      let contentEnd = usfm.length;
      if (afterEndMatch) {
        contentEnd = contentStart + afterEndMatch.index!;
      }
      
      let rangeText = usfm.substring(contentStart, contentEnd);
      
      // Clean and format with chapter headers
      rangeText = rangeText
        // Preserve chapter markers
        .replace(/\\c\s+(\d+)/g, "[[CHAPTER:$1]]")
        // Preserve verse markers
        .replace(/\\v\s+(\d+)\s*/g, "[[VERSE:$1]]")
        
        // Remove alignment markers
        .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "")
        .replace(/\\zaln-e\\*/g, "")
        
        // Remove word markers
        .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1")
        
        // Remove other USFM markers
        .replace(/\\-s\s*\|[^\\]+\\*/g, "")
        .replace(/\\-e\\*/g, "")
        .replace(/\\[a-z]+\d*\s*/g, "")
        
        // Remove asterisks and braces
        .replace(/\*+/g, "")
        .replace(/\{([^}]+)\}/g, "$1")
        
        // Clean whitespace
        .replace(/\s+/g, " ")
        .replace(/\s+([.,;:!?])/g, "$1");
        
      // Format chapters and verses
      const chapters = rangeText.split("[[CHAPTER:");
      let formattedText = "";
      
      for (let i = 0; i < chapters.length; i++) {
        if (!chapters[i].trim()) continue;
        
        const chapterMatch = chapters[i].match(/^(\d+)\]\]/);
        if (chapterMatch) {
          const chapterNum = chapterMatch[1];
          const chapterContent = chapters[i].substring(chapterMatch[0].length);
          
          // Always add chapter header (including first one)
          formattedText += `\n\n## Chapter ${chapterNum}\n\n`;
          
          // Format verses
          formattedText += chapterContent
            .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1. ")
            .trim();
        }
      }
      
      // Trim any leading newlines
      formattedText = formattedText.trim();
      
      return formattedText.trim();
    } catch (error) {
      logger.error("Error extracting chapter range:", error);
      return "";
    }
  }

  private parseTSVForReference(tsv: string, reference: ParsedReference): unknown[] {
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
    const trace = this.tracer.getTrace();
    console.log("[ZipResourceFetcher2] getTrace apiCalls length:", trace.apiCalls?.length);
    return trace;
  }

  setTracer(tracer: EdgeXRayTracer) {
    console.log("[ZipResourceFetcher2] Setting new tracer");
    this.tracer = tracer;
  }
}
