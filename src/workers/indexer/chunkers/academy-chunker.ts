/**
 * Translation Academy Chunker (Article-Level Only)
 *
 * Processes Translation Academy ZIP files and generates ONE chunk per article.
 * Rolls up multi-file articles (01.md, 02.md, etc.) into single files.
 * No section-level chunking - just full articles for broader context.
 *
 * Output format:
 * ```markdown
 * # Metaphor
 *
 * A metaphor is a figure of speech in which one thing represents another...
 *
 * ## Description
 * ...
 *
 * ## Examples
 * ...
 * ```
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationAcademyMetadata,
} from "../types.js";
import { extractAllFiles, type ExtractedFile } from "../utils/zip-handler.js";

/**
 * Parsed academy article
 */
interface ParsedArticle {
  id: string;
  title: string;
  content: string;
  sectionCount: number;
  summary: string;
}

/**
 * Extract article folder ID from file path
 * Paths like: translate/figs-metaphor/01.md or checking/accuracy/01.md
 */
function extractArticleFolder(path: string): string {
  // Remove file extension
  const withoutExt = path.replace(/\.md$/i, "");

  // Split path
  const parts = withoutExt.split("/");

  // Find the article folder (not translate/checking/process/intro and not numeric)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (
      part &&
      !["translate", "checking", "process", "intro"].includes(part) &&
      !/^\d+$/.test(part)
    ) {
      return part;
    }
  }

  return parts[parts.length - 2] || "unknown";
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : "";
}

/**
 * Count sections (## headers) in content
 */
function countSections(content: string): number {
  const matches = content.match(/^##\s+/gm);
  return matches ? matches.length : 0;
}

/**
 * Generate a summary from the article content
 * Takes the first paragraph or ~200 characters
 */
function generateSummary(content: string): string {
  // Remove title
  const text = content.replace(/^#\s+.+$/m, "").trim();

  // Get first paragraph
  const paragraphs = text.split(/\n\n+/);
  let summary = paragraphs[0] || "";

  // Clean up markdown
  summary = summary.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  summary = summary.replace(/[*_`#]/g, "");
  summary = summary.trim();

  // Truncate if too long
  if (summary.length > 200) {
    summary = summary.slice(0, 197) + "...";
  }

  return summary;
}

/**
 * Clean article content
 */
function cleanContent(content: string): string {
  // Convert markdown links to plain text with context
  let cleaned = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Remove rc:// links
  cleaned = cleaned.replace(/rc:\/\/[^\s)]+/g, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Parse and combine article files into a single article
 */
function parseArticle(
  articleId: string,
  files: ExtractedFile[],
): ParsedArticle {
  // Sort files by path to ensure correct order (01.md, 02.md, etc.)
  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));

  // Combine content
  const combinedContent = sortedFiles.map((f) => f.content).join("\n\n");

  // Extract title from combined content
  let title = extractTitle(combinedContent);
  if (!title) {
    // Convert article ID to title format (figs-metaphor -> Figures of Speech - Metaphor)
    title = articleId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Count sections
  const sectionCount = countSections(combinedContent);

  // Generate summary
  const summary = generateSummary(combinedContent);

  return {
    id: articleId,
    title,
    content: cleanContent(combinedContent),
    sectionCount,
    summary,
  };
}

/**
 * Process a Translation Academy ZIP file and generate article-level chunks
 */
export async function processTranslationAcademy(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Academy Chunker] Processing ${files.length} files from ZIP`);

  // Find markdown files
  const mdFiles = files.filter((f) => f.path.endsWith(".md"));

  console.log(`[Academy Chunker] Found ${mdFiles.length} markdown files`);

  // Group files by article folder (to roll up multi-file articles)
  const articleFiles = new Map<string, ExtractedFile[]>();

  for (const file of mdFiles) {
    // Skip table of contents and index files
    if (
      file.path.includes("toc.md") ||
      file.path.includes("index.md") ||
      file.path.endsWith("/README.md")
    ) {
      continue;
    }

    const articleId = extractArticleFolder(file.path);
    if (!articleFiles.has(articleId)) {
      articleFiles.set(articleId, []);
    }
    articleFiles.get(articleId)!.push(file);
  }

  console.log(`[Academy Chunker] Found ${articleFiles.size} unique articles`);

  for (const [articleId, files] of articleFiles) {
    const article = parseArticle(articleId, files);

    // Skip empty articles
    if (!article.content || article.content.length < 10) {
      console.log(`[Academy Chunker] Skipping empty article: ${articleId}`);
      continue;
    }

    const metadata: TranslationAcademyMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: "ta",
      resource_name: "Translation Academy",
      version: parsed.version,
      chunk_level: "article",
      indexed_at: new Date().toISOString(),
      article_id: article.id,
      article_title: article.title,
      section_count:
        article.sectionCount > 0 ? article.sectionCount : undefined,
      summary: article.summary || undefined,
    };

    // Create chunk path: lang/org/ta/version/articleId.md
    const chunkPath = `${parsed.language}/${parsed.organization}/ta/${parsed.version}/${article.id}.md`;

    chunks.push({
      path: chunkPath,
      content: article.content,
      metadata,
    });
  }

  console.log(`[Academy Chunker] Generated ${chunks.length} article chunks`);
  return chunks;
}
