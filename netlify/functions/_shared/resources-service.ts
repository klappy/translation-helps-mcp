/**
 * Resources Service
 * Shared core implementation for fetching multiple resource types
 * Combines existing services for unified resource access
 */

import { fetchTranslationNotes } from "./translation-notes-service";
import { fetchTranslationQuestions } from "./translation-questions-service";
import { fetchTranslationWords } from "./translation-words-service";
import { fetchScripture } from "./scripture-service";

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
  scripture?: any;
  translationNotes?: any[];
  translationQuestions?: any[];
  translationWords?: any[];
  citations: any[];
  metadata: {
    responseTime: number;
    cached: boolean;
    timestamp: string;
    resourcesRequested: string[];
    resourcesFound: number;
  };
}

/**
 * Core resources aggregation logic using existing services
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

  const result: ResourcesResult = {
    reference,
    citations: [],
    metadata: {
      responseTime: 0,
      cached: false,
      timestamp: new Date().toISOString(),
      resourcesRequested: resources,
      resourcesFound: 0,
    },
  };

  const promises: Promise<any>[] = [];

  // Fetch scripture if requested
  if (resources.includes("scripture")) {
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
  }

  // Fetch translation notes if requested
  if (resources.includes("notes")) {
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
  }

  // Fetch translation questions if requested
  if (resources.includes("questions")) {
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
  }

  // Fetch translation words if requested
  if (resources.includes("words")) {
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
  }

  // Wait for all requests to complete
  await Promise.all(promises);

  // Check if any results were cached
  result.metadata.cached = false; // For simplicity, mark as not cached since we're aggregating

  result.metadata.responseTime = Date.now() - startTime;

  console.log(
    `📦 Resources aggregation completed: ${result.metadata.resourcesFound}/${resources.length} found`
  );

  return result;
}
