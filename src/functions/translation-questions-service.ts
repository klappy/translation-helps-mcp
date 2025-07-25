/**
 * Translation Questions Service
 * Fetches translation questions from DCS (Door43 Content Service)
 * Uses unified resource discovery to minimize DCS API calls
 */

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

  for (const line of lines) {
    const columns = line.split("\t");
    if (columns.length < 7) continue; // Skip malformed lines

    const [book, chapter, verse, , question, response] = columns;

    // Only include questions for the requested reference
    if (
      book.toLowerCase() === reference.book.toLowerCase() &&
      parseInt(chapter) === reference.chapter &&
      (reference.verse === undefined || parseInt(verse) === reference.verse)
    ) {
      questions.push({
        id: `tq-${reference.book}-${chapter}-${verse}-${questionId++}`,
        reference: `${book} ${chapter}:${verse}`,
        question: question.trim(),
        response: response.trim(),
        tags: [], // Could be populated from additional columns if available
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

  console.log(`❓ Core translation questions service called with:`, {
    reference,
    language,
    organization,
  });

  // Check cache first
  const responseKey = `questions:${reference}:${language}:${organization}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed questions: ${responseKey}`);
    return {
      translationQuestions: cachedResponse.value.translationQuestions,
      citation: cachedResponse.value.citation,
      metadata: {
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        questionsFound: cachedResponse.value.translationQuestions?.length || 0,
      },
    };
  }

  console.log(`🔄 Processing fresh questions request: ${responseKey}`);

  // 🚀 OPTIMIZATION: Use unified resource discovery instead of separate catalog search
  console.log(`🔍 Using unified resource discovery for translation questions...`);
  const resourceInfo = await getResourceForBook(reference, "questions", language, organization);

  if (!resourceInfo) {
    throw new Error(`No translation questions found for ${language}/${organization}`);
  }

  console.log(`📖 Using resource: ${resourceInfo.name} (${resourceInfo.title})`);
  console.log(`🔍 Looking for book: ${parsedRef.book} (lowercased: ${parsedRef.book.toLowerCase()})`);
  console.log(`📦 Ingredients available:`, resourceInfo.ingredients?.map((i: any) => i.identifier));

  // Find the correct file from ingredients
  const ingredient = resourceInfo.ingredients?.find(
    (ing: { identifier?: string }) => ing.identifier?.toLowerCase() === parsedRef.book.toLowerCase()
  );

  if (!ingredient) {
    console.error(`❌ Book ${parsedRef.book} not found in ingredients:`, resourceInfo.ingredients);
    throw new Error(`Book ${parsedRef.book} not found in resource ${resourceInfo.name}`);
  }

  // Build URL for the TSV file
  const fileUrl = `https://git.door43.org/${organization}/${resourceInfo.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
  console.log(`🔗 Fetching from: ${fileUrl}`);

  // Try to get from cache first
  const cacheKey = `tq:${fileUrl}`;
  let tsvData = await cache.getFileContent(cacheKey);

  if (!tsvData) {
    console.log(`🔄 Cache miss for TQ file, downloading...`);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error(`❌ Failed to fetch TQ file: ${fileResponse.status}`);
      throw new Error(`Failed to fetch translation questions content: ${fileResponse.status}`);
    }

    tsvData = await fileResponse.text();
    console.log(`📄 Downloaded ${tsvData.length} characters of TSV data`);

    // Cache the file content
    await cache.setFileContent(cacheKey, tsvData);
    console.log(`💾 Cached TQ file (${tsvData.length} chars)`);
  } else {
    console.log(`✅ Cache hit for TQ file (${tsvData.length} chars)`);
  }

  // Parse the TSV data
  const questions = parseTQFromTSV(tsvData, parsedRef);
  console.log(`❓ Parsed ${questions.length} translation questions`);

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

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationQuestions: result.translationQuestions,
    citation: result.citation,
  });

  console.log(`❓ Parsed ${questions.length} translation questions`);

  return result;
}
