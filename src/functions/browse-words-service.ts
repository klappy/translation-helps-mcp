/**
 * Browse Words Service
 * Shared core implementation for browsing translation words
 * Used by both Netlify functions and MCP tools for consistency
 */

import { logger } from "../utils/logger.js";

export interface BrowseWordsOptions {
  language?: string;
  organization?: string;
  category?: string;
  search?: string;
  limit?: number;
}

export interface WordSummary {
  id: string;
  title: string;
  category: string;
  path: string;
}

export interface BrowseWordsResult {
  words: WordSummary[];
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    wordsFound: number;
    category?: string;
    search?: string;
  };
}

/**
 * Core browse words logic
 */
export async function browseWords(options: BrowseWordsOptions): Promise<BrowseWordsResult> {
  const startTime = Date.now();
  const {
    language = "en",
    organization = "unfoldingWord",
    category,
    search,
    limit = 100,
  } = options;

  logger.info(`Browse words called`, {
    language,
    organization,
    category,
    search,
    limit,
  });

  logger.info(`Browse words fresh request`);

  // Search catalog for Translation Words
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Words&lang=${language}&owner=${organization}`;
  logger.debug(`Searching catalog`, { catalogUrl });

  const catalogResponse = await fetch(catalogUrl);
  if (!catalogResponse.ok) {
    logger.error(`Catalog search failed`, { status: catalogResponse.status });
    throw new Error(`Failed to search catalog: ${catalogResponse.status}`);
  }

  const catalogData = (await catalogResponse.json()) as {
    data?: Array<{
      name: string;
      title: string;
    }>;
  };

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No translation words found for ${language}/${organization}`);
  }

  const resource = catalogData.data[0];
  const words: WordSummary[] = [];

  // Categories to browse
  const categories = category ? [category] : ["kt", "names", "other"];

  for (const cat of categories) {
    try {
      // Get file listing for this category
      const categoryUrl = `https://git.door43.org/api/v1/repos/${organization}/${resource.name}/contents/bible/${cat}`;
      const categoryResponse = await fetch(categoryUrl);

      if (categoryResponse.ok) {
        const files = (await categoryResponse.json()) as Array<{
          name: string;
          path: string;
          type: string;
        }>;

        for (const file of files) {
          if (file.type === "file" && file.name.endsWith(".md")) {
            const id = file.name.replace(".md", "");

            // Apply search filter if provided
            if (search && !id.toLowerCase().includes(search.toLowerCase())) {
              continue;
            }

            words.push({
              id,
              title: id.charAt(0).toUpperCase() + id.slice(1),
              category: cat,
              path: file.path,
            });

            // Apply limit
            if (words.length >= limit) {
              break;
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to browse category`, {
        category: cat,
        error: String(error),
      });
    }

    if (words.length >= limit) {
      break;
    }
  }

  logger.info(`Browse words: found`, { count: words.length });

  const result: BrowseWordsResult = {
    words,
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      wordsFound: words.length,
      category,
      search,
    },
  };

  // Do not cache transformed responses

  return result;
}
