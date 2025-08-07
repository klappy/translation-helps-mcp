/**
 * Platform-agnostic Get Translation Word Handler - SIMPLIFIED VERSION
 * Fetches actual translation word article content from DCS
 */

import { logger } from "../../utils/logger.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";

interface TranslationWordArticle {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  url?: string;
}

export const getTranslationWordHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    // Use 'word' parameter as per user preference, fallback to 'term'
    const word =
      request.queryStringParameters.word || request.queryStringParameters.term;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";

    if (!word) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Missing required parameter: 'word'",
          code: "MISSING_PARAMETER",
          message:
            "Please provide a word to look up. Example: ?word=love&language=en",
          validEndpoints: [
            "/api/list-available-resources - Find available organizations/languages",
            "/api/browse-translation-words - Browse available words",
          ],
        }),
      };
    }

    logger.info("Fetching translation word article", {
      word,
      language,
      organization,
    });

    // Normalize the word for file lookup
    const normalizedWord = word.toLowerCase().replace(/\s+/g, "");

    // Build the base URL for translation words repository
    const repoName = `${language}_tw`;
    const baseUrl = `https://git.door43.org/${organization}/${repoName}/raw/branch/master`;

    // Common categories where translation words are stored
    const categories = ["kt", "names", "other"];
    let articleContent = null;
    let foundCategory = null;
    let foundUrl = null;

    // Try each category and path pattern
    for (const category of categories) {
      const paths = [
        `bible/${category}/${normalizedWord}.md`,
        `bible/${category}/${normalizedWord}/01.md`,
      ];

      for (const path of paths) {
        const url = `${baseUrl}/${path}`;

        try {
          logger.debug("Trying URL", { url });
          const response = await fetch(url);

          if (response.ok) {
            articleContent = await response.text();
            foundCategory = category;
            foundUrl = url;
            logger.info("Found article", { url, category });
            break;
          }
        } catch {
          // Continue to next path
          logger.debug("Failed to fetch", { url, error: err });
        }
      }

      if (articleContent) break;
    }

    if (!articleContent) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: `Translation word article not found for '${word}'`,
          code: "WORD_NOT_FOUND",
          message:
            "The word article could not be found. Please check the spelling or browse available words.",
          suggestions: [
            "Check if the word is spelled correctly",
            "Try the singular form if it's plural",
            "Use /api/browse-translation-words to see available words",
            "Use /api/fetch-translation-word-links to find words for a verse",
          ],
          triedCategories: categories,
          language,
          organization,
        }),
      };
    }

    // Check for additional content files (01.md, 02.md, etc.) if main file is a directory structure
    let fullContent = articleContent;
    let subtitle = "";

    // If we found the main .md file, check if there's a directory with additional content
    if (foundUrl && foundUrl.endsWith(".md")) {
      // Try to fetch subtitle and numbered sections
      const basePath = foundUrl.replace(/\.md$/, "");

      try {
        // Try subtitle
        const subtitleUrl = `${basePath}/sub.md`;
        const subtitleResponse = await fetch(subtitleUrl);
        if (subtitleResponse.ok) {
          subtitle = await subtitleResponse.text();
          logger.info("Found subtitle", { url: subtitleUrl });
        }
      } catch {
        // No subtitle, that's okay
      }

      // Try numbered sections (01.md, 02.md, etc.)
      const sections: string[] = [];
      for (let i = 1; i <= 10; i++) {
        try {
          const sectionNum = i.toString().padStart(2, "0");
          const sectionUrl = `${basePath}/${sectionNum}.md`;
          const sectionResponse = await fetch(sectionUrl);

          if (sectionResponse.ok) {
            const sectionContent = await sectionResponse.text();
            sections.push(sectionContent);
            logger.info("Found section", {
              url: sectionUrl,
              section: sectionNum,
            });
          } else {
            // No more sections
            break;
          }
        } catch {
          break;
        }
      }

      // If we found sections, use them as the main content
      if (sections.length > 0) {
        fullContent = sections.join("\n\n");
      }
    }

    // Parse the markdown content
    const article = parseTranslationWordArticle(
      fullContent,
      word,
      foundCategory!,
      subtitle,
    );

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=7200", // Cache for 2 hours
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        word: {
          ...article,
          url: foundUrl,
        },
        metadata: {
          language,
          organization,
          category: foundCategory,
          responseTime: duration,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    logger.error("Get Translation Word API Error:", error);
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message:
          "An error occurred while fetching the translation word. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

/**
 * Parse markdown content into structured article
 */
function parseTranslationWordArticle(
  content: string,
  word: string,
  category: string,
  subtitle?: string,
): TranslationWordArticle {
  // Extract title from first heading (skip YAML frontmatter if present)
  let title = word;
  const lines = content.split("\n");
  let inFrontMatter = false;
  const contentWithoutFrontMatter = [];

  for (const line of lines) {
    if (line.trim() === "---") {
      inFrontMatter = !inFrontMatter;
      continue;
    }
    if (!inFrontMatter) {
      contentWithoutFrontMatter.push(line);
    }
  }

  const cleanContent = contentWithoutFrontMatter.join("\n");
  const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1];
  }

  return {
    id: word.toLowerCase().replace(/\s+/g, "-"),
    title,
    subtitle: subtitle ? subtitle.trim() : undefined,
    content: cleanContent,
    category,
  };
}
