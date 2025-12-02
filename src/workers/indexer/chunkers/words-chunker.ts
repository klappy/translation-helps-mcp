/**
 * Translation Words Chunker
 *
 * Processes Translation Words ZIP files and generates article-level chunks.
 * Each word/term definition is stored as a separate .md file.
 */

import type {
  Env,
  ParsedZipKey,
  IndexChunk,
  TranslationWordsMetadata,
} from "../types.js";
import { extractAllFiles } from "../utils/zip-handler.js";

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
 * Extract article ID from file path
 * e.g., bible/kt/grace.md -> grace
 */
function extractArticleId(path: string): string {
  const match = path.match(/\/([^/]+)\.md$/i);
  return match ? match[1] : path;
}

/**
 * Parse markdown content to extract article info
 */
function parseArticle(path: string, content: string): ParsedArticle {
  const category = extractCategory(path);
  const id = extractArticleId(path);

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : id;

  // Extract related terms (usually in "See also" section)
  const related: string[] = [];
  const seeAlsoMatch = content.match(
    /##?\s*See\s+also[:\s]*\n([\s\S]*?)(?=\n##|\n$|$)/i,
  );
  if (seeAlsoMatch) {
    const seeAlsoContent = seeAlsoMatch[1];
    // Find markdown links
    const linkMatches = seeAlsoContent.matchAll(/\[([^\]]+)\]\([^)]+\)/g);
    for (const match of linkMatches) {
      related.push(match[1]);
    }
    // Find plain list items
    const listMatches = seeAlsoContent.matchAll(/^\s*\*\s+(.+)$/gm);
    for (const match of listMatches) {
      if (!match[1].includes("[")) {
        related.push(match[1].trim());
      }
    }
  }

  // Extract Bible references
  const bibleReferences: string[] = [];
  const refMatch = content.match(
    /##?\s*Bible\s+References?[:\s]*\n([\s\S]*?)(?=\n##|\n$|$)/i,
  );
  if (refMatch) {
    const refContent = refMatch[1];
    // Find references in list format
    const listMatches = refContent.matchAll(/^\s*\*\s+(.+)$/gm);
    for (const match of listMatches) {
      bibleReferences.push(match[1].trim());
    }
  }

  // Clean content - remove the "See also" and "Bible References" sections for main content
  let cleanContent = content;
  cleanContent = cleanContent.replace(
    /##?\s*See\s+also[:\s]*\n[\s\S]*?(?=\n##|\n$|$)/gi,
    "",
  );
  cleanContent = cleanContent.replace(
    /##?\s*Bible\s+References?[:\s]*\n[\s\S]*?(?=\n##|\n$|$)/gi,
    "",
  );
  cleanContent = cleanContent.trim();

  return {
    id,
    title,
    category,
    content: cleanContent,
    related,
    bibleReferences,
  };
}

/**
 * Process a Translation Words ZIP file and generate chunks
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

  console.log(`[Words Chunker] Found ${mdFiles.length} word articles`);

  for (const file of mdFiles) {
    // Skip index/intro files
    if (file.path.includes("index.md") || file.path.includes("intro.md")) {
      continue;
    }

    const article = parseArticle(file.path, file.content);

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

    const basePath = `${parsed.language}/${parsed.organization}/tw/${parsed.version}/${article.category}`;

    chunks.push({
      path: `${basePath}/${article.id}.md`,
      content: article.content,
      metadata,
    });
  }

  console.log(`[Words Chunker] Generated ${chunks.length} total chunks`);
  return chunks;
}
