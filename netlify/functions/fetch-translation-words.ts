import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { ResourceAggregator } from "./_shared/resource-aggregator";
import { timedResponse } from "./_shared/utils";
import { cache } from "./_shared/cache";

interface TranslationWord {
  term: string;
  definition: string;
  title?: string;
  subtitle?: string;
  content?: string;
}

interface WordsResponse {
  translationWords?: TranslationWord[];
  citation?: {
    resource: string;
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
    const wordParam = params.get("word");
    const language = params.get("language") || "en";
    const organization = params.get("organization") || "unfoldingWord";

    // Parse section inclusion parameters
    const includeTitle = params.get("includeTitle") !== "false"; // Default to true
    const includeSubtitle = params.get("includeSubtitle") !== "false"; // Default to true
    const includeContent = params.get("includeContent") !== "false"; // Default to true

    console.log(`📖 fetch-translation-words called with:`, {
      reference: referenceParam,
      word: wordParam,
      language,
      organization,
      includeTitle,
      includeSubtitle,
      includeContent,
    });

    // Validate that we have either a reference or a word
    if (!referenceParam && !wordParam) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing reference or word parameter" }),
      };
    }

    const aggregator = new ResourceAggregator();
    let translationWords: TranslationWord[] = [];

    if (referenceParam) {
      // Mode 1: Get words for a specific Bible reference
      const reference = parseReference(referenceParam);
      if (!reference) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Invalid reference format" }),
        };
      }

      // Check for cached transformed response FIRST
      const responseKey = `words:${referenceParam}:${language}:${organization}`;
      const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

      if (cachedResponse.value) {
        console.log(`🚀 FAST cache hit for processed words: ${responseKey}`);
        return timedResponse(cachedResponse.value, startTime, undefined, {
          cached: true,
          cacheType: cachedResponse.cacheType,
          expiresAt: cachedResponse.expiresAt,
          ttlSeconds: cachedResponse.ttlSeconds,
        });
      }

      console.log(`🔄 Processing fresh words request: ${responseKey}`);

      translationWords = await aggregator.fetchTranslationWords(
        reference,
        {
          language,
          organization,
          resources: ["words"],
        },
        {
          title: includeTitle,
          subtitle: includeSubtitle,
          content: includeContent,
        }
      );
    } else if (wordParam) {
      // Mode 2: Get a specific word article
      const wordResult = await aggregator.fetchTranslationWordByTerm(
        wordParam,
        {
          language,
          organization,
        },
        {
          title: includeTitle,
          subtitle: includeSubtitle,
          content: includeContent,
        }
      );

      if (wordResult) {
        translationWords = [wordResult];
      }
    }

    const result: WordsResponse = {
      translationWords,
      citation: {
        resource: "Translation Words",
        organization,
        language,
        url: `https://git.door43.org/${organization}/${language}_tw`,
        version: "master",
      },
      language,
      organization,
    };

    // Cache the transformed response for fast future retrieval
    const cacheKey = `words:${referenceParam}:${language}:${organization}`;
    await cache.setTransformedResponse(cacheKey, result);

    return timedResponse(result, startTime);
  } catch (error) {
    console.error("Error in fetch-translation-words:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
