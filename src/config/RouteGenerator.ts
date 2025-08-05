/**
 * Route Generator
 *
 * Auto-generates consistent API route handlers from endpoint configurations.
 * Handles transformations, error handling, performance tracking, and response formatting.
 */

import { performanceMonitor } from "../functions/performance-monitor.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../functions/platform-adapter.js";
import { unifiedCache } from "../functions/unified-cache.js";
import { parseReference } from "../parsers/referenceParser.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import type {
  DataSourceConfig,
  EndpointConfig,
  ParamConfig,
  TransformationType,
} from "./EndpointConfig.js";

/**
 * Book name to DCS code mapping
 */
const BOOK_CODE_MAP: Record<string, string> = {
  // Old Testament
  Genesis: "GEN",
  Exodus: "EXO",
  Leviticus: "LEV",
  Numbers: "NUM",
  Deuteronomy: "DEU",
  Joshua: "JOS",
  Judges: "JDG",
  Ruth: "RUT",
  "1 Samuel": "1SA",
  "2 Samuel": "2SA",
  "1 Kings": "1KI",
  "2 Kings": "2KI",
  "1 Chronicles": "1CH",
  "2 Chronicles": "2CH",
  Ezra: "EZR",
  Nehemiah: "NEH",
  Esther: "EST",
  Job: "JOB",
  Psalms: "PSA",
  Psalm: "PSA",
  Proverbs: "PRO",
  Ecclesiastes: "ECC",
  "Song of Solomon": "SNG",
  Isaiah: "ISA",
  Jeremiah: "JER",
  Lamentations: "LAM",
  Ezekiel: "EZK",
  Daniel: "DAN",
  Hosea: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA",
  Jonah: "JON",
  Micah: "MIC",
  Nahum: "NAM",
  Habakkuk: "HAB",
  Zephaniah: "ZEP",
  Haggai: "HAG",
  Zechariah: "ZEC",
  Malachi: "MAL",

  // New Testament
  Matthew: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Romans: "ROM",
  "1 Corinthians": "1CO",
  "2 Corinthians": "2CO",
  Galatians: "GAL",
  Ephesians: "EPH",
  Philippians: "PHP",
  Colossians: "COL",
  "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH",
  "1 Timothy": "1TI",
  "2 Timothy": "2TI",
  Titus: "TIT",
  Philemon: "PHM",
  Hebrews: "HEB",
  James: "JAS",
  "1 Peter": "1PE",
  "2 Peter": "2PE",
  "1 John": "1JN",
  "2 John": "2JN",
  "3 John": "3JN",
  Jude: "JUD",
  Revelation: "REV",
};

/**
 * Generated route handler configuration
 */
export interface GeneratedRouteHandler {
  /** The handler function */
  handler: PlatformHandler;
  /** Original endpoint configuration */
  config: EndpointConfig;
  /** Generated at timestamp */
  generatedAt: string;
}

/**
 * Parameter parsing result
 */
export interface ParsedParams {
  [key: string]: string | boolean | number | string[] | undefined;
}

/**
 * Route generation error
 */
export class RouteGenerationError extends Error {
  constructor(
    message: string,
    public endpointName: string,
    public field?: string
  ) {
    super(message);
    this.name = "RouteGenerationError";
  }
}

/**
 * Route Generator Class
 */
export class RouteGenerator {
  private dcsClient: DCSApiClient;

  constructor() {
    this.dcsClient = new DCSApiClient();
  }

