/**
 * ScriptureService - A simple, focused service for fetching scripture
 *
 * This extracts the essential scripture fetching logic from ZipResourceFetcher2
 * into a clean, understandable interface.
 */

import { EdgeXRayTracer } from "../functions/edge-xray.js";
import type { ParsedReference } from "../functions/reference-parser.js";
import { logger } from "../utils/logger.js";
import { ZipResourceFetcher2 } from "./ZipResourceFetcher2.js";

export interface ScriptureParams {
  reference: string;
  language?: string;
  organization?: string;
  resource?: string;
}

export interface Scripture {
  text: string;
  reference: string;
  resource: string;
  language: string;
  citation: string;
  organization: string;
}

export class ScriptureService {
  private zipFetcher: ZipResourceFetcher2;

  constructor() {
    // For now, reuse the existing ZIP fetcher
    // In the future, we'll extract just what we need
    const tracer = new EdgeXRayTracer();
    this.zipFetcher = new ZipResourceFetcher2(tracer);
  }

  /**
   * Get scripture for a reference
   * @param params - Scripture request parameters
   * @returns Array of scripture translations
   */
  async getScripture(params: ScriptureParams): Promise<Scripture[]> {
    const {
      reference,
      language = "en",
      organization = "unfoldingWord",
      resource,
    } = params;

    logger.info("ScriptureService.getScripture", {
      reference,
      language,
      organization,
      resource,
    });

    // 1. Parse the reference
    const parsedRef = await this.parseReference(reference);
    if (!parsedRef) {
      throw new Error(`Invalid reference: ${reference}`);
    }

    // 2. Fetch from ZIP fetcher (for now)
    try {
      const rawResults = await this.zipFetcher.getScripture(
        parsedRef,
        language,
        organization,
        resource, // This is optional version parameter
      );

      // 3. Transform to our clean format
      return rawResults.map((result) => ({
        text: result.text,
        reference: reference,
        resource: result.translation || result.resource || "unknown",
        language: language,
        citation: `${reference} (${result.translation || result.resource})`,
        organization: organization,
      }));
    } catch (error) {
      logger.error("Failed to fetch scripture", { error, reference, language });
      throw new Error(`Failed to fetch scripture: ${error.message}`);
    }
  }

  /**
   * Parse a scripture reference
   * TODO: Extract this logic from the complex reference parser
   */
  private async parseReference(
    reference: string,
  ): Promise<ParsedReference | null> {
    // For now, use a simple regex parser
    // In the future, extract clean parsing logic
    const match = reference.match(
      /^(\d?\s*)?([A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/,
    );

    if (!match) {
      return null;
    }

    const [, _bookNumber, bookName, chapter, verse, verseEnd] = match;

    return {
      book: bookName,
      bookName: bookName,
      chapter: parseInt(chapter, 10),
      verse: verse ? parseInt(verse, 10) : undefined,
      verseEnd: verseEnd ? parseInt(verseEnd, 10) : undefined,
      isValid: true,
    };
  }
}
