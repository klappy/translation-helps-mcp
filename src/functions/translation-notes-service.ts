/**
 * Translation Notes Service
 * Fetches translation notes from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

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
  options: TranslationNotesOptions,
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
  const cachedResponse =
    await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed notes: ${responseKey}`);

    // Separate verse notes from context notes
    const allNotes = cachedResponse.value.translationNotes || [];
    const verseNotes = allNotes.filter(
      (note: TranslationNote) =>
        !note.reference.includes("intro") && !note.reference.includes("front:"),
    );
    const contextNotes = allNotes.filter(
      (note: TranslationNote) =>
        note.reference.includes("intro") || note.reference.includes("front:"),
    );

    return {
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

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  console.log(`🔍 Using unified resource discovery for translation notes...`);
  const resourceInfo = await getResourceForBook(
    reference,
    "notes",
    language,
    organization,
  );

  if (!resourceInfo) {
    throw new Error(
      `No translation notes found for ${language}/${organization}`,
    );
  }

  console.log(
    `📖 Using resource: ${resourceInfo.name} (${resourceInfo.title})`,
  );
  console.log(`🔍 Looking for book: ${parsedRef.book} (lowercased: ${parsedRef.book.toLowerCase()})`);
  console.log(`📦 Ingredients available:`, resourceInfo.ingredients?.map((i: any) => i.identifier));

  // Find the correct file from ingredients
  const ingredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) =>
      ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase(),
  );

  if (!ingredient) {
    console.error(`❌ Book ${parsedRef.book} not found in ingredients:`, resourceInfo.ingredients);
    throw new Error(
      `Book ${parsedRef.book} not found in resource ${resourceInfo.name}`,
    );
  }

  // Build URL for the TSV file
  const fileUrl = `https://git.door43.org/${organization}/${resourceInfo.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching from: ${fileUrl}`);

  // Try to get from cache first
  const cacheKey = `tn:${fileUrl}`;
  let tsvData = await cache.getFileContent(cacheKey);

  if (!tsvData) {
    console.log(`🔄 Cache miss for TN file, downloading...`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error(`❌ Failed to fetch TN file: ${fileResponse.status}`);
      throw new Error(
        `Failed to fetch translation notes content: ${fileResponse.status}`,
      );
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
  const notes = parseTNFromTSV(
    tsvData,
    parsedRef,
    includeIntro,
    includeContext,
  );
  console.log(`📝 Parsed ${notes.length} translation notes`);

  // Separate verse notes from context notes
  // Context notes include book-level (front:intro) and chapter-level (N:intro) notes
  const verseNotes = notes.filter(
    (note: TranslationNote) => {
      const ref = note.reference.toLowerCase();
      return !ref.includes("intro") && !ref.includes("front:");
    }
  );
  const contextNotes = notes.filter(
    (note: TranslationNote) => {
      const ref = note.reference.toLowerCase();
      return ref.includes("intro") || ref.includes("front:");
    }
  );

  const result: TranslationNotesResult = {
    verseNotes: includeIntro ? verseNotes : notes,
    contextNotes: includeIntro ? contextNotes : [],
    citation: {
      resource: resourceInfo.name,
      title: resourceInfo.title,
      organization,
      language,
      url:
        resourceInfo.url ||
        `https://git.door43.org/${organization}/${resourceInfo.name}`,
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
    translationNotes: [...result.verseNotes, ...result.contextNotes],
    citation: result.citation,
  });

  console.log(`📝 Parsed ${notes.length} translation notes`);

  return result;
}

/**
 * Parse Translation Notes from TSV data
 */
function parseTNFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number },
  includeIntro: boolean,
  includeContext: boolean,
): TranslationNote[] {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  const notes: TranslationNote[] = [];
  let noteId = 1;

  // Log first line for debugging
  if (lines.length > 0 && lines[0]) {
    const firstCols = lines[0].split("\t");
    console.log(`📋 First TSV line has ${firstCols.length} columns`);
    console.log(`📋 Sample: ref="${firstCols[0]}", quote="${firstCols[3]}", col5="${firstCols[5]}", col6="${firstCols[6]?.substring(0, 50)}..."`);
  }

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 7) continue; // Skip malformed lines

    const [ref, , , quote, occurrence, note, markdownPayload] = columns;

    // Handle different reference formats
    let include = false;
    let noteRef = ref;

    if (ref.includes("front:intro")) {
      // This is a book-level introduction note
      include = includeIntro || includeContext;
      noteRef = `${reference.book} Introduction`;
    } else if (ref.match(/^\d+:intro$/)) {
      // This is a chapter-level introduction note (e.g., "1:intro")
      const chapterMatch = ref.match(/^(\d+):intro$/);
      const chapterNum = parseInt(chapterMatch[1]);
      include = (includeIntro || includeContext) && chapterNum === reference.chapter;
      noteRef = `${reference.book} Chapter ${chapterNum} Introduction`;
    } else {
      // Parse chapter:verse reference
      const refMatch = ref.match(/(\d+):(\d+)/);
      if (refMatch) {
        const chapterNum = parseInt(refMatch[1]);
        const verseNum = parseInt(refMatch[2]);

        if (reference.verse) {
          include =
            chapterNum === reference.chapter && verseNum === reference.verse;
        } else {
          include = chapterNum === reference.chapter;
        }
        noteRef = `${reference.book} ${chapterNum}:${verseNum}`;
      }
    }

    if (include && markdownPayload && markdownPayload.trim()) {
      notes.push({
        id: `tn-${reference.book}-${noteId++}`,
        reference: noteRef,
        note: markdownPayload.trim(), // The actual note content is in the markdown field!
        quote: quote ? quote.trim() : undefined,
        occurrence: occurrence ? parseInt(occurrence) : undefined,
        occurrences: undefined, // Not provided in standard format
        markdown: markdownPayload ? markdownPayload.trim() : undefined, // Keep original for compatibility
        supportReference: undefined, // Could be extracted from note content
      });
    }
  }

  return notes;
}
