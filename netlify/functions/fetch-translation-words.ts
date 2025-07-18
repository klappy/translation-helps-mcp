import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { ResourceAggregator } from "./_shared/resource-aggregator";
import { timedResponse } from "./_shared/utils";

interface TranslationWord {
  term: string;
  definition: string;
  title?: string;
  subtitle?: string;
  content?: string;
}

interface WordsResponse {
  translationWords?: TranslationWord[];
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

    // Parse section inclusion parameters
    const includeTitle = params.get("includeTitle") !== "false"; // Default to true
    const includeSubtitle = params.get("includeSubtitle") !== "false"; // Default to true
    const includeContent = params.get("includeContent") !== "false"; // Default to true

    console.log(`📖 fetch-translation-words called with:`, {
      reference: referenceParam,
      language,
      organization,
      includeTitle,
      includeSubtitle,
      includeContent,
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

    // Use the ResourceAggregator to fetch TW data
    const aggregator = new ResourceAggregator();
    const translationWords = await aggregator.fetchTranslationWords(
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

    const result: WordsResponse = {
      translationWords,
      language,
      organization,
    };

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
