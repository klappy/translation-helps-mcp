/**
 * ZIP File Handler
 *
 * Utilities for extracting files from ZIP archives in Workers.
 * Uses fflate for ZIP decompression (lightweight, works in Workers).
 */

import { unzipSync, strFromU8 } from "fflate";

/**
 * Extracted file from a ZIP archive
 */
export interface ExtractedFile {
  path: string;
  content: string;
  size: number;
}

/**
 * Extract all files from a ZIP archive
 *
 * @param zipBuffer - The ZIP file as an ArrayBuffer
 * @returns Array of extracted files with paths and content
 */
export function extractAllFiles(zipBuffer: ArrayBuffer): ExtractedFile[] {
  const zipData = new Uint8Array(zipBuffer);
  const unzipped = unzipSync(zipData);

  const files: ExtractedFile[] = [];

  for (const [path, data] of Object.entries(unzipped)) {
    // Skip directories (they end with /)
    if (path.endsWith("/")) {
      continue;
    }

    // Skip hidden files and system files
    if (path.includes("__MACOSX") || path.startsWith(".")) {
      continue;
    }

    try {
      const content = strFromU8(data);
      files.push({
        path,
        content,
        size: data.length,
      });
    } catch (_err) {
      console.warn(`[ZIP Handler] Could not decode file as UTF-8: ${path}`);
    }
  }

  return files;
}

/**
 * Extract files matching a pattern from a ZIP archive
 *
 * @param zipBuffer - The ZIP file as an ArrayBuffer
 * @param pattern - RegExp to match file paths
 * @returns Array of extracted files matching the pattern
 */
export function extractFilesMatching(
  zipBuffer: ArrayBuffer,
  pattern: RegExp,
): ExtractedFile[] {
  const allFiles = extractAllFiles(zipBuffer);
  return allFiles.filter((f) => pattern.test(f.path));
}

/**
 * Extract a single file from a ZIP archive
 *
 * @param zipBuffer - The ZIP file as an ArrayBuffer
 * @param filePath - Exact path of the file to extract
 * @returns The extracted file or null if not found
 */
export function extractFile(
  zipBuffer: ArrayBuffer,
  filePath: string,
): ExtractedFile | null {
  const zipData = new Uint8Array(zipBuffer);
  const unzipped = unzipSync(zipData);

  const data = unzipped[filePath];
  if (!data) {
    return null;
  }

  try {
    return {
      path: filePath,
      content: strFromU8(data),
      size: data.length,
    };
  } catch (_err) {
    console.warn(`[ZIP Handler] Could not decode file as UTF-8: ${filePath}`);
    return null;
  }
}

/**
 * List all file paths in a ZIP archive
 *
 * @param zipBuffer - The ZIP file as an ArrayBuffer
 * @returns Array of file paths (excluding directories)
 */
export function listFiles(zipBuffer: ArrayBuffer): string[] {
  const zipData = new Uint8Array(zipBuffer);
  const unzipped = unzipSync(zipData);

  return Object.keys(unzipped).filter(
    (path) =>
      !path.endsWith("/") &&
      !path.includes("__MACOSX") &&
      !path.startsWith("."),
  );
}

/**
 * Get statistics about a ZIP archive
 */
export function getZipStats(zipBuffer: ArrayBuffer): {
  fileCount: number;
  totalSize: number;
  fileTypes: Record<string, number>;
} {
  const zipData = new Uint8Array(zipBuffer);
  const unzipped = unzipSync(zipData);

  const fileTypes: Record<string, number> = {};
  let totalSize = 0;
  let fileCount = 0;

  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith("/") || path.includes("__MACOSX")) {
      continue;
    }

    fileCount++;
    totalSize += data.length;

    const ext = path.split(".").pop()?.toLowerCase() || "unknown";
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  }

  return { fileCount, totalSize, fileTypes };
}
