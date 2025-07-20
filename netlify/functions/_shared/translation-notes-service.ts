/**
 * Translation Notes Service
 * Shared core implementation for fetching translation notes
 * Used by both Netlify functions and MCP tools for consistency
 */

import { parseReference } from "./reference-parser";
import { cache } from "./cache";

export interface TranslationNote {
  reference: string;
  quote: string;
  note: string;
}

export interface TranslationNotesOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeIntro?: boolean;
  includeContext?: boolean;
}

export interface TranslationNotesResult {
  translationNotes: TranslationNote[];
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
 * Core translation notes fetching logic - extracted from working Netlify function
 */
export async function fetchTranslationNotes(
  options: TranslationNotesOptions
): Promise<TranslationNotesResult> {
  const startTime = Date.now();
  const {
    reference: referenceParam,
    language = "en",
    organization = "unfoldingWord",
    includeIntro = true,
    includeContext = true,
  } = options;

  console.log(`📝 Core translation notes service called with:`, {
    reference: referenceParam,
    language,
    organization,
    includeIntro,
    includeContext,
  });

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Check for cached transformed response FIRST
  const responseKey = `notes:${referenceParam}:${language}:${organization}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed notes: ${responseKey}`);

    // Separate verse notes from context notes
    const allNotes = cachedResponse.value.translationNotes || [];
    const verseNotes = allNotes.filter(
      (note: TranslationNote) =>
        !note.reference.includes("intro") && !note.reference.includes("front:")
    );
    const contextNotes = allNotes.filter(
      (note: TranslationNote) =>
        note.reference.includes("intro") || note.reference.includes("front:")
    );

    return {
      translationNotes: allNotes,
      verseNotes: includeIntro ? verseNotes : allNotes,
      contextNotes: includeIntro ? contextNotes : [],
      citation: cachedResponse.value.citation,
      metadata: {
        sourceNotesCount: allNotes.length,
        verseNotesCount: verseNotes.length,
        contextNotesCount: contextNotes.length,
        cached: true,
        responseTime: Date.now() - startTime,
      },
    };
  }

  console.log(`🔄 Processing fresh notes request: ${responseKey}`);

  // Search catalog for Translation Notes
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Notes&lang=${language}&owner=${organization}`;
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

  console.log(`📊 Found ${catalogData.data?.length || 0} translation notes resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No translation notes found for ${language}/${organization}`);
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

  // Build URL for the TSV file
  const fileUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching from: ${fileUrl}`);

  // Try to get from cache first
  const cacheKey = `tsv:${fileUrl}`;
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

  // Parse the TSV data
  const notes = parseTNFromTSV(tsvData, reference, includeIntro);
  console.log(`📝 Parsed ${notes.length} translation notes`);

  // Separate verse notes from context notes
  const verseNotes = notes.filter(
    (note) => !note.reference.includes("intro") && !note.reference.includes("front:")
  );
  const contextNotes = notes.filter(
    (note) => note.reference.includes("intro") || note.reference.includes("front:")
  );

  const result: TranslationNotesResult = {
    translationNotes: notes,
    verseNotes: includeIntro ? verseNotes : notes,
    contextNotes: includeIntro ? contextNotes : [],
    citation: {
      resource: resource.name,
      title: resource.title,
      organization,
      language,
      url: `https://git.door43.org/${organization}/${resource.name}`,
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

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationNotes: notes,
    citation: result.citation,
  });

  return result;
}

/**
 * Parse Translation Notes from TSV data - extracted from working implementation
 */
function parseTNFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number; verseEnd?: number },
  includeIntro: boolean = false
): TranslationNote[] {
  const lines = tsvData.split("\n");
  const notes: TranslationNote[] = [];

  // Skip header line
  if (lines.length > 0 && lines[0].startsWith("Reference")) {
    lines.shift();
  }

  for (const line of lines) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue;

    const [ref, id, tags, supportReference, quote, occurrence, noteText] = columns;

    // Skip intro notes if not requested
    if (!includeIntro && ref.includes("intro")) {
      continue;
    }

    // Parse the reference
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch && !ref.includes("intro")) continue;

    if (refMatch) {
      const chapterNum = parseInt(refMatch[1]);
      const verseNum = parseInt(refMatch[2]);

      // Check if this note is in our range
      let include = false;

      if (!reference.verse && reference.verseEnd) {
        // Chapter range
        const startChapter = reference.chapter;
        const endChapter = reference.verseEnd;
        include = chapterNum >= startChapter && chapterNum <= endChapter;
      } else if (reference.verse && reference.verseEnd) {
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

      if (!include) continue;
    } else if (includeIntro && ref.includes("intro")) {
      // Handle intro notes
      if (ref === "front:intro") {
        // Book intro - always include if includeIntro is true
      } else if (ref.includes(":intro")) {
        // Chapter intro - check if it's for our chapter
        const introChapterMatch = ref.match(/(\d+):intro/);
        if (introChapterMatch) {
          const introChapter = parseInt(introChapterMatch[1]);
          if (introChapter !== reference.chapter) continue;
        }
      }
    }

    notes.push({
      reference: `${reference.book} ${ref}`,
      quote: quote || "",
      note: noteText || "",
    });
  }

  console.log(`📝 Parsed ${notes.length} translation notes`);
  return notes;
}
