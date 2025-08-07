/**
 * Handler for browsing Translation Academy table of contents
 *
 * Reads toc.yaml files from each category folder to build a proper TOC structure
 */

import * as yaml from "yaml";
import { DEFAULT_STRATEGIC_LANGUAGE, Organization } from "../../constants/terminology.js";
import { EdgeXRayTracer, trackedFetch } from "../edge-xray.js";
import type { PlatformHandler } from "../platform-adapter.js";

interface TOCEntry {
  title: string;
  link: string;
  slug?: string;
  sections?: TOCEntry[];
}

interface CategoryTOC {
  title: string;
  projects?: TOCEntry[];
  sections?: TOCEntry[];
}

const CACHE_TTL = 43200; // 12 hours for TOC data

// Helper to get X-ray metadata
function getXRayMetadata(tracer: EdgeXRayTracer | null, additionalMetadata: any = {}) {
  if (!tracer) {
    return additionalMetadata;
  }

  const xrayTrace = tracer.getTrace();

  return {
    ...additionalMetadata,
    xrayTrace,
    responseTime: xrayTrace.totalDuration,
    cached: xrayTrace.cacheStats.hits > 0,
    cacheStatus: `${xrayTrace.cacheStats.hits}/${xrayTrace.cacheStats.total} hits`,
  };
}

