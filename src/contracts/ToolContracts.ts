/**
 * Single Source of Truth for MCP Tool Contracts
 * This defines the EXACT interface between Chat, MCP, and Endpoints
 */

export interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export interface ScriptureToolArgs {
  reference: string;
  language?: string;
  organization?: string;
  version?: string;
}

export interface TranslationNotesToolArgs {
  reference: string;
  language?: string;
  organization?: string;
}

export interface TranslationQuestionsToolArgs {
  reference: string;
  language?: string;
  organization?: string;
}

export interface TranslationWordToolArgs {
  term: string;
  language?: string;
  organization?: string;
}

// Define the exact response formatters
export const ToolFormatters = {
  scripture: (data: any): string => {
    // Handle filter response format (has 'matches' array)
    if (data.matches && Array.isArray(data.matches)) {
      if (data.matches.length === 0) {
        return `No matches found for filter: ${data.filter || "unknown"}`;
      }
      // Format filter matches
      const header = `# Filter Results: "${data.filter}"\n\nFound ${data.totalMatches} matches\n\n`;
      const matches = data.matches
        .slice(0, 50) // Limit to first 50 for readability
        .map((m: any) => `**${m.reference}** (${m.resource}): ${m.text}`)
        .join("\n\n");
      return (
        header +
        matches +
        (data.totalMatches > 50
          ? `\n\n... and ${data.totalMatches - 50} more matches`
          : "")
      );
    }

    // Check both 'scripture' (singular - standard response format) and 'scriptures' (plural - legacy)
    const scriptureArray = data.scripture || data.scriptures;

    if (scriptureArray && Array.isArray(scriptureArray)) {
      // If multiple scriptures, return all of them formatted
      if (scriptureArray.length > 1) {
        return scriptureArray
          .map((s: any) => `${s.translation || "Unknown"}: ${s.text || ""}`)
          .join("\n\n");
      }
      // Single scripture - return just the text
      return scriptureArray[0]?.text || "Scripture not found";
    }
    return data.text || data.ult || data.ust || "Scripture not found";
  },

  notes: (data: any): string => {
    let notes: any[] = [];

    // Collect all notes with flexible extraction
    const possibleArrays = [
      "items", // Standard response format from createTranslationHelpsResponse
      "verseNotes",
      "contextNotes",
      "notes",
      "Notes",
      "VerseNotes",
    ];
    for (const field of possibleArrays) {
      if (data[field] && Array.isArray(data[field])) {
        notes = notes.concat(data[field]);
      }
    }

    // Also check nested data structures
    if (data.data) {
      for (const field of possibleArrays) {
        if (data.data[field] && Array.isArray(data.data[field])) {
          notes = notes.concat(data.data[field]);
        }
      }
    }

    if (notes.length === 0) {
      return "No translation notes found";
    }

    // Format notes with proper markdown
    return notes
      .map((note: any, index: number) => {
        const content =
          note.text || note.note || note.Note || note.content || "";
        // Replace escaped newlines with actual newlines
        let unescapedContent = content.replace(/\\n/g, "\n");

        // Handle ALL rc:// reference links in various formats
        // Pattern 1: [[rc:///...]] or [[rc://*/...]]
        unescapedContent = unescapedContent.replace(
          /\[\[rc:\/\/\*?\/([^\]]+)\]\]/g,
          (match, path) => {
            const parts = path.split("/");
            if (parts[0] === "ta" && parts[1] === "man") {
              const articleId = parts.slice(2).join("/");
              const articleName = parts[parts.length - 1].replace(/-/g, " ");
              return `📚 *[Learn more about ${articleName}](rc:${articleId})*`;
            }
            return `📚 *[Learn more](rc:${path})*`;
          },
        );

        // Pattern 2: Plain rc:// links not in brackets
        unescapedContent = unescapedContent.replace(
          /(?<!\[)rc:\/\/\*?\/ta\/man\/([^\s\]]+)/g,
          (match, path) => {
            const articleId = path.replace(/^translate\//, "");
            const articleName =
              articleId.split("/").pop()?.replace(/-/g, " ") || articleId;
            return `📚 *[Learn more about ${articleName}](rc:${articleId})*`;
          },
        );

        // Pattern 3: Markdown style links [text](rc://...)
        unescapedContent = unescapedContent.replace(
          /\[([^\]]+)\]\(rc:\/\/[^/]*\/ta\/man\/([^)]+)\)/g,
          (match, text, path) => {
            const articleId = path.replace(/^translate\//, "");
            return `📚 *[${text}](rc:${articleId})*`;
          },
        );

        // Add support reference link if available
        if (note.supportReference || note.SupportReference) {
          const rcPath = (
            note.supportReference || note.SupportReference
          ).replace("rc://*/", "");
          const parts = rcPath.split("/");
          if (parts[0] === "ta" && parts[1] === "man") {
            const articleId = parts.slice(2).join("/");
            const articleName = parts[parts.length - 1].replace(/-/g, " ");
            unescapedContent += `\n📚 *[Learn more about ${articleName}](rc:${articleId})*`;
          }
        }

        // Format based on note type
        const reference = note.reference || note.Reference;
        if (
          reference?.includes("Introduction") ||
          reference?.includes("Chapter")
        ) {
          // Context notes (introductions) - show as markdown sections
          return `## ${reference}\n\n${unescapedContent}`;
        } else {
          // Verse notes - show with quote context when available
          let formattedNote = `**${index + 1}.**`;

          // Add quote if present (Greek/Hebrew with English translation)
          const quote = note.quote || note.Quote;
          if (quote && quote.trim()) {
            formattedNote += ` **${quote}**:`;
          }

          // Add the note content on the same line
          formattedNote += ` ${unescapedContent}`;

          return formattedNote;
        }
      })
      .join("\n\n");
  },

  questions: (data: any): string => {
    // Check multiple possible field names, including the standard "items" field
    const questions =
      data.items || // Standard response format from createTranslationHelpsResponse
      data.translationQuestions ||
      data.questions ||
      [];

    if (!Array.isArray(questions) || questions.length === 0) {
      return "No translation questions found";
    }

    return questions
      .map((q: any, index: number) => {
        const question = q.question || "";
        const answer = q.response || q.answer || "";

        // Format as markdown with bold question
        return `**Q${index + 1}: ${question}**\n\n${answer}`;
      })
      .join("\n\n---\n\n");
  },

  words: (data: any): string => {
    // Handle word links format (from fetch_translation_word_links)
    if (data.items && Array.isArray(data.items)) {
      const links = data.items.map((link: any) => {
        const term = link.term || link.TWLink || "Unknown term";
        const category = link.category ? ` (${link.category})` : "";
        return `**${term}**${category}`;
      });
      return links.length > 0
        ? links.join("\n")
        : "No translation word links found";
    }
    // Handle word articles format (from fetch_translation_word)
    if (data.words && Array.isArray(data.words)) {
      return (
        data.words
          .map((word: any) => `**${word.term}**\n${word.definition}`)
          .join("\n\n") || "No translation words found"
      );
    }
    if (data.term && data.definition) {
      return `**${data.term}**\n${data.definition}`;
    }
    return "No translation words found";
  },

  academy: (data: any): string => {
    // Handle single academy article
    if (data.title && data.content) {
      return `# ${data.title}\n\n${data.content}`;
    }
    // Handle array of academy articles
    if (Array.isArray(data)) {
      return data
        .map((article: any) => {
          if (article.title && article.content) {
            return `# ${article.title}\n\n${article.content}`;
          }
          return article.content || article.markdown || "No content";
        })
        .join("\n\n---\n\n");
    }
    // Handle nested structure
    if (data.modules && Array.isArray(data.modules)) {
      return data.modules
        .map((module: any) => {
          const title =
            module.title || module.id || "Translation Academy Article";
          const content = module.markdown || module.content || "";
          return `# ${title}\n\n${content}`;
        })
        .join("\n\n---\n\n");
    }
    // Fallback: return content if available
    if (data.content) {
      return data.content;
    }
    if (data.markdown) {
      return data.markdown;
    }
    return "No translation academy content found";
  },

  search: (data: any): string => {
    if (!data.hits || !Array.isArray(data.hits) || data.hits.length === 0) {
      return "# Search Results\n\nNo results found.";
    }

    // Count unique resources for summary
    const uniqueResources = new Set(data.hits.map((h: any) => h.resource)).size;

    // Helper to extract verse range from content using regex
    const extractVerseRef = (content: string): string | null => {
      if (!content) return null;
      // Find ALL chapter:verse patterns in content
      const verseMatches = content.match(/\b(\d{1,3}):(\d{1,3})\b/g);
      if (!verseMatches || verseMatches.length === 0) return null;

      // Parse all matches to find the range
      const parsed = verseMatches.map((m) => {
        const [chapter, verse] = m.split(":").map(Number);
        return { chapter, verse, raw: m };
      });

      // Get first and last (they should be same chapter for a passage)
      const first = parsed[0];
      const last = parsed[parsed.length - 1];

      if (first.chapter === last.chapter) {
        // Same chapter - return range like "4:13-20"
        return first.verse === last.verse
          ? `${first.chapter}:${first.verse}`
          : `${first.chapter}:${first.verse}-${last.verse}`;
      } else {
        // Different chapters - return full range like "3:16-4:21"
        return `${first.raw}-${last.raw}`;
      }
    };

    // Helper to extract book code from path (e.g., "en/unfoldingWord/tn/v87/JHN.md" -> "JHN")
    const extractBookFromPath = (path: string): string | null => {
      if (!path) return null;
      const bookMatch = path.match(/\/([A-Z0-9]{3})\.md$/i);
      return bookMatch ? bookMatch[1].toUpperCase() : null;
    };

    // Helper to build scripture reference from hit data
    const buildRef = (hit: any): string => {
      // First try pre-computed reference if it looks like a Bible reference (not a path)
      if (hit.reference && !hit.reference.includes("/")) {
        return hit.reference;
      }

      // Try to build from structured fields
      if (hit.book || hit.book_name) {
        const bookName = hit.book_name || hit.book;
        if (hit.chapter && (hit.verse || hit.verse_start)) {
          const verse = hit.verse || hit.verse_start;
          const verseEnd =
            hit.verse_end && hit.verse_end !== verse ? `-${hit.verse_end}` : "";
          return `${bookName} ${hit.chapter}:${verse}${verseEnd}`;
        } else if (hit.chapter) {
          return `${bookName} ${hit.chapter}`;
        }
        return bookName;
      }

      // Try to extract from content/preview using regex
      const content = hit.content || hit.preview || "";
      const verseRef = extractVerseRef(content);
      const bookName = extractBookFromPath(hit.path);

      if (bookName && verseRef) {
        return `${bookName} ${verseRef}`;
      }

      return "";
    };

    // Helper to generate lookup info based on resource type
    const getLookupInfo = (hit: any, extractedRef?: string): string => {
      const lang = hit.language || "en";
      const org = hit.organization || "unfoldingWord";
      const resource = hit.resource?.toLowerCase() || "";
      // Use extracted reference from cleaned content, or try to build from hit data
      const ref = extractedRef || buildRef(hit);

      const lines: string[] = [];

      // Scripture resources (ult, ust, ueb)
      if (["ult", "ust", "ueb", "scripture"].includes(resource)) {
        lines.push(`**Lookup:** \`fetch_scripture\``);
        if (ref) lines.push(`- reference: \`${ref}\``);
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Translation Notes
      if (resource === "tn") {
        lines.push(`**Lookup:** \`fetch_translation_notes\``);
        if (ref) lines.push(`- reference: \`${ref}\``);
        if (hit.note_id) lines.push(`- note_id: \`${hit.note_id}\``);
        if (hit.phrase) lines.push(`- phrase: \`${hit.phrase}\``);
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Translation Words
      if (resource === "tw") {
        const term =
          hit.article_id || hit.title?.toLowerCase().replace(/\s+/g, "");
        const category = hit.category || "kt";
        lines.push(`**Lookup:** \`fetch_translation_word\``);
        if (term) {
          lines.push(`- term: \`${term}\``);
          lines.push(`- category: \`${category}\``);
          lines.push(
            `- rcLink: \`rc://${lang}/tw/dict/bible/${category}/${term}\``,
          );
        }
        if (hit.title) lines.push(`- title: \`${hit.title}\``);
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Translation Academy
      if (resource === "ta") {
        const moduleId = hit.article_id;
        lines.push(`**Lookup:** \`fetch_translation_academy\``);
        if (moduleId) {
          lines.push(`- moduleId: \`${moduleId}\``);
          lines.push(`- rcLink: \`rc://${lang}/ta/man/translate/${moduleId}\``);
        }
        if (hit.title) lines.push(`- title: \`${hit.title}\``);
        if (hit.section_title)
          lines.push(`- section: \`${hit.section_title}\``);
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Translation Questions
      if (resource === "tq") {
        lines.push(`**Lookup:** \`fetch_translation_questions\``);
        if (ref) lines.push(`- reference: \`${ref}\``);
        if (hit.question_text)
          lines.push(
            `- question: \`${hit.question_text.substring(0, 50)}...\``,
          );
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Translation Word Links (TWL) - verse-level word associations
      if (resource === "twl") {
        lines.push(`**Lookup:** \`fetch_translation_word_links\``);
        if (ref) lines.push(`- reference: \`${ref}\``);
        if (hit.article_id) lines.push(`- linked_word: \`${hit.article_id}\``);
        lines.push(`- language: \`${lang}\``);
        lines.push(`- organization: \`${org}\``);
        return lines.join("\n");
      }

      // Fallback - show all available metadata
      lines.push(`**Metadata:**`);
      if (ref) lines.push(`- reference: \`${ref}\``);
      lines.push(`- path: \`${hit.path || "unknown"}\``);
      lines.push(`- language: \`${lang}\``);
      lines.push(`- organization: \`${org}\``);
      if (hit.article_id) lines.push(`- article_id: \`${hit.article_id}\``);
      if (hit.note_id) lines.push(`- note_id: \`${hit.note_id}\``);
      return lines.join("\n");
    };

    // Start with markdown header so ApiTester detects it as markdown
    return (
      `# Search Results\n\n` +
      `**${data.total_hits || data.hits.length} results** across ${uniqueResources} resource${uniqueResources !== 1 ? "s" : ""} (${data.took_ms || 0}ms)\n\n` +
      data.hits
        .map((hit: any, index: number) => {
          // Use resource_name or resource for display, chunk_level for type
          const resourceDisplay =
            hit.resource_name || hit.resource || "unknown";
          const typeDisplay = hit.chunk_level || "result";

          // Use human-readable reference, fallback to path
          const locationDisplay =
            hit.reference || hit.path || "Unknown location";

          // Get full content - clean up and extract just the text
          let content = hit.content || hit.preview || "";

          // Extract text from JSON chunks - pattern: "text":" actual content "
          const textMatches = content.match(/"text"\s*:\s*"([^"]+)"/g);
          if (textMatches && textMatches.length > 0) {
            // Extract just the text values and join them
            content = textMatches
              .map((m: string) => {
                const match = m.match(/"text"\s*:\s*"([^"]+)"/);
                return match ? match[1] : "";
              })
              .filter((t: string) => t.length > 0)
              .join(" ");
          }

          // Unescape common escape sequences
          content = content.replace(/\\n/g, "\n");
          content = content.replace(/\\"/g, '"');
          content = content.replace(/\\\\/g, "\\");

          // Clean up extra whitespace but preserve paragraph breaks
          content = content.replace(/[ \t]+/g, " ").trim();

          // Now extract reference from CLEANED content (has visible verse numbers)
          const bookCode = extractBookFromPath(hit.path);
          const verseRef = extractVerseRef(content);
          const extractedRef =
            bookCode && verseRef ? `${bookCode} ${verseRef}` : "";

          // Get lookup information, passing the extracted reference
          const lookupInfo = getLookupInfo(hit, extractedRef);

          // Format: each result as markdown section with full content
          return `### ${index + 1}. ${resourceDisplay} [${typeDisplay}]\n\n**${locationDisplay}** | Score: ${hit.score?.toFixed(2) || "N/A"}\n\n${lookupInfo}\n\n**Content:**\n\`\`\`\n${content}\n\`\`\``;
        })
        .join("\n\n---\n\n")
    );
  },
};

// Tool registry with endpoint mappings
export const ToolRegistry = {
  fetch_scripture: {
    endpoint: "/api/fetch-scripture",
    formatter: ToolFormatters.scripture,
    requiredParams: [], // Reference is optional when search is provided
  },
  fetch_translation_notes: {
    endpoint: "/api/fetch-translation-notes",
    formatter: ToolFormatters.notes,
    requiredParams: [], // Reference is optional when search is provided
  },
  fetch_translation_questions: {
    endpoint: "/api/fetch-translation-questions",
    formatter: ToolFormatters.questions,
    requiredParams: [], // Reference is optional when search is provided
  },
  fetch_translation_word: {
    endpoint: "/api/fetch-translation-word",
    formatter: ToolFormatters.words,
    requiredParams: [], // term optional when using filter
  },
  fetch_translation_word_links: {
    endpoint: "/api/fetch-translation-word-links",
    formatter: ToolFormatters.words, // Uses same formatter as words
    requiredParams: [], // reference optional when using filter
  },
  fetch_translation_academy: {
    endpoint: "/api/fetch-translation-academy",
    formatter: ToolFormatters.academy,
    requiredParams: [], // At least one of moduleId, path, or rcLink should be provided, but we don't enforce it here
  },
  search_biblical_resources: {
    endpoint: "/api/search",
    formatter: ToolFormatters.search,
    requiredParams: ["query"],
  },
};
