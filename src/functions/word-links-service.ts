/**
 * Word Links Service
 * Shared core implementation for fetching translation word links
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseReference } from "./reference-parser";
import { cache } from "./cache";

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
    return {
      translationWordLinks: cachedResponse.value.translationWordLinks || [],
      citation: cachedResponse.value.citation,
      metadata: {
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        linksFound: cachedResponse.value.translationWordLinks?.length || 0,
      },
    };
  }

  console.log(`🔄 Processing fresh word links request: ${responseKey}`);

  // Search catalog for Translation Word Links
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Word%20Links&lang=${language}&owner=${organization}`;
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

  // Get the translation word links for this reference
  const linksUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/twl_${reference.book.toUpperCase()}.tsv`;
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

  // Parse the word links TSV
  const wordLinks = parseWordLinksFromTSV(linksData, reference);
  console.log(`🔗 Parsed ${wordLinks.length} word links`);

  const result: WordLinksResult = {
    translationWordLinks: wordLinks,
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

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationWordLinks: result.translationWordLinks,
    citation: result.citation,
  });

  return result;
}

/**
 * Parse word links from TSV data for a specific reference
 */
function parseWordLinksFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number; verseEnd?: number }
): TranslationWordLink[] {
  const lines = tsvData.split("\n");
  const wordLinks: TranslationWordLink[] = [];

  // Skip header line
  if (lines.length > 0 && lines[0].startsWith("Reference")) {
    lines.shift();
  }

  for (const line of lines) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns.length < 5) continue;

    const [ref, id, tags, supportReference, originalWords] = columns;

    // Parse the reference
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch) continue;

    const chapterNum = parseInt(refMatch[1]);
    const verseNum = parseInt(refMatch[2]);

    // Check if this word link is in our range
    let include = false;

    if (reference.verse && reference.verseEnd) {
      // Verse range within same chapter
      include =
        chapterNum === reference.chapter &&
        verseNum >= reference.verse &&
        verseNum <= reference.verseEnd;
    } else if (reference.verse) {
      // Single verse
      include = chapterNum === reference.chapter && verseNum === reference.verse;
    } else {
      // Full chapter
      include = chapterNum === reference.chapter;
    }

    if (include && id) {
      wordLinks.push({
        word: id,
        occurrences: 1,
        twlid: id,
        reference: `${reference.book} ${ref}`,
        id,
        tags,
        origWords: originalWords,
        occurrence: 1,
      });
    }
  }

  console.log(`🔗 Parsed ${wordLinks.length} word links`);
  return wordLinks;
}
