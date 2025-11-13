/**
 * Resource Transfer Service
 *
 * Handles import and export of translation resources as ZIP files
 * for offline sharing via USB, Bluetooth, or other direct transfer methods.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { logger } from "../utils/logger.js";
/**
 * Resource Transfer Service
 */
export class ResourceTransfer {
    cacheDir;
    exportsDir;
    importsDir;
    constructor(cachePath) {
        const baseDir = cachePath || path.join(os.homedir(), ".translation-helps-mcp", "cache");
        this.cacheDir = path.join(baseDir, "resources");
        this.exportsDir = path.join(baseDir, "exports");
        this.importsDir = path.join(baseDir, "imports");
        // Ensure directories exist
        try {
            fs.mkdirSync(this.cacheDir, { recursive: true });
            fs.mkdirSync(this.exportsDir, { recursive: true });
            fs.mkdirSync(this.importsDir, { recursive: true });
            logger.info(`📦 ResourceTransfer initialized`);
        }
        catch (error) {
            logger.error("Failed to create transfer directories", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Calculate checksum of a file
     */
    calculateChecksum(filePath) {
        const content = fs.readFileSync(filePath);
        return crypto.createHash("sha256").update(content).digest("hex");
    }
    /**
     * Export a specific resource
     */
    async exportResource(lang, resourceType, options = {}) {
        try {
            const sourceFile = path.join(this.cacheDir, lang, `${resourceType}.zip`);
            if (!fs.existsSync(sourceFile)) {
                logger.error(`Resource not found: ${lang}/${resourceType}`);
                return null;
            }
            const outputPath = options.outputPath ||
                path.join(this.exportsDir, `${lang}_${resourceType}_${Date.now()}.zip`);
            // Copy file to exports directory
            fs.copyFileSync(sourceFile, outputPath);
            logger.info(`✅ Exported ${lang}/${resourceType} to ${outputPath}`);
            return outputPath;
        }
        catch (error) {
            logger.error(`Failed to export ${lang}/${resourceType}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Export all resources for a language
     */
    async exportLanguage(lang, options = {}) {
        try {
            const langDir = path.join(this.cacheDir, lang);
            if (!fs.existsSync(langDir)) {
                logger.error(`Language not found: ${lang}`);
                return null;
            }
            // Get all resource files
            const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".zip"));
            if (files.length === 0) {
                logger.error(`No resources found for ${lang}`);
                return null;
            }
            // Create manifest
            const manifest = {
                version: "1.0",
                createdAt: new Date().toISOString(),
                language: lang,
                resources: files.map((filename) => {
                    const filePath = path.join(langDir, filename);
                    const stats = fs.statSync(filePath);
                    return {
                        type: filename.replace(".zip", ""),
                        filename,
                        size: stats.size,
                        checksum: this.calculateChecksum(filePath),
                    };
                }),
            };
            // For simplicity, we'll create a directory structure and then the user can zip it
            // In a real implementation, we'd use a ZIP library like adm-zip
            const tempDir = options.outputPath || path.join(this.exportsDir, `temp-${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });
            // Copy manifest
            fs.writeFileSync(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));
            // Copy resource files
            for (const file of files) {
                const sourcePath = path.join(langDir, file);
                const destPath = path.join(tempDir, file);
                fs.copyFileSync(sourcePath, destPath);
            }
            logger.info(`✅ Created share package for ${lang} at ${tempDir}`);
            logger.info(`📦 Package contains ${files.length} resources (${this.formatBytes(manifest.resources.reduce((sum, r) => sum + r.size, 0))})`);
            return tempDir;
        }
        catch (error) {
            logger.error(`Failed to export language ${lang}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Export entire cache
     */
    async exportAll(_options = {}) {
        try {
            const languages = fs
                .readdirSync(this.cacheDir)
                .filter((f) => fs.statSync(path.join(this.cacheDir, f)).isDirectory());
            if (languages.length === 0) {
                logger.error("No cached resources to export");
                return null;
            }
            const timestamp = new Date().toISOString().split("T")[0];
            const packageName = `share-package-all-${timestamp}`;
            const tempDir = path.join(this.exportsDir, packageName);
            fs.mkdirSync(tempDir, { recursive: true });
            for (const lang of languages) {
                const result = await this.exportLanguage(lang, {
                    outputPath: path.join(tempDir, lang),
                });
                if (result) {
                    logger.info(`✅ Exported ${lang}`);
                }
            }
            logger.info(`✅ Exported all languages to ${tempDir}`);
            return tempDir;
        }
        catch (error) {
            logger.error("Failed to export all resources", {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Export a custom bundle of resources
     */
    async exportBundle(resources, // Format: "lang/type" e.g., ["en/ult", "en/tn"]
    _options = {}) {
        try {
            const timestamp = new Date().toISOString().split("T")[0];
            const packageName = `share-bundle-${timestamp}`;
            const tempDir = path.join(this.exportsDir, packageName);
            fs.mkdirSync(tempDir, { recursive: true });
            const exported = [];
            for (const resource of resources) {
                const [lang, type] = resource.split("/");
                if (!lang || !type) {
                    logger.warn(`Invalid resource format: ${resource}`);
                    continue;
                }
                const sourceFile = path.join(this.cacheDir, lang, `${type}.zip`);
                if (!fs.existsSync(sourceFile)) {
                    logger.warn(`Resource not found: ${resource}`);
                    continue;
                }
                const destDir = path.join(tempDir, lang);
                fs.mkdirSync(destDir, { recursive: true });
                const destFile = path.join(destDir, `${type}.zip`);
                fs.copyFileSync(sourceFile, destFile);
                exported.push(resource);
            }
            if (exported.length === 0) {
                logger.error("No resources were exported");
                return null;
            }
            // Create bundle manifest
            const manifest = {
                version: "1.0",
                createdAt: new Date().toISOString(),
                type: "bundle",
                resources: exported,
            };
            fs.writeFileSync(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));
            logger.info(`✅ Created bundle with ${exported.length} resources at ${tempDir}`);
            return tempDir;
        }
        catch (error) {
            logger.error("Failed to export bundle", {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Validate a ZIP file before importing
     */
    async validateZip(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                logger.error(`File not found: ${filePath}`);
                return false;
            }
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) {
                logger.error(`Not a file: ${filePath}`);
                return false;
            }
            // Basic validation: check if it's a ZIP file
            const ext = path.extname(filePath).toLowerCase();
            if (ext !== ".zip") {
                logger.error(`Not a ZIP file: ${filePath}`);
                return false;
            }
            // Could add more validation here (e.g., check ZIP file structure)
            return true;
        }
        catch (error) {
            logger.error(`Failed to validate ${filePath}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    /**
     * Import a single ZIP file
     */
    async importZip(filePath) {
        const result = {
            success: false,
            imported: [],
            failed: [],
            errors: [],
        };
        try {
            // Validate first
            const valid = await this.validateZip(filePath);
            if (!valid) {
                result.errors.push({ file: filePath, error: "Invalid ZIP file" });
                return result;
            }
            // Determine if this is a share package or a single resource
            // For now, just copy to imports directory
            const filename = path.basename(filePath);
            const destPath = path.join(this.importsDir, filename);
            fs.copyFileSync(filePath, destPath);
            result.imported.push(filename);
            result.success = true;
            logger.info(`✅ Imported ${filename}`);
        }
        catch (error) {
            result.errors.push({
                file: filePath,
                error: error instanceof Error ? error.message : String(error),
            });
            logger.error(`Failed to import ${filePath}`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return result;
    }
    /**
     * Import multiple ZIP files from a directory
     */
    async importBulk(directory) {
        const result = {
            success: false,
            imported: [],
            failed: [],
            errors: [],
        };
        try {
            if (!fs.existsSync(directory)) {
                result.errors.push({ file: directory, error: "Directory not found" });
                return result;
            }
            const files = fs
                .readdirSync(directory)
                .filter((f) => f.toLowerCase().endsWith(".zip"));
            for (const file of files) {
                const filePath = path.join(directory, file);
                const importResult = await this.importZip(filePath);
                result.imported.push(...importResult.imported);
                result.failed.push(...importResult.failed);
                result.errors.push(...importResult.errors);
            }
            result.success = result.imported.length > 0;
            logger.info(`✅ Bulk import: ${result.imported.length} succeeded, ${result.failed.length} failed`);
        }
        catch (error) {
            result.errors.push({
                file: directory,
                error: error instanceof Error ? error.message : String(error),
            });
            logger.error(`Failed to bulk import from ${directory}`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return result;
    }
    /**
     * List imported resources
     */
    listImported() {
        try {
            if (!fs.existsSync(this.importsDir)) {
                return [];
            }
            return fs
                .readdirSync(this.importsDir)
                .filter((f) => f.toLowerCase().endsWith(".zip"));
        }
        catch (error) {
            logger.error("Failed to list imported resources", {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
    /**
     * Calculate export size before creating
     */
    getExportSize(resources) {
        let totalSize = 0;
        for (const resource of resources) {
            const [lang, type] = resource.split("/");
            if (!lang || !type)
                continue;
            const filePath = path.join(this.cacheDir, lang, `${type}.zip`);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }
        }
        return totalSize;
    }
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
    /**
     * Get export directory
     */
    getExportsDir() {
        return this.exportsDir;
    }
    /**
     * Get imports directory
     */
    getImportsDir() {
        return this.importsDir;
    }
}
//# sourceMappingURL=ResourceTransfer.js.map