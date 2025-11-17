/**
 * Local ZIP Fetcher
 *
 * Downloads ZIP files from Door43 and stores them locally in the file system.
 * Reuses the sophisticated download logic from ZipResourceFetcher2 but stores
 * ZIPs locally instead of R2/Cache API.
 *
 * Used by CLI for offline-first operation with local storage.
 */

import * as fs from "fs";
import * as path from "path";
import { EdgeXRayTracer, trackedFetch } from "../functions/edge-xray.js";
import { logger } from "../utils/logger.js";

export class LocalZipFetcher {
  private tracer: EdgeXRayTracer;
  private cacheDir: string;

  constructor(cacheDir: string, tracer?: EdgeXRayTracer) {
    this.cacheDir = cacheDir;
    this.tracer =
      tracer ||
      new EdgeXRayTracer(`local-zip-${Date.now()}`, "LocalZipFetcher");

    // Ensure cache directory exists
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      logger.info(`📁 LocalZipFetcher initialized at ${this.cacheDir}`);
    } catch (error) {
      logger.error("Failed to create cache directory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get client headers for requests (matching ZipResourceFetcher2)
   */
  private getClientHeaders(): Record<string, string> {
    return {
      "User-Agent": "translation-helps-mcp/1.0",
      Accept: "application/zip, application/x-gzip, */*",
      "Accept-Encoding": "gzip, deflate, br",
    };
  }

  /**
   * Get or download a ZIP file (stores locally instead of R2)
   * Reuses download logic from ZipResourceFetcher2.getOrDownloadZip()
   */
  async getOrDownloadZip(
    organization: string,
    repository: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<Uint8Array | null> {
    try {
      // Build preferred URLs (same logic as ZipResourceFetcher2)
      if (!zipballUrl && !ref) {
        logger.error(
          `[LocalZipFetcher] No zipballUrl or ref provided for ${organization}/${repository}`,
        );
        return null;
      }

      const zipUrl =
        zipballUrl ||
        `https://git.door43.org/${organization}/${repository}/archive/${encodeURIComponent(ref!)}.zip`;
      const tarUrl = zipUrl.replace(/\.zip(\?.*)?$/i, ".tar.gz$1");

      // Build local cache key
      const _cacheKey = ref
        ? `zip:${organization}/${repository}:${ref}`
        : `zip:${organization}/${repository}`;
      const localPath = this.getLocalZipPath(organization, repository, ref);

      // Check local cache first
      if (fs.existsSync(localPath)) {
        try {
          const cachedData = fs.readFileSync(localPath);
          const isValidZip =
            cachedData.length >= 1024 &&
            cachedData[0] === 0x50 &&
            cachedData[1] === 0x4b; // PK header
          const isValidGzip =
            cachedData.length >= 1024 &&
            cachedData[0] === 0x1f &&
            cachedData[1] === 0x8b; // GZIP header

          if (isValidZip || isValidGzip) {
            logger.info(
              `✨ Local cache HIT for ${organization}/${repository} (${(cachedData.length / 1024 / 1024).toFixed(2)} MB)`,
            );
            this.tracer.addApiCall({
              url: `file://${localPath}`,
              duration: 1,
              status: 200,
              size: cachedData.length,
              cached: true,
            });
            return new Uint8Array(cachedData);
          } else {
            logger.warn(
              `⚠️ Cached ZIP is corrupted, deleting and re-downloading`,
            );
            fs.unlinkSync(localPath);
          }
        } catch (error) {
          logger.warn(`Failed to read cached ZIP, re-downloading`, { error });
        }
      }

      // Download ZIP first (same logic as ZipResourceFetcher2)
      logger.info(`⬇️ Downloading ZIP from Door43: ${zipUrl}`);
      let response = await trackedFetch(this.tracer, zipUrl, {
        headers: this.getClientHeaders(),
      });

      if (!response.ok) {
        logger.info(
          `[LocalZipFetcher] Initial ZIP fetch failed: ${response.status} ${response.statusText}`,
        );
        // Prefer plain tag tar.gz first
        let tarResp = await trackedFetch(this.tracer, tarUrl, {
          headers: this.getClientHeaders(),
        });

        if (!tarResp.ok) {
          logger.info(
            `[LocalZipFetcher] TAR.GZ fetch also failed: ${tarResp.status} ${tarResp.statusText}`,
          );
          // Then try immutable Link header (often commit tarball) if available
          const linkHeader =
            response.headers.get("link") || response.headers.get("Link");
          const match = linkHeader?.match(/<([^>]+)>\s*;\s*rel="immutable"/i);
          if (match?.[1]) {
            const altUrl = match[1];
            logger.info(`[LocalZipFetcher] Trying immutable link: ${altUrl}`);
            tarResp = await trackedFetch(this.tracer, altUrl, {
              headers: this.getClientHeaders(),
            });
            if (!tarResp.ok) {
              logger.error(
                `[LocalZipFetcher] Immutable link also failed: ${tarResp.status}`,
              );
              return null;
            }
          } else {
            logger.error(
              `[LocalZipFetcher] No immutable link found, giving up`,
            );
            return null;
          }
        } else {
          logger.info(
            `[LocalZipFetcher] Successfully fetched TAR.GZ from: ${tarUrl}`,
          );
        }
        response = tarResp;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 1024) {
        logger.error(
          `[LocalZipFetcher] Downloaded file too small (${buffer.byteLength} bytes), not caching`,
        );
        return null;
      }

      const zipData = new Uint8Array(buffer);

      // Validate ZIP/TAR.GZ
      const isValidZip =
        zipData.length >= 1024 && zipData[0] === 0x50 && zipData[1] === 0x4b;
      const isValidGzip =
        zipData.length >= 1024 && zipData[0] === 0x1f && zipData[1] === 0x8b;

      if (!isValidZip && !isValidGzip) {
        logger.error(
          `[LocalZipFetcher] Downloaded file is not a valid ZIP or TAR.GZ`,
        );
        return null;
      }

      // Save to local file system
      const zipDir = path.dirname(localPath);
      fs.mkdirSync(zipDir, { recursive: true });
      fs.writeFileSync(localPath, zipData);

      logger.info(
        `✅ Downloaded and cached ZIP: ${organization}/${repository} (${(zipData.length / 1024 / 1024).toFixed(2)} MB)`,
      );

      this.tracer.addApiCall({
        url: zipUrl,
        duration: 0, // Would need to track actual download time
        status: response.status,
        size: zipData.length,
        cached: false,
      });

      return zipData;
    } catch (error) {
      logger.error("Error in getOrDownloadZip:", error);
      return null;
    }
  }

  /**
   * Extract a file from a ZIP archive (local or in-memory)
   */
  async extractFileFromZip(
    zipData: Uint8Array,
    filePath: string,
    repository: string,
  ): Promise<string | null> {
    try {
      const { unzipSync } = await import("fflate");
      // Remove leading ./ if present
      const cleanPath = filePath.replace(/^\.\//, "");
      const possiblePaths = [
        cleanPath,
        `./${cleanPath}`,
        `${repository}/${cleanPath}`,
      ];

      // Fast header check: ZIP or GZIP (tar.gz)
      const isZip =
        zipData.length >= 2 && zipData[0] === 0x50 && zipData[1] === 0x4b; // PK
      const isGzip =
        zipData.length >= 2 && zipData[0] === 0x1f && zipData[1] === 0x8b; // GZ

      if (isZip) {
        const unzipped = unzipSync(zipData);
        for (const path of possiblePaths) {
          if (unzipped[path]) {
            const content = unzipped[path];
            if (content) {
              return new TextDecoder("utf-8").decode(content);
            }
          }
        }
      }

      if (isGzip) {
        // For tar.gz, we'd need to decompress and walk the TAR
        // For now, return null and let ZipResourceFetcher2 handle it
        // In the future, we could add TAR walking logic here
        logger.warn(
          `[LocalZipFetcher] TAR.GZ extraction not yet implemented, falling back`,
        );
        return null;
      }

      logger.warn(
        `[LocalZipFetcher] File not found in ZIP: ${filePath} (tried: ${possiblePaths.join(", ")})`,
      );
      return null;
    } catch (error) {
      logger.error("Error extracting file from ZIP:", error);
      return null;
    }
  }

  /**
   * Get local file path for a ZIP
   */
  private getLocalZipPath(
    organization: string,
    repository: string,
    ref?: string | null,
  ): string {
    const safeRef = (ref || "master").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${organization}_${repository}_${safeRef}.zip`;
    return path.join(this.cacheDir, "zips", organization, repository, filename);
  }

  /**
   * Get raw USFM file content from local ZIP
   */
  async getRawUSFMContent(
    organization: string,
    repository: string,
    filePath: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<string | null> {
    try {
      // Download ZIP if needed (cached locally)
      const zipData = await this.getOrDownloadZip(
        organization,
        repository,
        ref,
        zipballUrl,
      );
      if (!zipData) {
        return null;
      }

      // Extract USFM file from ZIP
      const usfmContent = await this.extractFileFromZip(
        zipData,
        filePath,
        repository,
      );
      return usfmContent;
    } catch (error) {
      logger.error("Error in getRawUSFMContent:", error);
      return null;
    }
  }

  /**
   * List all file paths inside a ZIP archive
   */
  private async listZipFiles(zipData: Uint8Array): Promise<string[]> {
    try {
      const { unzipSync, gunzip } = await import("fflate");

      // Fast header check: ZIP or GZIP (tar.gz)
      const isZip =
        zipData.length >= 2 && zipData[0] === 0x50 && zipData[1] === 0x4b; // PK
      const isGzip =
        zipData.length >= 2 && zipData[0] === 0x1f && zipData[1] === 0x8b; // GZ

      if (isZip) {
        // Lazy mode lists entries via central directory without inflating file contents
        const unzipped = unzipSync(zipData, { lazy: true } as any);
        return Object.keys(unzipped);
      }

      if (isGzip) {
        // List TAR entries without decoding file contents
        const tarBytes = await new Promise<Uint8Array>((resolve, reject) => {
          gunzip(zipData, (err, decompressed) =>
            err ? reject(err) : resolve(decompressed),
          );
        });

        const names: string[] = [];
        const decoder = new TextDecoder("utf-8");

        const readOct = (
          arr: Uint8Array,
          start: number,
          len: number,
        ): number => {
          let s = "";
          for (let i = start; i < start + len; i++) {
            const c = arr[i];
            if (c === 0 || c === 32) continue;
            s += String.fromCharCode(c);
          }
          const trimmed = s.replace(/\0+$/, "").trim();
          return trimmed ? parseInt(trimmed, 8) : 0;
        };

        let offset = 0;
        while (offset + 512 <= tarBytes.length) {
          const block = tarBytes.subarray(offset, offset + 512);
          const zero = block.every((b) => b === 0);
          if (zero) break;
          const nameRaw = block.subarray(0, 100);
          const name = decoder.decode(nameRaw).replace(/\0+$/, "").trim();
          if (name) {
            names.push(name);
          }
          const size = readOct(block, 124, 12);
          offset += 512 + Math.ceil(size / 512) * 512;
        }

        return names;
      }

      return [];
    } catch (error) {
      logger.error("Error listing ZIP files:", error);
      return [];
    }
  }

  /**
   * Resolve ref tag and zipball URL from catalog resource
   * Matches the logic from ZipResourceFetcher2.resolveRefAndZip
   */
  private resolveRefAndZip(resource: unknown): {
    refTag: string | null;
    zipballUrl: string | null;
  } {
    type ProdPath = {
      catalog?: {
        prod?: { branch_or_tag_name?: string; zipball_url?: string };
      };
    };
    type RepoPath = {
      repo?: {
        catalog?: {
          prod?: { branch_or_tag_name?: string; zipball_url?: string };
        };
      };
    };
    type MetaPath = {
      metadata?: {
        catalog?: {
          prod?: { branch_or_tag_name?: string; zipball_url?: string };
        };
      };
    };

    // Check if the fields are directly on the resource first
    const res = resource as Record<string, unknown>;
    if (res.zipball_url || res.branch_or_tag_name) {
      let refTag = (res.branch_or_tag_name as string) || null;
      const zipballUrl = (res.zipball_url as string) || null;

      // If no refTag but we have a zipball URL, extract tag from it
      if (!refTag && zipballUrl) {
        const match = zipballUrl.match(/\/archive\/([^/]+)\.zip$/);
        if (match) {
          refTag = match[1];
        }
      }

      return { refTag, zipballUrl };
    }

    // Then check nested paths for backward compatibility
    const paths: Array<(r: Record<string, unknown>) => unknown> = [
      (r) => (r as ProdPath).catalog?.prod,
      (r) => (r as RepoPath).repo?.catalog?.prod,
      (r) => (r as MetaPath).metadata?.catalog?.prod,
    ];
    for (const get of paths) {
      try {
        const prod = get(resource as Record<string, unknown>) as
          | { branch_or_tag_name?: string; zipball_url?: string }
          | undefined;
        if (prod && (prod.branch_or_tag_name || prod.zipball_url)) {
          let refTag = prod.branch_or_tag_name || null;
          const zipballUrl = prod.zipball_url || null;

          // If no refTag but we have a zipball URL, extract tag from it
          if (!refTag && zipballUrl) {
            const match = zipballUrl.match(/\/archive\/([^/]+)\.zip$/);
            if (match) {
              refTag = match[1];
            }
          }

          return { refTag, zipballUrl };
        }
      } catch {
        // Continue to next path
      }
    }

    return { refTag: null, zipballUrl: null };
  }

  /**
   * Get markdown content (for TW/TA) from a ZIP file
   * Implements the same logic as ZipResourceFetcher2 but uses local file system
   */
  async getMarkdownContent(
    language: string,
    organization: string,
    resourceType: "tw" | "ta",
    identifier?: string,
    forceRefresh = false,
  ): Promise<unknown> {
    logger.info(`[LocalZipFetcher.getMarkdownContent] START`, {
      language,
      organization,
      resourceType,
      identifier,
      forceRefresh,
    });

    try {
      // Map resource types to proper subject filters
      const subjectMap = {
        tw: "Translation Words",
        ta: "Translation Academy",
      };
      const subject = subjectMap[resourceType];

      // 1) Catalog lookup with subject-specific filtering
      const baseCatalog = `https://git.door43.org/api/v1/catalog/search`;
      const params = new URLSearchParams();
      params.set("lang", language);
      params.set("owner", organization);
      params.set("stage", "prod");

      if (resourceType === "tw") {
        params.set("type", "text");
      }

      params.set("subject", subject);
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // Fix double ?? issue (if baseCatalog already has ?)
      const fixedCatalogUrl = catalogUrl.replace(/\?\?/g, "?");

      // Cache catalog response to file system
      const catalogCachePath = path.join(
        this.cacheDir,
        "catalog",
        `${language}_${organization}_${subject.replace(/\s+/g, "_")}.json`,
      );

      let catalogData: { data?: any[] } | null = null;

      // Check file system cache for catalog
      if (!forceRefresh && fs.existsSync(catalogCachePath)) {
        try {
          const cachedContent = fs.readFileSync(catalogCachePath, "utf-8");
          catalogData = JSON.parse(cachedContent);
          logger.info(`✨ Catalog cache HIT from file system`);
        } catch (error) {
          logger.warn(`Failed to read cached catalog, fetching fresh`, {
            error,
          });
        }
      }

      // Fetch catalog if not cached
      if (!catalogData) {
        logger.info(`⬇️ Fetching catalog from Door43: ${fixedCatalogUrl}`);
        const catalogResponse = await trackedFetch(
          this.tracer,
          fixedCatalogUrl,
          {
            headers: this.getClientHeaders(),
          },
        );

        if (!catalogResponse.ok) {
          logger.error(`Catalog fetch failed: ${catalogResponse.status}`);
          return resourceType === "tw"
            ? { articles: [] }
            : { modules: [], categories: [] };
        }

        const body = await catalogResponse.text();
        try {
          catalogData = JSON.parse(body);
          // Cache to file system
          fs.mkdirSync(path.dirname(catalogCachePath), { recursive: true });
          fs.writeFileSync(catalogCachePath, body, "utf-8");
          logger.info(`💾 Cached catalog to file system`);
        } catch (error) {
          logger.error(`Failed to parse catalog response`, { error });
          return resourceType === "tw"
            ? { articles: [] }
            : { modules: [], categories: [] };
        }
      }

      const resource = (catalogData?.data || [])[0];

      if (!resource) {
        logger.warn(
          `[LocalZipFetcher] No resource found in catalog for ${resourceType}`,
        );
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };
      }

      // 2) Download ZIP (prefer catalog-provided ref and zipball URL)
      const { refTag, zipballUrl } = this.resolveRefAndZip(resource);

      logger.info(`[LocalZipFetcher] Resource details:`, {
        name: resource.name,
        owner: resource.owner,
        refTag,
        hasZipballUrl: !!zipballUrl,
        hasCatalog: !!resource.catalog,
        hasCatalogProd: !!resource.catalog?.prod,
        catalogProdKeys: resource.catalog?.prod
          ? Object.keys(resource.catalog.prod)
          : [],
      });

      if (!refTag) {
        logger.error(`[LocalZipFetcher] No ref tag found for ${resource.name}`);
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };
      }

      const zipData = await this.getOrDownloadZip(
        resource.owner,
        resource.name,
        refTag,
        zipballUrl,
      );

      if (!zipData) {
        logger.error(`[LocalZipFetcher] Failed to download ZIP`);
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };
      }

      // 3) Extract markdown content
      const ingredients = resource.ingredients || [];

      if (resourceType === "tw") {
        if (!identifier) return { articles: [] };
        const id = String(identifier);
        const looksLikePath =
          id.includes("/") && id.toLowerCase().endsWith(".md");
        const term = id.toLowerCase();

        let targetPath: string | null = null;

        if (looksLikePath) {
          targetPath = id;
        } else {
          // INDEX-FIRST: scan archive file list for best matching path
          try {
            const allPaths = await this.listZipFiles(zipData);
            if (allPaths && allPaths.length > 0) {
              const lower = allPaths.map((p) => p.toLowerCase());
              const tf = `${term}.md`;
              const predicates: Array<(p: string) => boolean> = [
                (p) => p.endsWith(`/content/bible/kt/${tf}`),
                (p) => p.endsWith(`/content/bible/names/${tf}`),
                (p) => p.endsWith(`/content/bible/other/${tf}`),
                (p) => p.endsWith(`/bible/kt/${tf}`),
                (p) => p.endsWith(`/bible/names/${tf}`),
                (p) => p.endsWith(`/bible/other/${tf}`),
                (p) => p.endsWith(`/kt/${tf}`),
                (p) => p.endsWith(`/names/${tf}`),
                (p) => p.endsWith(`/other/${tf}`),
                (p) => p.endsWith(`/${tf}`),
              ];
              let idx = -1;
              for (const pred of predicates) {
                idx = lower.findIndex(pred);
                if (idx >= 0) break;
              }
              if (idx >= 0) {
                targetPath = allPaths[idx];
              }
            }
          } catch (error) {
            logger.warn(`Failed to list ZIP files`, { error });
          }

          // Fallback to ingredient-based lookup
          if (!targetPath) {
            targetPath =
              ingredients.find((ing: any) =>
                (ing.path || "").toLowerCase().endsWith(`/${term}.md`),
              )?.path || null;
          }
        }

        if (!targetPath) {
          logger.warn(
            `[LocalZipFetcher] No target path found for term: ${term}`,
          );
          return { articles: [] };
        }

        // Extract content
        const content = await this.extractFileFromZip(
          zipData,
          targetPath,
          resource.name,
        );

        if (!content) {
          logger.warn(`[LocalZipFetcher] Failed to extract content from ZIP`);
          return { articles: [] };
        }

        return {
          articles: [
            {
              term: looksLikePath
                ? targetPath.split("/").pop()?.replace(/\.md$/i, "") || term
                : term,
              path: targetPath,
              markdown: content,
            },
          ],
        };
      } else {
        // Translation Academy handling (simplified - can be expanded)
        logger.warn(
          `[LocalZipFetcher] Translation Academy getMarkdownContent not fully implemented yet`,
        );
        return { modules: [], categories: [] };
      }
    } catch (error) {
      logger.error("Error in getMarkdownContent:", {
        error: error instanceof Error ? error.message : String(error),
        resourceType,
        identifier,
        language,
        organization,
      });
      return resourceType === "tw"
        ? { articles: [] }
        : { modules: [], categories: [] };
    }
  }

