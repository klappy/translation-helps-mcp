/**
 * Unzip Worker
 *
 * Consumes R2 event notifications when ZIP files are cached in the source bucket.
 * Extracts files one-at-a-time to R2, which triggers the Index Worker via R2 events.
 *
 * Architecture:
 * ZIP cached in R2 → R2 Event → This Worker → Extract to R2 → R2 Event → Index Worker
 *
 * Memory optimization:
 * - Lists files without full decompression
 * - Extracts ONE file at a time
 * - Releases memory between extractions
 */

import type { Message } from "@cloudflare/workers-types";
import type { Env, R2EventNotification } from "./types.js";
import {
  extractSingleFile,
  getTAArticleId,
  groupTAArticleFiles,
  isIndexableFile,
  listFilesOnly,
  mergeTAArticleContent,
  sortTAArticlePieces,
  type TAArticlePiece,
} from "./utils/zip-handler.js";

/**
 * Result of processing a single ZIP file
 */
interface UnzipResult {
  zipKey: string;
  filesExtracted: number;
  filesSkipped: number;
  articlesMerged: number;
  errors: string[];
  durationMs: number;
}

/**
 * Check if a ZIP key represents a Translation Academy resource
 * TA repositories follow patterns like: en_ta, es-419_ta, etc.
 */
function isTranslationAcademyZip(key: string): boolean {
  // Match patterns like: /_ta/ or /_ta- in the key
  // e.g., unfoldingWord/en_ta/archive/v87.zip
  return /_ta[/-]/.test(key) || /_ta\.zip/.test(key);
}

/**
 * Process a single ZIP file - extract files one at a time to R2
 * For Translation Academy, merges article pieces into single files.
 */
