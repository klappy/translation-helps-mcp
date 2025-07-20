/**
 * Scripture Service
 * Shared core implementation for fetching scripture text
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseReference } from "./reference-parser";
import { cache } from "./cache";
import {
  extractVerseText,
  extractVerseRange,
  extractChapterText,
  extractChapterRange,
} from "./usfm-extractor";

export interface ScriptureOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeVerseNumbers?: boolean;
  format?: "text" | "usfm";
}

export interface ScriptureResult {
  scripture?: {
    text: string;
    translation: string;
    citation: {
      resource: string;
      organization: string;
      language: string;
      url: string;
      version: string;
    };
  };
  scriptures?: Array<{
    text: string;
    translation: string;
    citation: {
      resource: string;
      organization: string;
      language: string;
      url: string;
      version: string;
    };
  }>;
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    includeVerseNumbers: boolean;
    format: string;
  };
}

/**
 * Core scripture fetching logic - extracted from working Netlify function
 */
export async function fetchScripture(options: ScriptureOptions): Promise<ScriptureResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
    includeVerseNumbers = true,
    format = "text",
  } = options;

  console.log(`📖 Core scripture service called with:`, {
    reference: referenceParam,
    language,
    organization,
    includeVerseNumbers,
    format,
  });

  // Check for cached transformed response FIRST
  const responseKey = `scripture:${referenceParam}:${language}:${organization}:${includeVerseNumbers}:${format}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed scripture: ${responseKey}`);
    return {
      ...cachedResponse.value,
      metadata: {
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        includeVerseNumbers,
        format,
      },
    };
  }

  console.log(`🔄 Processing fresh scripture request: ${responseKey}`);

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Search catalog for Scripture
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Aligned%20Bible&lang=${language}&owner=${organization}`;
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

  console.log(`📊 Found ${catalogData.data?.length || 0} scripture resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No scripture found for ${language}/${organization}`);
  }

  const resource = catalogData.data[0];
  console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

  // Find the correct file from ingredients
  const ingredient = resource.ingredients?.find(
    (ing: any) => ing.identifier === reference.book.toLowerCase()
  );

  if (!ingredient) {
    throw new Error(`Book ${reference.book} not found in resource ${resource.name}`);
  }

  // Build URL for the USFM file
  const fileUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching from: ${fileUrl}`);

  // Try to get from cache first
  const cacheKey = `usfm:${fileUrl}`;
  let usfmData = await cache.getFileContent(cacheKey);

  if (!usfmData) {
    console.log(`🔄 Cache miss for USFM file, downloading...`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error(`❌ Failed to fetch USFM file: ${fileResponse.status}`);
      throw new Error(`Failed to fetch scripture content: ${fileResponse.status}`);
    }

    usfmData = await fileResponse.text();
    console.log(`📄 Downloaded ${usfmData.length} characters of USFM data`);

    // Cache the file content
    await cache.setFileContent(cacheKey, usfmData);
    console.log(`💾 Cached USFM file (${usfmData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for USFM file (${usfmData.length} chars)`);
  }

  // Extract scripture text based on reference type
  let text = "";

  if (reference.verse && reference.verseEnd) {
    // Verse range
    text = extractVerseRange(usfmData, reference.chapter, reference.verse, reference.verseEnd);
  } else if (reference.verse) {
    // Single verse
    text = extractVerseText(usfmData, reference.chapter, reference.verse);
  } else if (reference.verseEnd) {
    // Chapter range (using verseEnd as end chapter)
    text = extractChapterRange(usfmData, reference.chapter, reference.verseEnd);
  } else {
    // Full chapter
    text = extractChapterText(usfmData, reference.chapter);
  }

  if (!text.trim()) {
    throw new Error(`No scripture text found for ${referenceParam}`);
  }

  console.log(`📝 Extracted ${text.length} characters of scripture text`);

  const result: ScriptureResult = {
    scripture: {
      text: text.trim(),
      translation: resource.title,
      citation: {
        resource: resource.name,
        organization,
        language,
        url: `https://git.door43.org/${organization}/${resource.name}`,
        version: "master",
      },
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      includeVerseNumbers,
      format,
    },
  };

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    scripture: result.scripture,
  });

  return result;
}