  /**
   * Get TSV data (TN, TQ, TWL) using ingredients
   * Reuses logic from ZipResourceFetcher2.getTSVData()
   */
  async getTSVData(
    reference: { book: string; chapter: number; verse?: number },
    language: string,
    organization: string,
    resourceType: "tn" | "tq" | "twl",
  ): Promise<unknown[]> {
    try {
      // Map resource types to proper subject filters
      const subjectMap = {
        tn: "TSV Translation Notes",
        tq: "TSV Translation Questions",
        twl: "TSV Translation Words Links",
      };
      const subject = subjectMap[resourceType];

      // 1. Get catalog with subject-specific filtering
      const baseCatalog = `https://git.door43.org/api/v1/catalog/search`;
      const params = new URLSearchParams();
      params.set("lang", language);
      if (organization && organization !== "all")
        params.set("owner", organization);
      params.set("type", "text");
      params.set("stage", "prod");
      params.set("subject", subject);
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // Check local catalog cache first
      const catalogCachePath = path.join(
        this.cacheDir,
        "catalog",
        `${language}_${organization}_${subject.replace(/\s+/g, "_")}.json`,
      );
      let resources: any[] = [];

      if (fs.existsSync(catalogCachePath)) {
        try {
          const cached = fs.readFileSync(catalogCachePath, "utf-8");
          const parsed = JSON.parse(cached) as { data?: any[] };
          resources = parsed.data || [];
          logger.info(`✨ Catalog cache HIT from file system`);
        } catch {
          // Fall through to network
        }
      }

      if (resources.length === 0) {
        // Download catalog
        const catalogRes = await trackedFetch(this.tracer, catalogUrl, {
          headers: this.getClientHeaders(),
        });
        if (!catalogRes.ok) return [];
        const body = await catalogRes.text();
        try {
          const parsed = JSON.parse(body) as { data?: any[] };
          resources = parsed.data || [];

          // Cache catalog locally
          try {
            fs.mkdirSync(path.dirname(catalogCachePath), { recursive: true });
            fs.writeFileSync(catalogCachePath, body, "utf-8");
            logger.info(`💾 Catalog cached to file system`);
          } catch {
            // Ignore cache write errors
          }
        } catch {
          return [];
        }
      }

      // 2. Find the right resource
      const resource = resources[0];
      if (!resource) return [];

      // 3. Find the ingredient for this book
      const bookCode = this.getBookCode(reference.book);
      let targetIngredient: { path: string } | null = null;

      // TSV files might be named differently, check various patterns
      const ingredients =
        resource.ingredients ||
        (resource as any).door43_metadata?.ingredients ||
        (resource as any).metadata?.ingredients ||
        [];
      for (const ingredient of ingredients) {
        const path = (ingredient.path || "").toLowerCase();
        if (path.includes(bookCode.toLowerCase()) && path.endsWith(".tsv")) {
          targetIngredient = { path: ingredient.path };
          break;
        }
      }

      if (!targetIngredient) {
        logger.debug(
          `No TSV ingredient found for ${reference.book} in ${resource.name}`,
        );
        return [];
      }

      // 4. Get ZIP and extract (prefer catalog-provided ref and zipball URL)
      const { refTag, zipballUrl } = this.resolveRefAndZip(resource);
      const zipData = await this.getOrDownloadZip(
        resource.owner,
        resource.name,
        refTag,
        zipballUrl,
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
      logger.error("Error in getTSVData:", error as Error);
      return [];
    }
  }

  /**
   * Get book code from book name (reused from ZipResourceFetcher2)
   */
  private getBookCode(book: string): string {
    const bookMap: Record<string, string> = {
      genesis: "GEN",
      gen: "GEN",
      exodus: "EXO",
      exo: "EXO",
      exod: "EXO",
      leviticus: "LEV",
      lev: "LEV",
      numbers: "NUM",
      num: "NUM",
      deuteronomy: "DEU",
      deut: "DEU",
      dt: "DEU",
      joshua: "JOS",
      josh: "JOS",
      judges: "JDG",
      jdg: "JDG",
      ruth: "RUT",
      rut: "RUT",
      "1 samuel": "1SA",
      "2 samuel": "2SA",
      "1 kings": "1KI",
      "2 kings": "2KI",
      "1 chronicles": "1CH",
      "2 chronicles": "2CH",
      ezra: "EZR",
      nehemiah: "NEH",
      neh: "NEH",
      esther: "EST",
      job: "JOB",
      psalms: "PSA",
      psalm: "PSA",
      ps: "PSA",
      proverbs: "PRO",
      pro: "PRO",
      ecclesiastes: "ECC",
      ecc: "ECC",
      "song of songs": "SNG",
      "song of solomon": "SNG",
      isaiah: "ISA",
      isa: "ISA",
      jeremiah: "JER",
      jer: "JER",
      lamentations: "LAM",
      lam: "LAM",
      ezekiel: "EZK",
      ezk: "EZK",
      daniel: "DAN",
      dan: "DAN",
      hosea: "HOS",
      hos: "HOS",
      joel: "JOL",
      jol: "JOL",
      amos: "AMO",
      amo: "AMO",
      obadiah: "OBA",
      oba: "OBA",
      jonah: "JON",
      jon: "JON",
      micah: "MIC",
      mic: "MIC",
      nahum: "NAM",
      nam: "NAM",
      habakkuk: "HAB",
      hab: "HAB",
      zephaniah: "ZEP",
      zep: "ZEP",
      haggai: "HAG",
      hag: "HAG",
      zechariah: "ZEC",
      zec: "ZEC",
      malachi: "MAL",
      mal: "MAL",
      matthew: "MAT",
      matt: "MAT",
      mat: "MAT",
      mt: "MAT",
      mark: "MRK",
      mrk: "MRK",
      mk: "MRK",
      luke: "LUK",
      luk: "LUK",
      lk: "LUK",
      john: "JHN",
      jn: "JHN",
      joh: "JHN",
      acts: "ACT",
      act: "ACT",
      romans: "ROM",
      rom: "ROM",
      "1 corinthians": "1CO",
      "2 corinthians": "2CO",
      galatians: "GAL",
      gal: "GAL",
      ephesians: "EPH",
      eph: "EPH",
      philippians: "PHP",
      php: "PHP",
      colossians: "COL",
      col: "COL",
      "1 thessalonians": "1TH",
      "2 thessalonians": "2TH",
      "1 timothy": "1TI",
      "2 timothy": "2TI",
      titus: "TIT",
      tit: "TIT",
      philemon: "PHM",
      phm: "PHM",
      hebrews: "HEB",
      heb: "HEB",
      james: "JAS",
      jas: "JAS",
      "1 peter": "1PE",
      "2 peter": "2PE",
      "1 john": "1JN",
      "2 john": "2JN",
      "3 john": "3JN",
      jude: "JUD",
      jud: "JUD",
      revelation: "REV",
      rev: "REV",
    };

    const normalized = book.toLowerCase().trim();
    return bookMap[normalized] || book.toUpperCase().slice(0, 3);
  }

  /**
   * Parse TSV and filter by reference (reused from ZipResourceFetcher2)
   */
  private parseTSVForReference(
    tsv: string,
    reference: { book: string; chapter: number; verse?: number },
  ): unknown[] {
    try {
      const lines = tsv.split("\n");
      if (lines.length < 2) return [];

      // Parse header
      const headers = lines[0].split("\t");

      // Parse data rows
      const results: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split("\t");
        if (values.length !== headers.length) continue;

        // Build object from headers and values
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Check if this row matches our reference
        const ref = (row.Reference || row.reference || "").trim();
        if (!ref) continue;

        // Always include book/chapter intros
        if (ref === "front:intro") {
          results.push(row as Record<string, string>);
          continue;
        }
        const introMatch = ref.match(/^(\d+):intro$/);
        if (introMatch) {
          const introChapter = parseInt(introMatch[1]);
          if (introChapter === reference.chapter) {
            results.push(row as Record<string, string>);
            continue;
          }
        }

        // Normalize reference cell: extract trailing chapter:verse if present
        const matchCv = ref.match(/(\d+:\d+)\b/);
        const refCv = matchCv ? matchCv[1] : ref;

        // Handle verse ranges and exact verse matches
        if (reference.verse) {
          const verseMatch = refCv.match(/^(\d+):(\d+)$/);
          if (verseMatch) {
            const chapterNum = parseInt(verseMatch[1]);
            const verseNum = parseInt(verseMatch[2]);

            if (chapterNum === reference.chapter) {
              const endVerse =
                (reference as any).endVerse || (reference as any).verseEnd;
              if (endVerse) {
                if (verseNum >= reference.verse && verseNum <= endVerse) {
                  results.push(row as Record<string, string>);
                }
              } else {
                if (verseNum === reference.verse) {
                  results.push(row as Record<string, string>);
                }
              }
            }
          }
          continue;
        }

        // Chapter-only: allow any verse in that chapter
        if (
          reference.chapter &&
          (refCv.startsWith(`${reference.chapter}:`) ||
            ref.includes(` ${reference.chapter}:`))
        ) {
          results.push(row as Record<string, string>);
        }
      }

      return results;
    } catch (error) {
      logger.error("Error parsing TSV:", error as Error);
      return [];
    }
  }

