/**
 * Metadata Builder Utility
 *
 * Provides consistent metadata generation for MCP tools and HTTP endpoints.
 * Eliminates duplication of metadata construction logic.
 */

import { estimateTokens } from "./tokenCounter.js";

export interface MetadataOptions {
  /** Start time of the operation (from Date.now()) */
  startTime: number;
  /** The data/result to include in metadata calculations */
  data: unknown;
  /** Metadata from the underlying service (e.g., cached, responseTime) */
  serviceMetadata?: {
    cached?: boolean;
    [key: string]: unknown;
  };
  /** Additional custom fields to include in metadata */
  additionalFields?: Record<string, unknown>;
}

export interface BuiltMetadata {
  responseTime: number;
  tokenEstimate: number;
  timestamp: string;
  cached: boolean;
  [key: string]: unknown;
}

/**
 * Build consistent metadata object for API responses
 *
 * @param options - Metadata construction options
 * @returns Complete metadata object with standard fields
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * const result = await fetchScripture(...);
 * const metadata = buildMetadata({
 *   startTime,
 *   data: result,
 *   serviceMetadata: result.metadata,
 *   additionalFields: { textLength: scriptureText.length }
 * });
 * ```
 */
export function buildMetadata(options: MetadataOptions): BuiltMetadata {
  const {
    startTime,
    data,
    serviceMetadata = {},
    additionalFields = {},
  } = options;

  const responseTime = Date.now() - startTime;
  const dataString = typeof data === "string" ? data : JSON.stringify(data);
  const tokenEstimate = estimateTokens(dataString);

  return {
    responseTime,
    tokenEstimate,
    timestamp: new Date().toISOString(),
    cached: serviceMetadata.cached || false,
    ...additionalFields,
  };
}

/**
 * Build metadata with automatic field extraction from service result
 *
 * This is a convenience function that automatically extracts common fields
 * from service results (like counts, found items, etc.)
 *
 * @param options - Metadata construction options
 * @param extractFields - Function to extract additional fields from the data
 * @returns Complete metadata object
 */
export function buildMetadataWithExtraction<T>(
  options: MetadataOptions & { data: T },
  extractFields?: (data: T) => Record<string, unknown>,
): BuiltMetadata {
  const extractedFields = extractFields ? extractFields(options.data) : {};

  return buildMetadata({
    ...options,
    additionalFields: {
      ...options.additionalFields,
      ...extractedFields,
    },
  });
}
