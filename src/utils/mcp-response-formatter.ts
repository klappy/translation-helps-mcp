/**
 * MCP Response Formatter
 *
 * Formats MCP tool responses based on the requested format.
 * Supports JSON, Markdown (with YAML frontmatter), and plain text.
 *
 * DESIGN PRINCIPLES:
 * - Markdown output is TRUE markdown that can be rendered directly
 * - YAML frontmatter provides structured metadata
 * - LLMs understand markdown naturally - no parsing needed
 * - Consumers should NOT need to know internal JSON structures
 */

import { logger } from "./logger.js";

export type OutputFormat = "json" | "md" | "markdown" | "text";

export interface MCPResponseContent {
  type: "text";
  text: string;
}

export interface MCPResponse {
  content: MCPResponseContent[];
  metadata?: Record<string, unknown>;
}

/**
 * YAML frontmatter serializer
 * Converts an object to YAML frontmatter format
 */
function toYamlFrontmatter(metadata: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      // Skip complex nested objects in frontmatter
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Simple arrays as comma-separated
      lines.push(`${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`);
    } else if (typeof value === "string") {
      // Quote strings that might have special characters
      if (value.includes(":") || value.includes("#") || value.includes("\n")) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Format translation notes as markdown
 */
export function formatTranslationNotesMarkdown(data: {
  reference?: string;
  language?: string;
  organization?: string;
  verseNotes?: Array<{
    id?: string;
    reference?: string;
    note?: string;
    quote?: string;
    occurrence?: number;
    occurrences?: number;
    supportReference?: string;
  }>;
  contextNotes?: Array<{
    id?: string;
    reference?: string;
    note?: string;
    quote?: string;
    supportReference?: string;
  }>;
  citation?: {
    resource?: string;
    version?: string;
    organization?: string;
  };
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Translation Notes",
    reference: data.reference || "Unknown",
    language: data.language || "en",
    organization: data.organization || "unfoldingWord",
    verse_notes_count: data.verseNotes?.length || 0,
    context_notes_count: data.contextNotes?.length || 0,
    version: data.citation?.version,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  // Title
  lines.push(`# Translation Notes: ${data.reference || "Unknown Reference"}`);
  lines.push("");

  // Context notes (introductions, chapter intros)
  if (data.contextNotes && data.contextNotes.length > 0) {
    for (const note of data.contextNotes) {
      if (note.note) {
        // Context notes often contain markdown - render as-is
        lines.push(note.note.replace(/\\n/g, "\n"));
        lines.push("");
        lines.push("---");
        lines.push("");
      }
    }
  }

  // Verse notes
  if (data.verseNotes && data.verseNotes.length > 0) {
    for (const note of data.verseNotes) {
      // Section header for the note
      const header = note.quote
        ? `## ${note.reference}: "${note.quote}"`
        : `## ${note.reference}`;
      lines.push(header);
      lines.push("");

      // Quote/occurrence info
      if (note.quote && note.occurrence !== undefined) {
        const occTotal = note.occurrences || 1;
        lines.push(
          `**Quote:** ${note.quote} (occurrence ${note.occurrence}/${occTotal})`,
        );
        lines.push("");
      }

      // The note content
      if (note.note) {
        lines.push(note.note.replace(/\\n/g, "\n"));
        lines.push("");
      }

      // Support reference (link to Translation Academy)
      if (note.supportReference) {
        lines.push(
          `**See:** [${note.supportReference}](${note.supportReference})`,
        );
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  // No notes found
  if (
    (!data.verseNotes || data.verseNotes.length === 0) &&
    (!data.contextNotes || data.contextNotes.length === 0)
  ) {
    lines.push("*No translation notes found for this reference.*");
    lines.push("");
  }

  // Citation
  if (data.citation) {
    lines.push("## Source");
    lines.push(
      `*${data.citation.resource || "Translation Notes"} ${data.citation.version || ""} · ${data.citation.organization || data.organization || "unfoldingWord"}*`,
    );
  }

  return lines.join("\n");
}

/**
 * Format scripture as markdown
 */
export function formatScriptureMarkdown(data: {
  reference?: string;
  language?: string;
  organization?: string;
  resources?: Array<{
    resource?: string;
    text?: string;
    organization?: string;
    version?: string;
  }>;
  scripture?: {
    reference?: string;
    text?: string;
    resource?: string;
    language?: string;
  };
  metadata?: Record<string, unknown>;
}): string {
  const resources = data.resources || (data.scripture ? [data.scripture] : []);
  const reference = data.reference || data.scripture?.reference || "Unknown";

  const frontmatter = toYamlFrontmatter({
    resource: "Scripture",
    reference,
    language: data.language || "en",
    organization: data.organization || "unfoldingWord",
    resources_count: resources.length,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  // Title
  lines.push(`# ${reference}`);
  lines.push("");

  // Each scripture resource
  for (const res of resources) {
    const resourceName = res.resource || "Scripture";
    lines.push(`## ${resourceName}`);
    lines.push("");

    if (res.text) {
      // Check if it's a multi-verse passage
      const isMultiVerse =
        res.text.includes("\n") && /^\d+[\. ]/.test(res.text);
      if (isMultiVerse) {
        lines.push(res.text);
      } else {
        lines.push(`> ${res.text}`);
      }
      lines.push("");
    }

    lines.push(
      `*— ${reference} (${resourceName}) · ${res.organization || data.organization || "unfoldingWord"}*`,
    );
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format translation questions as markdown
 */
export function formatTranslationQuestionsMarkdown(data: {
  reference?: string;
  language?: string;
  organization?: string;
  questions?: Array<{
    id?: string;
    reference?: string;
    question?: string;
    response?: string;
  }>;
  citation?: {
    resource?: string;
    version?: string;
  };
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Translation Questions",
    reference: data.reference || "Unknown",
    language: data.language || "en",
    organization: data.organization || "unfoldingWord",
    questions_count: data.questions?.length || 0,
    version: data.citation?.version,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  lines.push(
    `# Translation Questions: ${data.reference || "Unknown Reference"}`,
  );
  lines.push("");

  if (data.questions && data.questions.length > 0) {
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      lines.push(`## Question ${i + 1}`);
      if (q.reference) {
        lines.push(`*Reference: ${q.reference}*`);
      }
      lines.push("");
      lines.push(`**Q:** ${q.question || ""}`);
      lines.push("");
      if (q.response) {
        lines.push(`**A:** ${q.response}`);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  } else {
    lines.push("*No translation questions found for this reference.*");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format translation word article as markdown
 */
export function formatTranslationWordMarkdown(data: {
  term?: string;
  title?: string;
  definition?: string;
  content?: string;
  category?: string;
  seeAlso?: string[];
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Translation Word",
    term: data.term,
    title: data.title,
    category: data.category,
    see_also: data.seeAlso,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  // Title from the article
  lines.push(`# ${data.title || data.term || "Translation Word"}`);
  lines.push("");

  if (data.category) {
    lines.push(`*Category: ${data.category}*`);
    lines.push("");
  }

  // Definition/content
  if (data.definition) {
    lines.push("## Definition");
    lines.push("");
    lines.push(data.definition);
    lines.push("");
  }

  if (data.content) {
    // Content is often already markdown
    lines.push(data.content.replace(/\\n/g, "\n"));
    lines.push("");
  }

  // See also
  if (data.seeAlso && data.seeAlso.length > 0) {
    lines.push("## See Also");
    lines.push("");
    for (const term of data.seeAlso) {
      lines.push(`- ${term}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format translation word links as markdown
 */
export function formatTranslationWordLinksMarkdown(data: {
  reference?: string;
  language?: string;
  organization?: string;
  words?: Array<{
    term?: string;
    category?: string;
    occurrence?: number;
    quote?: string;
  }>;
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Translation Word Links",
    reference: data.reference || "Unknown",
    language: data.language || "en",
    organization: data.organization || "unfoldingWord",
    words_count: data.words?.length || 0,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  lines.push(
    `# Translation Word Links: ${data.reference || "Unknown Reference"}`,
  );
  lines.push("");

  if (data.words && data.words.length > 0) {
    // Group by category
    const categories: Record<
      string,
      Array<{ term?: string; quote?: string; occurrence?: number }>
    > = {};

    for (const word of data.words) {
      const cat = word.category || "other";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(word);
    }

    const categoryNames: Record<string, string> = {
      kt: "Key Terms",
      names: "Names",
      other: "Other Terms",
    };

    for (const [cat, words] of Object.entries(categories)) {
      lines.push(`## ${categoryNames[cat] || cat}`);
      lines.push("");

      for (const word of words) {
        let entry = `- **${word.term || "Unknown"}**`;
        if (word.quote) {
          entry += ` — "${word.quote}"`;
        }
        if (word.occurrence !== undefined) {
          entry += ` (${word.occurrence})`;
        }
        lines.push(entry);
      }
      lines.push("");
    }
  } else {
    lines.push("*No translation word links found for this reference.*");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format translation academy article as markdown
 */
export function formatTranslationAcademyMarkdown(data: {
  moduleId?: string;
  title?: string;
  content?: string;
  relatedArticles?: string[];
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Translation Academy",
    module_id: data.moduleId,
    title: data.title,
    related_articles: data.relatedArticles,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  lines.push(`# ${data.title || data.moduleId || "Translation Academy"}`);
  lines.push("");

  if (data.content) {
    // Content is already markdown
    lines.push(data.content.replace(/\\n/g, "\n"));
    lines.push("");
  }

  if (data.relatedArticles && data.relatedArticles.length > 0) {
    lines.push("## Related Articles");
    lines.push("");
    for (const article of data.relatedArticles) {
      lines.push(`- ${article}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format search results as markdown
 */
export function formatSearchResultsMarkdown(data: {
  query?: string;
  results?: Array<{
    type?: string;
    reference?: string;
    title?: string;
    content?: string;
    score?: number;
  }>;
  metadata?: Record<string, unknown>;
}): string {
  const frontmatter = toYamlFrontmatter({
    resource: "Search Results",
    query: data.query,
    results_count: data.results?.length || 0,
    cached: data.metadata?.cached,
    response_time_ms: data.metadata?.responseTime,
  });

  const lines: string[] = [frontmatter, ""];

  lines.push(`# Search: "${data.query || ""}"`);
  lines.push("");

  if (data.results && data.results.length > 0) {
    for (let i = 0; i < data.results.length; i++) {
      const result = data.results[i];
      lines.push(
        `## ${i + 1}. ${result.title || result.reference || "Result"}`,
      );
      if (result.type) {
        lines.push(`*Type: ${result.type}*`);
      }
      if (result.reference) {
        lines.push(`*Reference: ${result.reference}*`);
      }
      lines.push("");
      if (result.content) {
        lines.push(result.content.substring(0, 500));
        if (result.content.length > 500) lines.push("...");
      }
      if (result.score !== undefined) {
        lines.push("");
        lines.push(`*Relevance: ${(result.score * 100).toFixed(1)}%*`);
      }
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  } else {
    lines.push("*No results found.*");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generic fallback markdown formatter
 */
export function formatGenericMarkdown(
  data: unknown,
  resourceType: string,
): string {
  const frontmatter = toYamlFrontmatter({
    resource: resourceType,
    format: "generic",
  });

  const lines: string[] = [frontmatter, ""];

  lines.push(`# ${resourceType}`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(data, null, 2));
  lines.push("```");

  return lines.join("\n");
}

/**
 * Format MCP response based on requested format
 *
 * @param data - The data to format
 * @param format - The output format (json, md, markdown, text)
 * @param resourceType - Type of resource for markdown formatting
 * @returns MCP-formatted response
 */
export function formatMCPResponse(
  data: unknown,
  format: OutputFormat = "json",
  resourceType: string = "generic",
): MCPResponse {
  logger.debug("Formatting MCP response", { format, resourceType });

  let text: string;

  if (format === "md" || format === "markdown") {
    // Route to appropriate markdown formatter based on resource type
    const typedData = data as Record<string, unknown>;

    switch (resourceType) {
      case "translation-notes":
        text = formatTranslationNotesMarkdown(typedData);
        break;
      case "scripture":
        text = formatScriptureMarkdown(typedData);
        break;
      case "translation-questions":
        text = formatTranslationQuestionsMarkdown(typedData);
        break;
      case "translation-word":
        text = formatTranslationWordMarkdown(typedData);
        break;
      case "translation-word-links":
        text = formatTranslationWordLinksMarkdown(typedData);
        break;
      case "translation-academy":
        text = formatTranslationAcademyMarkdown(typedData);
        break;
      case "search":
        text = formatSearchResultsMarkdown(typedData);
        break;
      default:
        text = formatGenericMarkdown(data, resourceType);
    }
  } else if (format === "text") {
    // Plain text: strip markdown syntax from markdown output
    const md = formatMCPResponse(data, "md", resourceType);
    text = (md.content[0]?.text || "")
      .replace(/^---[\s\S]*?---\n*/m, "") // Remove YAML frontmatter
      .replace(/^#{1,6}\s+/gm, "") // Remove heading markers
      .replace(/^\s*>\s?/gm, "") // Remove blockquotes
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/^---+$/gm, "") // Remove horizontal rules
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .trim();
  } else {
    // JSON format (default)
    text = JSON.stringify(data, null, 2);
  }

  return {
    content: [{ type: "text", text }],
  };
}
