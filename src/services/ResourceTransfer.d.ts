/**
 * Resource Transfer Service
 *
 * Handles import and export of translation resources as ZIP files
 * for offline sharing via USB, Bluetooth, or other direct transfer methods.
 */
export interface ShareManifest {
    version: string;
    createdAt: string;
    language: string;
    resources: {
        type: string;
        filename: string;
        size: number;
        checksum: string;
    }[];
    creator?: string;
    description?: string;
}
export interface ExportOptions {
    outputPath?: string;
    compress?: number;
    split?: number;
}
export interface ImportResult {
    success: boolean;
    imported: string[];
    failed: string[];
    errors: {
        file: string;
        error: string;
    }[];
}
/**
 * Resource Transfer Service
 */
export declare class ResourceTransfer {
    private cacheDir;
    private exportsDir;
    private importsDir;
    constructor(cachePath?: string);
    /**
     * Calculate checksum of a file
     */
    private calculateChecksum;
    /**
     * Export a specific resource
     */
    exportResource(lang: string, resourceType: string, options?: ExportOptions): Promise<string | null>;
    /**
     * Export all resources for a language
     */
    exportLanguage(lang: string, options?: ExportOptions): Promise<string | null>;
    /**
     * Export entire cache
     */
    exportAll(_options?: ExportOptions): Promise<string | null>;
    /**
     * Export a custom bundle of resources
     */
    exportBundle(resources: string[], // Format: "lang/type" e.g., ["en/ult", "en/tn"]
    _options?: ExportOptions): Promise<string | null>;
    /**
     * Validate a ZIP file before importing
     */
    validateZip(filePath: string): Promise<boolean>;
    /**
     * Import a single ZIP file
     */
    importZip(filePath: string): Promise<ImportResult>;
    /**
     * Import multiple ZIP files from a directory
     */
    importBulk(directory: string): Promise<ImportResult>;
    /**
     * List imported resources
     */
    listImported(): string[];
    /**
     * Calculate export size before creating
     */
    getExportSize(resources: string[]): number;
    /**
     * Format bytes to human-readable string
     */
    private formatBytes;
    /**
     * Get export directory
     */
    getExportsDir(): string;
    /**
     * Get imports directory
     */
    getImportsDir(): string;
}
//# sourceMappingURL=ResourceTransfer.d.ts.map