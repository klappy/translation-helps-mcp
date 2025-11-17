/**
 * Translation Notes Service
 * Fetches translation notes from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { parseTSV } from "../config/RouteGenerator";
import { logger } from "../utils/logger.js";
import { proxyFetch } from "../utils/httpClient.js";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";
import { EdgeXRayTracer } from "./edge-xray";

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

  logger.info(`Core translation notes service called`, {
    reference,
    language,
    organization,
    includeIntro,
    includeContext,
  });

  logger.info(`Processing fresh notes request`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  logger.debug(`Using unified resource discovery for translation notes...`);
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

  logger.info(`Using resource`, {
    name: resourceInfo.name,
    title: resourceInfo.title,
  });
  logger.debug(`Looking for book`, {
    book: parsedRef.book,
    lower: parsedRef.book.toLowerCase(),
  });
  logger.debug(`Ingredients available`, {
    ingredients: resourceInfo.ingredients?.map(
      (i: { identifier?: string }) => i.identifier,
    ),
  });

  // Find the correct file from ingredients
  const ingredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) =>
      ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase(),
  );

  if (!ingredient) {
    logger.error(`Book not found in ingredients`, {
      book: parsedRef.book,
      ingredients: resourceInfo.ingredients,
    });
    throw new Error(
      `Book ${parsedRef.book} not found in resource ${resourceInfo.name}`,
    );
  }

  // Use ZIP-based fetching via ZipFetcherFactory (pluggable system)
  const tracer = new EdgeXRayTracer(
    `tn-${Date.now()}`,
    "translation-notes-service",
  );
  const zipFetcherProvider = ZipFetcherFactory.create(
    (options.zipFetcherProvider as "r2" | "fs" | "auto") ||
      (process.env.ZIP_FETCHER_PROVIDER as "r2" | "fs" | "auto") ||
      "auto",
    process.env.CACHE_PATH,
    tracer,
  );

  // Get TSV rows from ZIP (already parsed and filtered by reference)
  const rows = (await zipFetcherProvider.getTSVData(
    {
      book: parsedRef.book,
      chapter: parsedRef.chapter!,
      verse: parsedRef.verse,
    },
    language,
    organization,
    "tn",
  )) as Array<Record<string, string>>;

  logger.info(`Fetched TSV rows from ZIP`, { count: rows.length });

  // Convert rows to TranslationNote format
  // The rows are already filtered by reference, so we just need to map them
  const notes: TranslationNote[] = rows.map((row) => {
    const note: TranslationNote = {
      id: row.ID || row.Id || "",
      reference: row.Reference || row.reference || "",
      note: row.Note || row.note || "",
      quote: row.Quote || row.quote,
      occurrence: row.Occurrence
        ? parseInt(row.Occurrence, 10)
        : row.occurrence
          ? parseInt(row.occurrence, 10)
          : undefined,
      occurrences: row.Occurrences
        ? parseInt(row.Occurrences, 10)
        : row.occurrences
          ? parseInt(row.occurrences, 10)
          : undefined,
      supportReference: row.SupportReference || row.supportReference,
    };
    return note;
  });

  // Filter notes based on includeIntro and includeContext
  let filteredNotes = notes;
  if (!includeIntro && !includeContext) {
    // Exclude intro notes
    filteredNotes = notes.filter(
      (note) =>
        !note.reference.includes("intro") && !note.reference.includes("front:"),
    );
  } else if (!includeIntro) {
    // Exclude only front:intro
    filteredNotes = notes.filter((note) => !note.reference.includes("front:"));
  } else if (!includeContext) {
    // Exclude chapter intros
    filteredNotes = notes.filter((note) => !note.reference.includes(":intro"));
  }

  logger.info(`Parsed translation notes`, { count: filteredNotes.length });

  // Split notes into verse notes and context notes based on reference patterns
  const verseNotes = filteredNotes.filter((note) => {
    const ref = note.reference || "";
    return ref.match(/\d+:\d+/) && !ref.includes("intro");
  });

  const contextNotes = filteredNotes.filter((note) => {
    const ref = note.reference || "";
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
      url:
        resourceInfo.url ||
        `https://git.door43.org/${organization}/${resourceInfo.name}`,
      version: "master",
    },
    metadata: {
      sourceNotesCount: filteredNotes.length,
      verseNotesCount: verseNotes.length,
      contextNotesCount: contextNotes.length,
      cached: false,
      responseTime: Date.now() - startTime,
    },
  };

  // Do not cache transformed responses

  return result;
}

/**
 * Lightweight integration helper used by tests: fetch Translation Notes directly via
 * catalog -> TSV URL and map columns with the correct order.
 * Expected TSV header:
 * Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
 */
