/**
 * Tool handler for getting a specific translation word article
 * Retrieves the content of a translation word article by term or path
 */

import { DCSApiClient } from "../services/DCSApiClient.js";
import { logger } from "../utils/logger.js";

interface GetTranslationWordParams {
  term?: string;
  path?: string;
  language?: string;
  organization?: string;
}

interface TranslationWordContent {
  term: string;
  path: string;
  content: string;
  category?: string;
}

export async function handleGetTranslationWord(
  params: GetTranslationWordParams
): Promise<{ content: TranslationWordContent[] }> {
  const client = new DCSApiClient();
  const organization = params.organization || "unfoldingWord";
  const language = params.language || "en";

  logger.info("Getting translation word", {
    term: params.term,
    path: params.path,
    language,
    organization,
  });

  try {
    const repoName = `${language}_tw`;
    const results: TranslationWordContent[] = [];

    if (params.path) {
      // Direct path provided
      const response = await client.getRawFileContent(organization, repoName, params.path);

      if (response.success && response.data) {
        const pathParts = params.path.split("/");
        const category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : undefined;
        const term = pathParts[pathParts.length - 1].replace(".md", "");

        results.push({
          term,
          path: params.path,
          content: response.data,
          category,
        });
      }
    } else if (params.term) {
      // Search for the term
      const term = params.term.toLowerCase();

      // Try common paths based on term structure
      const possiblePaths: string[] = [];

      // Try first letter directory pattern (e.g., "grace" -> "g/grace.md")
      const firstLetter = term[0];
      possiblePaths.push(`bible/other/${firstLetter}/${term}.md`);
      possiblePaths.push(`bible/kt/${firstLetter}/${term}.md`);
      possiblePaths.push(`bible/names/${firstLetter}/${term}.md`);

      // Also try direct lookup in common categories
      possiblePaths.push(`bible/other/${term}.md`);
      possiblePaths.push(`bible/kt/${term}.md`);
      possiblePaths.push(`bible/names/${term}.md`);

      // Try each possible path
      for (const path of possiblePaths) {
        try {
          const response = await client.getRawFileContent(organization, repoName, path);

          if (response.success && response.data) {
            const pathParts = path.split("/");
            const category = pathParts[1]; // bible/kt/... -> kt

            results.push({
              term,
              path,
              content: response.data,
              category,
            });

            // Found the term, no need to continue searching
            break;
          }
        } catch (error) {
          // Path doesn't exist, try next one
          logger.debug("Path not found", { path });
        }
      }

      // If still not found, try browsing and finding it
      if (results.length === 0) {
        logger.info("Term not found in common locations, browsing repository");

        // Get all categories
        const browseResponse = await client.getRepositoryContents(organization, repoName, "bible");

        if (browseResponse.success && browseResponse.data) {
          for (const category of browseResponse.data) {
            if (category.type !== "dir") continue;

            // Check each category for the term
            const categoryPath = `bible/${category.name}`;

            // First check if there's a direct file
            const directPath = `${categoryPath}/${term}.md`;
            try {
              const response = await client.getRawFileContent(organization, repoName, directPath);

              if (response.success && response.data) {
                results.push({
                  term,
                  path: directPath,
                  content: response.data,
                  category: category.name,
                });
                break;
              }
            } catch (error) {
              // Not found directly, check subdirectories
              const subDirResponse = await client.getRepositoryContents(
                organization,
                repoName,
                categoryPath
              );

              if (subDirResponse.success && subDirResponse.data) {
                for (const subDir of subDirResponse.data) {
                  if (subDir.type === "dir" && subDir.name === firstLetter) {
                    // Check in the first letter subdirectory
                    const letterPath = `${categoryPath}/${firstLetter}/${term}.md`;
                    try {
                      const response = await client.getRawFileContent(
                        organization,
                        repoName,
                        letterPath
                      );

                      if (response.success && response.data) {
                        results.push({
                          term,
                          path: letterPath,
                          content: response.data,
                          category: category.name,
                        });
                        break;
                      }
                    } catch (error) {
                      // Not found here either
                    }
                  }
                }
              }
            }

            if (results.length > 0) break;
          }
        }
      }
    } else {
      throw new Error("Either 'term' or 'path' parameter is required");
    }

    logger.info("Found translation word articles", { count: results.length });

    return {
      content: results,
    };
  } catch (error) {
    logger.error("Error getting translation word", { error });
    throw error;
  }
}
