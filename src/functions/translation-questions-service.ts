/**
 * Translation Questions Service
 * Shared core implementation for fetching translation questions
 * Used by both Netlify functions and MCP tools for consistency
 */

import { cache } from "./cache";
import { parseReference } from "./reference-parser";

export interface TranslationQuestion {
  reference: string;
  question: string;
  response?: string;
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
 * Core translation questions fetching logic
 */
export async function fetchTranslationQuestions(
  options: TranslationQuestionsOptions
): Promise<TranslationQuestionsResult> {
  const startTime = Date.now();
  const { reference: referenceParam, language = "en", organization = "unfoldingWord" } = options;

  console.log(`❓ Core translation questions service called with:`, {
    reference: referenceParam,
    language,
    organization,
  });

  // Parse the reference
  const reference = parseReference(referenceParam);
  if (!reference) {
    throw new Error(`Invalid reference format: ${referenceParam}`);
  }

  // Check for cached transformed response FIRST
  const responseKey = `questions:${referenceParam}:${language}:${organization}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed questions: ${responseKey}`);
    return {
      translationQuestions: cachedResponse.value.translationQuestions || [],
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

  // Search catalog for Translation Questions
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=${language}&owner=${organization}`;
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

  console.log(`📊 Found ${catalogData.data?.length || 0} translation questions resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No translation questions found for ${language}/${organization}`);
  }

  const resource = catalogData.data[0];
  console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

  // Find the correct file from ingredients
  const ingredient = resource.ingredients?.find(
    (ing: { identifier?: string }) => ing.identifier === reference.book.toLowerCase()
  );

  if (!ingredient) {
    throw new Error(`Book ${reference.book} not found in resource ${resource.name}`);
  }

  // Build URL for the TSV file
  const fileUrl = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
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
  const questions = parseTQFromTSV(tsvData, reference);
  console.log(`❓ Parsed ${questions.length} translation questions`);

  const result: TranslationQuestionsResult = {
    translationQuestions: questions,
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
      questionsFound: questions.length,
    },
  };

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    translationQuestions: result.translationQuestions,
    citation: result.citation,
  });

  return result;
}

/**
 * Parse Translation Questions from TSV data
 */
function parseTQFromTSV(
  tsvData: string,
  reference: { book: string; chapter: number; verse?: number; verseEnd?: number }
): TranslationQuestion[] {
  const lines = tsvData.split("\n");
  const questions: TranslationQuestion[] = [];

  // Skip header line
  if (lines.length > 0 && lines[0].startsWith("Reference")) {
    lines.shift();
  }

  for (const line of lines) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns.length < 7) continue; // Need at least 7 columns

    // Correct structure: Reference | ID | Tags | Quote | Occurrence | Question | Response
    const [ref, , , , , question, response] = columns;

    // Parse the reference
    const refMatch = ref.match(/(\d+):(\d+)/);
    if (!refMatch) continue;

    const chapterNum = parseInt(refMatch[1]);
    const verseNum = parseInt(refMatch[2]);

    // Check if this question is in our range
    let include = false;

    if (reference.verse && reference.verseEnd) {
      include =
        chapterNum === reference.chapter &&
        verseNum >= reference.verse &&
        verseNum <= reference.verseEnd;
    } else if (reference.verse) {
      include = chapterNum === reference.chapter && verseNum === reference.verse;
    } else {
      include = chapterNum === reference.chapter;
    }

    if (include && question && question.trim()) {
      questions.push({
        reference: `${reference.book} ${chapterNum}:${verseNum}`,
        question: question.trim(),
        response: response?.trim() || undefined,
      });
    }
  }

  console.log(`❓ Parsed ${questions.length} translation questions`);
  return questions;
}
