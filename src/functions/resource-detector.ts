/**
 * Resource Detector Service
 * Unified DCS catalog discovery to minimize API calls
 * Caches resource availability and provides metadata to other services
 */

import { ResourceType } from "../constants/terminology";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";

export interface ResourceContext {
  identifier: string;
  subject: string;
  organization?: string;
  language?: string;
  name?: string;
  title?: string;
  description?: string;
}

export interface ResourceDetectionResult {
  type: ResourceType | null;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{ type: ResourceType; confidence: number; reason: string }>;
  context?: ResourceContext;
}

export interface CatalogDetectionResult {
  detection: ResourceDetectionResult;
  resource: Record<string, unknown>;
}

/**
 * Detect resource type from identifier and subject patterns
 * Implements the algorithm from Task 7 implementation plan
 */
export function detectResourceType(context: ResourceContext): ResourceDetectionResult {
  const reasoning: string[] = [];
  const alternatives: Array<{ type: ResourceType; confidence: number; reason: string }> = [];
  let bestMatch: { type: ResourceType; confidence: number } | null = null;

  if (!context.identifier || !context.subject) {
    return {
      type: null,
      confidence: 0,
      reasoning: ["Missing identifier or subject"],
      alternatives: [],
      context,
    };
  }

  const identifier = context.identifier.toLowerCase();
  const subject = context.subject.toLowerCase();

  // High confidence patterns - exact identifier matches
  // Check longer patterns first to avoid partial matches (twl before tw)
  const exactPatterns: Array<{ pattern: string; type: ResourceType }> = [
    { pattern: "twl", type: ResourceType.TWL },
    { pattern: "ult", type: ResourceType.ULT },
    { pattern: "glt", type: ResourceType.GLT },
    { pattern: "ust", type: ResourceType.UST },
    { pattern: "gst", type: ResourceType.GST },
    { pattern: "tn", type: ResourceType.TN },
    { pattern: "tw", type: ResourceType.TW },
    { pattern: "tq", type: ResourceType.TQ },
    { pattern: "ta", type: ResourceType.TA },
    { pattern: "uhb", type: ResourceType.UHB },
    { pattern: "ugnt", type: ResourceType.UGNT },
  ];

  // Check for exact resource type in identifier
  for (const { pattern, type } of exactPatterns) {
    if (
      identifier.includes(`_${pattern}`) ||
      (identifier.endsWith(pattern) &&
        (identifier.length === pattern.length ||
          identifier[identifier.length - pattern.length - 1] === "_"))
    ) {
      bestMatch = { type, confidence: 0.95 };
      reasoning.push(`Exact identifier match: found '${pattern}' in '${identifier}'`);
      break;
    }
  }

  // Medium confidence patterns - subject-based detection
  // NOTE: Check TWL before TW to avoid mismatching
  if (!bestMatch) {
    if (subject.includes("bible") || subject.includes("aligned bible")) {
      if (identifier.includes("ult") || identifier.includes("glt")) {
        bestMatch = { type: ResourceType.ULT, confidence: 0.8 };
        reasoning.push(`Bible subject with literal identifier: '${identifier}'`);
      } else if (identifier.includes("ust") || identifier.includes("gst")) {
        bestMatch = { type: ResourceType.UST, confidence: 0.8 };
        reasoning.push(`Bible subject with simplified identifier: '${identifier}'`);
      } else {
        // Default to ULT for generic Bible subjects
        bestMatch = { type: ResourceType.ULT, confidence: 0.6 };
        reasoning.push(`Generic Bible subject, defaulting to ULT`);
      }
    } else if (subject.includes("translation notes")) {
      bestMatch = { type: ResourceType.TN, confidence: 0.85 };
      reasoning.push(`Translation Notes subject detected`);
    } else if (
      subject.includes("translation word links") ||
      subject.includes("translation words links")
    ) {
      bestMatch = { type: ResourceType.TWL, confidence: 0.85 };
      reasoning.push(`Translation Words Links subject detected`);
    } else if (subject.includes("translation words")) {
      bestMatch = { type: ResourceType.TW, confidence: 0.85 };
      reasoning.push(`Translation Words subject detected`);
    } else if (subject.includes("translation questions")) {
      bestMatch = { type: ResourceType.TQ, confidence: 0.85 };
      reasoning.push(`Translation Questions subject detected`);
    } else if (subject.includes("translation academy")) {
      bestMatch = { type: ResourceType.TA, confidence: 0.85 };
      reasoning.push(`Translation Academy subject detected`);
    } else if (subject.includes("hebrew bible")) {
      bestMatch = { type: ResourceType.UHB, confidence: 0.9 };
      reasoning.push(`Hebrew Bible subject detected`);
    } else if (subject.includes("greek new testament") || subject.includes("greek nt")) {
      bestMatch = { type: ResourceType.UGNT, confidence: 0.9 };
      reasoning.push(`Greek New Testament subject detected`);
    }
  }

  // Low confidence fallback patterns
  if (!bestMatch) {
    reasoning.push(
      `No clear pattern match for identifier '${identifier}' and subject '${subject}'`
    );
    return {
      type: null,
      confidence: 0,
      reasoning,
      alternatives: [],
      context,
    };
  }

  // Confidence adjustments based on context
  let finalConfidence = bestMatch.confidence;

  // Reduce confidence for obviously wrong combinations
  if (
    subject.includes("quantum physics") ||
    subject.includes("cooking") ||
    subject.includes("sports")
  ) {
    finalConfidence = Math.max(0.1, finalConfidence - 0.8);
    reasoning.push(`Subject appears non-biblical, reducing confidence`);
  }

  // Boost confidence for organization match
  if (context.organization === "unfoldingWord" || context.organization === "Door43-Catalog") {
    finalConfidence = Math.min(1.0, finalConfidence + 0.05);
    reasoning.push(`Trusted organization: ${context.organization}`);
  }

  return {
    type: bestMatch.type,
    confidence: finalConfidence,
    reasoning,
    alternatives,
    context,
  };
}