  /**
   * Generate a route handler from endpoint configuration
   */
  generateHandler(config: EndpointConfig): GeneratedRouteHandler {
    // Validate configuration
    this.validateConfig(config);

    // Generate the handler function
    const handler: PlatformHandler = async (
      request: PlatformRequest
    ): Promise<PlatformResponse> => {
      const startTime = Date.now();
      const traceId = `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Enable DCS tracing for API endpoints
        if (config.dataSource.type === "dcs-api") {
          this.dcsClient.enableTracing(traceId, `/api/${config.path.replace(/^\//, "")}`);
        }

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
          return this.generateCORSResponse();
        }

        // Parse and validate parameters
        const params = this.parseParameters(request, config.params);
        const validationErrors = this.validateParameters(params, config.params);

        if (validationErrors.length > 0) {
          return this.generateErrorResponse(
            400,
            "Parameter validation failed",
            { errors: validationErrors },
            startTime
          );
        }

        // Check cache if enabled
        const cacheKey = this.generateCacheKey(config.name, params);
        let responseData: unknown = null;
        let cacheStatus: "hit" | "miss" | "bypass" = "bypass";

        if (config.responseShape.performance.cacheable) {
          const bypassCache =
            request.queryStringParameters["cache-bypass"] === "true" ||
            request.headers["x-cache-bypass"] === "true";

          if (!bypassCache) {
            const cached = await unifiedCache.get(cacheKey);
            if (cached && cached.value) {
              responseData = cached.value;
              cacheStatus = "hit";
            } else {
              cacheStatus = "miss";
            }
          }
        }

        // Fetch data if not cached
        if (!responseData) {
          responseData = await this.fetchData(config, params, traceId);

          // Cache the result if cacheable
          if (config.responseShape.performance.cacheable && cacheStatus !== "bypass") {
            const ttl = config.dataSource.cacheTtl || 3600; // Default 1 hour
            await unifiedCache.set(cacheKey, responseData, ttl);
          }
        }

        // Apply transformations
        const transformedData = await this.applyTransformations(
          responseData,
          config.dataSource.transformation,
          params
        );

        // Build response
        const responseTime = Date.now() - startTime;
        const response = this.buildResponse(transformedData, {
          responseTime,
          cacheStatus,
          success: true,
          status: 200,
          traceId,
          endpointName: config.name,
        });

        // Complete monitoring - fixed
        // Record performance metrics
        performanceMonitor.recordMetrics({
          endpoint: config.name,
          method: request.method || "GET",
          responseTime,
          statusCode: 200,
          contentSize: JSON.stringify(response).length,
          cacheHit: cacheStatus === "hit",
          compressed: false,
        });

        // Disable DCS tracing
        if (config.dataSource.type === "dcs-api") {
          this.dcsClient.disableTracing();
        }

        return {
          statusCode: 200,
          headers: this.generateHeaders(),
          body: JSON.stringify(response),
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        // Complete monitoring with error - fixed
        // Record error metrics
        performanceMonitor.recordMetrics({
          endpoint: config.name,
          method: request.method || "GET",
          responseTime,
          statusCode: 500,
          contentSize: 0,
          cacheHit: false,
          compressed: false,
        });

        // Disable DCS tracing on error
        if (config.dataSource.type === "dcs-api") {
          this.dcsClient.disableTracing();
        }

        console.error(`❌ Error in generated route ${config.name}:`, error);

        return this.generateErrorResponse(
          500,
          "Internal server error",
          {
            message: error instanceof Error ? error.message : "Unknown error",
            endpoint: config.name,
            traceId,
          },
          responseTime
        );
      }
    };

    return {
      handler,
      config,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate endpoint configuration for route generation
   */
  private validateConfig(config: EndpointConfig): void {
    if (!config.name) {
      throw new RouteGenerationError("Endpoint name is required", "unknown", "name");
    }

    if (!config.path) {
      throw new RouteGenerationError("Endpoint path is required", config.name, "path");
    }

    if (!config.dataSource) {
      throw new RouteGenerationError(
        "Data source configuration is required",
        config.name,
        "dataSource"
      );
    }

    if (config.dataSource.type === "dcs-api" && !config.dataSource.dcsEndpoint) {
      throw new RouteGenerationError(
        "DCS endpoint is required for dcs-api data sources",
        config.name,
        "dataSource.dcsEndpoint"
      );
    }
  }

  /**
   * Parse request parameters according to configuration
   */
  private parseParameters(
    request: PlatformRequest,
    paramConfigs: Record<string, ParamConfig>
  ): ParsedParams {
    const params: ParsedParams = {};

    // Handle both GET query parameters and POST body parameters
    let sourceParams: Record<string, string | undefined> = request.queryStringParameters;

    if (request.method === "POST" && request.body) {
      try {
        const bodyParams = JSON.parse(request.body);
        // Query parameters take precedence over body parameters
        sourceParams = { ...bodyParams, ...request.queryStringParameters };
      } catch {
        // If body parsing fails, just use query parameters
      }
    }

    for (const [paramName, paramConfig] of Object.entries(paramConfigs)) {
      const rawValue = sourceParams[paramName];

      if (rawValue === undefined) {
        // Use default value if available
        if (paramConfig.default !== undefined) {
          params[paramName] = paramConfig.default;
        }
        continue;
      }

      // Parse based on type
      switch (paramConfig.type) {
        case "string":
          params[paramName] = rawValue;
          break;

        case "boolean":
          params[paramName] = rawValue === "true";
          break;

        case "number":
          const numValue = Number(rawValue);
          params[paramName] = isNaN(numValue) ? undefined : numValue;
          break;

        case "array":
          const delimiter = paramConfig.arrayDelimiter || ",";
          params[paramName] = rawValue.split(delimiter).map((v) => v.trim());
          break;

        default:
          params[paramName] = rawValue;
      }
    }

    return params;
  }

  /**
   * Validate parsed parameters against configuration
   */
  private validateParameters(
    params: ParsedParams,
    paramConfigs: Record<string, ParamConfig>
  ): string[] {
    const errors: string[] = [];

    for (const [paramName, paramConfig] of Object.entries(paramConfigs)) {
      const value = params[paramName];

      // Check required parameters
      if (paramConfig.required && (value === undefined || value === null || value === "")) {
        errors.push(`Missing required parameter: ${paramName}`);
        continue;
      }

      // Skip validation if parameter is not provided and not required
      if (value === undefined) {
        continue;
      }

      // Type-specific validation
      switch (paramConfig.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push(`Parameter ${paramName} must be a string`);
          } else {
            // Pattern validation
            if (paramConfig.pattern && !new RegExp(paramConfig.pattern).test(value)) {
              errors.push(`Parameter ${paramName} does not match required pattern`);
            }

            // Length validation
            if (paramConfig.min !== undefined && value.length < paramConfig.min) {
              errors.push(`Parameter ${paramName} must be at least ${paramConfig.min} characters`);
            }
            if (paramConfig.max !== undefined && value.length > paramConfig.max) {
              errors.push(`Parameter ${paramName} must be at most ${paramConfig.max} characters`);
            }

            // Options validation
            if (paramConfig.options && !paramConfig.options.includes(value)) {
              errors.push(
                `Parameter ${paramName} must be one of: ${paramConfig.options.join(", ")}`
              );
            }
          }
          break;

        case "number":
          if (typeof value !== "number" || isNaN(value)) {
            errors.push(`Parameter ${paramName} must be a valid number`);
          } else {
            if (paramConfig.min !== undefined && value < paramConfig.min) {
              errors.push(`Parameter ${paramName} must be at least ${paramConfig.min}`);
            }
            if (paramConfig.max !== undefined && value > paramConfig.max) {
              errors.push(`Parameter ${paramName} must be at most ${paramConfig.max}`);
            }
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            errors.push(`Parameter ${paramName} must be a boolean`);
          }
          break;

        case "array":
          if (!Array.isArray(value)) {
            errors.push(`Parameter ${paramName} must be an array`);
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Generate cache key for the request
   */
  private generateCacheKey(endpointName: string, params: ParsedParams): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join("&");

    return `${endpointName}:${sortedParams}`;
  }

  /**
   * Fetch data based on data source configuration
   */
  private async fetchData(
    config: EndpointConfig,
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    switch (config.dataSource.type) {
      case "dcs-api": {
        return this.fetchFromDCS(config.dataSource, params, traceId);
      }

      case "computed": {
        return this.computeData(config, params, null); // Pass null for dcsData
      }

      case "hybrid": {
        // For hybrid, we might fetch from DCS and then do additional computation
        const dcsData = config.dataSource.dcsEndpoint
          ? await this.fetchFromDCS(config.dataSource, params, traceId)
          : null;
        return this.computeData(config, params, dcsData);
      }

      default: {
        throw new Error(`Unsupported data source type: ${config.dataSource.type}`);
      }
    }
  }

  /**
   * Fetch data from DCS API
   */
  private async fetchFromDCS(
    dataSource: DataSourceConfig,
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    if (!dataSource.dcsEndpoint) {
      throw new Error("DCS endpoint is required for dcs-api data sources");
    }

    // Replace parameters in the endpoint URL
    let endpoint = dataSource.dcsEndpoint;
    
    // If there's a reference parameter, parse it and add book/chapter to params
    const expandedParams = { ...params };
    if (params.reference && typeof params.reference === "string") {
      const parsed = parseReference(params.reference);
      if (parsed.isValid && parsed.book && parsed.chapter) {
        // Convert book name to DCS code
        const bookCode = BOOK_CODE_MAP[parsed.book] || parsed.book.toUpperCase();
        expandedParams.book = bookCode;
        expandedParams.chapter = parsed.chapter.toString();
      }
    }

    // Handle multiple resources
    const resourceParam = expandedParams.resource as string;
    if (resourceParam === "all" || resourceParam?.includes(",")) {
      const resources = resourceParam === "all" 
        ? ["ult", "ust"] 
        : resourceParam.split(",").map(r => r.trim());
      
      const results = [];
      for (const resource of resources) {
        const resourceParams = { ...expandedParams, resource };
        let resourceEndpoint = dataSource.dcsEndpoint;
        
        for (const [key, value] of Object.entries(resourceParams)) {
          if (value !== undefined) {
            resourceEndpoint = resourceEndpoint.replace(`{${key}}`, String(value));
          }
        }
        
        try {
          const resourceResponse = await this.dcsClient.fetchResource(resourceEndpoint);
          results.push({
            resource,
            ...resourceResponse
          });
        } catch (error) {
          // Continue with other resources if one fails
          results.push({
            resource,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const trace = this.dcsClient.getTrace();
      return {
        data: {
          success: true,
          resources: results,
          total: results.length
        },
        _trace: trace,
      };
    }

    // Single resource (existing logic)
    for (const [key, value] of Object.entries(expandedParams)) {
      if (value !== undefined) {
        endpoint = endpoint.replace(`{${key}}`, String(value));
      }
    }

    // Make the API call using DCS client
    const response = await this.dcsClient.fetchResource(endpoint);

    // Add trace information
    const trace = this.dcsClient.getTrace();
    return {
      data: response,
      _trace: trace,
    };
  }

  /**
   * Compute data for computed or hybrid endpoints
   */
  private async computeData(
    config: EndpointConfig,
    _params: ParsedParams,
    _dcsData?: unknown
  ): Promise<unknown> {
    // This is a placeholder for computed data logic
    // In the actual implementation, we would have specific computation logic
    // based on the endpoint type and parameters

    throw new Error(`Computed data source not yet implemented for endpoint: ${config.name}`);
  }

  /**
   * Apply data transformations
   */
  private async applyTransformations(
    data: unknown,
    transformation: TransformationType | undefined,
    params: ParsedParams
  ): Promise<unknown> {
    if (!transformation) {
      return data;
    }

    switch (transformation) {
      case "usfm-to-text": {
        return this.transformUSFMToText(data, params);
      }

      case "tsv-parse": {
        return this.parseTSV(data);
      }

      case "markdown-assemble": {
        return this.assembleMarkdown(data);
      }

      case "json-passthrough": {
        return data;
      }

      case "array-flatten": {
        return this.flattenArray(data);
      }

      case "reference-parse": {
        return this.parseReferences(data);
      }

      default: {
        console.warn(`Unknown transformation type: ${transformation}`);
        return data;
      }
    }
  }

  /**
   * Transform USFM to text
   */
  private transformUSFMToText(data: unknown, _params: ParsedParams): unknown {
    // Placeholder for USFM transformation logic
    // This would use the existing USFM extractor functions
    return data;
  }

  /**
   * Parse TSV data
   */
  private parseTSV(data: unknown): unknown {
    if (typeof data !== "string") {
      return data;
    }

    const lines = data.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split("\t");
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split("\t");
      const row: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || "";
      }

      result.push(row);
    }

    return result;
  }

  /**
   * Assemble markdown content
   */
  private assembleMarkdown(data: unknown): unknown {
    // Placeholder for markdown assembly logic
    return data;
  }

  /**
   * Flatten array data
   */
  private flattenArray(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.flat();
    }
    return data;
  }

  /**
   * Parse reference data
   */
  private parseReferences(data: unknown): unknown {
    // Placeholder for reference parsing logic
    return data;
  }

  /**
   * Build consistent response format
   */
  private buildResponse(
    data: unknown,
    metadata: {
      responseTime: number;
      cacheStatus: "hit" | "miss" | "bypass";
      success: boolean;
      status: number;
      traceId: string;
      endpointName: string;
    }
  ): unknown {
    return {
      ...data,
      _metadata: {
        responseTime: metadata.responseTime,
        cacheStatus: metadata.cacheStatus,
        success: metadata.success,
        status: metadata.status,
        timestamp: new Date().toISOString(),
        traceId: metadata.traceId,
        endpoint: metadata.endpointName,
      },
    };
  }

  /**
   * Generate CORS response
   */
  private generateCORSResponse(): PlatformResponse {
    return {
      statusCode: 200,
      headers: this.generateHeaders(),
      body: "",
    };
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(
    statusCode: number,
    message: string,
    details?: unknown,
    responseTime?: number
  ): PlatformResponse {
    const response = {
      error: message,
      details,
      _metadata: {
        success: false,
        status: statusCode,
        responseTime: responseTime || 0,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      statusCode,
      headers: this.generateHeaders(),
      body: JSON.stringify(response),
    };
  }

  /**
   * Generate standard headers
   */
  private generateHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Cache-Control": "public, max-age=300", // 5 minutes default
    };
  }
}

// Export singleton instance
export const routeGenerator = new RouteGenerator();

// Export utility functions
export const generateHandler = (config: EndpointConfig) => routeGenerator.generateHandler(config);

// Export the TSV parsing function for use elsewhere
export function parseTSV(tsvData: string): Array<Record<string, string>> {
  const lines = tsvData.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split("\t");
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }

    result.push(row);
  }

  return result;
}
