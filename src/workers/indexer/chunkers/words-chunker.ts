/**
 * Translation Words Chunker (Article-Level with Roll-Up)
 *
 * Processes Translation Words ZIP files and generates ONE chunk per word/term.
 * Rolls up multi-file articles (01.md, 02.md, etc.) into single files.
 *
 * Output format:
 * ```markdown
 * # Grace
 *
 * Grace is God's unmerited favor toward sinners...
 *
 * ## Definition
 * ...
 *
 * ## Related Terms
 * - mercy
 * - forgiveness
 * ```
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationWordsMetadata,
} from "../types.js";
import { extractAllFiles, ExtractedFile } from "../utils/zip-handler.js";

/**
 * Parsed word article
 */
interface ParsedArticle {
  id: string;
  title: string;
  category: "kt" | "names" | "other";
  content: string;
  related: string[];
  bibleReferences: string[];
}

/**
 * Extract category from file path
 * Paths like: bible/kt/grace.md, bible/names/paul.md, bible/other/tax.md
 */
function extractCategory(path: string): "kt" | "names" | "other" {
  if (path.includes("/kt/")) return "kt";
  if (path.includes("/names/")) return "names";
  return "other";
}

/**
 * Extract article folder ID from file path
 * e.g., bible/kt/grace/01.md -> grace
 * e.g., bible/kt/grace.md -> grace
 */
function extractArticleFolder(path: string): string {
  // Remove file extension
  const withoutExt = path.replace(/\.md$/i, "");

  // Split path
  const parts = withoutExt.split("/");

  // Check if last part is numeric (multi-file article)
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    // Multi-file: bible/kt/grace/01 -> grace
    return parts[parts.length - 2] || lastPart;
  }

  // Single file: bible/kt/grace -> grace
  return lastPart;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : "";
}

/**
 * Extract related terms (usually in "See also" section)
 */
function extractRelated(content: string): string[] {
  const related: string[] = [];
  const seeAlsoMatch = content.match(
    /##?\s*See\s+also[:\s]*\n([\s\S]*?)(?=\n##|\n$|$)/i,
  );

  if (seeAlsoMatch) {
    const seeAlsoContent = seeAlsoMatch[1];
    // Find markdown links
    const linkMatches = seeAlsoContent.matchAll(/\[([^\]]+)\]\([^)]+\)/g);
    for (const match of linkMatches) {
      if (!related.includes(match[1])) {
        related.push(match[1]);
      }
    }
    // Find plain list items
    const listMatches = seeAlsoContent.matchAll(/^\s*\*\s+(.+)$/gm);
    for (const match of listMatches) {
      const item = match[1].trim();
      if (!item.includes("[") && !related.includes(item)) {
        related.push(item);
      }
    }
  }

  return related;
}

/**
 * Extract Bible references
 */
function extractBibleReferences(content: string): string[] {
  const references: string[] = [];
  const refMatch = content.match(
    /##?\s*Bible\s+References?[:\s]*\n([\s\S]*?)(?=\n##|\n$|$)/i,
  );

  if (refMatch) {
    const refContent = refMatch[1];
    const listMatches = refContent.matchAll(/^\s*\*\s+(.+)$/gm);
    for (const match of listMatches) {
      references.push(match[1].trim());
    }
  }

  return references;
}

/**
 * Clean article content - keep it but don't strip sections
 * We want the full content for search
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

  // Get category from first file
  const category = extractCategory(sortedFiles[0].path);

  // Extract title from first file (should have the main heading)
  let title = extractTitle(combinedContent);
  if (!title) {
    // Fallback to article ID with first letter capitalized
    title = articleId.charAt(0).toUpperCase() + articleId.slice(1);
  }

  // Extract related terms and references
  const related = extractRelated(combinedContent);
  const bibleReferences = extractBibleReferences(combinedContent);

  return {
    id: articleId,
    title,
    category,
    content: cleanContent(combinedContent),
    related,
    bibleReferences,
  };
}

/**
 * Process a Translation Words ZIP file and generate article-level chunks
 */
export async function processTranslationWords(
  zipBuffer: ArrayBuffer,
  parsed: ParsedZipKey,
  _env: Env,
): Promise<IndexChunk[]> {
  const chunks: IndexChunk[] = [];
  const files = extractAllFiles(zipBuffer);

  console.log(`[Words Chunker] Processing ${files.length} files from ZIP`);

  // Find markdown files in bible/ folder
  const mdFiles = files.filter(
    (f) => f.path.endsWith(".md") && f.path.includes("/bible/"),
  );

  console.log(`[Words Chunker] Found ${mdFiles.length} markdown files`);

  // Group files by article folder (to roll up multi-file articles)
  const articleFiles = new Map<string, ExtractedFile[]>();

  for (const file of mdFiles) {
    // Skip index/intro files
    if (
      file.path.includes("index.md") ||
      file.path.includes("intro.md") ||
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

  console.log(`[Words Chunker] Found ${articleFiles.size} unique articles`);

  for (const [articleId, files] of articleFiles) {
    const article = parseArticle(articleId, files);

    // Skip empty articles
    if (!article.content || article.content.length < 10) {
      console.log(`[Words Chunker] Skipping empty article: ${articleId}`);
      continue;
    }

    const metadata: TranslationWordsMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: "tw",
      resource_name: "Translation Words",
      version: parsed.version,
      chunk_level: "article",
      indexed_at: new Date().toISOString(),
      article_id: article.id,
      category: article.category,
      title: article.title,
      related: article.related.length > 0 ? article.related : undefined,
      bible_references:
        article.bibleReferences.length > 0
          ? article.bibleReferences
          : undefined,
    };

    // Create chunk path: lang/org/tw/version/category/articleId.md
    const chunkPath = `${parsed.language}/${parsed.organization}/tw/${parsed.version}/${article.category}/${article.id}.md`;

    chunks.push({
      path: chunkPath,
      content: article.content,
      metadata,
    });
  }

  console.log(`[Words Chunker] Generated ${chunks.length} article chunks`);
  return chunks;
}
