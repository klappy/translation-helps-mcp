/**
 * Tool handler for browsing available translation word articles
 * Allows the LLM to see what translation words are available in a repository
 */

import { DCSApiClient } from "../services/DCSApiClient.js";
import { logger } from "../utils/logger.js";

interface BrowseTranslationWordsParams {
  language: string;
  category?: string;
  organization?: string;
}

interface TranslationWordEntry {
  path: string;
  name: string;
  category: string;
}

export async function handleBrowseTranslationWords(
  params: BrowseTranslationWordsParams,
): Promise<{ content: TranslationWordEntry[] }> {
  const client = new DCSApiClient();
  const organization = params.organization || "unfoldingWord";
  const language = params.language || "en";

  logger.info("Browsing translation words", {
    language,
    organization,
    category: params.category,
  });

  try {
    // Translation words are typically in repositories like "en_tw" (English Translation Words)
    const repoName = `${language}_tw`;

    // Get the repository contents
    const response = await client.getRepositoryContents(organization, repoName);

    if (!response.success || !response.data) {
      logger.warn("Failed to get repository contents", {
        organization,
        repo: repoName,
        error: response.error,
      });
      return { content: [] };
    }

    const entries: TranslationWordEntry[] = [];

    // Process the directory listing
    for (const item of response.data) {
      // Skip non-directories and special files
      if (item.type !== "dir" || item.name.startsWith(".")) {
        continue;
      }

      // If category filter is specified, only include matching categories
      if (params.category && item.name !== params.category) {
        continue;
      }

      // Get contents of the category directory
      const categoryResponse = await client.getRepositoryContents(
        organization,
        repoName,
        item.path,
      );

      if (categoryResponse.success && categoryResponse.data) {
        for (const file of categoryResponse.data) {
          // Only include markdown files
          if (file.type === "file" && file.name.endsWith(".md")) {
            entries.push({
              path: file.path,
              name: file.name.replace(".md", ""),
              category: item.name,
            });
          }
        }
      }
    }

    logger.info("Found translation word entries", { count: entries.length });

    return {
      content: entries,
    };
  } catch (error) {
    logger.error("Error browsing translation words", { error });
    throw error;
  }
}
