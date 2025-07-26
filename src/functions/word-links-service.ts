/**
 * Word Links Service
 * Shared core implementation for fetching translation word links
 * Used by both Netlify functions and MCP tools for consistency
 */

import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { parseTSV } from "../config/RouteGenerator";

export interface TranslationWordLink {
  word: string;
  occurrences: number;
  twlid: string;
  reference?: string;
  id?: string;
  tags?: string;
  origWords?: string;
  occurrence?: number;
}

export interface WordLinksOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface WordLinksResult {
  translationWordLinks: TranslationWordLink[];
  citation: {
    resource: string;
    organization: string;
    language: string;
    url: string;
    version: string;
  };
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    linksFound: number;
  };
}

/**
 * Core word links fetching logic
 */
export async function fetchWordLinks(options: WordLinksOptions): Promise<WordLinksResult> {
  const startTime = Date.now();
  const { reference: referenceParam, language = "en", organization = "unfoldingWord" } = options;

  console.log(`🔗 Core word links service called with:`, {
    reference: referenceParam,
    language,
    organization,
  });

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Check for cached transformed response FIRST
  const responseKey = `wordlinks:${referenceParam}:${language}:${organization}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed word links: ${responseKey}`);
    // Return cached response as-is
    return {
      ...cachedResponse.value,
      metadata: {
        ...cachedResponse.value.metadata,
        cached: true,
        responseTime: Date.now() - startTime,
      },
    };
  }

  console.log(`🔄 Processing fresh word links request: ${responseKey}`);

  // Search catalog for Translation Word Links
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Words%20Links&lang=${language}&owner=${organization}`;
  console.log(`🔍 Searching catalog: ${catalogUrl}`);

  const catalogResponse = await fetch(catalogUrl);
  if (!catalogResponse.ok) {
    console.error(`❌ Catalog search failed: ${catalogResponse.status}`);
    throw new Error(`Failed to search catalog: ${catalogResponse.status}`);
  }

  const catalogData = (await catalogResponse.json()) as {
    data?: Array<{
      name: string;
      title: string;
      ingredients?: Array<{
        identifier: string;
        path: string;
      }>;
    }>;
  };

  console.log(`📊 Found ${catalogData.data?.length || 0} word links resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No translation word links found for ${language}/${organization}`);
  }

  const resource = catalogData.data[0];
  console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

  // Find the correct file from ingredients
  const ingredient = resource.ingredients?.find(
    (ing: { identifier?: string }) =>
      ing.identifier === reference.book.toLowerCase() ||
      ing.identifier === reference.book.toUpperCase() ||
      ing.identifier === reference.book
  );

  if (!ingredient) {
    throw new Error(`Book ${reference.book} not found in resource ${resource.name}`);
  }

  // Build URL using the ingredient path
  const linksUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching from: ${linksUrl}`);

  // Try to get from cache first
  const cacheKey = `twl:${linksUrl}`;
  let linksData = await cache.getFileContent(cacheKey);

  if (!linksData) {
    console.log(`🔄 Cache miss for TWL file, downloading...`);
    const linksResponse = await fetch(linksUrl);
    if (!linksResponse.ok) {
      console.error(`❌ Failed to fetch TWL file: ${linksResponse.status}`);
      throw new Error(`Failed to fetch translation word links: ${linksResponse.status}`);
    }

    linksData = await linksResponse.text();
    console.log(`📄 Downloaded ${linksData.length} characters of TWL data`);

    // Cache the file content
    await cache.setFileContent(cacheKey, linksData);
    console.log(`💾 Cached TWL file (${linksData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for TWL file (${linksData.length} chars)`);
  }

  // Parse the word links TSV - automatic parsing preserves exact structure
  const wordLinks = parseWordLinksFromTSV(linksData, reference);
  console.log(`🔗 Parsed ${wordLinks.length} word links`);

  // Return the raw TSV structure without transformation
  const result = {
    links: wordLinks,  // Direct TSV structure, no renaming
    citation: {
      resource: resource.name,
      organization,
      language,
      url: `https://git.door43.org/${organization}/${resource.name}`,
      version: "master",
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      linksFound: wordLinks.length,
    },
  };

  // Cache the response
  await cache.setTransformedResponse(responseKey, result);

  return result;
}

/**
 * Parse word links from TSV data for a specific reference - using automatic parsing
 */
function parseWordLinksFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number; verseEnd?: number }
): any[] {
  // Use the generic parseTSV to preserve exact structure
  const allRows = parseTSV(tsvData);
  
  // Filter rows based on reference
  return allRows.filter(row => {
    const ref = row.Reference;
    if (!ref) return false;
    
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch) return false;

    const chapterNum = parseInt(refMatch[1]);
    const verseNum = parseInt(refMatch[2]);

    // Check if this word link is in our range
    if (reference.verse && reference.verseEnd) {
      // Verse range within same chapter
      return chapterNum === reference.chapter &&
             verseNum >= reference.verse &&
             verseNum <= reference.verseEnd;
    } else if (reference.verse) {
      // Single verse
      return chapterNum === reference.chapter && verseNum === reference.verse;
    } else {
      // Full chapter
      return chapterNum === reference.chapter;
    }
  }).map(row => ({
    ...row,
    Reference: `${reference.book} ${row.Reference}` // Keep original field name
  }));
}
