/**
 * ZIP Fetcher Provider Interface
 *
 * Pluggable ZIP fetcher system that allows different ZIP storage implementations
 * to be swapped via configuration. This integrates with the cache provider system
 * to provide a unified configuration approach.
 */

import { EdgeXRayTracer } from "../functions/edge-xray.js";
import { ZipResourceFetcher2 } from "./ZipResourceFetcher2.js";
import { LocalZipFetcher } from "./LocalZipFetcher.js";
import * as os from "os";
import * as path from "path";
import { logger } from "../utils/logger.js";

/**
 * Base interface for ZIP fetcher providers
 */
export interface ZipFetcherProvider {
  /**
   * Unique name identifier for this provider
   */
  name: string;

  /**
   * Get raw USFM content from a ZIP file
   */
  getRawUSFMContent(
    organization: string,
    repository: string,
    filePath: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<string | null>;

  /**
   * Get markdown content (for TW/TA) from a ZIP file
   */
  getMarkdownContent(
    language: string,
    organization: string,
    resourceType: "tw" | "ta",
    identifier?: string,
    forceRefresh?: boolean,
  ): Promise<unknown>;

  /**
   * Get TSV data (TN, TQ, TWL) from a ZIP file
   */
  getTSVData(
    reference: {
      book: string;
      chapter: number;
      verse?: number;
      endVerse?: number;
      verseEnd?: number;
    },
    language: string,
    organization: string,
    resourceType: "tn" | "tq" | "twl",
  ): Promise<unknown[]>;

  /**
   * Check if this provider is currently available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * R2 ZIP Fetcher Provider
 * Uses Cloudflare R2/Cache API for ZIP storage
 */
export class R2ZipFetcherProvider implements ZipFetcherProvider {
  name = "r2";
  private fetcher: ZipResourceFetcher2;

  constructor(tracer?: EdgeXRayTracer) {
    this.fetcher = new ZipResourceFetcher2(tracer);
  }

  async getRawUSFMContent(
    organization: string,
    repository: string,
    filePath: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<string | null> {
    return this.fetcher.getRawUSFMContent(
      organization,
      repository,
      filePath,
      ref,
      zipballUrl,
    );
  }

  async getMarkdownContent(
    language: string,
    organization: string,
    resourceType: "tw" | "ta",
    identifier?: string,
    forceRefresh?: boolean,
  ): Promise<unknown> {
    return this.fetcher.getMarkdownContent(
      language,
      organization,
      resourceType,
      identifier,
      forceRefresh,
    );
  }

  async getTSVData(
    reference: {
      book: string;
      chapter: number;
      verse?: number;
      endVerse?: number;
      verseEnd?: number;
    },
    language: string,
    organization: string,
    resourceType: "tn" | "tq" | "twl",
  ): Promise<unknown[]> {
    // ZipResourceFetcher2.getTSVData expects ParsedReference, but we only need the basic fields
    return this.fetcher.getTSVData(
      reference as any,
      language,
      organization,
      resourceType,
    );
  }

  async isAvailable(): Promise<boolean> {
    // R2 is available in Cloudflare Workers environment
    return typeof globalThis !== "undefined" && "caches" in globalThis;
  }
}

/**
 * File System ZIP Fetcher Provider
 * Uses local file system for ZIP storage
 */
export class FSZipFetcherProvider implements ZipFetcherProvider {
  name = "fs";
  private fetcher: LocalZipFetcher;

  constructor(cacheDir?: string, tracer?: EdgeXRayTracer) {
    const defaultCacheDir =
      cacheDir ||
      (typeof process !== "undefined" && process.env.CACHE_PATH
        ? process.env.CACHE_PATH
        : path.join(os.homedir(), ".translation-helps-mcp", "cache"));

    // Log which cache directory is being used
    if (typeof process !== "undefined" && process.env.CACHE_PATH) {
      logger.info(
        `📁 Using CACHE_PATH from environment: ${process.env.CACHE_PATH}`,
      );
    } else if (cacheDir) {
      logger.info(`📁 Using cacheDir parameter: ${cacheDir}`);
    } else {
      logger.info(`📁 Using default cache directory: ${defaultCacheDir}`);
    }

    this.fetcher = new LocalZipFetcher(defaultCacheDir, tracer);
  }

  async getRawUSFMContent(
    organization: string,
    repository: string,
    filePath: string,
    ref?: string | null,
    zipballUrl?: string | null,
  ): Promise<string | null> {
    return this.fetcher.getRawUSFMContent(
      organization,
      repository,
      filePath,
      ref,
      zipballUrl,
    );
  }

  async getMarkdownContent(
    language: string,
    organization: string,
    resourceType: "tw" | "ta",
    identifier?: string,
    forceRefresh?: boolean,
  ): Promise<unknown> {
    // Use LocalZipFetcher's getMarkdownContent (now implemented)
    return this.fetcher.getMarkdownContent(
      language,
      organization,
      resourceType,
      identifier,
      forceRefresh,
    );
  }

  async getTSVData(
    reference: {
      book: string;
      chapter: number;
      verse?: number;
      endVerse?: number;
      verseEnd?: number;
    },
    language: string,
    organization: string,
    resourceType: "tn" | "tq" | "twl",
  ): Promise<unknown[]> {
    return this.fetcher.getTSVData(
      reference,
      language,
      organization,
      resourceType,
    );
  }

  async isAvailable(): Promise<boolean> {
    // FS is available in Node.js environment
    try {
      return (
        typeof process !== "undefined" &&
        typeof require !== "undefined" &&
        typeof (globalThis as any).navigator === "undefined"
      );
    } catch {
      return false;
    }
  }
}

/**
 * ZIP Fetcher Factory
 * Creates the appropriate ZIP fetcher provider based on configuration
 */
export class ZipFetcherFactory {
  /**
   * Create a ZIP fetcher provider based on configuration
   */
  static create(
    providerName: "r2" | "fs" | "auto" = "auto",
    cacheDir?: string,
    tracer?: EdgeXRayTracer,
  ): ZipFetcherProvider {
    // Auto-detect if not specified
    if (providerName === "auto") {
      const useLocalStorage =
        typeof process !== "undefined" &&
        (process.env.USE_FS_CACHE === "true" ||
          process.env.NODE_ENV === "development" ||
          typeof (globalThis as any).navigator === "undefined");

      providerName = useLocalStorage ? "fs" : "r2";
    }

    switch (providerName) {
      case "fs":
        return new FSZipFetcherProvider(cacheDir, tracer);
      case "r2":
        return new R2ZipFetcherProvider(tracer);
      default:
        logger.warn(
          `Unknown ZIP fetcher provider: ${providerName}, defaulting to fs`,
        );
        return new FSZipFetcherProvider(cacheDir, tracer);
    }
  }

  /**
   * Get available providers
   */
  static async getAvailableProviders(): Promise<string[]> {
    const providers: string[] = [];
    const r2 = new R2ZipFetcherProvider();
    const fs = new FSZipFetcherProvider();

    if (await r2.isAvailable()) {
      providers.push("r2");
    }
    if (await fs.isAvailable()) {
      providers.push("fs");
    }

    return providers;
  }
}
