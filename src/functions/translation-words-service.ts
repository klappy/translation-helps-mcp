/**
 * Translation Words Service
 * Fetches translation words from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";

export interface TranslationWord {
  id: string;
  word: string;
  definition: string;
  translationHelps?: string[];
  examples?: Array<{
    reference: string;
    text: string;
  }>;
  related?: string[];
}

export interface TranslationWordsOptions {
  reference: string;
  language?: string;
  organization?: string;
  category?: string;
}

export interface TranslationWordsResult {
  translationWords: TranslationWord[];
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
    wordsFound: number;
  };
}

/**
 * Core translation words fetching logic with unified resource discovery
 */
export async function fetchTranslationWords(
  options: TranslationWordsOptions
): Promise<TranslationWordsResult> {
  const startTime = Date.now();
  const { reference, language = "en", organization = "unfoldingWord", category } = options;

  const parsedRef = parseReference(reference);
  if (!parsedRef) {
    throw new Error(`Invalid reference format: ${reference}`);
  }

  console.log(`📚 Core translation words service called with:`, {
    reference,
    language,
    organization,
    category,
  });

  // Check cache first
  const responseKey = `words:${reference}:${language}:${organization}:${category || "all"}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed words: ${responseKey}`);
    return {
      translationWords: cachedResponse.value.translationWords,
      citation: cachedResponse.value.citation,
      metadata: {
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        wordsFound: cachedResponse.value.translationWords?.length || 0,
      },
    };
  }

  console.log(`🔄 Processing fresh words request: ${responseKey}`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  console.log(`🔍 Using unified resource discovery for translation words...`);
  const resourceInfo = await getResourceForBook(reference, "words", language, organization);

  if (!resourceInfo) {
    throw new Error(`No translation words found for ${language}/${organization}`);
  }

  console.log(`📖 Using resource: ${resourceInfo.name} (${resourceInfo.title})`);

  // Translation words are organized differently - we need to fetch the word links first
  // Then fetch individual word definitions

  // Try to find translation word links for this book
  const linksIngredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) =>
      ing.identifier === `${parsedRef.book.toLowerCase()}_links` ||
      ing.identifier === parsedRef.book.toLowerCase()
  );

  if (!linksIngredient) {
    console.warn(
      `⚠️ Translation word links for ${parsedRef.book} not found in resource ${resourceInfo.name}`
    );
    throw new Error(
      `Translation word links for ${parsedRef.book} not found in resource ${resourceInfo.name}`
    );
  }

  // Build URL for the links file
  const linksUrl = `https://git.door43.org/${organization}/${resourceInfo.name}/raw/branch/master/${linksIngredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching word links from: ${linksUrl}`);

  // Try to get links from cache first
  const linksCacheKey = `tw-links:${linksUrl}`;
  let linksData = await cache.getFileContent(linksCacheKey);

  if (!linksData) {
    console.log(`🔄 Cache miss for TW links file, downloading...`);
    const linksResponse = await fetch(linksUrl);
    if (!linksResponse.ok) {
      console.error(`❌ Failed to fetch TW links file: ${linksResponse.status}`);
      throw new Error(`Failed to fetch translation word links: ${linksResponse.status}`);
    }

    linksData = await linksResponse.text();
    console.log(`📄 Downloaded ${linksData.length} characters of word links data`);

    // Cache the file content
    await cache.setFileContent(linksCacheKey, linksData);
    console.log(`💾 Cached TW links file (${linksData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for TW links file (${linksData.length} chars)`);
  }

  // Parse the word links for the specific verse/chapter
  const wordIds = parseWordLinksFromTSV(linksData, parsedRef);
  console.log(`📝 Found ${wordIds.length} word links for ${reference}`);

  // For now, return empty array if no words found (to match existing behavior)
  // Individual word fetching would happen here in full implementation
  const words: TranslationWord[] = [];

  const result: TranslationWordsResult = {
    translationWords: words,
    citation: {
      resource: resourceInfo.name,
      organization,
      language,
      url: resourceInfo.url || `https://git.door43.org/${organization}/${resourceInfo.name}`,
      version: "master",
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      wordsFound: words.length,
    },
  };

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationWords: result.translationWords,
    citation: result.citation,
  });

  console.log(`📚 Processed ${words.length} translation words`);

  return result;
}

/**
 * Parse word links from TSV data
 */
function parseWordLinksFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number }
): string[] {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  const wordIds: string[] = [];

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 5) continue; // Skip malformed lines

    const [ref, , , , wordId] = columns;

    // Parse the reference to check if it matches
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch) continue;

    const chapterNum = parseInt(refMatch[1]);
    const verseNum = parseInt(refMatch[2]);

    // Check if this word link is in our range
    let include = false;
    if (reference.verse) {
      include = chapterNum === reference.chapter && verseNum === reference.verse;
    } else {
      include = chapterNum === reference.chapter;
    }

    if (include && wordId && wordId.trim()) {
      wordIds.push(wordId.trim());
    }
  }

  return [...new Set(wordIds)]; // Remove duplicates
}
