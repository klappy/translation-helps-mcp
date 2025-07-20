import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { timedResponse } from "./_shared/utils";
import { cache } from "./_shared/cache";

interface TranslationNote {
  reference: string;
  quote: string;
  note: string;
}

interface NotesResponse {
  translationNotes?: TranslationNote[];
  citation?: {
    resource: string;
    title: string;
    organization: string;
    language: string;
    url: string;
    version: string;
  };
  error?: string;
  language?: string;
  organization?: string;
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const params = new URLSearchParams(
      (event.queryStringParameters as Record<string, string>) || {}
    );
    const referenceParam = params.get("reference");
    const language = params.get("language") || "en";
    const organization = params.get("organization") || "unfoldingWord";
    const includeIntro = params.get("includeIntro") === "true";

    console.log(`📝 fetch-translation-notes called with:`, {
      reference: referenceParam,
      language,
      organization,
      includeIntro,
    });

    if (!referenceParam) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing reference parameter" }),
      };
    }

    // Parse the reference
    const reference = parseReference(referenceParam);
    if (!reference) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Invalid reference format" }),
      };
    }

    // Check for cached transformed response FIRST
    const responseKey = `notes:${referenceParam}:${language}:${organization}`;
    const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

    if (cachedResponse.value) {
      console.log(`🚀 FAST cache hit for processed notes: ${responseKey}`);
      return timedResponse(cachedResponse.value, startTime, undefined, {
        cached: true,
        cacheType: cachedResponse.cacheType,
        expiresAt: cachedResponse.expiresAt,
        ttlSeconds: cachedResponse.ttlSeconds,
      });
    }

    console.log(`🔄 Processing fresh notes request: ${responseKey}`);

    // Search catalog for Translation Notes
    const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Notes&lang=${language}&owner=${organization}`;
    console.log(`🔍 Searching catalog: ${catalogUrl}`);

    const catalogResponse = await fetch(catalogUrl);
    if (!catalogResponse.ok) {
      console.error(`❌ Catalog search failed: ${catalogResponse.status}`);
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "No translation notes resource found",
          language,
          organization,
        }),
      };
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
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "No translation notes found",
          language,
          organization,
        }),
      };
    }

    const resource = catalogData.data[0];
    console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

    // Find the correct file from ingredients
    const ingredient = resource.ingredients?.find(
      (ing: any) => ing.identifier === reference.book.toLowerCase()
    );

    if (!ingredient) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Book ${reference.book} not found in resource`,
          language,
          organization,
        }),
      };
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
        return {
          statusCode: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            error: "Failed to fetch translation notes content",
            language,
            organization,
          }),
        };
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

    const result: NotesResponse = {
      translationNotes: notes,
      citation: {
        resource: resource.name,
        title: resource.title,
        organization,
        language,
        url: fileUrl,
        version: "master",
      },
      language,
      organization,
    };

    // Cache the transformed response for fast future retrieval
    await cache.setTransformedResponse(responseKey, result);

    return timedResponse(result, startTime);
  } catch (error) {
    console.error("Error in fetch-translation-notes:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

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
