/**
 * ZIP File Handler
 *
 * Utilities for extracting files from ZIP and TAR.GZ archives in Workers.
 * Uses fflate for decompression (lightweight, works in Workers).
 *
 * NOTE: Some files stored under .zip keys may actually be TAR.GZ format
 * due to Cache API sync issues. This handler detects and handles both.
 */

import { unzipSync, gunzipSync, strFromU8 } from "fflate";

/**
 * Extracted file from an archive
 */
export interface ExtractedFile {
  path: string;
  content: string;
  size: number;
}

/**
 * Detect archive type from magic bytes
 */
function detectArchiveType(
  data: Uint8Array,
): "zip" | "gzip" | "tar" | "unknown" {
  if (data.length < 4) return "unknown";

  // ZIP: PK header (0x50 0x4B)
  if (data[0] === 0x50 && data[1] === 0x4b) return "zip";

  // GZIP: 0x1F 0x8B
  if (data[0] === 0x1f && data[1] === 0x8b) return "gzip";

  // TAR: Check for "ustar" at offset 257
  if (data.length > 262) {
    const ustar = String.fromCharCode(...data.slice(257, 262));
    if (ustar === "ustar") return "tar";
  }

  return "unknown";
}

/**
 * Parse TAR archive (after gunzip decompression)
 */
function parseTar(tarData: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  let offset = 0;

  while (offset < tarData.length - 512) {
    // Read header (512 bytes)
    const header = tarData.slice(offset, offset + 512);

    // Check for end of archive (two zero blocks)
    if (header.every((b) => b === 0)) break;

    // Extract filename (first 100 bytes, null-terminated)
    let filename = "";
    for (let i = 0; i < 100 && header[i] !== 0; i++) {
      filename += String.fromCharCode(header[i]);
    }

    // Extract file size (octal string at offset 124, 12 bytes)
    let sizeStr = "";
    for (let i = 124; i < 136 && header[i] !== 0; i++) {
      sizeStr += String.fromCharCode(header[i]);
    }
    const fileSize = parseInt(sizeStr.trim(), 8) || 0;

    // Type flag at offset 156
    const typeFlag = header[156];

    // Move past header
    offset += 512;

    // Only process regular files (type '0' or '\0')
    if ((typeFlag === 48 || typeFlag === 0) && fileSize > 0 && filename) {
      const fileData = tarData.slice(offset, offset + fileSize);
      files.set(filename, fileData);
    }

    // Move to next header (size rounded up to 512 bytes)
    offset += Math.ceil(fileSize / 512) * 512;
  }

  return files;
}

/**
 * Extract all files from a ZIP or TAR.GZ archive
 *
 * @param archiveBuffer - The archive file as an ArrayBuffer
 * @returns Array of extracted files with paths and content
 */
export function extractAllFiles(archiveBuffer: ArrayBuffer): ExtractedFile[] {
  const archiveData = new Uint8Array(archiveBuffer);
  const archiveType = detectArchiveType(archiveData);

  console.log(
    `[ZIP Handler] Detected archive type: ${archiveType} (${archiveData.length} bytes)`,
  );

  let fileMap: Map<string, Uint8Array> | Record<string, Uint8Array>;

  if (archiveType === "zip") {
    fileMap = unzipSync(archiveData);
  } else if (archiveType === "gzip") {
    // Decompress GZIP to get TAR
    const tarData = gunzipSync(archiveData);
    console.log(
      `[ZIP Handler] Decompressed GZIP to TAR: ${tarData.length} bytes`,
    );
    fileMap = parseTar(tarData);
  } else {
    console.error(
      `[ZIP Handler] Unknown archive type. First bytes: ${archiveData[0]}, ${archiveData[1]}`,
    );
    return [];
  }

  const files: ExtractedFile[] = [];

  for (const [path, data] of fileMap instanceof Map
    ? fileMap.entries()
    : Object.entries(fileMap)) {
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

  console.log(`[ZIP Handler] Extracted ${files.length} files from archive`);
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
