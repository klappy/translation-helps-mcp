/**
 * Markdown Generator with YAML Frontmatter
 *
 * Generates markdown files with rich YAML frontmatter for AI Search indexing.
 * The frontmatter contains all metadata needed for filtering and LLM context.
 */

import type { IndexedMetadata } from "../types.js";

/**
 * Convert a metadata object to YAML string
 * Simple implementation that handles our metadata types
 */
function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === "object") {
            lines.push(`${prefix}  -`);
            lines.push(toYaml(item as Record<string, unknown>, indent + 2));
          } else {
            lines.push(`${prefix}  - ${formatYamlValue(item)}`);
          }
        }
      }
    } else if (typeof value === "object") {
      lines.push(`${prefix}${key}:`);
      lines.push(toYaml(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${key}: ${formatYamlValue(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a primitive value for YAML
 */
function formatYamlValue(value: unknown): string {
  if (typeof value === "string") {
    // Quote strings that contain special characters
    if (
      value.includes(":") ||
      value.includes("#") ||
      value.includes("\n") ||
      value.includes('"') ||
      value.includes("'") ||
      value.startsWith(" ") ||
      value.endsWith(" ")
    ) {
      // Use double quotes and escape internal quotes
      return `"${value.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value);
}

/**
 * Generate a markdown file with YAML frontmatter
 *
 * @param content - The main content of the file (cleaned text)
 * @param metadata - Metadata object to include in frontmatter
 * @returns Complete markdown string with frontmatter
 */
export function generateMarkdownWithFrontmatter(
  content: string,
  metadata: IndexedMetadata,
): string {
  const frontmatter = toYaml(metadata as unknown as Record<string, unknown>);

  return `---
${frontmatter}
---

${content}`;
}

/**
 * Generate a simple markdown file without frontmatter
 * Used for testing or simple content
 */
export function generateMarkdown(content: string): string {
  return content;
}

/**
 * Parse YAML frontmatter from a markdown string
 * Returns the metadata and content separately
 */
export function parseMarkdownWithFrontmatter(markdown: string): {
  metadata: Record<string, unknown> | null;
  content: string;
} {
  const frontmatterMatch = markdown.match(
    /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/,
  );

  if (!frontmatterMatch) {
    return { metadata: null, content: markdown };
  }

  const [, yamlStr, content] = frontmatterMatch;

  // Simple YAML parsing (handles our flat structure)
  const metadata: Record<string, unknown> = {};
  const lines = yamlStr.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Try to parse as number or boolean
      if (value === "true") {
        metadata[key] = true;
      } else if (value === "false") {
        metadata[key] = false;
      } else if (/^\d+$/.test(value)) {
        metadata[key] = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        metadata[key] = parseFloat(value);
      } else {
        // Remove quotes if present
        metadata[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { metadata, content: content.trim() };
}
