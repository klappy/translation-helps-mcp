/**
 * Resources Service
 * Shared core implementation for fetching multiple resource types
 * Uses unified resource discovery to minimize DCS API calls
 */

import { checkResourceAvailability, discoverAvailableResources } from "./resource-detector";
import { fetchScripture } from "./scripture-service";
import { fetchTranslationNotes } from "./translation-notes-service";
import { fetchTranslationQuestions } from "./translation-questions-service";
import { fetchTranslationWords } from "./translation-words-service";

export interface ResourcesOptions {
  reference: string;
  language?: string;
  organization?: string;
  resources?: string[];
  includeIntro?: boolean;
  includeVerseNumbers?: boolean;
  format?: "text" | "usfm";
}

export interface ResourcesResult {
  reference: string;
  scripture?: unknown;
  translationNotes?: unknown[];
  translationQuestions?: unknown[];
  translationWords?: unknown[];
  citations: unknown[];
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    resourcesRequested: string[];
    resourcesFound: number;
    resourceAvailability: {
      hasScripture: boolean;
      hasNotes: boolean;
      hasQuestions: boolean;
      hasWords: boolean;
      hasWordLinks: boolean;
      totalResources: number;
    };
  };
}

/**
 * Core resources aggregation logic with intelligent resource discovery
 * Uses unified catalog discovery to minimize DCS API calls
 */
export async function fetchResources(options: ResourcesOptions): Promise<ResourcesResult> {
  const startTime = Date.now();
  const {
    reference,
    language = "en",
    organization = "unfoldingWord",
    resources = ["scripture", "notes", "questions", "words"],
    includeIntro = true,
    includeVerseNumbers = true,
    format = "text",
  } = options;

  console.log(`📦 Core resources service called with:`, {
    reference,
    language,
    organization,
    resources,
  });

  // 🚀 OPTIMIZATION: Discover resource availability first with one unified call
  console.log(`🔍 Checking resource availability for optimized fetching...`);
  const availability = await checkResourceAvailability(reference, language, organization);

  console.log(`📊 Resource availability discovered:`, {
    scripture: availability.hasScripture,
    notes: availability.hasNotes,
    questions: availability.hasQuestions,
    words: availability.hasWords,
    wordLinks: availability.hasWordLinks,
    total: availability.totalResources,
  });

  const result: ResourcesResult = {
    reference,
    citations: [],
    metadata: {
      responseTime: 0,
      cached: false,
      timestamp: new Date().toISOString(),
      resourcesRequested: resources,
      resourcesFound: 0,
      resourceAvailability: availability,
    },
  };

  const promises: Promise<unknown>[] = [];

  // 🚀 OPTIMIZATION: Only fetch scripture if available
  if (resources.includes("scripture") && availability.hasScripture) {
    console.log(`📖 Scripture available - fetching...`);
    promises.push(
      fetchScripture({
        reference,
        language,
        organization,
        includeVerseNumbers,
        format,
      })
        .then((res) => {
          result.scripture = res.scripture;
          if (res.scripture?.citation) {
            result.citations.push(res.scripture.citation);
          }
          if (res.scripture) result.metadata.resourcesFound++;
          return res;
        })
        .catch((error) => {
          console.warn(`⚠️ Scripture fetch failed: ${error.message}`);
          return null;
        })
    );
  } else if (resources.includes("scripture")) {
    console.log(`⏭️ Scripture not available - skipping fetch`);
  }

  // 🚀 OPTIMIZATION: Only fetch notes if available
  if (resources.includes("notes") && availability.hasNotes) {
    console.log(`📝 Translation notes available - fetching...`);
    promises.push(
      fetchTranslationNotes({
        reference,
        language,
        organization,
        includeIntro,
        includeContext: true,
      })
        .then((res) => {
          result.translationNotes = res.translationNotes;
          result.citations.push(res.citation);
          if (res.translationNotes?.length) result.metadata.resourcesFound++;
          return res;
        })
        .catch((error) => {
          console.warn(`⚠️ Translation notes fetch failed: ${error.message}`);
          return null;
        })
    );
  } else if (resources.includes("notes")) {
    console.log(`⏭️ Translation notes not available - skipping fetch`);
  }

  // 🚀 OPTIMIZATION: Only fetch questions if available
  if (resources.includes("questions") && availability.hasQuestions) {
    console.log(`❓ Translation questions available - fetching...`);
    promises.push(
      fetchTranslationQuestions({
        reference,
        language,
        organization,
      })
        .then((res) => {
          result.translationQuestions = res.translationQuestions;
          result.citations.push(res.citation);
          if (res.translationQuestions?.length) result.metadata.resourcesFound++;
          return res;
        })
        .catch((error) => {
          console.warn(`⚠️ Translation questions fetch failed: ${error.message}`);
          return null;
        })
    );
  } else if (resources.includes("questions")) {
    console.log(`⏭️ Translation questions not available - skipping fetch`);
  }

  // 🚀 OPTIMIZATION: Only fetch words if available
  if (resources.includes("words") && availability.hasWords) {
    console.log(`📚 Translation words available - fetching...`);
    promises.push(
      fetchTranslationWords({
        reference,
        language,
        organization,
      })
        .then((res) => {
          result.translationWords = res.translationWords;
          result.citations.push(res.citation);
          if (res.translationWords?.length) result.metadata.resourcesFound++;
          return res;
        })
        .catch((error) => {
          console.warn(`⚠️ Translation words fetch failed: ${error.message}`);
          return null;
        })
    );
  } else if (resources.includes("words")) {
    console.log(`⏭️ Translation words not available - skipping fetch`);
  }

  // Wait for all requests to complete
  await Promise.all(promises);

  // Check if any results were cached
  result.metadata.cached = false; // For simplicity, mark as not cached since we're aggregating

  result.metadata.responseTime = Date.now() - startTime;

  console.log(
    `📦 Resources aggregation completed: ${result.metadata.resourcesFound}/${resources.length} found (${availability.totalResources} total resources available)`
  );

  return result;
}

