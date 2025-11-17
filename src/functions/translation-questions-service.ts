/**
 * Translation Questions Service
 * Fetches translation questions from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { proxyFetch } from "../utils/httpClient.js";
import { logger } from "../utils/logger.js";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";
import { ZipFetcherFactory } from "../services/zip-fetcher-provider.js";
import { EdgeXRayTracer } from "./edge-xray";

export interface TranslationQuestion {
  id: string;
  reference: string;
  question: string;
  response: string;
  tags?: string[];
}

export interface TranslationQuestionsOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface TranslationQuestionsResult {
  translationQuestions: TranslationQuestion[];
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
    questionsFound: number;
  };
}

/**
 * Parse TSV data into TranslationQuestion objects
 */
function parseTQFromTSV(
  tsvData: string,
  reference: ParsedReference,
): TranslationQuestion[] {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  const questions: TranslationQuestion[] = [];
  let questionId = 1;

  // Log first few lines for debugging
  if (lines.length > 0) {
    logger.debug(`📋 First TSV line`, { line: lines[0] });
    logger.debug(
      `📋 Parsing questions for ${reference.book} ${reference.chapter}:${reference.verse || "*"}`,
    );
  }

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 7) continue; // Skip malformed lines

    // TSV format: reference, id, tags, quote, occurrence, question, response
    const [ref, id, tags, , , question, response] = columns;

    // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
    const refMatch = ref.match(/^(\d+):(\d+)$/);
    if (!refMatch) continue;

    const chapter = parseInt(refMatch[1]);
    const verse = parseInt(refMatch[2]);

    // Only include questions for the requested reference
    if (chapter === reference.chapter) {
      // Handle verse ranges and exact matches
      if (reference.verse === undefined) {
        // Include all verses in the chapter
        questions.push({
          id: id || `tq-${reference.book}-${chapter}-${verse}-${questionId++}`,
          reference: `${reference.bookName} ${chapter}:${verse}`,
          question: question.trim(),
          response: response.trim(),
          tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        });
      } else {
        // Check verse range or exact match
        const endVerse = reference.endVerse || reference.verseEnd;
        if (endVerse) {
          // Check if verse is within range
          if (verse >= reference.verse && verse <= endVerse) {
            questions.push({
              id:
                id ||
                `tq-${reference.book}-${chapter}-${verse}-${questionId++}`,
              reference: `${reference.bookName} ${chapter}:${verse}`,
              question: question.trim(),
              response: response.trim(),
              tags: tags ? tags.split(",").map((t) => t.trim()) : [],
            });
          }
        } else {
          // Exact verse match
          if (verse === reference.verse) {
            questions.push({
              id:
                id ||
                `tq-${reference.book}-${chapter}-${verse}-${questionId++}`,
              reference: `${reference.bookName} ${chapter}:${verse}`,
              question: question.trim(),
              response: response.trim(),
              tags: tags ? tags.split(",").map((t) => t.trim()) : [],
            });
          }
        }
      }
    }
  }

  return questions;
}

interface ParsedReference {
  book: string;
  bookName?: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
  verseEnd?: number;
}

/**
 * Core translation questions fetching logic with unified resource discovery
 */
export async function fetchTranslationQuestions(
  options: TranslationQuestionsOptions,
): Promise<TranslationQuestionsResult> {
  const startTime = Date.now();
  const {
    reference,
    language = "en",
    organization = "unfoldingWord",
  } = options;

  const parsedRef = parseReference(reference);
  if (!parsedRef) {
    throw new Error(`Invalid reference format: ${reference}`);
  }

  logger.info(`Core translation questions service called`, {
    reference,
    language,
    organization,
  });

  logger.info(`Processing fresh questions request`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  logger.debug(`Using unified resource discovery for translation questions...`);
  const resourceInfo = await getResourceForBook(
    reference,
    "questions",
    language,
    organization,
  );

  if (!resourceInfo) {
    throw new Error(
      `No translation questions found for ${language}/${organization}`,
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
    `tq-${Date.now()}`,
    "translation-questions-service",
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
    "tq",
  )) as Array<Record<string, string>>;

  logger.info(`Fetched TSV rows from ZIP`, { count: rows.length });

  // Convert rows to TranslationQuestion format
  // The rows are already filtered by reference, so we just need to map them
  const questions: TranslationQuestion[] = rows.map((row) => {
    const question: TranslationQuestion = {
      id: row.ID || row.Id || "",
      reference: row.Reference || row.reference || "",
      question: row.Question || row.question || "",
      response: row.Response || row.response || "",
      tags:
        row.Tags || row.tags
          ? (row.Tags || row.tags).split(",").map((t) => t.trim())
          : undefined,
    };
    return question;
  });

  logger.info(`Parsed translation questions`, { count: questions.length });

  const result: TranslationQuestionsResult = {
    translationQuestions: questions,
    citation: {
      resource: resourceInfo.name,
      organization,
      language,
      url:
        resourceInfo.url ||
        `https://git.door43.org/${organization}/${resourceInfo.name}`,
      version: "master",
    },
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      questionsFound: questions.length,
    },
  };

  // Do not cache transformed responses

  logger.info(`Parsed translation questions`, { count: questions.length });

  return result;
}
