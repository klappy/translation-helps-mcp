/**
 * Resource Sync Service
 *
 * Downloads complete resource repositories as ZIP files from Door43
 * for offline use. Stores resources in local file system cache.
 */
export interface ResourceInfo {
  organization: string;
  language: string;
  resourceType: string;
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
export declare class ResourceSync {
  private cacheDir;
  private metadataFile;
  private activeDownloads;
  private readonly RESOURCE_TYPES;
  constructor(cachePath?: string);
  /**
   * Download a specific resource
   */
  downloadResource(
    org: string,
    lang: string,
    resourceType: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<boolean>;
  /**
   * Perform the actual download
   * Uses LocalZipFetcher to reuse sophisticated download logic (ref tags, zipball URLs, fallbacks)
   */
  private performDownload;
  /**
   * Download all resources for a language
   */
  downloadAll(
    lang: string,
    org?: string,
    onProgress?: (status: SyncStatus) => void,
  ): Promise<SyncStatus>;
  /**
   * Sync resources (update if outdated)
   */
  syncResources(lang: string, org?: string): Promise<SyncStatus>;
  /**
   * Get list of available resources (from Door43)
   */
  getAvailableResources(): Promise<
    {
      language: string;
      resources: string[];
    }[]
  >;
  /**
   * Get list of downloaded resources (from local cache)
   */
  getDownloadedResources(): {
    language: string;
    resources: string[];
  }[];
  /**
   * Check for updates (compare local vs remote versions)
   */
  checkForUpdates(lang: string): Promise<
    {
      resource: string;
      hasUpdate: boolean;
    }[]
  >;
  /**
   * Update metadata file
   */
  private updateMetadata;
  /**
   * Get cache directory path
   */
  getCacheDir(): string;
}
//# sourceMappingURL=ResourceSync.d.ts.map