export async function getTranslationNotes(args: {
  reference: { book: string; chapter: number; verse?: number };
  options?: {
    includeContext?: boolean;
    language?: string;
    organization?: string;
  };
}): Promise<{
  notes: Array<{
    id: string;
    reference: string;
    tags?: string;
    supportReference?: string;
    quote?: string;
    occurrence?: string;
    note: string;
  }>;
}> {
  const { reference, options } = args;
  const language = options?.language || "en";
  const organization = options?.organization || "unfoldingWord";

  // Triggerable by tests via fetch mock
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Notes&lang=${language}&owner=${organization}`;
  const catalogRes = await proxyFetch(catalogUrl);
  if (!catalogRes.ok) {
    throw new Error(`Failed to search catalog: ${catalogRes.status}`);
  }
  const catalogJson = (await catalogRes.json()) as {
    data?: Array<{
      repo_url?: string;
      contents?: { formats?: Array<{ format: string; url: string }> };
    }>;
  };
  const tsvUrl = catalogJson.data?.[0]?.contents?.formats?.find((f) =>
    f.format?.includes("tsv"),
  )?.url;
  if (!tsvUrl) {
    throw new Error("No TSV URL found in catalog response");
  }

  const tsvRes = await fetch(tsvUrl);
  if (!tsvRes.ok) {
    throw new Error(`Failed to fetch TN TSV: ${tsvRes.status}`);
  }
  const tsv = await tsvRes.text();

  // Parse TSV preserving columns exactly
  const lines = tsv.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { notes: [] };
  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => line.split("\t"));

  // Column indices based on expected header order
  const idx = {
    Reference: headers.indexOf("Reference"),
    ID: headers.indexOf("ID"),
    Tags: headers.indexOf("Tags"),
    SupportReference: headers.indexOf("SupportReference"),
    Quote: headers.indexOf("Quote"),
    Occurrence: headers.indexOf("Occurrence"),
    Note: headers.indexOf("Note"),
  };

  const notes = rows
    .filter((cols) => {
      const ref = cols[idx.Reference] || "";
      const m = ref.match(/^(\d+):(\d+)/);
      if (!m) return false;
      const ch = parseInt(m[1]);
      const vs = parseInt(m[2]);
      if (reference.verse) {
        return ch === reference.chapter && vs === reference.verse;
      }
      return ch === reference.chapter;
    })
    .map((cols) => ({
      reference: cols[idx.Reference] || "",
      id: cols[idx.ID] || "",
      tags: idx.Tags >= 0 ? cols[idx.Tags] || "" : "",
      supportReference:
        idx.SupportReference >= 0 ? cols[idx.SupportReference] || "" : "",
      quote: idx.Quote >= 0 ? cols[idx.Quote] || "" : "",
      occurrence: idx.Occurrence >= 0 ? cols[idx.Occurrence] || "" : "",
      note: cols[idx.Note] || "",
    }));

  return { notes };
}

/**
 * Parse Translation Notes from TSV data - using automatic parsing
 */
function parseTNFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number },
  includeIntro: boolean,
  includeContext: boolean,
): Array<Record<string, string>> {
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
        return (
          (includeIntro || includeContext) && chapterNum === reference.chapter
        );
      } else {
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (refMatch) {
          const chapterNum = parseInt(refMatch[1]);
          const verseNum = parseInt(refMatch[2]);

          if (reference.verse) {
            return (
              chapterNum === reference.chapter && verseNum === reference.verse
            );
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
