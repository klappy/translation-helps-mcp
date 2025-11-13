/**
 * Resource Sync Service
 *
 * Downloads complete resource repositories as ZIP files from Door43
 * for offline use. Stores resources in local file system cache.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "../utils/logger.js";
import { networkDetector } from "../utils/network-detector.js";
import { LocalZipFetcher } from "./LocalZipFetcher.js";
import { EdgeXRayTracer } from "../functions/edge-xray.js";

export interface ResourceInfo {
  organization: string;
  language: string;
  resourceType: string; // 'ult', 'ust', 'tn', 'tq', 'tw', 'twl', 'ta'
  version?: string;
}

export interface DownloadProgress {
  resource: ResourceInfo;
  status: "pending" | "downloading" | "completed" | "failed";
  bytesDownloaded?: number;
  totalBytes?: number;
  error?: string;
}

export interface SyncStatus {
  language: string;
  resources: DownloadProgress[];
  totalSize: number;
  downloadedSize: number;
  startTime: number;
  endTime?: number;
}

/**
 * Resource Sync Service
 */
export class ResourceSync {
  private cacheDir: string;
  private metadataFile: string;
  private activeDownloads: Map<string, Promise<void>> = new Map();

  // Available resource types for syncing
  private readonly RESOURCE_TYPES = [
    "ult", // Unlocked Literal Text
    "ust", // Unlocked Simplified Text
    "tn", // Translation Notes
    "tq", // Translation Questions
    "tw", // Translation Words
    "twl", // Translation Word Links
    "ta", // Translation Academy
  ];

