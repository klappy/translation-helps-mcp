/**
 * Translation Notes Service
 * Fetches translation notes from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { parseTSV } from "../config/RouteGenerator";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";

export interface TranslationNote {
  id: string;
  reference: string;
  note: string;
  quote?: string;
  occurrence?: number;
  occurrences?: number;
  markdown?: string; // Original nested markdown payload
  supportReference?: string;
}

export interface TranslationNotesOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeIntro?: boolean;
  includeContext?: boolean;
}

export interface TranslationNotesResult {
  verseNotes: TranslationNote[];
  contextNotes: TranslationNote[];
  citation: {
    resource: string;
    title: string;
    organization: string;
    language: string;
    url: string;
    version: string;
  };
  metadata: {
    sourceNotesCount: number;
    verseNotesCount: number;
    contextNotesCount: number;
    cached: boolean;
    responseTime: number;
  };
}

/**
 * Core translation notes fetching logic with unified resource discovery
 */
export async function fetchTranslationNotes(
  options: TranslationNotesOptions
): Promise<TranslationNotesResult> {
  const startTime = Date.now();
  const {
    reference,
    language = "en",
    organization = "unfoldingWord",
    includeIntro = true,
    includeContext = true,
  } = options;

  const parsedRef = parseReference(reference);
  if (!parsedRef) {
    throw new Error(`Invalid reference format: ${reference}`);
  }

  console.log(`📝 Core translation notes service called with:`, {
    reference,
    language,
    organization,
    includeIntro,
    includeContext,
  });

  // Check cache first
  const responseKey = `notes:${reference}:${language}:${organization}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed notes: ${responseKey}`);

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

  console.log(`🔄 Processing fresh notes request: ${responseKey}`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  console.log(`🔍 Using unified resource discovery for translation notes...`);
  const resourceInfo = await getResourceForBook(reference, "notes", language, organization);

  if (!resourceInfo) {
    throw new Error(`No translation notes found for ${language}/${organization}`);
  }

  console.log(`📖 Using resource: ${resourceInfo.name} (${resourceInfo.title})`);
  console.log(
    `🔍 Looking for book: ${parsedRef.book} (lowercased: ${parsedRef.book.toLowerCase()})`
  );
  console.log(
    `📦 Ingredients available:`,
    resourceInfo.ingredients?.map((i: any) => i.identifier)
  );

  // Find the correct file from ingredients
  const ingredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) => ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase()
  );

  if (!ingredient) {
    console.error(`❌ Book ${parsedRef.book} not found in ingredients:`, resourceInfo.ingredients);
    throw new Error(`Book ${parsedRef.book} not found in resource ${resourceInfo.name}`);
  }

  // Enforce ingredients path via ZIP fetcher in new flow; avoid raw hardcoded URLs
  const fileUrl = undefined as unknown as string;

  // Try to get from cache first
  const cacheKey = `tn:${fileUrl}`;
  let tsvData = await cache.getFileContent(cacheKey);

  if (!tsvData) {
    console.log(`🔄 Cache miss for TN file, downloading...`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error(`❌ Failed to fetch TN file: ${fileResponse.status}`);
      throw new Error(`Failed to fetch translation notes content: ${fileResponse.status}`);
    }

    tsvData = await fileResponse.text();
    console.log(`📄 Downloaded ${tsvData.length} characters of TSV data`);

    // Cache the file content
    await cache.setFileContent(cacheKey, tsvData);
    console.log(`💾 Cached TN file (${tsvData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for TN file (${tsvData.length} chars)`);
  }

  // Parse the TSV data - automatic parsing preserves exact structure
  const notes = parseTNFromTSV(tsvData, parsedRef, includeIntro, includeContext);
  console.log(`📝 Parsed ${notes.length} translation notes`);

  // Split notes into verse notes and context notes based on reference patterns
  const verseNotes = notes.filter((note) => {
    const ref = note.Reference || "";
    return ref.match(/\d+:\d+/) && !ref.includes("intro");
  });

  const contextNotes = notes.filter((note) => {
    const ref = note.Reference || "";
    return ref.includes("intro") || ref.includes("front:");
  });

  // Return the format matching the interface
  const result: TranslationNotesResult = {
    verseNotes,
    contextNotes,
    citation: {
      resource: resourceInfo.name,
      title: resourceInfo.title,
      organization,
      language,
      url: resourceInfo.url || `https://git.door43.org/${organization}/${resourceInfo.name}`,
      version: "master",
    },
    metadata: {
      sourceNotesCount: notes.length,
      verseNotesCount: verseNotes.length,
      contextNotesCount: contextNotes.length,
      cached: false,
      responseTime: Date.now() - startTime,
    },
  };

  // Cache the response
  await cache.setTransformedResponse(responseKey, result);

  return result;
}

/**
 * Parse Translation Notes from TSV data - using automatic parsing
 */
function parseTNFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number },
  includeIntro: boolean,
  includeContext: boolean
): any[] {
  // Use the generic parseTSV to preserve exact structure
  const allRows = parseTSV(tsvData);

  // Filter rows based on reference
  return allRows
    .filter((row) => {
      const ref = row.Reference;
      if (!ref) return false;

      if (ref.includes("front:intro")) {
        return includeIntro || includeContext;
      } else if (ref.match(/^\d+:intro$/)) {
        const chapterMatch = ref.match(/^(\d+):intro$/);
        const chapterNum = parseInt(chapterMatch[1]);
        return (includeIntro || includeContext) && chapterNum === reference.chapter;
      } else {
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (refMatch) {
          const chapterNum = parseInt(refMatch[1]);
          const verseNum = parseInt(refMatch[2]);

          if (reference.verse) {
            return chapterNum === reference.chapter && verseNum === reference.verse;
          } else {
            return chapterNum === reference.chapter;
          }
        }
      }
      return false;
    })
    .map((row) => ({
      ...row,
      Reference: `${reference.book} ${row.Reference}`, // Keep original field name
    }));
}
