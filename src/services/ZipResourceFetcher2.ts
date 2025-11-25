/**
 * ZIP-based Resource Fetcher V2
 * Uses ingredients from catalog to map file paths correctly!
 *
 * KISS: Download ZIP once, use ingredients to find files
 * DRY: All resources use the same pattern
 */

import MiniSearch from "minisearch";
import { EdgeXRayTracer, trackedFetch } from "../functions/edge-xray.js";
import { getKVCache } from "../functions/kv-cache.js";
import { getR2Env } from "../functions/r2-env.js";
import { r2KeyFromUrl } from "../functions/r2-keys.js";
import { R2Storage } from "../functions/r2-storage.js";
import {
  createCacheValidator,
  validateCacheableData,
} from "../middleware/cacheValidator.js";
import type { ParsedReference } from "../parsers/referenceParser.js";
import { logger } from "../utils/logger.js";
import type { SearchDocument } from "./SearchService.js";

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

/**
 * Result type when extracting a file with optional index
 * Supports cached MiniSearch indexes for search acceleration
 */
export interface FileWithIndex {
  /** The raw file content */
  content: string;
  /** MiniSearch index if requested and available */
  index?: MiniSearch<SearchDocument>;
  /** How the index was obtained: 'cache' (from R2), 'built' (just created), or 'none' (not requested) */
  indexSource: "cache" | "built" | "none";
  /** R2 key where index is cached */
  indexKey?: string;
}

/**
 * Options for building/loading a MiniSearch index alongside file extraction
 */
export interface IndexOptions {
  /** Whether to build/load an index for this file */
  buildIndex: boolean;
  /** Resource type for document creation */
  resourceType: "bible" | "notes" | "words" | "academy" | "questions";
  /** Optional custom document parser - uses default if not provided */
  documentParser?: (
    content: string,
    path: string,
    resource: string,
  ) => SearchDocument[];
}

export class ZipResourceFetcher2 {
  private tracer: EdgeXRayTracer;
  private kvCache = getKVCache();
  private requestHeaders?: Record<string, string>;
  private cacheValidator: ReturnType<typeof createCacheValidator>;
  // Removed in-flight maps to simplify logic per KISS

  constructor(tracer?: EdgeXRayTracer) {
    this.tracer =
      tracer || new EdgeXRayTracer(`zip-${Date.now()}`, "ZipResourceFetcher2");

    // Initialize cache validator
    this.cacheValidator = createCacheValidator({
      strict: false,
      logLevel: "warn",
    });
  }

  setRequestHeaders(headers: Record<string, string>): void {
    this.requestHeaders = headers;
  }