  /**
   * Get cache directory
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * List all cached ZIP files
   */
  listCachedZips(): Array<{
    organization: string;
    repository: string;
    ref: string;
    path: string;
    size: number;
  }> {
    const zips: Array<{
      organization: string;
      repository: string;
      ref: string;
      path: string;
      size: number;
    }> = [];

    try {
      const zipsDir = path.join(this.cacheDir, "zips");
      if (!fs.existsSync(zipsDir)) {
        return zips;
      }

      const orgDirs = fs.readdirSync(zipsDir);
      for (const org of orgDirs) {
        const orgPath = path.join(zipsDir, org);
        if (!fs.statSync(orgPath).isDirectory()) continue;

        const repoDirs = fs.readdirSync(orgPath);
        for (const repo of repoDirs) {
          const repoPath = path.join(orgPath, repo);
          if (!fs.statSync(repoPath).isDirectory()) continue;

          const files = fs.readdirSync(repoPath);
          for (const file of files) {
            if (file.endsWith(".zip")) {
              const filePath = path.join(repoPath, file);
              const stats = fs.statSync(filePath);

              // Parse ref from filename: org_repo_ref.zip
              const match = file.match(/^[^_]+_[^_]+_(.+)\.zip$/);
              const ref = match ? match[1] : "unknown";

              zips.push({
                organization: org,
                repository: repo,
                ref,
                path: filePath,
                size: stats.size,
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error listing cached ZIPs:", error);
    }

    return zips;
  }
}
