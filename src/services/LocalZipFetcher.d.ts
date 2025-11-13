/**
 * Local ZIP Fetcher
 *
 * Downloads ZIP files from Door43 and stores them locally in the file system.
 * Reuses the sophisticated download logic from ZipResourceFetcher2 but stores
 * ZIPs locally instead of R2/Cache API.
 *
 * Used by CLI for offline-first operation with local storage.
 */
import { EdgeXRayTracer } from "../functions/edge-xray.js";
export interface LocalZipOptions {
    organization: string;
    repository: string;
    ref?: string | null;
    zipballUrl?: string | null;
    cacheDir: string;
}
export declare class LocalZipFetcher {
    private tracer;
    private cacheDir;
    constructor(cacheDir: string, tracer?: EdgeXRayTracer);
    /**
     * Get client headers for requests (matching ZipResourceFetcher2)
     */
    private getClientHeaders;
    /**
     * Get or download a ZIP file (stores locally instead of R2)
     * Reuses download logic from ZipResourceFetcher2.getOrDownloadZip()
     */
    getOrDownloadZip(organization: string, repository: string, ref?: string | null, zipballUrl?: string | null): Promise<Uint8Array | null>;
    /**
     * Extract a file from a ZIP archive (local or in-memory)
     */
    extractFileFromZip(zipData: Uint8Array, filePath: string, repository: string): Promise<string | null>;
    /**
     * Get local file path for a ZIP
     */
    private getLocalZipPath;
    /**
     * Get raw USFM file content from local ZIP
     */
    getRawUSFMContent(organization: string, repository: string, filePath: string, ref?: string | null, zipballUrl?: string | null): Promise<string | null>;
    /**
     * Get cache directory
     */
    getCacheDir(): string;
    /**
     * List all cached ZIP files
     */
    listCachedZips(): Array<{
        organization: string;
        repository: string;
        ref: string;
        path: string;
        size: number;
    }>;
}
//# sourceMappingURL=LocalZipFetcher.d.ts.map