import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { parseReference } from "./_shared/reference-parser";
import { extractVerseText, extractVerseRange, extractChapterText } from "./_shared/usfm-extractor";
import { timedResponse } from "./_shared/utils";

interface ScriptureResponse {
  scripture?: {
    text: string;
    translation: string;
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
    const translation = params.get("translation") || "ult"; // Default to ULT

    console.log(`📖 fetch-scripture called with:`, {
      reference: referenceParam,
      language,
      organization,
      translation,
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

    // Search catalog for Bible resource
    const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Bible,Aligned%20Bible&lang=${language}&owner=${organization}`;
    console.log(`🔍 Searching catalog: ${catalogUrl}`);

    const catalogResponse = await fetch(catalogUrl);
    if (!catalogResponse.ok) {
      console.error(`❌ Catalog search failed: ${catalogResponse.status}`);
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "No Bible resource found",
          language,
          organization,
          translation,
        }),
      };
    }

    const catalogData = (await catalogResponse.json()) as {
      data?: Array<{
        name: string;
        ingredients?: Array<{
          identifier: string;
          path: string;
        }>;
      }>;
    };
    console.log(`📊 Catalog returned ${catalogData.data?.length || 0} resources`);

    // Find the specific translation we want
    let resource = catalogData.data?.find((r) => r.name.includes(`_${translation}`));

    // If not found, try to find any Bible resource
    if (!resource) {
      resource = catalogData.data?.[0];
    }

    if (!resource || !resource.ingredients) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "No matching Bible resource found",
          language,
          organization,
          translation,
        }),
      };
    }

    // Find the correct file from ingredients array
    const ingredient = resource.ingredients.find(
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
          translation,
        }),
      };
    }

    // Build the URL using the ingredient path
    const fileName = ingredient.path.replace("./", "");
    const url = `https://git.door43.org/${organization}/${resource.name}/raw/branch/master/${fileName}`;
    console.log(`📥 Fetching scripture from: ${url}`);

    const response = await fetch(url);
    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Failed to fetch scripture: ${response.status}`);
      console.error(`❌ Response text: ${await response.text()}`);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Failed to fetch scripture content",
          details: `HTTP ${response.status}`,
          url: url,
          language,
          organization,
          translation,
        }),
      };
    }

    const usfm = await response.text();
    console.log(`📜 Got USFM text (${usfm.length} chars)`);

    // Extract the requested text
    let text: string | null = null;

    if (!reference.verse && reference.verseEnd) {
      // Chapter range
      const startChapter = reference.chapter;
      const endChapter = reference.verseEnd;
      let combinedText = "";

      for (let chapter = startChapter; chapter <= endChapter; chapter++) {
        const chapterText = extractChapterText(usfm, chapter);
        if (chapterText) {
          combinedText += chapterText + "\n\n";
        }
      }
      text = combinedText.trim() || null;
    } else if (reference.verse && reference.verseEnd) {
      // Verse range within same chapter
      text = extractVerseRange(usfm, reference.chapter, reference.verse, reference.verseEnd);
    } else if (reference.verse) {
      // Single verse
      text = extractVerseText(usfm, reference.chapter, reference.verse);
    } else {
      // Full chapter
      text = extractChapterText(usfm, reference.chapter);
    }

    if (!text) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Scripture text not found for reference",
          language,
          organization,
          translation,
        }),
      };
    }

    // Extract translation abbreviation from resource name
    const translationMatch = resource.name.match(/_([^_]+)$/);
    const actualTranslation = translationMatch ? translationMatch[1].toUpperCase() : resource.name;

    const result: ScriptureResponse = {
      scripture: {
        text,
        translation: actualTranslation,
      },
      language,
      organization,
    };

    return timedResponse(result, startTime);
  } catch (error) {
    console.error("Error in fetch-scripture:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