  private getClientHeaders(): Record<string, string> | undefined {
    if (!this.requestHeaders) {
      logger.debug("No request headers set for client passthrough");
      return undefined;
    }

    // Forward relevant headers from the client request
    const relevantHeaders: Record<string, string> = {};
    const headersToForward = [
      "user-agent",
      "accept",
      "accept-language",
      "accept-encoding",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "sec-ch-ua-platform",
      "sec-fetch-dest",
      "sec-fetch-mode",
      "sec-fetch-site",
    ];

    for (const [key, value] of Object.entries(this.requestHeaders)) {
      const lowerKey = key.toLowerCase();
      if (headersToForward.includes(lowerKey)) {
        relevantHeaders[key] = value;
      }
    }

    logger.debug("Client headers for passthrough", {
      original: Object.keys(this.requestHeaders).length,
      forwarded: Object.keys(relevantHeaders).length,
      userAgent: relevantHeaders["user-agent"] || relevantHeaders["User-Agent"],
    });

    return Object.keys(relevantHeaders).length > 0
      ? relevantHeaders
      : undefined;
  }

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
        // eslint-disable-next-line no-empty -- quiet fallback when property path fails
        void 0;
      }
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
    version?: string,
  ): Promise<Array<{ text: string; translation: string }>> {
    logger.debug("getScripture called", {
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
      if (organization && organization !== "all")
        params.set("owner", organization);
      params.set("type", "text");
      params.set("stage", "prod");
      // Use proper subject filtering for Bible resources
      params.set("subject", "Bible,Aligned Bible");
      // CRITICAL: request RC metadata so ingredients are included
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // KV+memory cached catalog per (lang, org, stage=prod, subject)
      const catalogCacheKey = catalogUrl; // Use exact URL as KV key
      let catalogData: { data?: CatalogResource[] } | null = null;
      const cacheStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      // Check if we should bypass cache
      const forceRefresh =
        this.requestHeaders?.["x-force-refresh"] === "true" ||
        this.requestHeaders?.["X-Force-Refresh"] === "true";

      if (forceRefresh) {
        logger.info(`🚫 Force refresh requested - bypassing catalog cache`);
      }

      const cachedCatalog = !forceRefresh
        ? await this.kvCache.get(catalogCacheKey)
        : null;
      const cacheDuration = Math.max(
        1,
        Math.round(
          (typeof performance !== "undefined"
            ? performance.now()
            : Date.now()) - cacheStart,
        ),
      );

      if (cachedCatalog) {
        try {
          const json =
            typeof cachedCatalog === "string"
              ? cachedCatalog
              : new TextDecoder().decode(cachedCatalog as ArrayBuffer);
          const parsed = JSON.parse(json);

          // Validate cached data structure - must have data array with items
          if (
            parsed &&
            parsed.data &&
            Array.isArray(parsed.data) &&
            parsed.data.length > 0
          ) {
            catalogData = parsed;

            // Determine cache source from duration: very fast (< 5ms) = memory, slower = KV
            const cacheSource = cacheDuration < 5 ? "memory" : "kv";

            console.log(`[CACHE TRACE] ✅ Catalog cache HIT:`, {
              source: cacheSource,
              duration: cacheDuration,
              key: catalogCacheKey,
              dataLength: parsed.data.length,
            });

            // Log synthetic cache hit for X-Ray
            this.tracer.addApiCall({
              url: `internal://${cacheSource}/catalog/${language}/${organization}/Bible,Aligned Bible`,
              duration: cacheDuration,
              status: 200,
              size: json.length,
              cached: true,
            });

            console.log(
              `[CACHE TRACE] Added to tracer with cached=true, source=${cacheSource}`,
            );
          } else {
            // Cached data is empty or invalid - treat as cache miss and clean up
            logger.warn(
              `Cached catalog data is empty or invalid, treating as cache miss`,
              {
                key: catalogCacheKey,
                hasData: !!parsed?.data,
                dataLength: parsed?.data?.length || 0,
              },
            );
            // Clean up invalid cache entry to prevent future misses
            try {
              await this.kvCache.delete(catalogCacheKey);
              logger.debug(
                `Cleaned up invalid cache entry for ${catalogCacheKey}`,
              );
            } catch (err) {
              // Best effort - ignore cleanup failures
              logger.debug(`Failed to clean up invalid cache entry: ${err}`);
            }
            catalogData = null; // Force fetch from network
          }
        } catch {
          // eslint-disable-next-line no-empty -- ignore corrupt cache JSON
          logger.warn(
            `Failed to parse cached catalog data, treating as cache miss`,
          );
          catalogData = null; // Force fetch from network
        }
      }
      // unified discovery uses KV+memory cache; no local flag needed
      if (!catalogData) {
        logger.info(`Fetching catalog: ${catalogUrl}`);
        const catalogResponse = await trackedFetch(this.tracer, catalogUrl, {
          headers: this.getClientHeaders(),
        });
        if (!catalogResponse.ok) {
          logger.error(`Catalog fetch failed: ${catalogResponse.status}`);
          return [];
        }
        catalogData = (await catalogResponse.json()) as {
          data?: CatalogResource[];
        };

        // Only cache non-empty catalogs with valid data to avoid persisting bad/empty results
        if (
          catalogData?.data &&
          Array.isArray(catalogData.data) &&
          catalogData.data.length > 0
        ) {
          try {
            await this.kvCache.set(
              catalogCacheKey,
              JSON.stringify(catalogData),
              3600,
            );
          } catch (err) {
            // eslint-disable-next-line no-empty -- best-effort KV set failure can be ignored
            logger.warn(`Failed to cache catalog data: ${err}`);
          }
        } else {
          logger.warn(
            `Empty or invalid catalog response for ${catalogCacheKey}, not caching. Skipping KV cache for empty catalog result`,
            {
              key: catalogCacheKey,
            },
          );
        }
      }
      // De-duplicate by owner/name (API subject filtering already applied)
      const seen = new Set<string>();
      const resources = (catalogData.data || []).filter((r) => {
        const key = `${r.owner}/${r.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If cache yielded zero resources AND we haven't forced refresh, retry with force refresh
      if (resources.length === 0 && !forceRefresh) {
        logger.warn(`Got 0 resources from cache, retrying with force refresh`);
        // Temporarily set the force refresh header and retry
        const originalHeaders = this.requestHeaders;
        this.requestHeaders = {
          ...this.requestHeaders,
          "X-Force-Refresh": "true",
        };
        const result = await this.getScripture(
          reference,
          language,
          organization,
          version,
        );
        this.requestHeaders = originalHeaders; // Restore original headers
        return result;
      }

      // If no resources found for the requested organization, return empty results
      // Do NOT fallback to other organizations - user requested specific org

      logger.info(`Found ${resources.length} Bible resources`);
      logger.debug(`Catalog resources`, {
        resources: resources.map((r) => r.name),
      });

      // 2. Prepare resources (prioritize common ones) and compute ingredients
      // Map resource type abbreviations to their equivalents
      // ULT/GLT are equivalent (Literal Text), UST/GST are equivalent (Simplified Text)
      const resourceTypeEquivalents: Record<string, string[]> = {
        ult: ["ult", "glt"], // unfoldingWord Literal Text / Gateway Literal Text
        glt: ["ult", "glt"],
        ust: ["ust", "gst"], // unfoldingWord Simplified Text / Gateway Simplified Text
        gst: ["ust", "gst"],
        t4t: ["t4t"],
        ueb: ["ueb"],
      };

      // Get equivalent types for the requested version
      const requestedTypes = version
        ? resourceTypeEquivalents[version.toLowerCase()] || [
            version.toLowerCase(),
          ]
        : null;

      const priorityOrder = ["ult", "glt", "ust", "gst", "t4t", "ueb"];
      const candidates = resources
        .filter(
          (r) =>
            !(
              r.name.includes("_tn") ||
              r.name.includes("_tq") ||
              r.name.includes("_tw") ||
              r.name.includes("_twl")
            ),
        )
        .filter((r) => {
          if (!version) return true; // No version specified, return all
          if (!requestedTypes) return r.name.endsWith(`_${version}`);
          // Check if resource name ends with any of the equivalent types
          return requestedTypes.some((type) => r.name.endsWith(`_${type}`));
        })
        .sort((a, b) => {
          // Sort by priority, checking for any equivalent type
          const aType = priorityOrder.find((p) => a.name.endsWith(`_${p}`));
          const bType = priorityOrder.find((p) => b.name.endsWith(`_${p}`));
          const as = aType ? priorityOrder.indexOf(aType) : 999;
          const bs = bType ? priorityOrder.indexOf(bType) : 999;
          return as - bs;
        });

      type ScriptureResult = { text: string; translation: string };
      const results: ScriptureResult[] = [];

      // Prepare targets with resolved ingredient path and zip info
      const bookCode = this.getBookCode(reference.book);
      const normalize = (s: unknown) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      const bookKey = normalize(bookCode);

      let targets = candidates
        .map((resource) => {
          const resIngredients =
            resource.ingredients ||
            // @ts-expect-error door43 metadata paths are not typed in CatalogResource
            (resource.door43_metadata?.ingredients as Array<{
              identifier?: string;
              path: string;
            }>) ||
            // @ts-expect-error generic metadata path
            (resource.metadata?.ingredients as Array<{
              identifier?: string;
              path: string;
            }>) ||
            [];
          // Select ingredient with strict path-code preference to avoid John vs 1 John confusion
          const code = bookCode.toLowerCase();
          const full = normalize(reference.book);
          const isPathForCode = (p: string) =>
            p.endsWith(`/${code}.usfm`) ||
            p.endsWith(`${code}.usfm`) ||
            p.includes(`-${code}.usfm`);

          let ingredient: { path?: string } | undefined = (
            resIngredients as Array<{
              identifier?: string;
              path?: string;
            }>
          ).find((ing) => isPathForCode(String(ing?.path || "").toLowerCase()));

          if (!ingredient) {
            ingredient = (
              resIngredients as Array<{ identifier?: string; path?: string }>
            ).find((ing) => {
              const id = normalize(ing?.identifier);
              if (id === bookKey || id === full) {
                // Even when identifier matches, ensure path does NOT clearly indicate a different numbered book
                const p = String(ing?.path || "").toLowerCase();
                return isPathForCode(p);
              }
              return false;
            });
          }
          if (!ingredient?.path) {
            logger.debug(
              `No ingredient found for ${reference.book} in ${resource.name}`,
            );
            return null;
          }
          const { refTag, zipballUrl } = this.resolveRefAndZip(
            resource as unknown,
          );
          return {
            owner: resource.owner,
            name: resource.name,
            ingredientPath: ingredient.path,
            refTag,
            zipballUrl,
          };
        })
        .filter(
          (
            v,
          ): v is {
            owner: string;
            name: string;
            ingredientPath: string;
            refTag: string | null;
            zipballUrl: string | null;
          } => Boolean(v),
        );

      // If no targets resolved, fall back to per-repo metadata lookup to obtain ingredients (DRY with RC)
      if (targets.length === 0 && candidates.length > 0) {
        const altTargets: Array<{
          owner: string;
          name: string;
          ingredientPath: string;
          refTag: string | null;
          zipballUrl: string | null;
        }> = [];
        for (const resource of candidates) {
          try {
            const metaUrl = `${baseCatalog}?metadataType=rc&lang=${language}&owner=${resource.owner}&name=${encodeURIComponent(
              resource.name,
            )}&includeMetadata=true`;
            const metaResp = await trackedFetch(this.tracer, metaUrl, {
              headers: this.getClientHeaders(),
            });
            if (!metaResp.ok) continue;
            const metaJson = (await metaResp.json()) as {
              data?: CatalogResource[];
            };
            const metaRes = (metaJson.data || [])[0];
            const ings = (metaRes?.ingredients || []) as Array<{
              identifier?: string;
              path?: string;
            }>;
            if (!ings.length) continue;
            const ingredient = ings.find((ing) => {
              const id = normalize(ing?.identifier);
              const full = normalize(reference.book);
              // Tight matching only: avoid fuzzy contains that can map John to 1 John
              if (id === bookKey || id === full) return true;
              const p = String(ing?.path || "").toLowerCase();
              const code = bookCode.toLowerCase();
              return (
                p.endsWith(`/${code}.usfm`) ||
                p.endsWith(`${code}.usfm`) ||
                p.includes(`-${code}.usfm`)
              );
            });
            if (!ingredient?.path) continue;
            const { refTag, zipballUrl } = this.resolveRefAndZip(
              metaRes as unknown,
            );
            altTargets.push({
              owner: resource.owner,
              name: resource.name,
              ingredientPath: ingredient.path,
              refTag,
              zipballUrl,
            });
          } catch {
            // ignore metadata failures per resource
          }
        }
        if (altTargets.length > 0) {
          targets = altTargets;
        }
      }

      // KISS: no per-request target de-duplication; rely on in-flight coalescing instead

      // First: try R2/Cache for extracted file content (no ZIP needed on hit)
      const misses: number[] = [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const zipUrl =
          t.zipballUrl ||
          `https://git.door43.org/${t.owner}/${t.name}/archive/${encodeURIComponent(t.refTag || "master")}.zip`;
        const { key: r2Key } = r2KeyFromUrl(zipUrl);
        const cleanInner = t.ingredientPath.replace(/^(\.\/|\/)+/, "");
        const fileKey = `${r2Key}/files/${cleanInner}`;
        const { bucket, caches } = getR2Env();
        const r2 = new R2Storage(bucket as any, caches as any);
        const ext = cleanInner.toLowerCase();
        const contentType = ext.endsWith(".md")
          ? "text/markdown; charset=utf-8"
          : ext.endsWith(".tsv")
            ? "text/tab-separated-values; charset=utf-8"
            : "text/plain; charset=utf-8";
        const {
          data: contentStr,
          source,
          durationMs,
          size,
        } = await r2.getFileWithInfo(fileKey, contentType);
        if (!contentStr) {
          misses.push(i);
          continue;
        }
        try {
          // R2 is a cache layer - both "cache" (Cache API) and "r2" (R2 bucket) are cache hits
          const isCacheHit = source === "cache" || source === "r2";
          console.log(`[CACHE TRACE] R2 file result:`, {
            fileKey,
            source,
            isCacheHit,
            duration: durationMs,
          });
          this.tracer.addApiCall({
            url: `internal://${source}/file/${fileKey}`,
            duration: durationMs,
            status: 200,
            size,
            cached: isCacheHit,
          });
        } catch {
          // ignore tracer issues
        }

        let verseText: string;
        if (!reference.chapter && !reference.verse) {
          verseText = this.extractFullBookFromUSFM(contentStr);
        } else if (
          (reference as any).verseEnd &&
          !reference.verse &&
          (reference as any).verseEnd !== reference.chapter
        ) {
          verseText = this.extractChapterRangeFromUSFM(contentStr, reference);
        } else if (reference.chapter && !reference.verse) {
          verseText = this.extractVerseFromUSFM(contentStr, reference);
        } else {
          verseText = this.extractVerseFromUSFM(contentStr, reference);
        }
        if (verseText && verseText.trim()) {
          const name = t.name.replace(`${language}_`, "");
          const upper = name.toUpperCase();
          const normalizedTrans = upper.includes("ULT")
            ? "ULT"
            : upper.includes("UST")
              ? "UST"
              : upper.includes("T4T")
                ? "T4T"
                : upper.includes("UEB")
                  ? "UEB"
                  : upper;
          const withVersion = t.refTag
            ? `${normalizedTrans} ${t.refTag}`
            : normalizedTrans;
          results.push({
            text: verseText,
            translation: withVersion,
            // @ts-expect-error - Adding organization tracking for accurate source attribution
            actualOrganization: t.owner,
          });
        }
      }

      // For misses only: download ZIPs with human-like delays (avoid bot detection)
      const missTargets = misses.map((i) => targets[i]);
      const missZipDatas = [];

      for (let i = 0; i < missTargets.length; i++) {
        const target = missTargets[i];

        // Add random delay between downloads (200-800ms) to look more human
        if (i > 0) {
          const delay = Math.floor(Math.random() * 600) + 200; // 200-800ms
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const zipData = await this.getOrDownloadZip(
          target.owner,
          target.name,
          target.refTag,
          target.zipballUrl,
        );
        missZipDatas.push(zipData);
      }

      // Then extract sequentially for misses (CPU-bound)
      for (let m = 0; m < missTargets.length; m++) {
        const t = missTargets[m];
        const zipData = missZipDatas[m];
        if (!zipData) continue;

        const zipUrl =
          t.zipballUrl ||
          `https://git.door43.org/${t.owner}/${t.name}/archive/${encodeURIComponent(t.refTag || "master")}.zip`;
        const { key: r2Key } = r2KeyFromUrl(zipUrl);
        const fileContent = await this.extractFileFromZip(
          zipData,
          t.ingredientPath,
          t.name,
          r2Key,
        );
        if (!fileContent) {
          console.log(
            `[getScripture] No file content for ${t.name} at ${t.ingredientPath}`,
          );
          continue;
        }
        console.log(
          `[getScripture] Got file content for ${t.name}, length: ${fileContent.length}`,
        );

        // Extract text
        let verseText: string;
        if (!reference.chapter && !reference.verse) {
          verseText = this.extractFullBookFromUSFM(fileContent);
        } else if (
          (reference as any).verseEnd &&
          !reference.verse &&
          (reference as any).verseEnd !== reference.chapter
        ) {
          // Chapter range: verseEnd is being used to store end chapter
          verseText = this.extractChapterRangeFromUSFM(fileContent, reference);
        } else if (reference.chapter && !reference.verse) {
          console.log(
            `[getScripture] Extracting chapter ${reference.chapter} from ${t.name}`,
          );
          verseText = this.extractVerseFromUSFM(fileContent, reference);
          console.log(
            `[getScripture] Extracted text length: ${verseText?.length || 0}`,
          );
        } else {
          verseText = this.extractVerseFromUSFM(fileContent, reference);
        }
        if (verseText && verseText.trim()) {
          const name = t.name.replace(`${language}_`, "");
          const upper = name.toUpperCase();
          const normalizedTrans = upper.includes("ULT")
            ? "ULT"
            : upper.includes("UST")
              ? "UST"
              : upper.includes("T4T")
                ? "T4T"
                : upper.includes("UEB")
                  ? "UEB"
                  : upper;
          const withVersion = t.refTag
            ? `${normalizedTrans} ${t.refTag}`
            : normalizedTrans;
          results.push({
            text: verseText,
            translation: withVersion,
            // @ts-expect-error - Adding organization tracking for accurate source attribution
            actualOrganization: t.owner,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error("Error in getScripture:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        reference,
        language,
        organization,
        version,
      });
      return [];
    }
  }

  /**
   * Get raw USFM file content from ZIP (public method for scripture service)
   * Downloads ZIP if needed (cached), extracts USFM file (cached extraction)
   */
  async getRawUSFMContent(
    organization: string,
    repository: string,
    filePath: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<string | null> {
    try {
      // Download ZIP (cached)
      const zipData = await this.getOrDownloadZip(
        organization,
        repository,
        ref,
        zipballUrl,
      );

      if (!zipData) {
        return null;
      }

      // Build cache key for extracted file
      const zipCacheKey = ref
        ? `zip:${organization}/${repository}:${ref}`
        : `zip:${organization}/${repository}`;

      // Extract USFM file from ZIP (cached extraction)
      const usfmContent = await this.extractFileFromZip(
        zipData,
        filePath,
        repository,
        zipCacheKey,
      );

      return usfmContent;
    } catch (error) {
      logger.error("Error in getRawUSFMContent:", error as Error);
      return null;
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
      // Map resource types to proper subject filters
      const subjectMap = {
        tn: "TSV Translation Notes",
        tq: "TSV Translation Questions",
        twl: "TSV Translation Words Links",
      };
      const subject = subjectMap[resourceType];

      // 1. Get catalog with subject-specific filtering for optimal caching
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

      const catalogCacheKey = catalogUrl; // Use exact URL as KV key
      let resources: CatalogResource[] = [];
      const kvStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const cachedCatalog = await this.kvCache.get(catalogCacheKey);
      if (cachedCatalog) {
        try {
          const json =
            typeof cachedCatalog === "string"
              ? cachedCatalog
              : new TextDecoder().decode(cachedCatalog as ArrayBuffer);
          const parsed = JSON.parse(json) as { data?: CatalogResource[] };
          resources = parsed.data || [];
          this.tracer.addApiCall({
            url: `internal://kv/catalog/${language}/${organization}/${subject}`,
            duration: Math.max(
              1,
              Math.round(
                (typeof performance !== "undefined"
                  ? performance.now()
                  : Date.now()) - kvStart,
              ),
            ),
            status: 200,
            size: json.length || 0,
            cached: true,
          });
          // no-op
        } catch {
          // fall through to network
        }
      }
      if (resources.length === 0) {
        const networkRes = await trackedFetch(this.tracer, catalogUrl, {
          headers: this.getClientHeaders(),
        });
        if (!networkRes.ok) return [];
        const body = await networkRes.text();
        try {
          const parsed = JSON.parse(body) as { data?: CatalogResource[] };
          resources = parsed.data || [];
          // Store in KV for reuse across endpoints - only cache valid results
          const validationResult = validateCacheableData(
            parsed,
            catalogCacheKey,
          );

          if (validationResult.cacheable) {
            await this.kvCache.set(
              catalogCacheKey,
              JSON.stringify(parsed),
              3600,
            );
          } else {
            logger.warn(
              `Invalid catalog response for ${catalogCacheKey}, not caching`,
              {
                reason: validationResult.reason,
              },
            );
          }
        } catch {
          return [];
        }
      }

      // 2. Find the right resource (API filtering already applied)
      const resource = resources[0]; // Should only have resources matching our subject
      if (!resource) return [];

      // 3. Find the ingredient for this book
      const bookCode = this.getBookCode(reference.book);
      let targetIngredient: { path: string } | null = null;

      // TSV files might be named differently, check various patterns
      for (const ingredient of resource.ingredients || []) {
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
      const { refTag, zipballUrl } = this.resolveRefAndZip(resource as unknown);
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
        `zip:${resource.owner}/${resource.name}:${refTag}`,
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
   * Get markdown content for Translation Words (tw) and Translation Academy (ta)
   * - tw: requires a term; returns { articles: [{ term, markdown, path }] }
   * - ta: if moduleId provided returns { modules: [{ id, markdown, path }] }
   *       otherwise returns TOC-like summary { categories: string[], modules: [{ id, path }] }
   */
  async getMarkdownContent(
    language: string,
    organization: string,
    resourceType: "tw" | "ta",
    identifier?: string,
    forceRefresh = false,
  ): Promise<unknown> {
    logger.info(`[getMarkdownContent] START`, {
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

      logger.info(`[getMarkdownContent] Subject: ${subject}`);

      // 1) Catalog lookup with subject-specific filtering (KV + memory cached)
      const baseCatalog = `https://git.door43.org/api/v1/catalog/search`;
      const params = new URLSearchParams();
      params.set("lang", language);
      params.set("owner", organization);
      params.set("stage", "prod");

      // Translation Academy uses flavor_type="gloss", not type="text"
      // So we don't set type filter for TA
      if (resourceType === "tw") {
        params.set("type", "text");
      }

      params.set("subject", subject);
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // KV-backed cache key aligned with other helpers
      const catalogCacheKey = catalogUrl; // Use exact URL as KV key

      let catalogData: { data?: CatalogResource[] } | null = null;
      let cachedCatalog: string | ArrayBuffer | null = null;

      // Skip cache if force refresh is requested
      if (!forceRefresh) {
        const kvStart =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        cachedCatalog = await this.kvCache.get(catalogCacheKey);
        if (cachedCatalog) {
          try {
            const json =
              typeof cachedCatalog === "string"
                ? (cachedCatalog as string)
                : new TextDecoder().decode(cachedCatalog as ArrayBuffer);
            const parsed = JSON.parse(json) as { data?: CatalogResource[] };

            // Validate cached data before using it
            if (
              parsed &&
              parsed.data &&
              Array.isArray(parsed.data) &&
              parsed.data.length > 0
            ) {
              catalogData = parsed;
              // Log synthetic cache hit for X-Ray
              this.tracer.addApiCall({
                url: `internal://kv/catalog/${language}/${organization}/${subject}`,
                duration: Math.max(
                  1,
                  Math.round(
                    (typeof performance !== "undefined"
                      ? performance.now()
                      : Date.now()) - (kvStart as number),
                  ),
                ),
                status: 200,
                size: json.length || 0,
                cached: true,
              });
            } else {
              // Cached data is empty or invalid - treat as cache miss and clean up
              logger.warn(
                `[getMarkdownContent] Cached catalog data is empty or invalid, treating as cache miss`,
                {
                  key: catalogCacheKey,
                  hasData: !!parsed?.data,
                  dataLength: parsed?.data?.length || 0,
                },
              );
              // Clean up invalid cache entry to prevent future misses
              try {
                await this.kvCache.delete(catalogCacheKey);
                logger.debug(
                  `Cleaned up invalid catalog cache entry for ${catalogCacheKey}`,
                );
              } catch (err) {
                // Best effort - ignore cleanup failures
                logger.debug(
                  `Failed to clean up invalid catalog cache entry: ${err}`,
                );
              }
              catalogData = null; // Force fetch from network
            }
          } catch {
            // Parse error - fall through to network
            catalogData = null;
          }
        }
      } else {
        logger.info(
          `🚫 Force refresh requested - bypassing catalog cache for ${resourceType}`,
        );
      }

      if (!catalogData) {
        const catalogResponse = await trackedFetch(this.tracer, catalogUrl, {
          headers: this.getClientHeaders(),
        });
        if (!catalogResponse.ok)
          return resourceType === "tw"
            ? { articles: [] }
            : { modules: [], categories: [] };
        const body = await catalogResponse.text();
        try {
          catalogData = JSON.parse(body) as { data?: CatalogResource[] };
          // Validate and cache if appropriate
          const validationResult = validateCacheableData(
            catalogData,
            catalogCacheKey,
          );
          if (validationResult.cacheable) {
            await this.kvCache.set(
              catalogCacheKey,
              JSON.stringify(catalogData),
              3600,
            );
          } else {
            logger.warn(
              `Invalid catalog response for ${catalogCacheKey}, not caching`,
              {
                reason: validationResult.reason,
              },
            );
          }
        } catch {
          return resourceType === "tw"
            ? { articles: [] }
            : { modules: [], categories: [] };
        }
      }

      const resource = (catalogData?.data || [])[0]; // API filtering already applied

      logger.info(`[getMarkdownContent] Catalog data:`, {
        hasData: !!catalogData,
        dataLength: catalogData?.data?.length || 0,
        hasResource: !!resource,
        resourceName: resource?.name,
      });

      // If cache yielded zero resources, delete the bad cache and retry fresh
      if (
        !resource &&
        (!catalogData?.data || catalogData.data.length === 0) &&
        !forceRefresh
      ) {
        logger.warn(
          `[getMarkdownContent] Got empty catalog from cache, invalidating and retrying with force refresh`,
          { key: catalogCacheKey },
        );
        // Delete the corrupted/empty cache from KV
        try {
          await this.kvCache.delete(catalogCacheKey);
          logger.info(`🗑️ Deleted corrupt catalog from KV cache`);
        } catch (err) {
          logger.warn(`Failed to delete corrupt catalog cache: ${err}`);
        }
        // Retry with fresh fetch (bypass ALL caches with forceRefresh=true)
        return this.getMarkdownContent(
          language,
          organization,
          resourceType,
          identifier,
          true, // forceRefresh=true to bypass memory cache
        );
      }

      if (!resource) {
        logger.warn(
          `[getMarkdownContent] No resource found in catalog for ${resourceType}`,
        );
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };
      }

      // 2) Download ZIP (prefer catalog-provided ref and zipball URL)
      const { refTag, zipballUrl } = this.resolveRefAndZip(resource as unknown);

      logger.info(`[getMarkdownContent] Resource details:`, {
        name: resource.name,
        owner: resource.owner,
        refTag,
        hasZipballUrl: !!zipballUrl,
      });

      // We must have a tag - no fallback to master
      if (!refTag) {
        console.error(
          `[getMarkdownContent] No ref tag found for ${resource.name}`,
        );
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
      if (!zipData)
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };

      // 3) Resolve by ingredients
      const ingredients = resource.ingredients || [];
      // Derive URL-based key for extracted files
      const zipUrlForKey =
        (zipballUrl as string | null) ||
        `https://git.door43.org/${resource.owner}/${resource.name}/archive/${encodeURIComponent(refTag as string)}.zip`;
      const { key: zipKeyForFiles } = r2KeyFromUrl(zipUrlForKey);

      if (resourceType === "tw") {
        if (!identifier) return { articles: [] };
        const id = String(identifier);
        const looksLikePath =
          id.includes("/") && id.toLowerCase().endsWith(".md");
        const term = id.toLowerCase();

        let targetPath: string | null = null;

        if (looksLikePath) {
          // If a path is explicitly provided, trust it and skip discovery
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
          } catch {
            // Ignore index scan errors and continue with ingredient-based hints
          }

          // First try to find exact file match in ingredients
          if (!targetPath) {
            targetPath =
              ingredients.find((ing) =>
                (ing.path || "").toLowerCase().endsWith(`/${term}.md`),
              )?.path || null;
          }

          // If no exact match, try to construct path from directory-based ingredients
          if (!targetPath) {
            // Collect candidate base directories from ingredients
            const baseCandidates: string[] = [];
            for (const ing of ingredients) {
              const p = String(ing.path || "")
                .replace(/^\.\//, "")
                .toLowerCase();
              if (p === "bible" || p.endsWith("/bible"))
                baseCandidates.push(p.replace(/\/bible$/, "bible"));
              if (p === "content" || p.endsWith("/content"))
                baseCandidates.push(p.replace(/\/content$/, "content"));
              if (p === "pages" || p.endsWith("/pages"))
                baseCandidates.push(p.replace(/\/pages$/, "pages"));
            }
            // Ensure default order preference and uniqueness
            const orderedBases = [
              "content",
              "bible",
              "pages",
              ...baseCandidates,
            ]
              .map((v) => v.replace(/^\.\//, ""))
              .filter((v, i, a) => a.indexOf(v) === i);

            if (orderedBases.length > 0) {
              const cleanBase = orderedBases[0];
              const prefix = /^(content|pages)$/i.test(cleanBase)
                ? `${cleanBase}/bible`
                : cleanBase;
              const possiblePaths = [
                `${prefix}/kt/${term}.md`,
                `${prefix}/names/${term}.md`,
                `${prefix}/other/${term}.md`,
              ];
              targetPath = possiblePaths[0];
            }
          }

          // No term-index KV lookups; index-first scan is authoritative
        }

        if (!targetPath) {
          return { articles: [] };
        }

        // If the target path was constructed (not a direct match), try all categories
        let content: string | null = null;
        const isConstructedPath =
          !looksLikePath &&
          !ingredients.find((ing) =>
            (ing.path || "").toLowerCase().endsWith(`/${term}.md`),
          );

        if (isConstructedPath) {
          // Try all category patterns for constructed paths
          const baseCandidates: string[] = [];
          for (const ing of ingredients) {
            const p = String(ing.path || "")
              .replace(/^\.\//, "")
              .toLowerCase();
            if (p === "content" || p.endsWith("/content"))
              baseCandidates.push(p.replace(/\/content$/, "content"));
            if (p === "bible" || p.endsWith("/bible"))
              baseCandidates.push(p.replace(/\/bible$/, "bible"));
            if (p === "pages" || p.endsWith("/pages"))
              baseCandidates.push(p.replace(/\/pages$/, "pages"));
          }
          const bases = ["content", "bible", "pages", ...baseCandidates]
            .map((v) => v.replace(/^\.\//, ""))
            .filter((v, i, a) => a.indexOf(v) === i);

          const categories = ["kt", "names", "other"];
          for (const base of bases) {
            for (const category of categories) {
              const prefix = /^(content|pages)$/i.test(base)
                ? `${base}/bible`
                : base;
              const tryPath = `${prefix}/${category}/${term}.md`;
              content = await this.extractFileFromZip(
                zipData,
                tryPath,
                resource.name,
                zipKeyForFiles,
              );
              if (content) {
                targetPath = tryPath;
                break;
              }
            }
            if (content) break;
          }
        } else {
          // Try extraction for exact paths
          content = await this.extractFileFromZip(
            zipData,
            targetPath,
            resource.name,
            zipKeyForFiles,
          );
          // If exact path failed (e.g., bible vs content), try alternate base directories
          if (!content) {
            const baseSwapMatch = targetPath.match(
              /^(.*?)(\b(?:bible|content|pages)\b)(\/.*)$/i,
            );
            if (baseSwapMatch) {
              const [, prefix, base, rest] = baseSwapMatch;
              const alts = ["content", "bible", "pages"]; // preference order
              for (const alt of alts) {
                if (alt.toLowerCase() === base.toLowerCase()) continue;
                let newRest = rest;
                if (
                  /^(\/)(kt|names|other)\//i.test(rest) &&
                  /^(content|pages)$/i.test(alt)
                ) {
                  newRest = `/bible${rest}`;
                }
                if (/^\/bible\//i.test(rest) && alt === "bible") {
                  newRest = rest;
                }
                const altPath = `${prefix}${alt}${newRest}`.replace(/^\/+/, "");
                const tryContent = await this.extractFileFromZip(
                  zipData,
                  altPath,
                  resource.name,
                  `zip:${resource.owner}/${resource.name}:${refTag}`,
                );
                if (tryContent) {
                  content = tryContent;
                  targetPath = altPath;
                  break;
                }
              }
            }
          }
        }

        if (!content) {
          // Last-resort fallback: scan ZIP index for any matching path
          try {
            const allPaths = await this.listZipFiles(zipData);
            const lower = allPaths.map((p) => p.toLowerCase());
            const termFile = `${term}.md`;

            const prefers = [
              (p: string) => p.endsWith(`/bible/kt/${termFile}`),
              (p: string) => p.endsWith(`/bible/names/${termFile}`),
              (p: string) => p.endsWith(`/bible/other/${termFile}`),
              (p: string) => p.endsWith(`/kt/${termFile}`),
              (p: string) => p.endsWith(`/names/${termFile}`),
              (p: string) => p.endsWith(`/other/${termFile}`),
              (p: string) =>
                (p.includes("/content/") ||
                  p.includes("/bible/") ||
                  p.includes("/pages/")) &&
                p.endsWith(`/${termFile}`),
              (p: string) => p.endsWith(`/${termFile}`),
            ];

            let foundIdx = -1;
            for (const pred of prefers) {
              foundIdx = lower.findIndex(pred);
              if (foundIdx >= 0) break;
            }

            if (foundIdx >= 0) {
              const foundPath = allPaths[foundIdx];
              const scanned = await this.extractFileFromZip(
                zipData,
                foundPath,
                resource.name,
                zipKeyForFiles,
              );
              if (scanned) {
                content = scanned;
                targetPath = foundPath;
              }
            }
          } catch {
            // ignore scan errors and fall through to debug response
          }
        }

        if (!content) {
          // Add debug info to the response
          return {
            articles: [],
            debug: {
              term,
              targetPath,
              isConstructedPath,
              triedCategories: isConstructedPath
                ? ["kt", "names", "other"]
                : [],
              repository: resource.name,
              refTag,
              attemptedPaths: isConstructedPath
                ? [
                    "content/kt/" + term + ".md",
                    "content/names/" + term + ".md",
                    "content/other/" + term + ".md",
                    "bible/kt/" + term + ".md",
                    "bible/names/" + term + ".md",
                    "bible/other/" + term + ".md",
                    "pages/kt/" + term + ".md",
                    "pages/names/" + term + ".md",
                    "pages/other/" + term + ".md",
                  ]
                : [targetPath],
              errorMessage: "Failed to extract content from ZIP",
            },
          };
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
      }

      // TA
      const rawId = identifier ? String(identifier) : undefined;
      const moduleId = rawId ? rawId.toLowerCase() : undefined;

      logger.info(`[getMarkdownContent] TA section:`, {
        rawId,
        moduleId,
        hasModuleId: !!moduleId,
      });

      if (moduleId) {
        const looksLikeSingleFile =
          rawId?.includes("/") && moduleId.endsWith(".md");
        const looksLikeDirPath =
          rawId?.includes("/") && !moduleId.endsWith(".md");

        logger.info(`[getMarkdownContent] Path type:`, {
          looksLikeSingleFile,
          looksLikeDirPath,
        });

        // Handle directory path - concatenate all .md files in directory
        if (looksLikeDirPath) {
          const dirPath = rawId || "";
          const allPaths = await this.listZipFiles(zipData);

          logger.info(`[TA DIR SEARCH] Looking for directory: "${dirPath}"`);
          logger.info(`[TA DIR SEARCH] Total files in ZIP: ${allPaths.length}`);

          // Show sample paths to understand structure
          const samplePaths = allPaths
            .filter((p) => p.includes("translate") || p.includes("figs"))
            .slice(0, 10);
          logger.info(
            `[TA DIR SEARCH] Sample paths containing 'translate' or 'figs':`,
            samplePaths,
          );

          // Find all .md files in the specified directory
          const dirFiles = allPaths
            .filter((p) => {
              const pLower = p.toLowerCase();
              const dirPathLower = dirPath.toLowerCase();

              // Try to match with or without repo prefix
              const matchesDirect =
                pLower.startsWith(dirPathLower) && pLower.endsWith(".md");
              const matchesWithPrefix =
                pLower.includes(`/${dirPathLower}`) && pLower.endsWith(".md");
              const matches = matchesDirect || matchesWithPrefix;

              if (matches) {
                // Ensure it's directly in the directory (count slashes after the dir path)
                const afterDir = matchesDirect
                  ? p.substring(dirPath.length)
                  : p.substring(p.indexOf(dirPath) + dirPath.length);
                const isDirectChild = afterDir.split("/").length === 2; // /filename.md

                if (isDirectChild) {
                  logger.debug(`[TA DIR SEARCH] ✓ Matched file: ${p}`);
                }

                return isDirectChild;
              }
              return false;
            })
            .sort((a, b) => {
              // Sort order: title.md, sub-title.md, 01.md, then alphabetically
              const aName = a.substring(a.lastIndexOf("/") + 1).toLowerCase();
              const bName = b.substring(b.lastIndexOf("/") + 1).toLowerCase();

              // Define priority order
              const getPriority = (name: string): number => {
                if (name === "title.md") return 1;
                if (name === "sub-title.md") return 2;
                if (name.startsWith("01.")) return 3;
                return 4;
              };

              const aPriority = getPriority(aName);
              const bPriority = getPriority(bName);

              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }

              // Same priority - sort alphabetically
              return aName.localeCompare(bName);
            });

          logger.info(
            `[TA DIR SEARCH] Found ${dirFiles.length} matching files`,
          );

          if (dirFiles.length === 0) {
            logger.warn(
              `[TA DIR SEARCH] No files found for directory: "${dirPath}"`,
            );
            return { modules: [] };
          }

          // Extract and concatenate all files with proper markdown headers
          const contentParts: string[] = [];

          for (let i = 0; i < dirFiles.length; i++) {
            const filePath = dirFiles[i];
            const fileName = filePath
              .substring(filePath.lastIndexOf("/") + 1)
              .toLowerCase();

            const content = await this.extractFileFromZip(
              zipData,
              filePath,
              resource.name,
              zipKeyForFiles,
            );

            if (content) {
              const trimmedContent = content.trim();

              // Add markdown headers based on file name
              if (fileName === "title.md") {
                // Title gets H1
                const titleText = trimmedContent.replace(/^#+\s*/, ""); // Remove existing headers
                contentParts.push(`# ${titleText}`);
              } else if (fileName === "sub-title.md") {
                // Subtitle gets H2
                const subtitleText = trimmedContent.replace(/^#+\s*/, ""); // Remove existing headers
                contentParts.push(`## ${subtitleText}`);
              } else {
                // Other files (01.md, etc.) - use as is
                contentParts.push(trimmedContent);
              }
            }
          }

          if (contentParts.length === 0) {
            return { modules: [] };
          }

          // Concatenate with newlines (no separators)
          const combined = contentParts.join("\n\n");
          const moduleIdFromPath = dirPath.split("/").pop() || dirPath;

          return {
            modules: [
              {
                id: moduleIdFromPath,
                path: dirPath,
                markdown: combined,
              },
            ],
          };
        }

        // Handle single file path (.md extension)
        let modulePath: string | null = looksLikeSingleFile
          ? rawId || null
          : null;

        // Prefer common TA module layout: <category>/<moduleId>/01.md
        if (!modulePath) {
          const allPaths = await this.listZipFiles(zipData);
          const lower = allPaths.map((p) => p.toLowerCase());
          const categories = [
            "translate",
            "checking",
            "process",
            "audio",
            "gateway",
          ];
          let idx = -1;

          // If identifier includes a slash (already has category), search directly
          if (moduleId.includes("/")) {
            idx = lower.findIndex(
              (p) =>
                p.endsWith(`/${moduleId}/01.md`) ||
                p.endsWith(`/${moduleId}.md`) ||
                p.endsWith(`/${moduleId}/index.md`),
            );
          } else {
            for (const cat of categories) {
              idx = lower.findIndex((p) =>
                p.endsWith(`/${cat}/${moduleId}/01.md`),
              );
              if (idx >= 0) break;
            }
            if (idx < 0) {
              // Legacy flat modules: <category>/<moduleId>.md
              for (const cat of categories) {
                idx = lower.findIndex((p) =>
                  p.endsWith(`/${cat}/${moduleId}.md`),
                );
                if (idx >= 0) break;
              }
            }
          }

          if (idx < 0) {
            // Ingredient-based heuristic
            modulePath =
              ingredients.find((ing) =>
                (ing.path || "").toLowerCase().endsWith(`/${moduleId}.md`),
              )?.path || null;
          } else {
            modulePath = allPaths[idx];
          }
        }

        if (!modulePath) return { modules: [] };
        let content = await this.extractFileFromZip(
          zipData,
          modulePath,
          resource.name,
          `zip:${resource.owner}/${resource.name}:${refTag}`,
        );
        if (!content) {
          const repoPrefixed = `${resource.name.replace(/\/$/, "")}/${modulePath.replace(/^\//, "")}`;
          content = await this.extractFileFromZip(
            zipData,
            repoPrefixed,
            resource.name,
            `zip:${resource.owner}/${resource.name}:${refTag}`,
          );
        }
        if (!content) return { modules: [] };

        return {
          modules: [
            {
              id: moduleId.split("/").pop() || moduleId,
              path: modulePath,
              markdown: content,
            },
          ],
        };
      }

      // No moduleId: build a TOC using ingredients first, then toc.yaml, then directory scan
      const categoriesSet = new Set<string>();
      let modules: Array<{ id: string; path: string }> = [];

      const categories = [
        "translate",
        "checking",
        "process",
        "audio",
        "gateway",
      ];

      // 1) Ingredients-first: find typical module entry files (01.md or index.md)
      if (Array.isArray(ingredients) && ingredients.length > 0) {
        for (const ing of ingredients) {
          const pRaw = ing.path || "";
          const p = pRaw.toLowerCase();
          if (!p.endsWith(".md")) continue;
          const cat = categories.find((c) => p.includes(`/${c}/`));
          if (!cat) continue;
          // Prefer folder-based modules with 01.md; accept category/module.md as fallback
          let match = p.match(
            /\/(translate|checking|process|audio|gateway)\/([^/]+)\/01\.md$/i,
          );
          if (!match) {
            match = p.match(
              /\/(translate|checking|process|audio|gateway)\/([^/]+)\.md$/i,
            );
          }
          if (match) {
            categoriesSet.add(match[1].toLowerCase());
            const id = match[2];
            modules.push({ id, path: pRaw });
          }
        }
      }

      // 2) If none from ingredients, parse toc.yaml per category
      if (modules.length === 0) {
        const allPaths = await this.listZipFiles(zipData);
        const lower = allPaths.map((p) => p.toLowerCase());
        const tocPaths: string[] = [];
        for (const cat of categories) {
          const idx = lower.findIndex((p) => p.endsWith(`/${cat}/toc.yaml`));
          if (idx >= 0) {
            tocPaths.push(allPaths[idx]);
            categoriesSet.add(cat);
          }
        }
        if (tocPaths.length > 0) {
          for (const tocPath of tocPaths) {
            const content = await this.extractFileFromZip(
              zipData,
              tocPath,
              resource.name,
            );
            if (!content) continue;
            const catDir = tocPath.split("/").slice(0, -1).join("/");
            for (const p of allPaths) {
              const lowerP = p.toLowerCase();
              if (!lowerP.startsWith(catDir.toLowerCase() + "/")) continue;
              const m =
                lowerP.match(/\/([^/]+)\/01\.md$/i) ||
                lowerP.match(/\/([^/]+)\.md$/i);
              if (m) {
                const id = m[1];
                modules.push({ id, path: p });
              }
            }
          }
        }
      }

      // 3) Fallback: scan for <category>/<module>/(01.md|index.md)
      if (modules.length === 0) {
        const allPaths = await this.listZipFiles(zipData);
        for (const p of allPaths) {
          const lowerP = p.toLowerCase();
          const m =
            lowerP.match(
              /\/(translate|checking|process|audio|gateway)\/([^/]+)\/(01|index)\.md$/i,
            ) ||
            lowerP.match(
              /\/(translate|checking|process|audio|gateway)\/([^/]+)\.md$/i,
            );

          if (m) {
            categoriesSet.add(m[1].toLowerCase());
            modules.push({ id: m[2], path: p });
          }
        }
      }

      // Dedupe modules by id
      const seen = new Set<string>();
      modules = modules.filter((m) =>
        seen.has(m.id) ? false : (seen.add(m.id), true),
      );

      return { categories: Array.from(categoriesSet), modules };
    } catch (error) {
      logger.error("Error in getMarkdownContent:", {
        error: error as Error,
        message: (error as Error).message,
        stack: (error as Error).stack,
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
          let name = decoder.decode(nameRaw).replace(/\0+$/, "");
          // Handle USTAR prefix if present
          const ustar = decoder.decode(block.subarray(257, 263));
          if (ustar.startsWith("ustar")) {
            const prefix = decoder
              .decode(block.subarray(345, 500))
              .replace(/\0+$/, "")
              .trim();
            if (prefix) name = `${prefix}/${name}`;
          }
          const size = readOct(block, 124, 12);
          const dataStart = offset + 512;
          const dataEnd = dataStart + size;
          if (name) names.push(name);
          const pad = (512 - (size % 512)) % 512;
          offset = dataEnd + pad;
        }
        return names;
      }

      // Unknown archive type
      return [];
    } catch (error) {
      logger.error("Error listing ZIP files:", error as Error);
      return [];
    }
  }

  /**
   * Get or download a ZIP file (public for scripture service)
   */
  async getOrDownloadZip(
    organization: string,
    repository: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<Uint8Array | null> {
    const _inFlightKey = ref
      ? `zip:${organization}/${repository}:${ref}`
      : `zip:${organization}/${repository}`;
    const task = (async () => {
      try {
        // Build preferred URLs
        if (!zipballUrl && !ref) {
          console.error(
            `[getOrDownloadZip] No zipballUrl or ref provided for ${organization}/${repository}`,
          );
          return null;
        }

        const zipUrl =
          zipballUrl ||
          `https://git.door43.org/${organization}/${repository}/archive/${encodeURIComponent(
            ref!,
          )}.zip`;
        const tarUrl = zipUrl.replace(/\.zip(\?.*)?$/i, ".tar.gz$1");

        // R2 + Cache API first: try ZIP key, then TAR key
        const { key: zipKey } = r2KeyFromUrl(zipUrl);
        const { key: tarKey } = r2KeyFromUrl(tarUrl);
        const { bucket, caches } = getR2Env();
        const r2 = new R2Storage(bucket as any, caches as any);

        // Try ZIP key
        {
          const { data, source, durationMs, size } =
            await r2.getZipWithInfo(zipKey);
          if (data) {
            // Validate cached ZIP before returning
            const isValidZip =
              data.length >= 1024 && data[0] === 0x50 && data[1] === 0x4b; // PK header

            if (!isValidZip) {
              console.log(
                `[ZIP] Cached ZIP is corrupted (${data.length} bytes), deleting and re-downloading`,
              );
              // Delete corrupted cache entry
              try {
                await r2.deleteZip(zipKey);
              } catch (e) {
                console.error(`[ZIP] Failed to delete corrupted cache: ${e}`);
              }
              // Fall through to download fresh copy
            } else {
              try {
                // R2 is a cache layer - both "cache" (Cache API) and "r2" (R2 bucket) are cache hits
                const isCacheHit = source === "cache" || source === "r2";
                console.log(`[CACHE TRACE] R2 ZIP result:`, {
                  zipKey,
                  source,
                  isCacheHit,
                  duration: durationMs,
                });
                this.tracer.addApiCall({
                  url: `internal://${source}/zip-url/${organization}/${repository}:${ref || "unknown"}`,
                  duration: durationMs,
                  status: 200,
                  size,
                  cached: isCacheHit,
                });
              } catch {
                // ignore trace add errors
              }
              return data;
            }
          }
        }

        // Try TAR key
        {
          const { data, source, durationMs, size } =
            await r2.getZipWithInfo(tarKey);
          if (data) {
            // Validate cached TAR.GZ before returning
            const isValidGzip =
              data.length >= 1024 && data[0] === 0x1f && data[1] === 0x8b; // GZIP header

            if (!isValidGzip) {
              console.log(
                `[ZIP] Cached TAR.GZ is corrupted (${data.length} bytes), deleting and re-downloading`,
              );
              // Delete corrupted cache entry
              try {
                await r2.deleteZip(tarKey);
              } catch (e) {
                console.error(`[ZIP] Failed to delete corrupted cache: ${e}`);
              }
              // Fall through to download fresh copy
            } else {
              try {
                // R2 is a cache layer - both "cache" (Cache API) and "r2" (R2 bucket) are cache hits
                const isCacheHit = source === "cache" || source === "r2";
                this.tracer.addApiCall({
                  url: `internal://${source}/tar-url/${organization}/${repository}:${ref || "unknown"}`,
                  duration: durationMs,
                  status: 200,
                  size,
                  cached: isCacheHit,
                });
              } catch {
                // ignore trace add errors
              }
              return data;
            }
          }
        }

        // Download ZIP first
        let response = await trackedFetch(this.tracer, zipUrl, {
          headers: this.getClientHeaders(),
        });

        if (!response.ok) {
          console.log(
            `[ZIP] Initial ZIP fetch failed: ${response.status} ${response.statusText}`,
          );
          // Prefer plain tag tar.gz first
          let tarResp = await trackedFetch(this.tracer, tarUrl, {
            headers: this.getClientHeaders(),
          });
          if (!tarResp.ok) {
            console.log(
              `[ZIP] TAR.GZ fetch also failed: ${tarResp.status} ${tarResp.statusText}`,
            );
            // Then try immutable Link header (often commit tarball) if available
            const linkHeader =
              response.headers.get("link") || response.headers.get("Link");
            const match = linkHeader?.match(/<([^>]+)>\s*;\s*rel="immutable"/i);
            if (match?.[1]) {
              const altUrl = match[1];
              console.log(`[ZIP] Trying immutable link: ${altUrl}`);
              tarResp = await trackedFetch(this.tracer, altUrl, {
                headers: this.getClientHeaders(),
              });
              if (!tarResp.ok) {
                console.log(
                  `[ZIP] Immutable link also failed: ${tarResp.status}`,
                );
                return null;
              }
            } else {
              console.log(`[ZIP] No immutable link found, giving up`);
              return null;
            }
          } else {
            console.log(`[ZIP] Successfully fetched TAR.GZ from: ${tarUrl}`);
          }
          response = tarResp;
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1024) {
          console.log(
            `[ZIP] Downloaded file too small (${buffer.byteLength} bytes), not caching`,
          );
          return null;
        }

        // Validate ZIP/TAR.GZ structure before caching
        const uint8Array = new Uint8Array(buffer);
        const isValidZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4b; // PK header
        const isValidGzip = uint8Array[0] === 0x1f && uint8Array[1] === 0x8b; // GZIP header

        if (!isValidZip && !isValidGzip) {
          console.log(
            `[ZIP] Downloaded file has invalid header, not caching. First bytes: ${uint8Array[0]},${uint8Array[1]}`,
          );
          return null;
        }

        // Store under the final URL-derived key
        const finalUrl = (response as any).url || zipUrl;
        const { key: storeKey, meta } = r2KeyFromUrl(finalUrl);
        await r2.putZip(storeKey, buffer, meta);

        // If we fetched via an immutable tar URL (differs from simple tarUrl),
        // also store under the ref-based tar key so future lookups hit without re-fetching
        try {
          if (finalUrl !== tarUrl) {
            const { key: refTarKey } = r2KeyFromUrl(tarUrl);
            await r2.putZip(refTarKey, buffer, meta);
          }
        } catch {
          // best-effort secondary write
        }

        return uint8Array;
      } catch (error) {
        logger.error("Error downloading ZIP:", error as Error);
        return null;
      } finally {
        // no-op
      }
    })();
    return task;
  }

  /**
   * Get the file list from a ZIP archive with caching
   * This allows skipping the ZIP unzip entirely when just checking what files exist
   */
  async getZipFileList(
    organization: string,
    repository: string,
    ref: string | null | undefined,
    zipballUrl: string | null | undefined,
    zipCacheKey: string,
  ): Promise<{ files: string[]; fromCache: boolean; zipData?: Uint8Array }> {
    const fileListKey = `${zipCacheKey}/filelist.json`;

    // Step 1: Try to get cached file list from R2
    const { bucket, caches } = getR2Env();
    if (bucket) {
      const r2 = new R2Storage(
        bucket as R2Bucket,
        caches as typeof globalThis.caches,
      );
      try {
        const { data: cachedList } = await r2.getFileWithInfo(
          fileListKey,
          "application/json",
        );
        if (cachedList) {
          const files = JSON.parse(cachedList) as string[];
          logger.debug(
            `[FileList] Cache HIT: ${fileListKey} (${files.length} files)`,
          );
          return { files, fromCache: true };
        }
      } catch (_e) {
        // File list not cached, will build
      }
    }

    // Step 2: Download ZIP and extract file list
    logger.debug(`[FileList] Cache MISS: ${fileListKey}, downloading ZIP`);
    const zipData = await this.getOrDownloadZip(
      organization,
      repository,
      ref,
      zipballUrl,
    );

    if (!zipData) {
      return { files: [], fromCache: false };
    }

    // Unzip to get file list (dynamic import for edge compatibility)
    const { unzipSync } = await import("fflate");
    const entries = unzipSync(zipData);
    const files = Object.keys(entries);

    // Step 3: Cache the file list in R2
    if (bucket) {
      const r2 = new R2Storage(
        bucket as R2Bucket,
        caches as typeof globalThis.caches,
      );
      try {
        await r2.putFile(
          fileListKey,
          JSON.stringify(files),
          "application/json",
        );
        logger.debug(
          `[FileList] Cached: ${fileListKey} (${files.length} files)`,
        );
      } catch (_e) {
        // Best effort
      }
    }

    return { files, fromCache: false, zipData };
  }

  /**
   * Get book code from book name
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
    return bookMap[normalized] || book.toUpperCase().substring(0, 3);
  }

  /**
   * Extract a file from ZIP using the exact path from ingredients (public for scripture service)
   */
  async extractFileFromZip(
    zipData: Uint8Array,
    filePath: string,
    repository: string,
    zipCacheKey?: string,
  ): Promise<string | null> {
    const task = (async () => {
      try {
        // R2 + Cache API cache for extracted file content
        if (zipCacheKey) {
          const cleanInner = filePath.replace(/^(\.\/|\/)+/, "");
          const fileKey = `${zipCacheKey}/files/${cleanInner}`;
          const { bucket, caches } = getR2Env();
          const r2 = new R2Storage(bucket as any, caches as any);
          // Heuristic content type for text files; these are markdown/tsv/usfm
          const ext = cleanInner.toLowerCase();
          const contentType = ext.endsWith(".md")
            ? "text/markdown; charset=utf-8"
            : ext.endsWith(".tsv")
              ? "text/tab-separated-values; charset=utf-8"
              : "text/plain; charset=utf-8";
          const { data, source, durationMs, size } = await r2.getFileWithInfo(
            fileKey,
            contentType,
          );
          if (data !== null) {
            try {
              // R2 is a cache layer - both "cache" (Cache API) and "r2" (R2 bucket) are cache hits
              const isCacheHit = source === "cache" || source === "r2";
              this.tracer.addApiCall({
                url: `internal://${source}/file/${fileKey}`,
                duration: durationMs,
                status: 200,
                size,
                cached: isCacheHit,
              });
            } catch {
              // ignore
            }
            return data;
          }
        }

        const { unzipSync, gunzip } = await import("fflate");
        // Remove leading ./ if present
        const cleanPath = filePath.replace(/^\.\//, "");

        // Get the ref tag from the cache key if available
        const refMatch = (zipCacheKey || "").match(/:([^:]+)$/);
        const ref = refMatch ? refMatch[1] : null;

        const possiblePaths = [
          cleanPath,
          `./${cleanPath}`,
          `${repository}/${cleanPath}`,
        ];

        // Only add ref-specific paths if we have a ref
        if (ref) {
          possiblePaths.push(`${repository}-${ref}/${cleanPath}`);
        }

        // Detect tar.gz by key hint or fallback when ZIP decode fails
        const keyHint = (zipCacheKey || "").toLowerCase();
        const looksLikeTarGz =
          keyHint.includes(".tar.gz") || keyHint.includes(".tgz");

        let decodedContent: string | null = null;

        if (!looksLikeTarGz) {
          try {
            // Use synchronous unzip in Worker environment for reliability
            const unzipped = unzipSync(zipData);

            if (unzipped) {
              decodedContent = await new Promise((resolve, _reject) => {
                // Find the matching file
                for (const path of possiblePaths) {
                  if (unzipped[path]) {
                    const decoder = new TextDecoder("utf-8");
                    resolve(decoder.decode(unzipped[path]));
                    return;
                  }
                }
                // Check for partial matches - look for files ending with just the filename
                const filename = cleanPath.split("/").pop() || cleanPath;
                for (const [key, data] of Object.entries(unzipped)) {
                  if (key.endsWith(`/${filename}`) || key.endsWith(filename)) {
                    const decoder = new TextDecoder("utf-8");
                    resolve(decoder.decode(data));
                    return;
                  }
                }

                // Track when file not found in ZIP
                this.tracer.addApiCall({
                  url: `internal://error/file-not-found-in-zip`,
                  duration: 1,
                  status: 404,
                  size: 0,
                  cached: false,
                });
                resolve(null);
              });
            } else {
              decodedContent = null;
            }
          } catch (_zipErr) {
            // If it fails, try tar.gz path
            logger.error("ZIP extraction exception:", _zipErr as Error);
            decodedContent = null;
          }
        }

        if (!decodedContent) {
          try {
            // Attempt tar.gz flow (gunzip + TAR walk)
            const tarBytes = await new Promise<Uint8Array>(
              (resolve, reject) => {
                gunzip(zipData, (err, decompressed) => {
                  if (err) {
                    logger.error("TAR.GZ extraction error:", err);
                    reject(err);
                  } else {
                    resolve(decompressed);
                  }
                });
              },
            );

            const decoder = new TextDecoder("utf-8");
            const matches = (name: string) => {
              if (possiblePaths.includes(name)) return true;
              return name.endsWith(cleanPath) || name.endsWith(`/${cleanPath}`);
            };
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
              let name = decoder.decode(nameRaw).replace(/\0+$/, "");
              // Handle USTAR prefix if present
              const ustar = decoder.decode(block.subarray(257, 263));
              if (ustar.startsWith("ustar")) {
                const prefix = decoder
                  .decode(block.subarray(345, 500))
                  .replace(/\0+$/, "")
                  .trim();
                if (prefix) name = `${prefix}/${name}`;
              }
              const size = readOct(block, 124, 12);
              const dataStart = offset + 512;
              const dataEnd = dataStart + size;
              if (matches(name)) {
                const fileBytes = tarBytes.subarray(dataStart, dataEnd);
                decodedContent = decoder.decode(fileBytes);
                break;
              }
              const pad = (512 - (size % 512)) % 512;
              offset = dataEnd + pad;
            }
          } catch (_tarErr) {
            // Not a tar.gz or failed to parse; will fall through to not found
          }
        }

        if (decodedContent !== null) {
          if (zipCacheKey) {
            try {
              const cleanInner = filePath.replace(/^(\.\/|\/)+/, "");
              const fileKey = `${zipCacheKey}/files/${cleanInner}`;
              const { bucket, caches } = getR2Env();
              const r2 = new R2Storage(bucket as any, caches as any);
              const ext = cleanInner.toLowerCase();
              const contentType = ext.endsWith(".md")
                ? "text/markdown; charset=utf-8"
                : ext.endsWith(".tsv")
                  ? "text/tab-separated-values; charset=utf-8"
                  : "text/plain; charset=utf-8";
              await r2.putFile(fileKey, decodedContent, contentType, {
                zip_key: zipCacheKey,
              });
              try {
                this.tracer.addApiCall({
                  url: `internal://r2/file-write/${fileKey}`,
                  duration: 1,
                  status: 200,
                  size: decodedContent.length,
                  cached: false,
                });
              } catch {
                // ignore
              }
            } catch {
              // ignore
            }
          }
          return decodedContent;
        }

        logger.warn(
          `File not found in ZIP. Tried: ${possiblePaths.join(", ")}`,
        );

        return null;
      } catch (error) {
        logger.error("Error extracting from ZIP:", error as Error);
        return null;
      } finally {
        // no-op
      }
    })();
    return task;
  }

  /**
   * Parse file content into searchable documents
   * KISS: Simple document creation for indexing
   */
  private parseContentToDocuments(
    content: string,
    filePath: string,
    repository: string,
    resourceType: "bible" | "notes" | "words" | "academy" | "questions",
  ): SearchDocument[] {
    const cleanPath = filePath.replace(/^(\.\/|\/)+/, "");
    const documents: SearchDocument[] = [];

    // For bible content: parse USFM into chapter/verse segments
    if (resourceType === "bible") {
      // Split by chapters
      const chapterMatches = content.matchAll(/\\c\s+(\d+)/g);
      const chapterPositions: { num: number; start: number }[] = [];
      for (const match of chapterMatches) {
        chapterPositions.push({
          num: parseInt(match[1], 10),
          start: match.index!,
        });
      }

      // Extract content between chapters
      for (let i = 0; i < chapterPositions.length; i++) {
        const chapter = chapterPositions[i];
        const nextStart =
          i + 1 < chapterPositions.length
            ? chapterPositions[i + 1].start
            : content.length;

        const chapterContent = content.substring(chapter.start, nextStart);

        // Clean USFM markers for searchable content
        const cleanContent = chapterContent
          .replace(/\\zaln-s\s*\|[^\\]+\\*/g, "")
          .replace(/\\zaln-e\\*/g, "")
          .replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, "$1")
          .replace(/\\[a-z]+\s*\d*\s*/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanContent.length > 0) {
          documents.push({
            id: `${repository}:${cleanPath}:ch${chapter.num}`,
            content: cleanContent,
            path: cleanPath,
            resource: repository,
            type: resourceType,
          });
        }
      }

      // If no chapters found, index as single document
      if (documents.length === 0 && content.trim().length > 0) {
        documents.push({
          id: `${repository}:${cleanPath}`,
          content: content,
          path: cleanPath,
          resource: repository,
          type: resourceType,
        });
      }
    } else if (resourceType === "notes" || resourceType === "questions") {
      // For TSV content: parse rows as individual documents
      const lines = content.split("\n").filter((line) => line.trim());
      const _header = lines[0]?.split("\t") || []; // Header available for future use

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split("\t");
        const rowContent = cells.join(" ").trim();
        if (rowContent.length > 0) {
          documents.push({
            id: `${repository}:${cleanPath}:row${i}`,
            content: rowContent,
            path: cleanPath,
            resource: repository,
            type: resourceType,
          });
        }
      }
    } else {
      // For markdown and other content: index as single document
      if (content.trim().length > 0) {
        documents.push({
          id: `${repository}:${cleanPath}`,
          content: content,
          path: cleanPath,
          resource: repository,
          type: resourceType,
        });
      }
    }

    return documents;
  }

  /**
   * Get file with cached MiniSearch index - LAZY ZIP LOADING
   *
   * Optimized flow:
   * 1. Check R2 for cached index → return immediately (no ZIP needed!)
   * 2. Check R2 for cached file content → build index if found
   * 3. Only fetch/unzip ZIP if both caches miss
   *
   * @param filePath - Path within the ZIP
   * @param repository - Repository name
   * @param zipCacheKey - Cache key for R2 storage
   * @param indexOptions - Options for building/loading search index
   * @param zipDataProvider - Lazy function to get ZIP data (only called on cache miss)
   * @returns FileWithIndex with index and content
   */
  async getIndexedFile(
    filePath: string,
    repository: string,
    zipCacheKey: string,
    indexOptions: IndexOptions,
    zipDataProvider: () => Promise<Uint8Array | null>,
  ): Promise<FileWithIndex | null> {
    const cleanPath = filePath.replace(/^(\.\/|\/)+/, "");
    const indexKey = `${zipCacheKey}/index/${cleanPath}.json`;
    const fileKey = `${zipCacheKey}/files/${cleanPath}`;

    // Get R2 environment once
    const { bucket, caches } = getR2Env();
    let r2: R2Storage | null = null;
    if (bucket) {
      r2 = new R2Storage(bucket as any, caches as any);
    }

    // STEP 1: Check for cached INDEX first (fastest path - no ZIP needed!)
    if (r2 && indexOptions.buildIndex) {
      try {
        const { data: cachedIndex, source } = await r2.getFileWithInfo(
          indexKey,
          "application/json",
        );

        if (cachedIndex) {
          try {
            const index = MiniSearch.loadJSON<SearchDocument>(cachedIndex, {
              fields: ["content"],
              storeFields: ["path", "resource", "type", "content"],
              searchOptions: {
                fuzzy: 0.2,
                prefix: true,
                boost: { content: 2 },
                combineWith: "AND",
              },
            });

            logger.debug(
              `[Index] Cache HIT (${source}): ${indexKey} - ZIP skipped!`,
            );
            this.tracer.addApiCall({
              url: `internal://${source}/index/${indexKey}`,
              duration: 1,
              status: 200,
              size: cachedIndex.length,
              cached: true,
            });

            // We have the index - no need for ZIP or file content!
            return { content: "", index, indexSource: "cache", indexKey };
          } catch (_e) {
            logger.warn(`[Index] Corrupted cache, will rebuild: ${indexKey}`);
          }
        }
      } catch (_e) {
        // Index not cached, continue to check file cache
      }
    }

    // STEP 2: Check for cached FILE content (still avoids ZIP unzip)
    let content: string | null = null;
    if (r2) {
      try {
        const ext = cleanPath.toLowerCase();
        const contentType = ext.endsWith(".md")
          ? "text/markdown; charset=utf-8"
          : ext.endsWith(".tsv")
            ? "text/tab-separated-values; charset=utf-8"
            : "text/plain; charset=utf-8";

        const { data: cachedContent, source } = await r2.getFileWithInfo(
          fileKey,
          contentType,
        );

        if (cachedContent) {
          content = cachedContent;
          logger.debug(
            `[Index] File cache HIT (${source}): ${fileKey} - ZIP skipped!`,
          );
          this.tracer.addApiCall({
            url: `internal://${source}/file/${fileKey}`,
            duration: 1,
            status: 200,
            size: cachedContent.length,
            cached: true,
          });
        }
      } catch (_e) {
        // File not cached, will need ZIP
      }
    }

    // STEP 3: Only now fetch ZIP if we still need content
    if (!content) {
      logger.debug(`[Index] Cache MISS, fetching ZIP for: ${cleanPath}`);
      const zipData = await zipDataProvider();
      if (!zipData) {
        logger.warn(`[Index] ZIP provider returned null for: ${cleanPath}`);
        return null;
      }

      // Extract file from ZIP
      content = await this.extractFileFromZip(
        zipData,
        filePath,
        repository,
        zipCacheKey,
      );
    }

    if (!content) return null;

    // If not building index, return content only
    if (!indexOptions.buildIndex) {
      return { content, indexSource: "none" };
    }

    // STEP 4: Build index from content
    logger.debug(`[Index] Building index: ${indexKey}`);
    const startTime = Date.now();

    const documents = indexOptions.documentParser
      ? indexOptions.documentParser(content, filePath, repository)
      : this.parseContentToDocuments(
          content,
          filePath,
          repository,
          indexOptions.resourceType,
        );

    if (documents.length === 0) {
      return { content, indexSource: "none" };
    }

    const index = new MiniSearch<SearchDocument>({
      fields: ["content"],
      storeFields: ["path", "resource", "type", "content"],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { content: 2 },
        combineWith: "AND",
      },
    });
    index.addAll(documents);

    const buildDuration = Date.now() - startTime;
    logger.debug(
      `[Index] Built in ${buildDuration}ms: ${documents.length} docs from ${cleanPath}`,
    );

    // 6. Cache the index in R2 (using same r2 instance from above)
    if (r2) {
      try {
        const serialized = JSON.stringify(index.toJSON());
        logger.debug(
          `[Index] Attempting to cache: ${indexKey} (${serialized.length} bytes)`,
        );

        await r2.putFile(indexKey, serialized, "application/json", {
          resource_type: indexOptions.resourceType,
          doc_count: documents.length.toString(),
        });

        this.tracer.addApiCall({
          url: `internal://r2/index-write/${indexKey}`,
          duration: buildDuration,
          status: 200,
          size: serialized.length,
          cached: false,
        });

        logger.info(
          `[Index] Cached: ${indexKey} (${documents.length} docs, ${serialized.length} bytes)`,
        );
      } catch (e) {
        logger.warn(`[Index] Failed to cache: ${String(e)}`);
      }
    } else {
      logger.warn(`[Index] No R2 bucket available for caching: ${indexKey}`);
    }

    return { content, index, indexSource: "built", indexKey };
  }

  /**
   * Legacy wrapper for extractFileWithIndex (backward compatibility)
   * Prefer getIndexedFile() for lazy ZIP loading
   */
  async extractFileWithIndex(
    zipData: Uint8Array,
    filePath: string,
    repository: string,
    zipCacheKey: string,
    indexOptions: IndexOptions,
  ): Promise<FileWithIndex | null> {
    // Use lazy method with pre-loaded ZIP data
    return this.getIndexedFile(
      filePath,
      repository,
      zipCacheKey,
      indexOptions,
      async () => zipData,
    );
  }

  private extractVerseFromUSFM(
    usfm: string,
    reference: { chapter?: number; verse?: number; verseEnd?: number },
  ): string {
    if (!reference.chapter) return "";

    try {
      // Find chapter (allow optional whitespace after marker)
      const chapterPattern = new RegExp(`\\\\c\\s*${reference.chapter}\\b`);
      const chapterMatch = usfm.match(chapterPattern);
      if (!chapterMatch) return "";

      const chapterStart = chapterMatch.index! + chapterMatch[0].length;

      // Find next chapter to limit scope
      const nextChapterMatch = usfm.substring(chapterStart).match(/\\c\s+\d+/);
      const chapterEnd = nextChapterMatch
        ? chapterStart + nextChapterMatch.index!
        : usfm.length;

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

          // Restore verse markers with proper formatting (no blank line, no period)
          .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1 ")
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
      if (reference.verseEnd && reference.verseEnd > reference.verse) {
        // Find the verse AFTER the verseEnd to get the full range
        const afterEndVersePattern = new RegExp(
          `\\\\v\\s*${reference.verseEnd + 1}\\b`,
        );
        const afterEndMatch = chapterContent.match(afterEndVersePattern);

        if (afterEndMatch) {
          verseEnd = afterEndMatch.index!;
        } else {
          // No verse after endVerse, so go to end of chapter
          verseEnd = chapterContent.length;
        }
      } else {
        // Single verse - find next verse or end
        const nextVerseMatch = chapterContent
          .substring(verseStart)
          .match(/\\v\s+\d+/);
        verseEnd = nextVerseMatch
          ? verseStart + nextVerseMatch.index!
          : chapterContent.length;
      }

      let verseText = chapterContent.substring(verseStart, verseEnd);

      // For verse ranges, keep verse numbers
      const isRange =
        (reference as any).verseEnd &&
        (reference as any).verseEnd > reference.verse;

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

          // Restore verse markers with proper formatting (single newline, no period)
          .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1 ")
          .trim();

        // Add the first verse number if it's missing (no period)
        if (!verseText.match(/^\d+\s/)) {
          verseText = `${reference.verse} ${verseText}`;
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
      logger.error("Error extracting verse:", error as Error);
      return "";
    }
  }

  private extractFullBookFromUSFM(usfm: string): string {
    try {
      // Clean the entire book text, preserving chapter and verse structure
      const bookText = usfm
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

        // Format chapters and verses (no period after verse number)
        .replace(/\[\[CHAPTER:(\d+)\]\]/g, "\n\n## Chapter $1\n\n")
        .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1 ")
        .trim();

      return bookText;
    } catch (error) {
      logger.error("Error extracting full book:", error as Error);
      return "";
    }
  }

  private extractChapterRangeFromUSFM(
    usfm: string,
    reference: { chapter?: number; verseEnd?: number },
  ): string {
    if (!reference.chapter || !reference.verseEnd) return "";

    try {
      const startChapter = reference.chapter;
      const endChapter = reference.verseEnd; // In Reference interface, verseEnd stores end chapter for chapter ranges

      // Find start chapter
      const startPattern = new RegExp(`\\\\c\\s*${startChapter}\\b`);
      const startMatch = usfm.match(startPattern);
      if (!startMatch) return "";

      // Include the chapter marker itself
      const contentStart = startMatch.index!;

      // Find the chapter after end chapter
      const afterEndPattern = new RegExp(`\\\\c\\s*${endChapter + 1}\\b`);
      const afterEndMatch = usfm.match(afterEndPattern);

      let contentEnd = usfm.length;
      if (afterEndMatch && afterEndMatch.index! > contentStart) {
        contentEnd = afterEndMatch.index!;
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

          // Format verses (no period after verse number)
          formattedText += chapterContent
            .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1 ")
            .trim();
        }
      }

      // Trim any leading newlines
      formattedText = formattedText.trim();

      return formattedText.trim();
    } catch (error) {
      logger.error("Error extracting chapter range:", error as Error);
      return "";
    }
  }

  private parseTSVForReference(
    tsv: string,
    reference: ParsedReference,
  ): unknown[] {
    try {
      const lines = tsv.split("\n");
      if (lines.length < 2) {
        logger.debug("parseTSVForReference: TSV has less than 2 lines", {
          lineCount: lines.length,
        });
        return [];
      }

      // Parse header
      const headers = lines[0].split("\t");
      logger.debug("parseTSVForReference: Parsing TSV", {
        totalLines: lines.length,
        reference:
          reference.originalText ||
          `${reference.book} ${reference.chapter}:${reference.verse}${reference.endVerse ? `-${reference.endVerse}` : ""}`,
        chapter: reference.chapter,
        verse: reference.verse,
        endVerse: reference.endVerse || (reference as any).verseEnd,
      });

      // Parse data rows
      const results: Record<string, string>[] = [];
      let processedRows = 0;
      let matchedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split("\t");
        if (values.length !== headers.length) continue;
        processedRows++;

        // Build object from headers and values
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Check if this row matches our reference
        const ref = (row.Reference || row.reference || "").trim();
        if (!ref) continue;

        // Always include book/chapter intros for the covered chapter(s), even when a verse is specified
        // - Book intro: "front:intro"
        // - Chapter intro: "{chapter}:intro"
        if (ref === "front:intro") {
          results.push(row as Record<string, string>);
          continue;
        }
        const introMatch = ref.match(/^(\d+):intro$/);
        if (introMatch) {
          const introChapter = parseInt(introMatch[1]);
          // If no chapter specified (book-only), include all chapter intros
          // Otherwise, only include if it matches the requested chapter
          if (!reference.chapter || introChapter === reference.chapter) {
            results.push(row as Record<string, string>);
            continue;
          }
        }

        // Normalize reference cell: extract trailing chapter:verse if present (e.g., "John 3:16" -> "3:16")
        const matchCv = ref.match(/(\d+:\d+)\b/);
        const refCv = matchCv ? matchCv[1] : ref;

        // Handle verse ranges and exact verse matches
        if (reference.verse) {
          // Parse the verse number from the reference
          const verseMatch = refCv.match(/^(\d+):(\d+)$/);
          if (verseMatch) {
            const chapterNum = parseInt(verseMatch[1]);
            const verseNum = parseInt(verseMatch[2]);

            // Check if chapter matches
            if (chapterNum === reference.chapter) {
              // Handle verse range if endVerse or verseEnd is provided
              const endVerse =
                reference.endVerse || (reference as any).verseEnd;
              if (endVerse) {
                // Check if verse is within range
                if (verseNum >= reference.verse && verseNum <= endVerse) {
                  matchedRows++;
                  results.push(row as Record<string, string>);
                }
              } else {
                // Exact verse match when no range provided
                if (verseNum === reference.verse) {
                  matchedRows++;
                  results.push(row as Record<string, string>);
                }
              }
            }
          } else {
            // Handle verse ranges in TSV (e.g., "2:8-9" in Reference column)
            const verseRangeMatch = refCv.match(/^(\d+):(\d+)-(\d+)$/);
            if (verseRangeMatch) {
              const chapterNum = parseInt(verseRangeMatch[1]);
              const rangeStart = parseInt(verseRangeMatch[2]);
              const rangeEnd = parseInt(verseRangeMatch[3]);

              if (chapterNum === reference.chapter) {
                const endVerse =
                  reference.endVerse || (reference as any).verseEnd;
                if (endVerse) {
                  // Check if the TSV verse range overlaps with requested range
                  if (rangeStart <= endVerse && rangeEnd >= reference.verse) {
                    matchedRows++;
                    results.push(row as Record<string, string>);
                  }
                } else {
                  // Check if requested verse is within TSV range
                  if (
                    reference.verse >= rangeStart &&
                    reference.verse <= rangeEnd
                  ) {
                    matchedRows++;
                    results.push(row as Record<string, string>);
                  }
                }
              }
            }
          }
          continue;
        }

        // Chapter-only: allow any verse in that chapter via chapter prefix match (works for both
        // "3:16" and "John 3:16")
        // Book-only: if no chapter specified, include all notes (any chapter:verse pattern)
        if (reference.chapter) {
          // Chapter specified - match only that chapter
          if (
            refCv.startsWith(`${reference.chapter}:`) ||
            ref.includes(` ${reference.chapter}:`)
          ) {
            matchedRows++;
            results.push(row as Record<string, string>);
          }
        } else {
          // Book-only - include all notes that have a chapter:verse pattern
          // This matches any reference like "3:16", "John 3:16", etc.
          if (matchCv) {
            matchedRows++;
            results.push(row as Record<string, string>);
          }
        }
      }

      logger.debug("parseTSVForReference: Filtering complete", {
        processedRows,
        matchedRows,
        totalResults: results.length,
        reference:
          reference.originalText ||
          `${reference.book} ${reference.chapter}:${reference.verse}${reference.endVerse ? `-${reference.endVerse}` : ""}`,
      });

      return results;
    } catch (error) {
      logger.error("Error parsing TSV:", error as Error);
      return [];
    }
  }

  getTrace(): unknown {
    const trace = this.tracer.getTrace();
    try {
      const len = (trace as unknown as { apiCalls?: unknown[] })?.apiCalls
        ?.length;
      logger.debug("[ZipResourceFetcher2] getTrace", { apiCalls: len });
    } catch {
      // ignore
    }
    return trace as unknown;
  }

  setTracer(tracer: EdgeXRayTracer) {
    logger.debug("[ZipResourceFetcher2] Setting new tracer");
    this.tracer = tracer;
  }
}
