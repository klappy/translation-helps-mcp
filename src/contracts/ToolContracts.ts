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
      return "No results found.";
    }

    return (
      `Found ${data.hits.length} results across ${data.resourceCount || 0} resources (took ${data.took_ms || 0}ms):\n\n` +
      data.hits
        .map((hit: any) => {
          return `**${hit.resource}** (${hit.type}) - ${hit.path} (Score: ${hit.score.toFixed(2)})\n> ${hit.preview.replace(/\n/g, " ")}`;
        })
        .join("\n\n")
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
    requiredParams: ["reference"],
  },
  fetch_translation_questions: {
    endpoint: "/api/fetch-translation-questions",
    formatter: ToolFormatters.questions,
    requiredParams: ["reference"],
  },
  fetch_translation_word: {
    endpoint: "/api/fetch-translation-word",
    formatter: ToolFormatters.words,
    requiredParams: ["term"],
  },
  fetch_translation_word_links: {
    endpoint: "/api/fetch-translation-word-links",
    formatter: ToolFormatters.words, // Uses same formatter as words
    requiredParams: ["reference"],
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
