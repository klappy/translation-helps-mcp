/**
 * Translation Academy Chunker
 *
 * Processes Translation Academy ZIP files and generates two-level chunks:
 * - Section level: Individual sections (## headers) for precise lookups
 * - Article level: Full articles with summaries for broader context
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationAcademyMetadata,
} from "../types.js";
import { extractAllFiles } from "../utils/zip-handler.js";

/**
 * Parsed section from an article
 */
interface ParsedSection {
  number: number;
  title: string;
  content: string;
}

/**
 * Parsed academy article
 */
interface ParsedArticle {
  id: string;
  title: string;
  fullContent: string;
  sections: ParsedSection[];
  summary: string;
}

/**
 * Extract article ID from file path
 * Paths like: translate/figs-metaphor/01.md or checking/accuracy/01.md
 */
function extractArticleId(path: string): string {
  // Get the folder name as article ID
  const parts = path.split("/");
  // Find the folder that's not translate/checking/process/intro and not a number
  for (let i = parts.length - 2; i >= 0; i--) {
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
 * Parse markdown content into sections
 */
function parseArticleSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Split by ## headers
  const parts = content.split(/^##\s+/m);

  // First part is intro (before any ## header)
  if (parts[0].trim()) {
    sections.push({
      number: 0,
      title: "Introduction",
      content: parts[0].trim(),
    });
  }

  // Process each section
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const newlineIndex = part.indexOf("\n");

    if (newlineIndex === -1) {
      // Section header with no content
      sections.push({
        number: i,
        title: part.trim(),
        content: "",
      });
    } else {
      const title = part.slice(0, newlineIndex).trim();
      const sectionContent = part.slice(newlineIndex + 1).trim();

      sections.push({
        number: i,
        title,
        content: sectionContent,
      });
    }
  }

  return sections;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : "Untitled";
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
 * Parse a full article
 */
function parseArticle(path: string, content: string): ParsedArticle {
  const id = extractArticleId(path);
  const title = extractTitle(content);
  const sections = parseArticleSections(content);
  const summary = generateSummary(content);

  return {
    id,
    title,
    fullContent: content,
    sections,
    summary,
  };
}

/**
 * Process a Translation Academy ZIP file and generate chunks
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

  // Group files by article (folder)
  const articleFiles = new Map<string, typeof mdFiles>();

  for (const file of mdFiles) {
    // Skip table of contents and index files
    if (
      file.path.includes("toc.md") ||
      file.path.includes("index.md") ||
      file.path.endsWith("/README.md")
    ) {
      continue;
    }

    const articleId = extractArticleId(file.path);
    if (!articleFiles.has(articleId)) {
      articleFiles.set(articleId, []);
    }
    articleFiles.get(articleId)!.push(file);
  }

  console.log(`[Academy Chunker] Found ${articleFiles.size} articles`);

  for (const [articleId, files] of articleFiles) {
    // Combine all files for this article
    const combinedContent = files
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => f.content)
      .join("\n\n");

    const article = parseArticle(files[0].path, combinedContent);

    const basePath = `${parsed.language}/${parsed.organization}/ta/${parsed.version}/${articleId}`;

    // Generate section-level chunks
    for (const section of article.sections) {
      if (!section.content) continue;

      const sectionMetadata: TranslationAcademyMetadata = {
        language: parsed.language,
        language_name: parsed.language === "en" ? "English" : parsed.language,
        organization: parsed.organization,
        resource: "ta",
        resource_name: "Translation Academy",
        version: parsed.version,
        chunk_level: "section",
        indexed_at: new Date().toISOString(),
        article_id: articleId,
        article_title: article.title,
        section: section.number,
        section_title: section.title,
        total_sections: article.sections.length,
      };

      // Create safe filename from section title
      const safeTitle = section.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);

      chunks.push({
        path: `${basePath}/${section.number}-${safeTitle || "section"}.md`,
        content: section.content,
        metadata: sectionMetadata,
      });
    }

    // Generate article-level chunk (full content)
    const articleMetadata: TranslationAcademyMetadata = {
      language: parsed.language,
      language_name: parsed.language === "en" ? "English" : parsed.language,
      organization: parsed.organization,
      resource: "ta",
      resource_name: "Translation Academy",
      version: parsed.version,
      chunk_level: "article",
      indexed_at: new Date().toISOString(),
      article_id: articleId,
      article_title: article.title,
      total_sections: article.sections.length,
      summary: article.summary,
    };

    chunks.push({
      path: `${basePath}/_full.md`,
      content: article.fullContent,
      metadata: articleMetadata,
    });
  }

  console.log(`[Academy Chunker] Generated ${chunks.length} total chunks`);
  return chunks;
}
