import { Handler } from "@netlify/functions";
import { DCSApiClient } from "../../src/services/DCSApiClient.js";
import { logger } from "../../src/utils/logger.js";

interface TranslationWordEntry {
  path: string;
  name: string;
  category: string;
}

export const handler: Handler = async (event) => {
  const startTime = performance.now();

  try {
    const {
      language = "en",
      category,
      organization = "unfoldingWord",
    } = event.queryStringParameters || {};

    logger.info("Browsing translation words", { language, organization, category });

    const client = new DCSApiClient();

    // Translation words are typically in repositories like "en_tw" (English Translation Words)
    const repoName = `${language}_tw`;

    // Get the repository contents - look in the bible directory
    const response = await client.getRepositoryContents(organization, repoName, "bible");

    if (!response.success || !response.data) {
      logger.warn("Failed to get repository contents", {
        organization,
        repo: repoName,
        path: "bible",
        error: response.error,
      });

      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({
          error: "Repository not found or empty",
          organization,
          repository: repoName,
          path: "bible",
          responseTime: performance.now() - startTime,
        }),
      };
    }

    const entries: TranslationWordEntry[] = [];

    // Process the directory listing - limit to first 10 categories to avoid timeout
    const categories = response.data
      .filter(
        (item) => item.type === "dir" && !item.name.startsWith(".") && item.name !== "config.yaml"
      )
      .slice(0, 10);

    for (const item of categories) {
      // If category filter is specified, only include matching categories
      if (category && item.name !== category) {
        continue;
      }

      // Get contents of the category directory
      const categoryResponse = await client.getRepositoryContents(
        organization,
        repoName,
        item.path
      );

      if (categoryResponse.success && categoryResponse.data) {
        // Limit to first 50 files per category to avoid timeout
        const files = categoryResponse.data
          .filter((file) => file.type === "file" && file.name.endsWith(".md"))
          .slice(0, 50);

        for (const file of files) {
          entries.push({
            path: file.path,
            name: file.name.replace(".md", ""),
            category: item.name,
          });
        }
      }
    }

    logger.info("Found translation word entries", { count: entries.length });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        translationWords: entries,
        language,
        organization,
        responseTime: performance.now() - startTime,
      }),
    };
  } catch (error) {
    logger.error("Error browsing translation words", { error });

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal server error",
        responseTime: performance.now() - startTime,
      }),
    };
  }
};