/**
 * Get the detailed catalog information for available resources
 * Useful for advanced clients that need resource metadata
 */
export async function getResourceCatalogInfo(
  reference: string,
  language: string = "en",
  organization: string = "unfoldingWord"
) {
  console.log(`📋 Getting detailed catalog info for ${reference}...`);
  const catalog = await discoverAvailableResources(reference, language, organization);

  return {
    reference,
    book: catalog.book,
    language: catalog.language,
    organization: catalog.organization,
    lastUpdated: catalog.lastUpdated,
    resources: {
      scripture: catalog.scripture.map((r) => ({
        name: r.name,
        title: r.title,
        subject: r.subject,
        url: r.url,
      })),
      notes: catalog.notes.map((r) => ({
        name: r.name,
        title: r.title,
        subject: r.subject,
        url: r.url,
      })),
      questions: catalog.questions.map((r) => ({
        name: r.name,
        title: r.title,
        subject: r.subject,
        url: r.url,
      })),
      words: catalog.words.map((r) => ({
        name: r.name,
        title: r.title,
        subject: r.subject,
        url: r.url,
      })),
      wordLinks: catalog.wordLinks.map((r) => ({
        name: r.name,
        title: r.title,
        subject: r.subject,
        url: r.url,
      })),
    },
    summary: {
      totalResources:
        catalog.scripture.length +
        catalog.notes.length +
        catalog.questions.length +
        catalog.words.length +
        catalog.wordLinks.length,
      hasScripture: catalog.scripture.length > 0,
      hasNotes: catalog.notes.length > 0,
      hasQuestions: catalog.questions.length > 0,
      hasWords: catalog.words.length > 0,
      hasWordLinks: catalog.wordLinks.length > 0,
    },
  };
}
