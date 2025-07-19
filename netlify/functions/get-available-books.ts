import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { timedResponse } from "./_shared/utils";
import { cache } from "./_shared/cache";

interface BookAvailability {
  resource: string;
  availableBooks: string[];
  title: string;
}

interface AvailabilityResponse {
  resources: BookAvailability[];
  language: string;
  organization: string;
  metadata: {
    timestamp: string;
    responseTime: number;
    version: string;
  };
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

    const language = params.get("language") || "en";
    const organization = params.get("organization") || "unfoldingWord";

    console.log(`📚 Getting available books for ${organization}/${language}`);

    // Resource types to check
    const resourceTypes = [
      { subject: "Translation Notes", resource: "tn" },
      { subject: "Translation Questions", resource: "tq" },
      { subject: "Translation Words", resource: "tw" },
      { subject: "Bible", resource: "bible" },
    ];

    const resources: BookAvailability[] = [];

    for (const resourceType of resourceTypes) {
      try {
        // Try to get from cache first
        const cacheKey = `availability:${organization}:${language}:${resourceType.resource}`;
        let cachedData = await cache.get(cacheKey);

        if (!cachedData) {
          console.log(`🔍 Fetching catalog for ${resourceType.subject}...`);

          // Fetch catalog data
          const catalogUrl = `https://git.door43.org/api/v1/catalog/search?owner=${organization}&lang=${language}&subject=${encodeURIComponent(resourceType.subject)}`;
          const catalogResponse = await fetch(catalogUrl);

          if (!catalogResponse.ok) {
            console.warn(`⚠️ Failed to fetch catalog for ${resourceType.subject}`);
            continue;
          }

          const catalogData: any = await catalogResponse.json();

          if (!catalogData.data || catalogData.data.length === 0) {
            console.warn(`⚠️ No resources found for ${resourceType.subject}`);
            continue;
          }

          const resource = catalogData.data[0];
          const availableBooks =
            resource.ingredients?.map((ing: any) => ing.identifier.toUpperCase()) || [];

          const bookData: BookAvailability = {
            resource: resourceType.resource,
            availableBooks: availableBooks.sort(),
            title: resource.title || resourceType.subject,
          };

          // Cache for 1 hour
          await cache.set(cacheKey, bookData, "resources");
          cachedData = bookData;
        }

        resources.push(cachedData);
        console.log(
          `✅ Found ${cachedData.availableBooks.length} books for ${resourceType.subject}`
        );
      } catch (error) {
        console.error(`❌ Error fetching ${resourceType.subject}:`, error);
        continue;
      }
    }

    const response: AvailabilityResponse = {
      resources,
      language,
      organization,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: "3.4.0",
      },
    };

    return timedResponse(response, startTime, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });
  } catch (error) {
    console.error("❌ Error in get-available-books:", error);

    const errorResponse = {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      language: "en",
      organization: "unfoldingWord",
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: "3.4.0",
      },
    };

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(errorResponse),
    };
  }
};
