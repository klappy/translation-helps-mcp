/**
 * MCP Response Formatter
 *
 * Formats MCP tool responses into JSON, Markdown, or Text.
 * Uses YAML frontmatter for metadata (LLM-friendly).
 *
 * This is used by the standalone MCP server (src/index.ts).
 * The UI uses ui/src/lib/responseFormatter.ts via HTTP endpoints.
 */

export type OutputFormat = "json" | "md" | "markdown" | "text";

interface ResponseData {
  reference?: string;
  language?: string;
  organization?: string;
  metadata?: {
    responseTime?: number;
    cached?: boolean;
    license?: string;
    version?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Format MCP response with YAML frontmatter for markdown
 */
export function formatMCPResponse(
  data: ResponseData,
  format: OutputFormat,
  resourceType: string,
): { content: Array<{ type: "text"; text: string }> } {
  if (format === "json") {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  if (format === "md" || format === "markdown") {
    const markdown = formatAsMarkdown(data, resourceType);
    return {
      content: [{ type: "text", text: markdown }],
    };
  }

  if (format === "text") {
    const text = formatAsText(data, resourceType);
    return {
      content: [{ type: "text", text }],
    };
  }

  // Default to JSON
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format as markdown with YAML frontmatter
 */
function formatAsMarkdown(data: ResponseData, resourceType: string): string {
  let md = "";

  // YAML frontmatter
  md += "---\n";
  md += `resource: ${resourceType}\n`;
  if (data.reference) md += `reference: ${data.reference}\n`;
  if (data.language) md += `language: ${data.language}\n`;
  if (data.organization) md += `organization: ${data.organization}\n`;
  if (data.metadata?.responseTime)
    md += `response_time_ms: ${data.metadata.responseTime}\n`;
  if (data.metadata?.cached !== undefined)
    md += `cached: ${data.metadata.cached}\n`;
  if (data.metadata?.license) md += `license: ${data.metadata.license}\n`;
  if (data.metadata?.version) md += `version: ${data.metadata.version}\n`;
  md += "---\n\n";

  // Title
  md += `# ${formatResourceTitle(resourceType)}: ${data.reference || "Unknown"}\n\n`;

  // Content based on resource type
  switch (resourceType) {
    case "translation-notes":
      md += formatNotesContent(data);
      break;
    case "scripture":
      md += formatScriptureContent(data);
      break;
    case "translation-questions":
      md += formatQuestionsContent(data);
      break;
    case "translation-words":
    case "translation-word-links":
      md += formatWordsContent(data);
      break;
    case "translation-academy":
      md += formatAcademyContent(data);
      break;
    case "search":
      md += formatSearchContent(data);
      break;
    default:
      md += "```json\n" + JSON.stringify(data, null, 2) + "\n```\n";
  }

  return md;
}

function formatResourceTitle(resourceType: string): string {
  const titles: Record<string, string> = {
    "translation-notes": "Translation Notes",
    scripture: "Scripture",
    "translation-questions": "Translation Questions",
    "translation-words": "Translation Words",
    "translation-word-links": "Translation Word Links",
    "translation-academy": "Translation Academy",
    search: "Search Results",
  };
  return titles[resourceType] || resourceType;
}

function formatNotesContent(data: ResponseData): string {
  let md = "";

  const verseNotes = (data.verseNotes as Array<Record<string, unknown>>) || [];
  const contextNotes =
    (data.contextNotes as Array<Record<string, unknown>>) || [];
  const allNotes = [...contextNotes, ...verseNotes];

  if (allNotes.length === 0) {
    return "*No translation notes found for this reference.*\n";
  }

  allNotes.forEach((note, index) => {
    const quote = (note.Quote as string) || (note.quote as string) || "";
    const noteText =
      (note.Note as string) ||
      (note.note as string) ||
      (note.content as string) ||
      "";
    const ref = (note.Reference as string) || (note.reference as string) || "";
    const id =
      (note.ID as string) || (note.id as string) || `note-${index + 1}`;
    const supportRef =
      (note.SupportReference as string) ||
      (note.supportReference as string) ||
      "";

    md += `## ${quote || id}\n\n`;

    // Unescape newlines in note content
    const unescapedNote = noteText.replace(/\\n/g, "\n");
    md += `${unescapedNote}\n\n`;

    if (ref && ref !== data.reference) {
      md += `**Reference**: ${ref}\n\n`;
    }

    if (supportRef) {
      md += `**See**: [${supportRef}](${supportRef})\n\n`;
    }

    md += "---\n\n";
  });

  return md;
}

function formatScriptureContent(data: ResponseData): string {
  let md = "";

  const scripture = (data.scripture as Array<Record<string, unknown>>) || [];

  if (scripture.length === 0) {
    return "*No scripture found for this reference.*\n";
  }

  scripture.forEach((verse) => {
    const translation = (verse.translation as string) || "Scripture";
    const text = (verse.text as string) || "";

    md += `## ${translation}\n\n`;
    md += `${text}\n\n`;
  });

  return md;
}

function formatQuestionsContent(data: ResponseData): string {
  let md = "";

  const questions = (data.questions as Array<Record<string, unknown>>) || [];

  if (questions.length === 0) {
    return "*No translation questions found for this reference.*\n";
  }

  questions.forEach((q, index) => {
    const question =
      (q.Question as string) ||
      (q.question as string) ||
      `Question ${index + 1}`;
    const answer = (q.Response as string) || (q.response as string) || "";

    md += `## ${index + 1}. ${question}\n\n`;
    if (answer) {
      md += `**Answer**: ${answer}\n\n`;
    }
    md += "---\n\n";
  });

  return md;
}

function formatWordsContent(data: ResponseData): string {
  let md = "";

  const words = (data.words as Array<Record<string, unknown>>) || [];
  const word = data.word as Record<string, unknown>;

  // Single word result
  if (word) {
    md += `## ${(word.term as string) || "Term"}\n\n`;
    if (word.definition) md += `**Definition**: ${word.definition}\n\n`;
    if (word.content) {
      const content = (word.content as string).replace(/\\n/g, "\n");
      md += `${content}\n\n`;
    }
    return md;
  }

  // Multiple word links
  if (words.length === 0) {
    return "*No translation words found for this reference.*\n";
  }

  words.forEach((w) => {
    const term = (w.term as string) || (w.word as string) || "";
    const definition = (w.definition as string) || "";

    md += `## ${term}\n\n`;
    if (definition) md += `${definition}\n\n`;
    md += "---\n\n";
  });

  return md;
}

function formatAcademyContent(data: ResponseData): string {
  let md = "";

  const module = data.module as Record<string, unknown>;
  if (!module) {
    return "*No translation academy content found.*\n";
  }

  const title = (module.title as string) || "Module";
  const content = (module.content as string) || "";

  md += `## ${title}\n\n`;
  if (content) {
    const unescapedContent = content.replace(/\\n/g, "\n");
    md += `${unescapedContent}\n\n`;
  }

  return md;
}

function formatSearchContent(data: ResponseData): string {
  let md = "";

  const results = (data.results as Array<Record<string, unknown>>) || [];

  if (results.length === 0) {
    return "*No search results found.*\n";
  }

  results.forEach((result, index) => {
    const title =
      (result.title as string) ||
      (result.reference as string) ||
      `Result ${index + 1}`;
    const type = (result.type as string) || "";
    const content =
      (result.content as string) || (result.snippet as string) || "";

    md += `## ${index + 1}. ${title}\n\n`;
    if (type) md += `*Type: ${type}*\n\n`;
    if (content) {
      const unescapedContent = content.replace(/\\n/g, "\n");
      md += `${unescapedContent}\n\n`;
    }
    md += "---\n\n";
  });

  return md;
}

/**
 * Format as plain text (no markdown)
 */
function formatAsText(data: ResponseData, resourceType: string): string {
  let text = "";

  // Header
  text += `${formatResourceTitle(resourceType)}: ${data.reference || "Unknown"}\n`;
  text += "=".repeat(50) + "\n\n";

  // Metadata
  if (data.language) text += `Language: ${data.language}\n`;
  if (data.organization) text += `Organization: ${data.organization}\n`;
  if (data.metadata?.responseTime)
    text += `Response Time: ${data.metadata.responseTime}ms\n`;
  text += "\n";

  // Content - strip markdown formatting
  const markdown = formatAsMarkdown(data, resourceType);
  // Remove YAML frontmatter
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n\n/, "");
  // Strip markdown syntax
  text += withoutFrontmatter
    .replace(/^#+\s*/gm, "") // Headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/`([^`]+)`/g, "$1") // Code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/^---$/gm, ""); // Horizontal rules

  return text;
}