export const browseTranslationAcademyHandler: PlatformHandler = async (request) => {
  // Extract query parameters
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const language = params.get("language") || DEFAULT_STRATEGIC_LANGUAGE;
  const organization = params.get("organization") || Organization.UNFOLDING_WORD;
  const category = params.get("category"); // Optional: specific category to browse
  const format = params.get("format") || "markdown"; // Default to markdown for LLM-friendly output

  // Initialize edge-compatible X-Ray tracing
  const traceId = `ta_browse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tracer = new EdgeXRayTracer(traceId, "browse-translation-academy");

  try {
    // If category is specified, get just that category's TOC
    if (category) {
      const tocUrl = `https://git.door43.org/${organization}/${language}_ta/raw/branch/master/${category}/toc.yaml`;

      console.log("Fetching TOC from:", tocUrl);

      const tocResponse = await trackedFetch(tracer, tocUrl);

      if (!tocResponse.ok) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: `Category '${category}' not found`,
            message: `Could not find toc.yaml for category ${category}`,
          }),
        };
      }

      const tocContent = await tocResponse.text();
      const tocData = yaml.parse(tocContent) as CategoryTOC;

      // Transform the TOC data to include proper links
      const transformedTOC = transformTOCWithLinks(tocData, category);
      const modules = transformedTOC.projects || transformedTOC.sections || [];
      const totalModules = countModules(transformedTOC);

      // Return markdown if requested
      if (format === "markdown") {
        const markdown = categoryTocToMarkdown(tocData.title, modules);

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${CACHE_TTL}`,
          },
          body: JSON.stringify({
            success: true,
            data: markdown,
            metadata: getXRayMetadata(tracer, {
              format: "markdown",
              category,
              moduleCount: totalModules,
              source: `${organization}/${language}_ta`,
              timestamp: new Date().toISOString(),
            }),
          }),
        };
      }

      // Return JSON by default
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
        },
        body: JSON.stringify({
          success: true,
          data: {
            category,
            title: tocData.title,
            modules: modules,
            totalModules: countModules(transformedTOC),
          },
          metadata: getXRayMetadata(tracer, {
            timestamp: new Date().toISOString(),
            language,
            organization,
          }),
        }),
      };
    }

    // Get all categories by reading root directory
    const rootUrl = `https://git.door43.org/api/v1/repos/${organization}/${language}_ta/contents`;

    console.log("Fetching root contents from:", rootUrl);

    const rootResponse = await trackedFetch(tracer, rootUrl);
    const rootContents = await rootResponse.json();

    // Filter for directories only (these are our categories)
    const categoryDirs = rootContents.filter(
      (item: any) => item.type === "dir" && !item.name.startsWith(".") && item.name !== "media"
    );

    console.log(
      "Found categories:",
      categoryDirs.map((d: any) => d.name)
    );

    // Fetch TOC for each category
    const allCategories = await Promise.all(
      categoryDirs.map(async (dir: any) => {
        const tocUrl = `https://git.door43.org/${organization}/${language}_ta/raw/branch/master/${dir.name}/toc.yaml`;

        try {
          const tocResponse = await trackedFetch(tracer, tocUrl);

          if (!tocResponse.ok) return null;

          const tocContent = await tocResponse.text();
          const tocData = yaml.parse(tocContent) as CategoryTOC;

          const transformedTOC = transformTOCWithLinks(tocData, dir.name);

          return {
            name: dir.name,
            title: tocData.title,
            modules: transformedTOC.projects || transformedTOC.sections || [],
            totalModules: countModules(transformedTOC),
          };
        } catch (error) {
          console.warn(`Failed to parse TOC for ${dir.name}:`, error);
          return null;
        }
      })
    );

    // Filter out failed categories
    const validCategories = allCategories.filter((cat) => cat !== null);

    // Calculate total modules
    const totalModules = validCategories.reduce((sum, cat) => sum + (cat.modules?.length || 0), 0);

    // Return markdown if requested
    if (format === "markdown") {
      const markdown = allCategoriesToMarkdown(validCategories, language, organization);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
        },
        body: JSON.stringify({
          success: true,
          data: markdown,
          metadata: getXRayMetadata(tracer, {
            format: "markdown",
            totalCategories: validCategories.length,
            totalModules,
            source: `${organization}/${language}_ta`,
            timestamp: new Date().toISOString(),
          }),
        }),
      };
    }

    // Return JSON by default
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
      },
      body: JSON.stringify({
        success: true,
        data: {
          categories: validCategories,
          totalModules,
          language,
          organization,
        },
        metadata: getXRayMetadata(tracer, {
          timestamp: new Date().toISOString(),
        }),
      }),
    };
  } catch (error) {
    console.error("Browse Translation Academy error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to browse Translation Academy",
        details: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
};

/**
 * Transform TOC entries to include proper links for fetching articles
 */
function transformTOCWithLinks(toc: CategoryTOC, category: string): CategoryTOC {
  const transform = (entries: TOCEntry[]): TOCEntry[] => {
    return entries.map((entry) => {
      // Build the article path from the category and link
      let articlePath = entry.link;

      // Handle relative paths
      if (entry.link?.startsWith("../")) {
        // This goes to a different category
        articlePath = entry.link.substring(3);
      } else if (!entry.link?.includes("/")) {
        // This is within the same category
        articlePath = `${category}/${entry.link}`;
      }

      // Remove .md extension if present
      articlePath = articlePath.replace(/\.md$/, "");

      return {
        ...entry,
        articlePath,
        sections: entry.sections ? transform(entry.sections) : undefined,
      };
    });
  };

  return {
    ...toc,
    projects: toc.projects ? transform(toc.projects) : undefined,
    sections: toc.sections ? transform(toc.sections) : undefined,
  };
}

/**
 * Count total modules in a TOC structure
 */
function countModules(toc: CategoryTOC): number {
  let count = 0;

  const countEntries = (entries?: TOCEntry[]): void => {
    if (!entries) return;

    entries.forEach((entry) => {
      count++;
      if (entry.sections) {
        countEntries(entry.sections);
      }
    });
  };

  countEntries(toc.projects);
  countEntries(toc.sections);

  return count;
}

/**
 * Convert TOC entries to markdown format
 */
function tocToMarkdown(entries: TOCEntry[], level: number = 0): string {
  const indent = "  ".repeat(level);
  let markdown = "";

  entries.forEach((entry) => {
    // Create a markdown link with the articlePath
    const link =
      entry.articlePath && !entry.articlePath.includes("undefined")
        ? `[${entry.title}](${entry.articlePath})`
        : entry.title;
    markdown += `${indent}- ${link}\n`;

    // Recursively add sections
    if (entry.sections && entry.sections.length > 0) {
      markdown += tocToMarkdown(entry.sections, level + 1);
    }
  });

  return markdown;
}

/**
 * Convert full category TOC to markdown
 */
function categoryTocToMarkdown(title: string, modules: TOCEntry[]): string {
  let markdown = `# ${title}\n\n`;
  markdown += tocToMarkdown(modules);
  return markdown;
}

/**
 * Convert all categories to markdown
 */
function allCategoriesToMarkdown(
  categories: any[],
  language: string,
  organization: string
): string {
  let markdown = `# Translation Academy - Table of Contents\n\n`;
  markdown += `**Language:** ${language}\n`;
  markdown += `**Organization:** ${organization}\n\n`;

  categories.forEach((category) => {
    markdown += `## ${category.title} (${category.name})\n\n`;
    if (category.modules && category.modules.length > 0) {
      markdown += tocToMarkdown(category.modules);
    }
    markdown += "\n";
  });

  return markdown;
}
