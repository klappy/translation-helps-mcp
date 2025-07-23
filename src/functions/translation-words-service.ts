/**
 * Translation Words Service
 * Shared core implementation for fetching translation words
 * Used by both Netlify functions and MCP tools for consistency
 */

import { cache } from "./cache";
import { parseReference } from "./reference-parser";

export interface TranslationWord {
  term: string;
  definition: string;
  title?: string;
  subtitle?: string;
  content?: string;
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
 * Core translation words fetching logic
 */
export async function fetchTranslationWords(
  options: TranslationWordsOptions
): Promise<TranslationWordsResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
    category,
  } = options;

  console.log(`📚 Core translation words service called with:`, {
    reference: referenceParam,
    language,
    organization,
    category,
  });

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Check for cached transformed response FIRST
  const responseKey = `words:${referenceParam}:${language}:${organization}:${category || "all"}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed words: ${responseKey}`);
    return {
      translationWords: cachedResponse.value.translationWords || [],
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

  // Search catalog for Translation Words (try multiple subjects)
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Words&lang=${language}&owner=${organization}`;
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

  console.log(`📊 Found ${catalogData.data?.length || 0} translation words resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No translation words found for ${language}/${organization}`);
  }

  const resource = catalogData.data[0];
  console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

  // Translation words are organized differently - we need to fetch the word links first
  // Then fetch individual word definitions
  const words: TranslationWord[] = [];

  // Find the TWL file from ingredients for this book
  const ingredient = resource.ingredients?.find((ing: { path?: string }) => {
    const path = ing.path?.toLowerCase() || "";
    const bookLower = reference.book.toLowerCase();
    return (
      path.includes(`twl_${bookLower}`) || path.includes(`twl_${reference.book.toUpperCase()}`)
    );
  });

  if (!ingredient) {
    throw new Error(
      `Translation word links for ${reference.book} not found in resource ${resource.name}`
    );
  }

  // Build URL using the ingredient path
  const linksUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching word links from: ${linksUrl}`);

  // Try to get from cache first
  const linksCacheKey = `twl:${linksUrl}`;
  let linksData = await cache.getFileContent(linksCacheKey);

  if (!linksData) {
    console.log(`🔄 Cache miss for word links, downloading...`);
    const linksResponse = await fetch(linksUrl);
    if (!linksResponse.ok) {
      console.error(`❌ Failed to fetch word links: ${linksResponse.status}`);
      throw new Error(`Failed to fetch translation word links: ${linksResponse.status}`);
    }

    linksData = await linksResponse.text();
    console.log(`📄 Downloaded ${linksData.length} characters of word links data`);

    // Cache the file content
    await cache.setFileContent(linksCacheKey, linksData);
    console.log(`💾 Cached word links (${linksData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for word links (${linksData.length} chars)`);
  }

  // Parse the word links TSV to find words for this reference
  const linkedWords = parseWordLinksFromTSV(linksData, reference);
  console.log(`📝 Found ${linkedWords.length} linked words for reference`);

  // Fetch definitions for each linked word
  for (const wordId of linkedWords) {
    try {
      const wordDefinition = await fetchWordDefinition(wordId, resource, organization, language);
      if (wordDefinition) {
        words.push(wordDefinition);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch definition for word ${wordId}:`, error);
    }
  }

  const result: TranslationWordsResult = {
    translationWords: words,
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
      wordsFound: words.length,
    },
  };

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationWords: result.translationWords,
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
): string[] {
  const lines = tsvData.split("\n");
  const wordIds: string[] = [];

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
      wordIds.push(id);
    }
  }

  // Remove duplicates
  return [...new Set(wordIds)];
}

/**
 * Fetch definition for a specific translation word
 */
async function fetchWordDefinition(
  wordId: string,
  resource: { name: string; ingredients?: { path?: string; identifier?: string }[] },
  organization: string,
  language: string
): Promise<TranslationWord | null> {
  // Translation words are organized in directories by category
  const categories = ["kt", "names", "other"];

  for (const category of categories) {
    const wordUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/bible/${category}/${wordId}.md`;

    // Try to get from cache first
    const cacheKey = `tw:${wordUrl}`;
    let wordContent = await cache.getFileContent(cacheKey);

    if (!wordContent) {
      try {
        const wordResponse = await fetch(wordUrl);
        if (wordResponse.ok) {
          wordContent = await wordResponse.text();
          // Cache the file content
          await cache.setFileContent(cacheKey, wordContent);
          console.log(`📖 Fetched word definition for ${wordId} from ${category}`);
        } else {
          continue; // Try next category
        }
      } catch (error) {
        continue; // Try next category
      }
    } else {
      console.log(`✅ Cache hit for word ${wordId}`);
    }

    if (wordContent) {
      // Parse the markdown content
      const lines = wordContent.split("\n");
      let title = "";
      let definition = "";
      const content = wordContent;

      // Extract title (first heading)
      for (const line of lines) {
        if (line.startsWith("# ")) {
          title = line.substring(2).trim();
          break;
        }
      }

      // Extract definition (content after title)
      const contentStartIndex = lines.findIndex((line: string) => line.startsWith("# "));
      if (contentStartIndex >= 0) {
        definition =
          lines
            .slice(contentStartIndex + 1)
            .join("\n")
            .trim()
            .substring(0, 500) + "..."; // Truncate for brevity
      }

      return {
        term: wordId,
        title: title || wordId,
        definition,
        content,
      };
    }
  }

  return null;
}
