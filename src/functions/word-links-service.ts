/**
 * Word Links Service
 * Shared core implementation for fetching translation word links
 * Used by both Netlify functions and MCP tools for consistency
 */

import { EdgeXRayTracer } from "../functions/edge-xray";
import { parseReference } from "../parsers/referenceParser";
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";
import { logger } from "../utils/logger.js";
import { cache } from "./cache";

export interface TranslationWordLink {
  word: string;
  occurrences: number;
  twlid: string;
  reference?: string;
  id?: string;
  tags?: string;
  origWords?: string;
  occurrence?: number;
}

export interface WordLinksOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface WordLinksResult {
  translationWordLinks: TranslationWordLink[];
  citation: {
    resource: string;
    organization: string;
    language: string;
    url: string;
    version: string;
  };
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    linksFound: number;
  };
}

/**
 * Core word links fetching logic
 */
export async function fetchWordLinks(
  options: WordLinksOptions,
): Promise<WordLinksResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
  } = options;

  logger.info(`Core word links service called`, {
    reference: referenceParam,
    language,
    organization,
  });

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // NEVER cache responses - only cache data sources
  // Removed response caching per CRITICAL_NEVER_CACHE_RESPONSES.md
  const responseKey = `wordlinks:${referenceParam}:${language}:${organization}`;

  logger.info(`Processing fresh word links request`, { key: responseKey });

  // Use ZIP + ingredients path via ZipFetcherFactory (pluggable system)
  const tracer = new EdgeXRayTracer(`twl-${Date.now()}`, "word-links-service");
  const zipFetcherProvider = ZipFetcherFactory.create(
    (options.zipFetcherProvider as "r2" | "fs" | "auto") ||
      (process.env.ZIP_FETCHER_PROVIDER as "r2" | "fs" | "auto") ||
      "auto",
    process.env.CACHE_PATH,
    tracer,
  );
  const rows = (await zipFetcherProvider.getTSVData(
    {
      book: reference.book,
      chapter: reference.chapter!,
      verse: reference.verse,
    },
    language,
    organization,
    "twl",
  )) as any[];

  // Map rows into expected pass-through structure (preserve fields)
  const wordLinks = (rows || []).map((row) => ({ ...row }));
  logger.info(`Parsed word links from ZIP`, { count: wordLinks.length });

  // Return the raw TSV structure without transformation
  const result = {
    links: wordLinks, // Direct TSV structure, no renaming
    citation: {
      resource: `${language}_twl`,
      organization,
      language,
      url: `https://git.door43.org/${organization}/${language}_twl`,
      version: "master",
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      linksFound: wordLinks.length,
    },
  };

  // NEVER cache responses - only cache data sources
  // Removed response caching per CRITICAL_NEVER_CACHE_RESPONSES.md

  return result;
}

/**
 * Parse word links from TSV data for a specific reference - using automatic parsing
 */
// Note: TSV parsing now handled in ZipResourceFetcher2.getTSVData
