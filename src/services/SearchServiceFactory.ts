/**
 * SearchServiceFactory - Resource-Specific Search Configurations
 *
 * KISS: Simple factory for creating configured SearchService instances
 * DRY: Centralized search configuration per resource type
 * Stateless: Each factory call creates a fresh, ephemeral SearchService
 *
 * IMPORTANT: SearchService instances are EPHEMERAL and PER-REQUEST
 * - Created fresh for each API request
 * - Exist only in memory during the request
 * - Garbage collected when request completes
 * - NO CACHING OR PERSISTENCE OF ANY KIND
 */

import {
  SearchService,
  type SearchDocument,
  type SearchOptions,
} from "./SearchService.js";

export type ResourceType =
  | "scripture"
  | "notes"
  | "questions"
  | "words"
  | "academy";

/**
 * Resource-specific search configurations
 */
const RESOURCE_CONFIGS: Record<ResourceType, SearchOptions> = {
  scripture: {
    fuzzy: 0.1, // Reduced from 0.2 - only allow 10% character difference
    prefix: true,
    boost: { content: 5 }, // Increased boost for exact matches
    maxResults: 100,
    contextLength: 200, // Show more context for scripture
  },

  notes: {
    fuzzy: 0.2,
    prefix: true,
    boost: { content: 2 }, // Balanced boost for notes
    maxResults: 50,
    contextLength: 150,
  },

  questions: {
    fuzzy: 0.2,
    prefix: true,
    boost: { content: 2.5 }, // Slightly higher for Q&A
    maxResults: 50,
    contextLength: 150,
  },

  words: {
    fuzzy: 0.15, // Less fuzzy for terminology
    prefix: true,
    boost: { content: 3 }, // High boost for word definitions
    maxResults: 30,
    contextLength: 200,
  },

  academy: {
    fuzzy: 0.2,
    prefix: true,
    boost: { content: 2 },
    maxResults: 50,
    contextLength: 180,
  },
};

/**
 * Create a fresh, ephemeral SearchService for a specific resource type
 *
 * CRITICAL: This creates a NEW instance every time it's called
 * The instance exists ONLY in memory for the duration of the request
 * NO caching, NO persistence, NO state carried between requests
 */
export function createSearchService(
  _resourceType: ResourceType,
): SearchService {
  return new SearchService();
}

/**
 * Get search options for a specific resource type
 */
export function getSearchOptions(resourceType: ResourceType): SearchOptions {
  return { ...RESOURCE_CONFIGS[resourceType] };
}

/**
 * Apply search to fetched data
 *
 * This is the main pattern for endpoint integration:
 * 1. Fetch fresh data from source
 * 2. If search param provided, create temporary search service
 * 3. Index data in memory
 * 4. Search and filter results
 * 5. Return enhanced results
 * 6. Let garbage collector clean up the search service
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

  // Create fresh, ephemeral search service
  const searchService = createSearchService(resourceType);
  const options = getSearchOptions(resourceType);

  // Map data to search documents with index for uniqueness
  const documents = data
    .map((item, index) => documentMapper(item, index))
    .filter((doc): doc is SearchDocument => doc !== null);

  if (documents.length === 0) {
    return []; // Nothing to search
  }

  // Index documents IN MEMORY ONLY
  await searchService.indexDocuments(documents);

  // Perform search
  const results = await searchService.search(query, options);

  // Create result map for quick lookup
  const resultMap = new Map(results.map((r) => [r.id, r]));

  // Filter and enhance original data with search scores
  const enhanced = data
    .filter((item, index) => {
      // Find corresponding search result
      const doc = documentMapper(item, index);
      return doc && resultMap.has(doc.id);
    })
    .map((item, index) => {
      const doc = documentMapper(item, index);
      const searchResult = doc ? resultMap.get(doc.id) : null;

      return {
        ...item,
        searchScore: searchResult?.score,
        matchedTerms: searchResult?.match.terms,
      };
    })
    .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0)); // Sort by relevance

  // SearchService will be garbage collected here
  return enhanced;
}
