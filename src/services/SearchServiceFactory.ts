/**
 * SearchServiceFactory - Simple In-Memory Search Filtering
 *
 * KISS: Simple string matching for filtering already-fetched data
 * DRY: Centralized search logic for all endpoints
 *
 * NOTE: This is for filtering within a single request's fetched data.
 * For broad discovery search, use the /api/search endpoint which uses AI Search.
 */

import { logger } from "../utils/logger.js";

export interface SearchDocument {
  id: string;
  content: string;
  path: string;
  resource: string;
  type: "bible" | "notes" | "words" | "academy" | "questions" | "obs";
}

export type ResourceType =
  | "scripture"
  | "notes"
  | "questions"
  | "words"
  | "academy";

export interface SearchOptions {
  fuzzy?: number;
  prefix?: boolean;
  boost?: { content: number };
  maxResults?: number;
  contextLength?: number;
}

/**
 * Resource-specific search configurations
 * Kept for API compatibility, but simplified
 */
const RESOURCE_CONFIGS: Record<ResourceType, SearchOptions> = {
  scripture: {
    maxResults: 500,
    contextLength: 150,
  },
  notes: {
    maxResults: 50,
    contextLength: 150,
  },
  questions: {
    maxResults: 50,
    contextLength: 150,
  },
  words: {
    maxResults: 30,
    contextLength: 200,
  },
  academy: {
    maxResults: 50,
    contextLength: 180,
  },
};

/**
 * Get search options for a specific resource type
 */
export function getSearchOptions(resourceType: ResourceType): SearchOptions {
  return { ...RESOURCE_CONFIGS[resourceType] };
}

/**
 * Simple string matching score calculator
 * Returns a relevance score based on term matches
 */
function calculateMatchScore(content: string, searchTerms: string[]): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  const matchedTerms: string[] = [];

  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();

    // Exact word match (highest score)
    const wordBoundaryRegex = new RegExp(
      `\\b${escapeRegex(lowerTerm)}\\b`,
      "gi",
    );
    const exactMatches = (lowerContent.match(wordBoundaryRegex) || []).length;
    if (exactMatches > 0) {
      score += exactMatches * 10;
      matchedTerms.push(term);
    }

    // Partial match (lower score)
    if (!exactMatches && lowerContent.includes(lowerTerm)) {
      score += 3;
      matchedTerms.push(term);
    }
  }

  // Bonus for multiple term matches
  if (matchedTerms.length > 1) {
    score *= 1 + matchedTerms.length * 0.2;
  }

  return score;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse search query into terms
 */
function parseSearchTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1); // Filter out single characters
}

/**
 * Apply search to fetched data using simple string matching
 *
 * This replaces MiniSearch with simple in-memory filtering.
 * For broad discovery, use the /api/search endpoint which uses AI Search.
 *
 * @param data - Freshly fetched data from resource
 * @param query - Search query string
 * @param resourceType - Type of resource being searched
 * @param documentMapper - Function to map resource data to SearchDocuments
 * @returns Filtered and ranked results with search scores
 */
export async function applySearch<T extends { id?: string }>(
  data: T[],
  query: string,
  resourceType: ResourceType,
  documentMapper: (item: T, index: number) => SearchDocument | null,
): Promise<Array<T & { searchScore?: number; matchedTerms?: string[] }>> {
  if (!query || query.trim().length === 0) {
    return data; // No search, return all data as-is
  }

  const options = getSearchOptions(resourceType);
  const searchTerms = parseSearchTerms(query);

  if (searchTerms.length === 0) {
    return data;
  }

  logger.debug("[Search] Applying simple search filter", {
    query,
    termCount: searchTerms.length,
    dataCount: data.length,
    resourceType,
  });

  // Score and filter data
  const scoredData = data
    .map((item, index) => {
      const doc = documentMapper(item, index);
      if (!doc) return null;

      const score = calculateMatchScore(doc.content, searchTerms);
      if (score === 0) return null;

      // Find matched terms
      const matchedTerms = searchTerms.filter((term) =>
        doc.content.toLowerCase().includes(term.toLowerCase()),
      );

      return {
        ...item,
        searchScore: score,
        matchedTerms,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Sort by score
  scoredData.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));

  // Apply max results limit
  const maxResults = options.maxResults || 50;
  const results = scoredData.slice(0, maxResults);

  logger.debug("[Search] Filter complete", {
    inputCount: data.length,
    matchCount: results.length,
  });

  return results;
}

/**
 * Create a simple search service (for backwards compatibility)
 * @deprecated Use applySearch directly instead
 */
export function createSearchService(_resourceType: ResourceType): {
  indexDocuments: (docs: SearchDocument[]) => Promise<void>;
  search: (
    query: string,
    options?: SearchOptions,
  ) => Promise<
    Array<{ id: string; score: number; match: { terms: string[] } }>
  >;
} {
  let indexedDocs: SearchDocument[] = [];

  return {
    async indexDocuments(docs: SearchDocument[]): Promise<void> {
      indexedDocs = docs;
    },

    async search(
      query: string,
      options?: SearchOptions,
    ): Promise<
      Array<{ id: string; score: number; match: { terms: string[] } }>
    > {
      const searchTerms = parseSearchTerms(query);
      const maxResults = options?.maxResults || 50;

      const results = indexedDocs
        .map((doc) => {
          const score = calculateMatchScore(doc.content, searchTerms);
          const matchedTerms = searchTerms.filter((term) =>
            doc.content.toLowerCase().includes(term.toLowerCase()),
          );
          return {
            id: doc.id,
            score,
            match: { terms: matchedTerms },
          };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      return results;
    },
  };
}
