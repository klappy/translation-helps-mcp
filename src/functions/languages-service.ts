/**
 * Languages Service
 * Shared core implementation for fetching available languages
 * Used by both Netlify functions and MCP tools for consistency
 */

import { cache } from "./cache";

export interface Language {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  alternateNames?: string[];
}

export interface LanguagesOptions {
  organization?: string;
  includeAlternateNames?: boolean;
}

export interface LanguagesResult {
  languages: Language[];
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    languagesFound: number;
    organization: string;
  };
}

/**
 * Core languages fetching logic
 */
export async function getLanguages(options: LanguagesOptions = {}): Promise<LanguagesResult> {
  const startTime = Date.now();
  const { organization = "unfoldingWord", includeAlternateNames = false } = options;

  console.log(`🌍 Core languages service called with:`, {
    organization,
    includeAlternateNames,
  });

  // Check for cached transformed response FIRST
  const responseKey = `languages:${organization}:${includeAlternateNames}`;
  const cachedResponse = await cache.getTransformedResponseWithCacheInfo(responseKey);

  if (cachedResponse.value) {
    console.log(`🚀 FAST cache hit for processed languages: ${responseKey}`);
    return {
      languages: cachedResponse.value.languages || [],
      metadata: {
        responseTime: Date.now() - startTime,
        cached: true,
        timestamp: new Date().toISOString(),
        languagesFound: cachedResponse.value.languages?.length || 0,
        organization,
      },
    };
  }

  console.log(`🔄 Processing fresh languages request: ${responseKey}`);

  // Search catalog for all available resources to extract languages
  const catalogUrl = `https://git.door43.org/api/v1/catalog/search?owner=${organization}`;
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
      language: string;
      stage?: string;
    }>;
  };

  console.log(`📊 Found ${catalogData.data?.length || 0} resources`);

  if (!catalogData.data || catalogData.data.length === 0) {
    throw new Error(`No resources found for ${organization}`);
  }

  // Extract unique languages from resources
  const languageMap = new Map<string, Language>();

  for (const resource of catalogData.data) {
    if (!resource.language) continue;

    // Parse language code from resource name (e.g., "en_ult" -> "en")
    const langMatch = resource.name.match(/^([a-z]{2,3})_/);
    const langCode = langMatch ? langMatch[1] : resource.language;

    if (!languageMap.has(langCode)) {
      // Determine language direction (RTL languages)
      const rtlLanguages = ["ar", "he", "fa", "ur", "yi"];
      const direction = rtlLanguages.includes(langCode) ? "rtl" : "ltr";

      // Extract language name from resource title or use code
      let languageName = langCode.toUpperCase();
      if (resource.title.includes("®")) {
        const titleMatch = resource.title.match(/^([^®]+)/);
        if (titleMatch) {
          languageName = titleMatch[1].trim();
        }
      }

      languageMap.set(langCode, {
        code: langCode,
        name: languageName,
        direction,
        alternateNames: includeAlternateNames ? [] : undefined,
      });
    }
  }

  const languages = Array.from(languageMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  console.log(`🌍 Extracted ${languages.length} unique languages`);

  const result: LanguagesResult = {
    languages,
    metadata: {
      responseTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
      languagesFound: languages.length,
      organization,
    },
  };

  // Cache the transformed response
  await cache.setTransformedResponse(responseKey, {
    languages: result.languages,
  });

  return result;
}
