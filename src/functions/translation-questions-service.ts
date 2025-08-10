/**
 * Translation Questions Service
 * Fetches translation questions from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

import { logger } from "../utils/logger.js";
import { cache } from "./cache";
import { parseReference } from "./reference-parser";
import { getResourceForBook } from "./resource-detector";

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
function parseTQFromTSV(tsvData: string, reference: ParsedReference): TranslationQuestion[] {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  const questions: TranslationQuestion[] = [];
  let questionId = 1;

  // Log first few lines for debugging
  if (lines.length > 0) {
    logger.debug(`📋 First TSV line`, { line: lines[0] });
    logger.debug(
      `📋 Parsing questions for ${reference.book} ${reference.chapter}:${reference.verse || "*"}`
    );
  }

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 7) continue; // Skip malformed lines

    // TSV format: reference, id, tags, quote, occurrence, question, response
    const [ref, id, tags, quote, occurrence, question, response] = columns;

    // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
    const refMatch = ref.match(/^(\d+):(\d+)$/);
    if (!refMatch) continue;

    const chapter = parseInt(refMatch[1]);
    const verse = parseInt(refMatch[2]);

    // Only include questions for the requested reference
    if (
      chapter === reference.chapter &&
      (reference.verse === undefined || verse === reference.verse)
    ) {
      questions.push({
        id: id || `tq-${reference.book}-${chapter}-${verse}-${questionId++}`,
        reference: `${reference.bookName} ${chapter}:${verse}`,
        question: question.trim(),
        response: response.trim(),
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      });
    }
  }

  return questions;
}

interface ParsedReference {
  book: string;
  chapter: number;
  verse?: number;
}

/**
 * Core translation questions fetching logic with unified resource discovery
 */
export async function fetchTranslationQuestions(
  options: TranslationQuestionsOptions
): Promise<TranslationQuestionsResult> {
  const startTime = Date.now();
  const { reference, language = "en", organization = "unfoldingWord" } = options;

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
  const resourceInfo = await getResourceForBook(reference, "questions", language, organization);

  if (!resourceInfo) {
    throw new Error(`No translation questions found for ${language}/${organization}`);
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
    ingredients: resourceInfo.ingredients?.map((i: any) => i.identifier),
  });

  // Find the correct file from ingredients
  const ingredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) => ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase()
  );

  if (!ingredient) {
    logger.error(`Book not found in ingredients`, {
      book: parsedRef.book,
      ingredients: resourceInfo.ingredients,
    });
    throw new Error(`Book ${parsedRef.book} not found in resource ${resourceInfo.name}`);
  }

  // Build URL for the TSV file
  // Direct raw URL fetch disabled. Use ZIP + ingredients path via ZipResourceFetcher2 service.

  // Try to get from cache first
  const cacheKey = `tq:${fileUrl}`;
  let tsvData = await cache.getFileContent(cacheKey);

  if (!tsvData) {
    logger.info(`Cache miss for TQ file, downloading...`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      logger.error(`Failed to fetch TQ file`, { status: fileResponse.status });
      throw new Error(`Failed to fetch translation questions content: ${fileResponse.status}`);
    }

    tsvData = await fileResponse.text();
    logger.info(`Downloaded TSV data`, { length: tsvData.length });

    // Cache the file content
    await cache.setFileContent(cacheKey, tsvData);
    logger.info(`Cached TQ file`, { length: tsvData.length });
  } else {
    logger.info(`Cache hit for TQ file`, { length: tsvData.length });
  }

  // Parse the TSV data
  const questions = parseTQFromTSV(tsvData, parsedRef);
  logger.info(`Parsed translation questions`, { count: questions.length });

  const result: TranslationQuestionsResult = {
    translationQuestions: questions,
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
      questionsFound: questions.length,
    },
  };

  // Do not cache transformed responses

  logger.info(`Parsed translation questions`, { count: questions.length });

  return result;
}
