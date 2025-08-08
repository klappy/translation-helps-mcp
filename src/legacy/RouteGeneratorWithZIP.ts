/**
 * Route Generator with ZIP Support - Example Implementation
 *
 * This demonstrates how to extend RouteGenerator to support ZIP-based caching
 * while maintaining backward compatibility with existing endpoints.
 */

import { EdgeXRayTracer } from "../functions/edge-xray.js";
import { ZipResourceFetcher2 } from "../services/ZipResourceFetcher2.js";
import type { DataSourceConfig, EndpointConfig } from "./EndpointConfig.js";
import type { ParsedParams } from "./RouteGenerator.js";
import { RouteGenerator } from "./RouteGenerator.js";

// Extend the DataSourceConfig type
export interface ZipDataSourceConfig extends DataSourceConfig {
  type: "dcs-api" | "computed" | "hybrid" | "zip-cached" | "zip-direct";

  zipConfig?: {
    fetchMethod: "getScripture" | "getTSVData" | "getUSFMContent" | "getMarkdownContent";
    resourceType: "ult" | "ust" | "tn" | "tq" | "tw" | "ta" | "twl";
    useIngredients?: boolean;
    zipCacheTtl?: number;
    warmCache?: boolean;
  };
}

/**
 * Extended Route Generator with ZIP Support
 */
export class RouteGeneratorWithZIP extends RouteGenerator {
  private zipFetcher?: ZipResourceFetcher2;

  /**
   * Override fetchData to support ZIP-based data sources
   */
  protected async fetchData(
    config: EndpointConfig & { dataSource: ZipDataSourceConfig },
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    switch (config.dataSource.type) {
      case "dcs-api":
        return super.fetchData(config, params, traceId);

      case "zip-cached":
      case "zip-direct":
        return this.fetchFromZIP(config.dataSource, params, traceId);

      case "computed":
        // Now computeData can use ZIP fetcher if needed
        return this.computeDataWithZIP(config, params, null);

      case "hybrid":
        // Can mix ZIP and DCS as needed
        const baseData = config.dataSource.zipConfig
          ? await this.fetchFromZIP(config.dataSource, params, traceId)
          : await super.fetchData(config, params, traceId);
        return this.computeDataWithZIP(config, params, baseData);

      default:
        return super.fetchData(config, params, traceId);
    }
  }

  /**
   * Fetch data using ZIP-based caching
   */
  private async fetchFromZIP(
    dataSource: ZipDataSourceConfig,
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    // Initialize ZIP fetcher if needed
    if (!this.zipFetcher) {
      const tracer = new EdgeXRayTracer(traceId, "route-generator-zip");
      this.zipFetcher = new ZipResourceFetcher2(tracer);
    }

    const { zipConfig } = dataSource;
    if (!zipConfig) {
      throw new Error("ZIP config required for zip-cached data source");
    }

    // Parse reference if provided
    const parsedRef = params.reference ? parseReference(params.reference as string) : null;

    // Call appropriate ZIP fetcher method
    switch (zipConfig.fetchMethod) {
      case "getScripture": {
        if (!parsedRef || !parsedRef.isValid) {
          throw new Error("Valid scripture reference required");
        }

        const resources = await this.zipFetcher.getScripture(
          parsedRef,
          (params.language as string) || "en",
          (params.organization as string) || "unfoldingWord",
          (params.resource as string) || zipConfig.resourceType
        );

        return {
          resources,
          reference: params.reference,
          language: params.language,
          organization: params.organization,
        };
      }

      case "getTSVData": {
        if (!parsedRef || !parsedRef.isValid) {
          throw new Error("Valid scripture reference required");
        }

        const data = await this.zipFetcher.getTSVData(
          (params.language as string) || "en",
          (params.organization as string) || "unfoldingWord",
          zipConfig.resourceType,
          parsedRef.book,
          parsedRef.chapter
        );

        // Filter by verse if specified
        if (parsedRef.verse) {
          const filteredData = data.filter((item) => {
            const itemVerse = parseInt(item.verse as string);
            return (
              itemVerse >= parsedRef.verse && itemVerse <= (parsedRef.endVerse || parsedRef.verse)
            );
          });
          return filteredData;
        }

        return data;
      }

      case "getMarkdownContent": {
        const term = (params.term as string) || (params.moduleId as string);
        if (!term) {
          throw new Error("Term or module ID required for markdown content");
        }

        const content = await this.zipFetcher.getMarkdownContent(
          (params.language as string) || "en",
          (params.organization as string) || "unfoldingWord",
          zipConfig.resourceType,
          term
        );

        return {
          term,
          content,
          language: params.language,
          organization: params.organization,
        };
      }

      case "getUSFMContent": {
        if (!parsedRef || !parsedRef.isValid) {
          throw new Error("Valid scripture reference required");
        }

        const usfm = await this.zipFetcher.getUSFMContent(
          (params.language as string) || "en",
          (params.organization as string) || "unfoldingWord",
          zipConfig.resourceType,
          parsedRef.book,
          parsedRef.chapter
        );

        return {
          usfm,
          reference: params.reference,
          language: params.language,
          organization: params.organization,
        };
      }

      default:
        throw new Error(`Unsupported ZIP fetch method: ${zipConfig.fetchMethod}`);
    }
  }

  /**
   * Enhanced computeData that can use ZIP fetcher
   */
  private async computeDataWithZIP(
    config: EndpointConfig,
    params: ParsedParams,
    dcsData?: unknown
  ): Promise<unknown> {
    // Initialize ZIP fetcher if needed for computed endpoints
    if (!this.zipFetcher) {
      const traceId = `computed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tracer = new EdgeXRayTracer(traceId, "computed-endpoint");
      this.zipFetcher = new ZipResourceFetcher2(tracer);
    }

    // Example: fetch-scripture endpoint that aggregates multiple translations
    if (config.name === "fetch-scripture") {
      const parsedRef = parseReference(params.reference as string);
      if (!parsedRef.isValid) {
        throw new Error("Invalid scripture reference");
      }

      const translations =
        params.resource === "all" ? ["ult", "ust"] : (params.resource as string).split(",");

      const results = await Promise.all(
        translations.map(async (translation) => {
          const resources = await this.zipFetcher!.getScripture(
            parsedRef,
            (params.language as string) || "en",
            (params.organization as string) || "unfoldingWord",
            translation
          );
          return { translation, resources };
        })
      );

      return {
        reference: params.reference,
        translations: results,
        language: params.language,
        organization: params.organization,
      };
    }

    // For other computed endpoints, fall back to error
    throw new Error(`Computed logic not implemented for endpoint: ${config.name}`);
  }
}

// Helper function (import from actual location)
function parseReference(reference: string): any {
  // This would import from the actual reference parser
  // Simplified for example
  const match = reference.match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) {
    return { isValid: false };
  }

  const [, book, chapter, verse, endVerse] = match;
  return {
    isValid: true,
    book: book.toUpperCase().replace(/\s/g, ""),
    chapter: parseInt(chapter),
    verse: verse ? parseInt(verse) : undefined,
    endVerse: endVerse ? parseInt(endVerse) : undefined,
  };
}
