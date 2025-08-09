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
    this.tracer =
      tracer || new EdgeXRayTracer(`zip-${Date.now()}`, "ZipResourceFetcher2");
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
          return {
            refTag: prod.branch_or_tag_name || null,
            zipballUrl: prod.zipball_url || null,
          };
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
      // CRITICAL: request RC metadata so ingredients are included
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      // KV+memory cached catalog per (lang, org, stage=prod)
      const catalogCacheKey = `catalog:${language}:${organization}:prod:rc`;
      let catalogData: { data?: CatalogResource[] } | null = null;
      const kvCatalogStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
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
            duration: Math.max(
              1,
              Math.round(
                (typeof performance !== "undefined"
                  ? performance.now()
                  : Date.now()) - kvCatalogStart,
              ),
            ),
            status: 200,
            size: json.length,
            cached: true,
          });
        } catch {
          // eslint-disable-next-line no-empty -- ignore corrupt cache JSON
          void 0; // swallow JSON parse failure
        }
      }
      // unified discovery uses KV+memory cache; no local flag needed
      if (!catalogData) {
        logger.info(`Fetching catalog: ${catalogUrl}`);
        const catalogResponse = await trackedFetch(this.tracer, catalogUrl);
        if (!catalogResponse.ok) {
          logger.error(`Catalog fetch failed: ${catalogResponse.status}`);
          return [];
        }
        catalogData = (await catalogResponse.json()) as {
          data?: CatalogResource[];
        };
        // Only cache non-empty catalogs to avoid persisting bad/empty results
        if ((catalogData.data?.length || 0) > 0) {
          try {
            await this.kvCache.set(
              catalogCacheKey,
              JSON.stringify(catalogData),
              3600,
            );
          } catch {
            // eslint-disable-next-line no-empty -- best-effort KV set failure can be ignored
            void 0; // non-fatal KV write error intentionally swallowed
          }
        } else {
          logger.warn(`Skipping KV cache for empty catalog result`, {
            key: catalogCacheKey,
          });
        }
      } else {
        usedCache = true;
      }
      // Local subject filter (Bible categories) and de-duplicate by owner/name
      const seen = new Set<string>();
      const resourcesInitial = (catalogData.data || [])
        .filter((r) => {
          const subj = (r.subject || "").toString().toLowerCase();
          // Accept if subject missing or contains the word "bible"
          return !subj || subj.includes("bible");
        })
        .filter((r) => {
          const key = `${r.owner}/${r.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      let resources = resourcesInitial;

      // If cache yielded zero resources, do NOT force a fresh fetch here.
      // We'll proceed and only fetch externally if truly necessary later.

      // Fallback: if nothing found under requested owner, retry with Door43-Catalog, then without owner
      if (resources.length === 0) {
        try {
          const altParams = new URLSearchParams();
          altParams.set("lang", language);
          altParams.set("owner", "Door43-Catalog");
          altParams.set("type", "text");
          altParams.set("stage", "prod");
          altParams.set("metadataType", "rc");
          altParams.set("includeMetadata", "true");
          const altUrl = `${baseCatalog}?${altParams.toString()}`;
          logger.info(`Fallback catalog fetch (Door43-Catalog): ${altUrl}`);
          const altResp = await trackedFetch(this.tracer, altUrl);
          if (altResp.ok) {
            const altData = (await altResp.json()) as {
              data?: CatalogResource[];
            };
            const altSeen = new Set<string>();
            const alt = (altData.data || [])
              .filter((r) => {
                const subj = (r.subject || "").toString().toLowerCase();
                return !subj || subj.includes("bible");
              })
              .filter((r) => {
                const key = `${r.owner}/${r.name}`;
                if (altSeen.has(key)) return false;
                altSeen.add(key);
                return true;
              });
            if (alt.length > 0) {
              resources = alt;
            }
          }
        } catch {
          // ignore fallback errors
        }
      }

      if (resources.length === 0) {
        try {
          const broadParams = new URLSearchParams();
          broadParams.set("lang", language);
          broadParams.set("type", "text");
          broadParams.set("stage", "prod");
          broadParams.set("metadataType", "rc");
          broadParams.set("includeMetadata", "true");
          const broadUrl = `${baseCatalog}?${broadParams.toString()}`;
          logger.info(`Fallback catalog fetch (no owner): ${broadUrl}`);
          const broadResp = await trackedFetch(this.tracer, broadUrl);
          if (broadResp.ok) {
            const broadData = (await broadResp.json()) as {
              data?: CatalogResource[];
            };
            const broadSeen = new Set<string>();
            const broad = (broadData.data || [])
              .filter((r) => {
                const subj = (r.subject || "").toString().toLowerCase();
                return !subj || subj.includes("bible");
              })
              .filter((r) => {
                const key = `${r.owner}/${r.name}`;
                if (broadSeen.has(key)) return false;
                broadSeen.add(key);
                return true;
              });
            if (broad.length > 0) {
              resources = broad;
            }
          }
        } catch {
          // ignore fallback errors
        }
      }

      logger.info(`Found ${resources.length} Bible resources`);
      logger.debug(`Catalog resources`, {
        resources: resources.map((r) => r.name),
      });

      // 2. Prepare resources (prioritize common ones) and compute ingredients
      const priorityOrder = ["ult", "ust", "t4t", "ueb"];
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
        .filter((r) => (version ? r.name.includes(`_${version}`) : true))
        .sort((a, b) => {
          const as = priorityOrder.findIndex((p) => a.name.endsWith(`_${p}`));
          const bs = priorityOrder.findIndex((p) => b.name.endsWith(`_${p}`));
          return (as === -1 ? 999 : as) - (bs === -1 ? 999 : bs);
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

      const targets = candidates
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
          const ingredient = (
            resIngredients as Array<{ identifier?: string; path?: string }>
          ).find((ing) => {
            const id = normalize(ing?.identifier);
            return (
              id === bookKey || id.endsWith(bookKey) || id.includes(bookKey)
            );
          });
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

      // First: try file-level KV cache for each target (no ZIP needed on hit)
      const fileKeys = targets.map(
        (t) =>
          `zipfile:zip:${t.owner}/${t.name}:${t.refTag || "master"}:${t.ingredientPath.replace(/^\./, "")}`,
      );
      const cachedContents = await Promise.all(
        fileKeys.map((key) => this.kvCache.get(key)),
      );

      const misses: number[] = [];
      for (let i = 0; i < targets.length; i++) {
        const cached = cachedContents[i];
        if (!cached) {
          misses.push(i);
          continue;
        }
        let contentStr: string | null = null;
        try {
          if (cached instanceof ArrayBuffer) {
            contentStr = new TextDecoder("utf-8").decode(cached as ArrayBuffer);
          } else if (cached instanceof Uint8Array) {
            contentStr = new TextDecoder("utf-8").decode(cached as Uint8Array);
          } else if (typeof cached === "string") {
            contentStr = cached.startsWith('"') ? JSON.parse(cached) : cached;
          }
        } catch {
          contentStr = null;
        }
        if (!contentStr) {
          misses.push(i);
          continue;
        }

        // Trace synthetic KV hit (to mirror extractFileFromZip behavior)
        try {
          this.tracer.addApiCall({
            url: `internal://kv/file/${fileKeys[i]}`,
            duration: 1,
            status: 200,
            size: contentStr.length,
            cached: true,
          });
        } catch {
          // ignore tracer issues
        }

        // Parse USFM to text and append result
        const t = targets[i];
        let verseText: string;
        if (!reference.chapter && !reference.verse) {
          verseText = this.extractFullBookFromUSFM(contentStr);
        } else if (
          reference.endChapter &&
          reference.endChapter !== reference.chapter
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
          results.push({ text: verseText, translation: normalizedTrans });
        }
      }

      // For misses only: download ZIPs in parallel (network-bound)
      const missTargets = misses.map((i) => targets[i]);
      const missZipDatas = await Promise.all(
        missTargets.map((t) =>
          this.getOrDownloadZip(t.owner, t.name, t.refTag, t.zipballUrl),
        ),
      );

      // Then extract sequentially for misses (CPU-bound)
      for (let m = 0; m < missTargets.length; m++) {
        const t = missTargets[m];
        const zipData = missZipDatas[m];
        if (!zipData) continue;

        const fileContent = await this.extractFileFromZip(
          zipData,
          t.ingredientPath,
          t.name,
          `zip:${t.owner}/${t.name}:${t.refTag || "master"}`,
        );
        if (!fileContent) continue;

        // Extract text
        let verseText: string;
        if (!reference.chapter && !reference.verse) {
          verseText = this.extractFullBookFromUSFM(fileContent);
        } else if (
          reference.endChapter &&
          reference.endChapter !== reference.chapter
        ) {
          verseText = this.extractChapterRangeFromUSFM(fileContent, reference);
        } else if (reference.chapter && !reference.verse) {
          verseText = this.extractVerseFromUSFM(fileContent, reference);
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
          results.push({ text: verseText, translation: normalizedTrans });
        }
      }

      return results;
    } catch (error) {
      logger.error("Error in getScripture:", error as Error);
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
      // 1. Get catalog (generic RC metadata) to find the resource (DRY: same as scripture path)
      const baseCatalog = `https://git.door43.org/api/v1/catalog/search`;
      const params = new URLSearchParams();
      params.set("lang", language);
      if (organization && organization !== "all")
        params.set("owner", organization);
      params.set("type", "text");
      params.set("stage", "prod");
      params.set("metadataType", "rc");
      params.set("includeMetadata", "true");
      const catalogUrl = `${baseCatalog}?${params.toString()}`;

      const catalogCacheKey = `catalog:${language}:${organization}:prod:rc`;
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
            url: `internal://kv/catalog/${language}/${organization}`,
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
          void usedCache; // mark as used to satisfy linter
        } catch {
          // fall through to network
        }
      }
      if (resources.length === 0) {
        const networkRes = await trackedFetch(this.tracer, catalogUrl);
        if (!networkRes.ok) return [];
        const body = await networkRes.text();
        try {
          const parsed = JSON.parse(body) as { data?: CatalogResource[] };
          resources = parsed.data || [];
          // Store in KV for reuse across endpoints
          await this.kvCache.set(catalogCacheKey, JSON.stringify(parsed), 3600);
        } catch {
          return [];
        }
      }

      // 2. Find the right resource
      const resource = resources.find((r) =>
        r.name.includes(`_${resourceType}`),
      );
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
        `zip:${resource.owner}/${resource.name}:${refTag || "master"}`,
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
  ): Promise<unknown> {
    try {
      const targetSuffix = resourceType === "tw" ? "_tw" : "_ta";

      // 1) Catalog lookup with RC metadata
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?lang=${language}&owner=${organization}&stage=prod&type=text&metadataType=rc`;
      const catalogResponse = await trackedFetch(this.tracer, catalogUrl);
      if (!catalogResponse.ok)
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };
      const catalogData = (await catalogResponse.json()) as {
        data?: CatalogResource[];
      };
      const resource = (catalogData.data || []).find((r) =>
        r.name.endsWith(targetSuffix),
      );
      if (!resource)
        return resourceType === "tw"
          ? { articles: [] }
          : { modules: [], categories: [] };

      // 2) Download ZIP (prefer catalog-provided ref and zipball URL)
      const { refTag, zipballUrl } = this.resolveRefAndZip(resource as unknown);
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
          // Prefer ingredients mapping when identifier is a term
          targetPath =
            ingredients.find((ing) =>
              (ing.path || "").toLowerCase().endsWith(`/${term}.md`),
            )?.path || null;

          // Check KV term index as a secondary source
          if (!targetPath) {
            const indexKey = `tw-index:${language}:${organization}:${term}`;
            const cached = await this.kvCache.get(indexKey);
            if (cached) {
              try {
                const decoded =
                  cached instanceof ArrayBuffer
                    ? new TextDecoder().decode(cached)
                    : (cached as unknown as string);
                const parsed = JSON.parse(decoded) as { path?: string };
                if (parsed?.path) {
                  targetPath = parsed.path;
                }
              } catch {
                // ignore corrupt cache
              }
            }
          }
        }

        if (!targetPath) return { articles: [] };

        // Try extraction, and if not found, retry with repository-prefixed path
        let content = await this.extractFileFromZip(
          zipData,
          targetPath,
          resource.name,
          `zip:${resource.owner}/${resource.name}:${refTag || "master"}`,
        );
        if (!content) {
          const repoPrefixed = `${resource.name.replace(/\/$/, "")}/${targetPath.replace(/^\//, "")}`;
          content = await this.extractFileFromZip(
            zipData,
            repoPrefixed,
            resource.name,
            `zip:${resource.owner}/${resource.name}:${refTag || "master"}`,
          );
        }
        if (!content) return { articles: [] };

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
      if (moduleId) {
        const looksLikePath = rawId?.includes("/") && moduleId.endsWith(".md");
        let modulePath: string | null = looksLikePath ? rawId || null : null;

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
          `zip:${resource.owner}/${resource.name}:${refTag || "master"}`,
        );
        if (!content) {
          const repoPrefixed = `${resource.name.replace(/\/$/, "")}/${modulePath.replace(/^\//, "")}`;
          content = await this.extractFileFromZip(
            zipData,
            repoPrefixed,
            resource.name,
            `zip:${resource.owner}/${resource.name}:${refTag || "master"}`,
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
      logger.error("Error in getMarkdownContent:", error as Error);
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
      const { unzipSync } = await import("fflate");
      const unzipped = unzipSync(zipData);
      return Object.keys(unzipped);
    } catch (error) {
      logger.error("Error listing ZIP files:", error as Error);
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
    zipballUrl?: string | null,
  ): Promise<Uint8Array | null> {
    try {
      const cacheKey = `zip:${organization}/${repository}:${ref || "master"}`;

      // Try KV cache first (includes memory cache)
      const kvStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const cached = await this.kvCache.get(cacheKey);
      logger.debug(`KV/Memory cache check`, {
        cacheKey,
        status: cached ? "HIT" : "MISS",
      });

      if (cached instanceof ArrayBuffer) {
        logger.info(`Using cached ZIP for ${repository}`);
        logger.debug(`Cached ZIP size (MB)`, {
          sizeMB: (cached.byteLength / 1024 / 1024).toFixed(2),
        });
        // Log synthetic KV hit for X-Ray
        try {
          const kvMs = Math.max(
            1,
            Math.round(
              (typeof performance !== "undefined"
                ? performance.now()
                : Date.now()) - kvStart,
            ),
          );
          this.tracer.addApiCall({
            url: `internal://kv/zip/${organization}/${repository}:${ref || "master"}`,
            duration: kvMs,
            status: 200,
            size: cached.byteLength,
            cached: true,
          });
        } catch {
          // ignore
        }
        return new Uint8Array(cached);
      }

      // Fallback to regular cache if KV missed
      const memStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const memoryCached = await cache.get(cacheKey);
      if (memoryCached instanceof ArrayBuffer) {
        logger.info(`Using memory-only cached ZIP for ${repository}`);
        // Warm KV cache with the value
        await this.kvCache.set(cacheKey, memoryCached, 30 * 24 * 60 * 60); // 30 days
        // Log synthetic memory hit for X-Ray
        try {
          const memMs = Math.max(
            1,
            Math.round(
              (typeof performance !== "undefined"
                ? performance.now()
                : Date.now()) - memStart,
            ),
          );
          this.tracer.addApiCall({
            url: `internal://memory/zip/${organization}/${repository}:${ref || "master"}`,
            duration: memMs,
            status: 200,
            size: memoryCached.byteLength,
            cached: true,
          });
        } catch {
          // eslint-disable-next-line no-empty -- ignore tracer add failure
          void 0;
        }
        return new Uint8Array(memoryCached);
      }

      // Download the ZIP (prefer provided zipball URL)
      const zipUrl =
        zipballUrl ||
        `https://git.door43.org/${organization}/${repository}/archive/${encodeURIComponent(
          ref || "master",
        )}.zip`;
      logger.info(`Downloading ZIP: ${zipUrl}`);

      const response = await trackedFetch(this.tracer, zipUrl);
      if (!response.ok) {
        logger.error(`Failed to download ZIP: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);

      // Cache in both places for 30 days (seconds)
      await cache.set(cacheKey, buffer, "fileContent", 30 * 24 * 60 * 60);
      await this.kvCache.set(cacheKey, buffer, 30 * 24 * 60 * 60); // 30 days

      logger.info(`Cached ZIP in memory and KV`, {
        sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
        repository,
        organization,
        ref,
      });
      return data;
    } catch (error) {
      logger.error("Error downloading ZIP:", error as Error);
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
    zipCacheKey?: string,
  ): Promise<string | null> {
    try {
      // KV+memory cache for extracted file content
      if (zipCacheKey) {
        const fileKey = `zipfile:${zipCacheKey}:${filePath.replace(/^\./, "")}`;
        const kvStart =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const cached = await this.kvCache.get(fileKey);
        if (cached) {
          let contentStr: string | null = null;
          try {
            if (cached instanceof ArrayBuffer) {
              contentStr = new TextDecoder("utf-8").decode(
                cached as ArrayBuffer,
              );
            } else if (cached instanceof Uint8Array) {
              contentStr = new TextDecoder("utf-8").decode(
                cached as Uint8Array,
              );
            } else if (typeof cached === "string") {
              // Stored as JSON string by kvCache.set for string values; remove potential quotes
              contentStr = cached.startsWith('"') ? JSON.parse(cached) : cached;
            }
          } catch {
            contentStr = null;
          }
          if (contentStr !== null) {
            try {
              const kvMs = Math.max(
                1,
                Math.round(
                  (typeof performance !== "undefined"
                    ? performance.now()
                    : Date.now()) - kvStart,
                ),
              );
              this.tracer.addApiCall({
                url: `internal://kv/file/${fileKey}`,
                duration: kvMs,
                status: 200,
                size: contentStr.length,
                cached: true,
              });
            } catch {
              // ignore
            }
            return contentStr;
          }
        }
      }

      const { unzipSync } = await import("fflate");
      // Remove leading ./ if present
      const cleanPath = filePath.replace(/^\.\//, "");
      const possiblePaths = [
        cleanPath,
        `./${cleanPath}`,
        `${repository}-master/${cleanPath}`,
        `${repository}/${cleanPath}`,
      ];

      // Filtered single-file extraction: only inflate matching entries
      const filtered = unzipSync(zipData, {
        filter: (f) => {
          const n = f.name;
          if (possiblePaths.includes(n)) return true;
          return n.endsWith(cleanPath) || n.endsWith(`/${cleanPath}`);
        },
      });

      // Find the first matching entry
      const matchedKey = Object.keys(filtered)[0];
      if (matchedKey) {
        const decoder = new TextDecoder("utf-8");
        const content = decoder.decode(filtered[matchedKey]);
        if (zipCacheKey) {
          try {
            const fileKey = `zipfile:${zipCacheKey}:${filePath.replace(/^\./, "")}`;
            const buf = new TextEncoder().encode(content);
            await this.kvCache.set(fileKey, buf.buffer, 30 * 24 * 60 * 60); // 30 days
            // Record as a write, not a cache hit
            this.tracer.addApiCall({
              url: `internal://kv/file-write/${fileKey}`,
              duration: 1,
              status: 200,
              size: content.length,
              cached: false,
            });
          } catch {
            // ignore
          }
        }
        return content;
      }

      logger.warn(`File not found in ZIP. Tried: ${possiblePaths.join(", ")}`);

      return null;
    } catch (error) {
      logger.error("Error extracting from ZIP:", error as Error);
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
        const afterEndVersePattern = new RegExp(
          `\\\\v\\s*${reference.endVerse + 1}\\b`,
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
        reference.endVerse && reference.endVerse > reference.verse;

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

        // Format chapters and verses
        .replace(/\[\[CHAPTER:(\d+)\]\]/g, "\n\n## Chapter $1\n\n")
        .replace(/\[\[VERSE:(\d+)\]\]/g, "\n$1. ")
        .trim();

      return bookText;
    } catch (error) {
      logger.error("Error extracting full book:", error as Error);
      return "";
    }
  }

  private extractChapterRangeFromUSFM(
    usfm: string,
    reference: ParsedReference,
  ): string {
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

        // Normalize reference cell: extract trailing chapter:verse if present (e.g., "John 3:16" -> "3:16")
        const matchCv = ref.match(/(\d+:\d+)\b/);
        const refCv = matchCv ? matchCv[1] : ref;

        // Exact verse match when verse provided (avoid 13:16 matching 3:16)
        if (reference.verse) {
          const target = `${reference.chapter}:${reference.verse}`;
          if (refCv === target) {
            results.push(row as Record<string, string>);
          }
          continue;
        }

        // Chapter-only: allow any verse in that chapter via chapter prefix match (works for both
        // "3:16" and "John 3:16")
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