async function processZipFile(
  env: Env,
  notification: R2EventNotification,
): Promise<UnzipResult> {
  const startTime = Date.now();
  const { key } = notification.object;
  const errors: string[] = [];
  let filesExtracted = 0;
  let filesSkipped = 0;
  let articlesMerged = 0;

  console.log(`[Unzip Worker] Processing ZIP: ${key}`);

  try {
    // Download ZIP from source bucket
    console.log(`[Unzip Worker] Fetching ZIP from R2: ${key}`);
    const fetchStart = Date.now();
    const zipObject = await env.SOURCE_BUCKET.get(key);
    if (!zipObject) {
      throw new Error(`ZIP not found in source bucket: ${key}`);
    }

    const zipBuffer = await zipObject.arrayBuffer();
    const fetchDuration = Date.now() - fetchStart;
    console.log(
      `[Unzip Worker] Downloaded ZIP: ${zipBuffer.byteLength} bytes in ${fetchDuration}ms`,
    );

    // List files without full decompression (memory efficient)
    console.log(`[Unzip Worker] Listing files in ZIP...`);
    const listStart = Date.now();
    const filePaths = listFilesOnly(zipBuffer);
    const listDuration = Date.now() - listStart;
    console.log(
      `[Unzip Worker] Found ${filePaths.length} files in ${listDuration}ms`,
    );

    // Filter to indexable files only
    const indexableFiles = filePaths.filter(isIndexableFile);
    console.log(
      `[Unzip Worker] ${indexableFiles.length} indexable files (.usfm, .tsv, .md, .txt, .json)`,
    );

    // Check if this is a Translation Academy resource
    const isTA = isTranslationAcademyZip(key);

    if (isTA) {
      console.log(
        `[Unzip Worker] Detected Translation Academy resource - will merge article pieces`,
      );

      // Group TA files by article folder
      const articleGroups = groupTAArticleFiles(indexableFiles);
      console.log(
        `[Unzip Worker] Found ${articleGroups.size} TA articles to merge`,
      );

      // Track which files belong to TA articles (so we skip them in normal processing)
      const taArticleFiles = new Set<string>();
      for (const files of articleGroups.values()) {
        for (const file of files) {
          taArticleFiles.add(file);
        }
      }

      // Process merged TA articles
      for (const [articleFolder, articleFiles] of articleGroups) {
        try {
          // Sort pieces in correct order: title.md -> sub-title.md -> 01.md -> 02.md...
          const sortedFiles = sortTAArticlePieces(articleFiles);

          // Extract and collect content for each piece
          const pieces: TAArticlePiece[] = [];
          for (const filePath of sortedFiles) {
            const content = extractSingleFile(zipBuffer, filePath);
            if (content) {
              pieces.push({ path: filePath, content });
            }
          }

          if (pieces.length === 0) {
            console.warn(
              `[Unzip Worker] No content extracted for article: ${articleFolder}`,
            );
            filesSkipped += articleFiles.length;
            continue;
          }

          // Merge all pieces into single markdown
          const mergedContent = mergeTAArticleContent(pieces);
          const articleId = getTAArticleId(articleFolder);

          // Build output path: replace article folder with single .md file
          // e.g., "en_ta-v87/translate/figs-metaphor" -> "en_ta-v87/translate/figs-metaphor.md"
          const cleanArticleFolder = articleFolder.replace(/^(\.\/|\/)+/, "");
          const outputKey = `${key}/files/${cleanArticleFolder}.md`;

          // Write merged article to R2
          await env.SOURCE_BUCKET.put(outputKey, mergedContent, {
            httpMetadata: { contentType: "text/markdown; charset=utf-8" },
            customMetadata: {
              zip_key: key,
              article_id: articleId,
              merged_from: articleFiles.length.toString(),
              original_paths: sortedFiles.join(","),
            },
          });

          articlesMerged++;
          filesExtracted++; // Count each merged article as one extracted file

          // Log progress every 10 articles
          if (articlesMerged % 10 === 0) {
            console.log(
              `[Unzip Worker] Merged ${articlesMerged}/${articleGroups.size} TA articles...`,
            );
          }
        } catch (err) {
          const errorMsg = `Failed to merge article ${articleFolder}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[Unzip Worker] ${errorMsg}`);
          errors.push(errorMsg);
          filesSkipped += articleFiles.length;
        }
      }

      // Process remaining non-TA files normally (e.g., manifest.yaml, toc.yaml)
      const nonTAFiles = indexableFiles.filter((f) => !taArticleFiles.has(f));
      for (const filePath of nonTAFiles) {
        try {
          const content = extractSingleFile(zipBuffer, filePath);

          if (!content) {
            console.warn(`[Unzip Worker] Could not extract file: ${filePath}`);
            filesSkipped++;
            continue;
          }

          const cleanPath = filePath.replace(/^(\.\/|\/)+/, "");
          const outputKey = `${key}/files/${cleanPath}`;

          const ext = cleanPath.toLowerCase();
          const contentType = ext.endsWith(".md")
            ? "text/markdown; charset=utf-8"
            : ext.endsWith(".tsv")
              ? "text/tab-separated-values; charset=utf-8"
              : ext.endsWith(".json")
                ? "application/json; charset=utf-8"
                : "text/plain; charset=utf-8";

          await env.SOURCE_BUCKET.put(outputKey, content, {
            httpMetadata: { contentType },
            customMetadata: {
              zip_key: key,
              original_path: filePath,
            },
          });

          filesExtracted++;
        } catch (err) {
          const errorMsg = `Failed to extract ${filePath}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[Unzip Worker] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(
        `[Unzip Worker] TA Completed: ${articlesMerged} articles merged, ${filesExtracted} total files, ${filesSkipped} skipped, ${errors.length} errors`,
      );
    } else {
      // Non-TA resource: extract and write files one at a time (original behavior)
      for (const filePath of indexableFiles) {
        try {
          // Extract single file (memory efficient)
          const content = extractSingleFile(zipBuffer, filePath);

          if (!content) {
            console.warn(`[Unzip Worker] Could not extract file: ${filePath}`);
            filesSkipped++;
            continue;
          }

          // Build R2 key for extracted file: {zipKey}/files/{filePath}
          // This matches the format used by ZipResourceFetcher2.extractFileFromZip()
          const cleanPath = filePath.replace(/^(\.\/|\/)+/, "");
          const outputKey = `${key}/files/${cleanPath}`;

          // Determine content type
          const ext = cleanPath.toLowerCase();
          const contentType = ext.endsWith(".md")
            ? "text/markdown; charset=utf-8"
            : ext.endsWith(".tsv")
              ? "text/tab-separated-values; charset=utf-8"
              : ext.endsWith(".json")
                ? "application/json; charset=utf-8"
                : "text/plain; charset=utf-8";

          // Write to R2 - this triggers the Index Worker via R2 event notification
          await env.SOURCE_BUCKET.put(outputKey, content, {
            httpMetadata: { contentType },
            customMetadata: {
              zip_key: key,
              original_path: filePath,
            },
          });

          filesExtracted++;

          // Log progress every 10 files
          if (filesExtracted % 10 === 0) {
            console.log(
              `[Unzip Worker] Extracted ${filesExtracted}/${indexableFiles.length} files...`,
            );
          }
        } catch (err) {
          const errorMsg = `Failed to extract ${filePath}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[Unzip Worker] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(
        `[Unzip Worker] Completed: ${filesExtracted} extracted, ${filesSkipped} skipped, ${errors.length} errors`,
      );
    }

    return {
      zipKey: key,
      filesExtracted,
      filesSkipped,
      articlesMerged,
      errors,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(errorMsg);
    console.error(`[Unzip Worker] Error processing ${key}: ${errorMsg}`);

    return {
      zipKey: key,
      filesExtracted,
      filesSkipped,
      articlesMerged,
      errors,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Process a batch of ZIP file messages
 * Called by the main pipeline router
 */
export async function processZipFiles(
  messages: Message<R2EventNotification>[],
  env: Env,
): Promise<void> {
  console.log(`[Unzip Worker] Processing ${messages.length} ZIP files`);

  const results: UnzipResult[] = [];

  for (const message of messages) {
    const notification = message.body;

    // Only process .zip files
    if (!notification.object.key.endsWith(".zip")) {
      console.log(
        `[Unzip Worker] Skipping non-ZIP: ${notification.object.key}`,
      );
      message.ack();
      continue;
    }

    try {
      const result = await processZipFile(env, notification);
      results.push(result);

      if (result.errors.length === 0) {
        message.ack();
      } else if (result.filesExtracted > 0) {
        // Partial success - ack but log errors
        console.warn(
          `[Unzip Worker] Partial success for ${result.zipKey}: ${result.errors.length} errors`,
        );
        message.ack();
      } else {
        // Complete failure - let it retry
        console.error(
          `[Unzip Worker] Complete failure for ${result.zipKey}, retrying`,
        );
        message.retry();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Unzip Worker] FATAL ERROR processing ${notification.object.key}: ${errorMsg}`,
      );
      message.retry();
    }
  }

  // Log summary
  const totalExtracted = results.reduce((sum, r) => sum + r.filesExtracted, 0);
  const totalMerged = results.reduce((sum, r) => sum + r.articlesMerged, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`[Unzip Worker] Complete:`, {
    processed: messages.length,
    totalFilesExtracted: totalExtracted,
    totalArticlesMerged: totalMerged,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalDurationMs: totalDuration,
  });
}