/**
 * Detect resource types from catalog response data
 * Processes multiple resources at once for efficiency
 */
export function detectResourcesFromCatalog(
  catalogData: Record<string, unknown>[]
): CatalogDetectionResult[] {
  return catalogData.map((resource) => {
    const context: ResourceContext = {
      identifier: typeof resource.name === "string" ? resource.name : "",
      subject: typeof resource.subject === "string" ? resource.subject : "",
      organization:
        typeof resource.organization === "string"
          ? resource.organization
          : typeof resource.owner === "object" &&
              resource.owner &&
              typeof (resource.owner as Record<string, unknown>).login === "string"
            ? ((resource.owner as Record<string, unknown>).login as string)
            : "",
      language: typeof resource.language === "string" ? resource.language : "",
      name: typeof resource.name === "string" ? resource.name : "",
      title: typeof resource.title === "string" ? resource.title : "",
      description: typeof resource.description === "string" ? resource.description : "",
    };

    const detection = detectResourceType(context);

    return {
      detection,
      resource: resource,
    };
  });
}

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
        const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=${encodeURIComponent(subject)}&lang=${language}&owner=${organization}&metadataType=rc&includeMetadata=true`;
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
          name: resource.name,
          title: resource.title || resource.door43_metadata?.title || resource.description,
          subject,
          url: `https://git.door43.org/${organization}/${resource.name}`,
          ingredients: resource.ingredients || resource.door43_metadata?.ingredients || resource.metadata?.ingredients || []
        }));

        console.log(`📊 Found ${resources.length} ${subject} resources`);
        if (resources.length > 0) {
          console.log(`🔍 First resource ingredients:`, resources[0].ingredients?.slice(0, 3));
        }
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
