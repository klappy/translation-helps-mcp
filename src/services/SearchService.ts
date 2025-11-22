/**
 * Search Service - BM25 Ranking with MiniSearch
 *
 * KISS: Simple, focused search operations
 * DRY: Reusable for all resource types
 * Antifragile: Handles malformed content gracefully
 */

import MiniSearch from "minisearch";
import { logger } from "../utils/logger.js";

export interface SearchDocument {
  id: string;
  content: string;
  path: string;
  resource: string;
  type: "bible" | "notes" | "words" | "academy" | "questions" | "obs";
}

export interface SearchResult {
  id: string;
  score: number;
  path: string;
  resource: string;
  type: string;
  preview: string;
  match: {
    terms: string[];
    positions?: number[];
  };
}

export interface SearchOptions {
  fuzzy?: number;
  prefix?: boolean;
  boost?: Record<string, number>;
  maxResults?: number;
  contextLength?: number;
}

/**
 * SearchService - Handles document indexing and BM25-like ranking
 */
export class SearchService {
  private miniSearch: MiniSearch<SearchDocument>;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ["content"], // Fields to index for full-text search
      storeFields: ["path", "resource", "type", "content"], // Fields to return
      searchOptions: {
        fuzzy: 0.2, // Default fuzzy matching for Bible terms
        prefix: true, // Enable prefix search for partial matches
        boost: { content: 2 }, // Boost content relevance
        combineWith: "AND", // Require all terms by default
      },
    });
  }

  /**
   * Index documents for searching
   */
  async indexDocuments(docs: SearchDocument[]): Promise<void> {
    const startTime = Date.now();

    try {
      // Filter out empty/invalid docs
      const validDocs = docs.filter(
        (doc) => doc && doc.id && doc.content && doc.content.trim().length > 0,
      );

      if (validDocs.length === 0) {
        logger.warn("[SearchService] No valid documents to index");
        return;
      }

      // Add all documents to the index
      this.miniSearch.addAll(validDocs);

      logger.info("[SearchService] Indexed documents", {
        count: validDocs.length,
        elapsed: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("[SearchService] Failed to index documents", {
        error: error instanceof Error ? error.message : String(error),
        docCount: docs.length,
      });
      throw error;
    }
  }

  /**
   * Search indexed documents
   */
  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const {
        fuzzy = 0.2,
        prefix = true,
        boost = { content: 2 },
        maxResults = 50,
        contextLength = 150,
      } = options;

      // Execute search
      const results = this.miniSearch.search(query, {
        fuzzy,
        prefix,
        boost,
      });

      // Limit results
      const limited = results.slice(0, maxResults);

      // Transform to our result format with previews
      const transformed: SearchResult[] = limited.map((result) => {
        const doc = result as any; // MiniSearch result includes stored fields

        return {
          id: result.id,
          score: result.score,
          path: doc.path || "",
          resource: doc.resource || "",
          type: doc.type || "unknown",
          preview: this.extractPreview(doc.content || "", query, contextLength),
          match: {
            terms: result.terms || [],
            positions: result.match?.content as number[] | undefined,
          },
        };
      });

      logger.info("[SearchService] Search completed", {
        query,
        resultsCount: transformed.length,
        elapsed: Date.now() - startTime,
      });

      return transformed;
    } catch (error) {
      logger.error("[SearchService] Search failed", {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extract preview snippet from content around query terms
   */
  extractPreview(
    content: string,
    query: string,
    maxLength: number = 150,
  ): string {
    if (!content || content.length === 0) {
      return "";
    }

    // Clean up content
    const cleanContent = content.replace(/\s+/g, " ").trim();

    // Find first occurrence of any query term
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2); // Ignore short terms

    let matchIndex = -1;
    let matchedTerm = "";

    for (const term of queryTerms) {
      const index = cleanContent.toLowerCase().indexOf(term);
      if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
        matchIndex = index;
        matchedTerm = term;
      }
    }

    // If no match found, return start of content
    if (matchIndex === -1) {
      return (
        cleanContent.substring(0, maxLength) +
        (cleanContent.length > maxLength ? "..." : "")
      );
    }

    // Calculate preview window around match
    const halfLength = Math.floor(maxLength / 2);
    const start = Math.max(0, matchIndex - halfLength);
    const end = Math.min(
      cleanContent.length,
      matchIndex + matchedTerm.length + halfLength,
    );

    let preview = cleanContent.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      preview = "..." + preview;
    }
    if (end < cleanContent.length) {
      preview = preview + "...";
    }

    return preview;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.miniSearch.removeAll();
  }

  /**
   * Get index stats
   */
  getStats(): {
    documentCount: number;
    termCount: number;
  } {
    return {
      documentCount: this.miniSearch.documentCount,
      termCount: this.miniSearch.termCount,
    };
  }
}