  constructor(cachePath?: string) {
    // Default: ~/.translation-helps-mcp/cache/resources/
    this.cacheDir =
      cachePath ||
      path.join(os.homedir(), ".translation-helps-mcp", "cache", "resources");

    this.metadataFile = path.join(path.dirname(this.cacheDir), "metadata.json");

    // Ensure cache directory exists
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      logger.info(`📁 ResourceSync initialized at ${this.cacheDir}`);
    } catch (error) {
      logger.error("Failed to create cache directory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Download a specific resource
   */
  async downloadResource(
    org: string,
    lang: string,
    resourceType: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<boolean> {
    const key = `${org}/${lang}/${resourceType}`;

    // Check if already downloading
    if (this.activeDownloads.has(key)) {
      logger.info(`⏳ Resource already downloading: ${key}`);
      await this.activeDownloads.get(key);
      return true;
    }

    // Check network availability
    const online = await networkDetector.isOnline();
    if (!online) {
      logger.error(`❌ Cannot download ${key}: offline`);
      return false;
    }

    const resource: ResourceInfo = {
      organization: org,
      language: lang,
      resourceType,
    };

    const progress: DownloadProgress = {
      resource,
      status: "downloading",
    };

    if (onProgress) {
      onProgress(progress);
    }

    // Create download promise
    const downloadPromise = this.performDownload(org, lang, resourceType)
      .then(() => {
        progress.status = "completed";
        if (onProgress) {
          onProgress(progress);
        }
        this.activeDownloads.delete(key);
        this.updateMetadata(resource, "downloaded");
      })
      .catch((error) => {
        progress.status = "failed";
        progress.error = error instanceof Error ? error.message : String(error);
        if (onProgress) {
          onProgress(progress);
        }
        this.activeDownloads.delete(key);
        logger.error(`Failed to download ${key}`, { error: progress.error });
      });

    this.activeDownloads.set(key, downloadPromise);
    await downloadPromise;

    return progress.status === "completed";
  }

  /**
   * Perform the actual download
   * Uses LocalZipFetcher to reuse sophisticated download logic (ref tags, zipball URLs, fallbacks)
   */
  private async performDownload(
    org: string,
    lang: string,
    resourceType: string,
  ): Promise<void> {
    const repoName = `${lang}_${resourceType}`;
    const tracer = new EdgeXRayTracer("resource-sync", "download");
    const zipFetcher = new LocalZipFetcher(this.cacheDir, tracer);

    logger.info(`⬇️ Downloading ${org}/${repoName} using ZIP fetcher`);

    try {
      // Use LocalZipFetcher which handles:
      // - Catalog lookup for ref tags and zipball URLs
      // - Fallback to tar.gz
      // - Immutable link headers
      // - Local file system caching
      const zipData = await zipFetcher.getOrDownloadZip(
        org,
        repoName,
        "master", // Default ref, LocalZipFetcher will resolve actual ref from catalog if available
        null, // zipballUrl - will be resolved from catalog
      );

      if (!zipData) {
        throw new Error(`Failed to download ZIP for ${org}/${repoName}`);
      }

      // LocalZipFetcher already saved the ZIP to local cache
      // But we also want it in the old location for compatibility
      const targetDir = path.join(this.cacheDir, lang);
      fs.mkdirSync(targetDir, { recursive: true });

      const targetFile = path.join(targetDir, `${resourceType}.zip`);
      // Copy from LocalZipFetcher's cache location to the old location
      const cachedPath = zipFetcher.getCacheDir();
      const cachedZipPath = path.join(
        cachedPath,
        "zips",
        org,
        repoName,
        `${org}_${repoName}_master.zip`,
      );

      if (fs.existsSync(cachedZipPath)) {
        fs.copyFileSync(cachedZipPath, targetFile);
      } else {
        // Fallback: write directly if cache path doesn't exist
        fs.writeFileSync(targetFile, zipData);
      }

      logger.info(
        `✅ Downloaded ${resourceType} for ${lang} (${(zipData.length / 1024 / 1024).toFixed(2)} MB)`,
      );
    } catch (error) {
      logger.error(`Failed to download ${org}/${repoName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Download all resources for a language
   */
  async downloadAll(
    lang: string,
    org: string = "unfoldingWord",
    onProgress?: (status: SyncStatus) => void,
  ): Promise<SyncStatus> {
    const status: SyncStatus = {
      language: lang,
      resources: [],
      totalSize: 0,
      downloadedSize: 0,
      startTime: Date.now(),
    };

    // Create download progress for each resource type
    for (const resourceType of this.RESOURCE_TYPES) {
      status.resources.push({
        resource: { organization: org, language: lang, resourceType },
        status: "pending",
      });
    }

    if (onProgress) {
      onProgress(status);
    }

    // Download all resources in parallel (with some concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < this.RESOURCE_TYPES.length; i += concurrency) {
      const batch = this.RESOURCE_TYPES.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (resourceType, idx) => {
          const progressIdx = i + idx;
          const success = await this.downloadResource(
            org,
            lang,
            resourceType,
            (progress) => {
              status.resources[progressIdx] = progress;
              if (onProgress) {
                onProgress(status);
              }
            },
          );

          if (!success) {
            logger.warn(`⚠️ Failed to download ${resourceType} for ${lang}`);
          }
        }),
      );
    }

    status.endTime = Date.now();

    if (onProgress) {
      onProgress(status);
    }

    logger.info(
      `✅ Sync completed for ${lang} in ${((status.endTime - status.startTime) / 1000).toFixed(1)}s`,
    );

    return status;
  }

  /**
   * Sync resources (update if outdated)
   */
  async syncResources(
    lang: string,
    org: string = "unfoldingWord",
  ): Promise<SyncStatus> {
    // For now, just download all
    // In the future, we could check versions and only download if outdated
    return await this.downloadAll(lang, org);
  }

  /**
   * Get list of available resources (from Door43)
   */
  async getAvailableResources(): Promise<
    { language: string; resources: string[] }[]
  > {
    // This would require querying Door43 API
    // For now, return a static list of common languages
    return [
      { language: "en", resources: this.RESOURCE_TYPES },
      { language: "es", resources: this.RESOURCE_TYPES },
      { language: "fr", resources: this.RESOURCE_TYPES },
      { language: "pt", resources: this.RESOURCE_TYPES },
      { language: "ru", resources: this.RESOURCE_TYPES },
      { language: "zh", resources: this.RESOURCE_TYPES },
      { language: "ar", resources: this.RESOURCE_TYPES },
      { language: "hi", resources: this.RESOURCE_TYPES },
    ];
  }

  /**
   * Get list of downloaded resources (from local cache)
   */
  getDownloadedResources(): { language: string; resources: string[] }[] {
    const downloaded: { language: string; resources: string[] }[] = [];

    try {
      if (!fs.existsSync(this.cacheDir)) {
        return downloaded;
      }

      const languages = fs.readdirSync(this.cacheDir);

      for (const lang of languages) {
        const langDir = path.join(this.cacheDir, lang);
        const stat = fs.statSync(langDir);

        if (stat.isDirectory()) {
          const files = fs.readdirSync(langDir);
          const resources = files
            .filter((f) => f.endsWith(".zip"))
            .map((f) => f.replace(".zip", ""));

          if (resources.length > 0) {
            downloaded.push({ language: lang, resources });
          }
        }
      }

      return downloaded;
    } catch (error) {
      logger.error("Failed to list downloaded resources", {
        error: error instanceof Error ? error.message : String(error),
      });
      return downloaded;
    }
  }

  /**
   * Check for updates (compare local vs remote versions)
   */
  async checkForUpdates(
    lang: string,
  ): Promise<{ resource: string; hasUpdate: boolean }[]> {
    // Placeholder: would need to implement version checking
    // For now, assume all resources are up to date
    const downloaded = this.getDownloadedResources().find(
      (d) => d.language === lang,
    );

    if (!downloaded) {
      return [];
    }

    return downloaded.resources.map((resource) => ({
      resource,
      hasUpdate: false,
    }));
  }

  /**
   * Update metadata file
   */
  private updateMetadata(resource: ResourceInfo, status: string): void {
    try {
      let metadata: any = {};

      if (fs.existsSync(this.metadataFile)) {
        const content = fs.readFileSync(this.metadataFile, "utf-8");
        metadata = JSON.parse(content);
      }

      const key = `${resource.language}/${resource.resourceType}`;
      metadata[key] = {
        ...resource,
        status,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.error("Failed to update metadata", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}
