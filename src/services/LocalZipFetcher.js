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
  tracer;
  cacheDir;
  constructor(cacheDir, tracer) {
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
  getClientHeaders() {
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
  async getOrDownloadZip(organization, repository, ref, zipballUrl) {
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
        `https://git.door43.org/${organization}/${repository}/archive/${encodeURIComponent(ref)}.zip`;
      const tarUrl = zipUrl.replace(/\.zip(\?.*)?$/i, ".tar.gz$1");
      // Build local cache key
      const cacheKey = ref
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
  async extractFileFromZip(zipData, filePath, repository) {
    try {
      const { unzipSync, gunzip } = await import("fflate");
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
        const unzipped = unzipSync(zipData, { lazy: true });
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
  getLocalZipPath(organization, repository, ref) {
    const safeRef = (ref || "master").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${organization}_${repository}_${safeRef}.zip`;
    return path.join(this.cacheDir, "zips", organization, repository, filename);
  }
  /**
   * Get raw USFM file content from local ZIP
   */
  async getRawUSFMContent(organization, repository, filePath, ref, zipballUrl) {
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
   * Get cache directory
   */
  getCacheDir() {
    return this.cacheDir;
  }
  /**
   * List all cached ZIP files
   */
  listCachedZips() {
    const zips = [];
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
//# sourceMappingURL=LocalZipFetcher.js.map
