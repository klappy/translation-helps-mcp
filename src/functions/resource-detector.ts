/**
 * Resource Detector Service
 * Unified DCS catalog discovery to minimize API calls
 * Caches resource availability and provides metadata to other services
 */

import { cache } from "./cache";
import { parseReference } from "./reference-parser";

export interface ResourceCatalogInfo {
  name: string;
  title: string;
  subject: string;
  ingredients?: Array<{
    identifier: string;
    path: string;
  }>;
  url?: string;
}

export interface ResourceAvailability {
  scripture: ResourceCatalogInfo[];
  notes: ResourceCatalogInfo[];
  questions: ResourceCatalogInfo[];
  words: ResourceCatalogInfo[];
  wordLinks: ResourceCatalogInfo[];
  lastUpdated: string;
  book: string;
  organization: string;
  language: string;
}

/**
 * Discover all available resources for a book/language/organization in one shot
 * Caches results to minimize DCS catalog API calls
 */
export async function discoverAvailableResources(
  reference: string,
  language: string = "en",
  organization: string = "unfoldingWord"
): Promise<ResourceAvailability> {
  const parsedRef = parseReference(reference);
  if (!parsedRef) {
    throw new Error(`Invalid reference format: ${reference}`);
  }
  const book = parsedRef.book;

  // Cache key for this book/language/org combination
  const cacheKey = `resource-discovery:${book}:${language}:${organization}`;

  // Try cache first
  const cached = await cache.getWithCacheInfo(cacheKey, "metadata");
  if (cached.value) {
    console.log(`🎯 Resource discovery cache HIT for ${book}/${language}/${organization}`);
    return cached.value;
  }

  console.log(`🔍 Discovering resources for ${book}/${language}/${organization}`);

  const availability: ResourceAvailability = {
    scripture: [],
    notes: [],
    questions: [],
    words: [],
    wordLinks: [],
    lastUpdated: new Date().toISOString(),
    book,
    organization,
    language,
  };

  // Parallel catalog searches for all resource types
  const searches = [
    {
      type: "scripture" as keyof ResourceAvailability,
      subjects: ["Bible", "Aligned Bible"],
    },
    {
      type: "notes" as keyof ResourceAvailability,
      subjects: ["TSV Translation Notes"],
    },
    {
      type: "questions" as keyof ResourceAvailability,
      subjects: ["TSV Translation Questions"],
    },
    {
      type: "words" as keyof ResourceAvailability,
      subjects: ["Translation Words"],
    },
    {
      type: "wordLinks" as keyof ResourceAvailability,
      subjects: ["Translation Word Links"],
    },
  ];

  const searchPromises = searches.flatMap((search) =>
    search.subjects.map(async (subject) => {
      try {
        const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=${encodeURIComponent(subject)}&lang=${language}&owner=${organization}`;
        console.log(`🔍 Catalog search: ${subject} for ${language}/${organization}`);

        const response = await fetch(catalogUrl);
        if (!response.ok) {
          console.warn(`⚠️ Catalog search failed for ${subject}: ${response.status}`);
          return { type: search.type, resources: [] };
        }

        const data = (await response.json()) as {
          data?: ResourceCatalogInfo[];
        };

        const resources = (data.data || []).map((resource) => ({
          ...resource,
          subject,
          url: `https://git.door43.org/${organization}/${resource.name}`,
        }));

        console.log(`📊 Found ${resources.length} ${subject} resources`);
        return { type: search.type, resources };
      } catch (error) {
        console.warn(`⚠️ Catalog search error for ${subject}:`, error);
        return { type: search.type, resources: [] };
      }
    })
  );

  // Wait for all searches to complete
  const searchResults = await Promise.all(searchPromises);

  // Aggregate results by resource type
  for (const result of searchResults) {
    const existing = availability[result.type] as ResourceCatalogInfo[];
    existing.push(...result.resources);
  }

  // Remove duplicates within each resource type
  availability.scripture = availability.scripture.filter(
    (resource, index, arr) => arr.findIndex((r) => r.name === resource.name) === index
  );
  availability.notes = availability.notes.filter(
    (resource, index, arr) => arr.findIndex((r) => r.name === resource.name) === index
  );
  availability.questions = availability.questions.filter(
    (resource, index, arr) => arr.findIndex((r) => r.name === resource.name) === index
  );
  availability.words = availability.words.filter(
    (resource, index, arr) => arr.findIndex((r) => r.name === resource.name) === index
  );
  availability.wordLinks = availability.wordLinks.filter(
    (resource, index, arr) => arr.findIndex((r) => r.name === resource.name) === index
  );

  // Cache the discovery results
  await cache.set(cacheKey, availability, "metadata");

  const totalResources =
    availability.scripture.length +
    availability.notes.length +
    availability.questions.length +
    availability.words.length +
    availability.wordLinks.length;

  console.log(
    `🎯 Resource discovery complete: ${totalResources} total resources found for ${book}`
  );

  return availability;
}

/**
 * Get specific resource info for a resource type and book
 * Uses cached discovery data when available
 */
export async function getResourceForBook(
  reference: string,
  resourceType: "scripture" | "notes" | "questions" | "words" | "wordLinks",
  language: string = "en",
  organization: string = "unfoldingWord"
): Promise<ResourceCatalogInfo | null> {
  const availability = await discoverAvailableResources(reference, language, organization);
  const resources = availability[resourceType];

  if (!resources || resources.length === 0) {
    return null;
  }

  // Return the first (usually best) resource of this type
  return resources[0];
}

/**
 * Check if any resources exist for a reference without fetching full details
 * Super fast check using cached discovery data
 */
export async function checkResourceAvailability(
  reference: string,
  language: string = "en",
  organization: string = "unfoldingWord"
): Promise<{
  hasScripture: boolean;
  hasNotes: boolean;
  hasQuestions: boolean;
  hasWords: boolean;
  hasWordLinks: boolean;
  totalResources: number;
}> {
  const availability = await discoverAvailableResources(reference, language, organization);

  return {
    hasScripture: availability.scripture.length > 0,
    hasNotes: availability.notes.length > 0,
    hasQuestions: availability.questions.length > 0,
    hasWords: availability.words.length > 0,
    hasWordLinks: availability.wordLinks.length > 0,
    totalResources:
      availability.scripture.length +
      availability.notes.length +
      availability.questions.length +
      availability.words.length +
      availability.wordLinks.length,
  };
}
