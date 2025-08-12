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
import { parseReference } from "../functions/reference-parser.js";
import { DCSApiClient } from "../services/DCSApiClient.js";
import {
  ResponseFormatter,
  type FormatMetadata,
} from "../services/ResponseFormatter.js";
import { logger } from "../utils/logger.js";
import type {
  DataSourceConfig,
  EndpointConfig,
  ParamConfig,
  TransformationType,
} from "./EndpointConfig.js";

/**
 * Book code to number mapping (for DCS file naming)
 */
const BOOK_NUMBER_MAP: Record<string, string> = {
  GEN: "01",
  EXO: "02",
  LEV: "03",
  NUM: "04",
  DEU: "05",
  JOS: "06",
  JDG: "07",
  RUT: "08",
  "1SA": "09",
  "2SA": "10",
  "1KI": "11",
  "2KI": "12",
  "1CH": "13",
  "2CH": "14",
  EZR: "15",
  NEH: "16",
  EST: "17",
  JOB: "18",
  PSA: "19",
  PRO: "20",
  ECC: "21",
  SNG: "22",
  ISA: "23",
  JER: "24",
  LAM: "25",
  EZK: "26",
  DAN: "27",
  HOS: "28",
  JOL: "29",
  AMO: "30",
  OBA: "31",
  JON: "32",
  MIC: "33",
  NAM: "34",
  HAB: "35",
  ZEP: "36",
  HAG: "37",
  ZEC: "38",
  MAL: "39",
  MAT: "41",
  MRK: "42",
  LUK: "43",
  JHN: "44",
  ACT: "45",
  ROM: "46",
  "1CO": "47",
  "2CO": "48",
  GAL: "49",
  EPH: "50",
  PHP: "51",
  COL: "52",
  "1TH": "53",
  "2TH": "54",
  "1TI": "55",
  "2TI": "56",
  TIT: "57",
  PHM: "58",
  HEB: "59",
  JAS: "60",
  "1PE": "61",
  "2PE": "62",
  "1JN": "63",
  "2JN": "64",
  "3JN": "65",
  JUD: "66",
  REV: "67",
};

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
    public field?: string,
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
  private cachedZipFetcher?: any;
  private responseFormatter: ResponseFormatter;
  private lastComputedCacheStatus: string = "miss";

  constructor() {
    this.dcsClient = new DCSApiClient();
    this.responseFormatter = new ResponseFormatter();
  }

  /**
   * Generate a route handler from endpoint configuration
   */
  generateHandler(config: EndpointConfig): GeneratedRouteHandler {
    // Validate configuration
    this.validateConfig(config);

    // Generate the handler function
    const handler: PlatformHandler = async (
      request: PlatformRequest,
    ): Promise<PlatformResponse> => {
      const startTime =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const traceId = `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Enable DCS tracing for API endpoints
        if (config.dataSource.type === "dcs-api") {
          this.dcsClient.enableTracing(
            traceId,
            `/api/${config.path.replace(/^\//, "")}`,
          );
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
            startTime,
          );
        }

        // CRITICAL: Per CRITICAL_NEVER_CACHE_RESPONSES.md, we NEVER cache responses
        // The dataCacheStatus below tracks whether underlying data sources (catalog/ZIP) were cached
        const cacheKey = this.generateCacheKey(config.name, params);
        // CRITICAL: This tracks data source caching, NOT response caching
        let dataCacheStatus: string = "miss";

        const bypassOptions = {
          queryParams: request.queryStringParameters,
          headers: request.headers,
        } as const;

        // Do not cache transformed responses. Only deduplicate in-flight requests if needed.
        const { data: responseData, cacheStatus: computedCacheStatus } =
          await this.fetchData(config, params, request);
        // If downstream formatted an error object with explicit status, honor it here
        if (
          responseData &&
          typeof responseData === "object" &&
          // @ts-expect-error runtime field from error handler
          (responseData as any).__httpStatus
        ) {
          const status = (responseData as any).__httpStatus as number;
          // remove signal field before formatting
          // @ts-expect-error delete runtime field
          delete (responseData as any).__httpStatus;
          const endNow =
            typeof performance !== "undefined" && performance.now
              ? performance.now()
              : Date.now();
          const responseTime = Math.max(1, Math.round(endNow - startTime));
          // Return the error payload directly with proper status and headers
          const errorPayload = {
            ...(responseData as Record<string, unknown>),
            _metadata: {
              ...(typeof (responseData as any)._metadata === "object"
                ? ((responseData as any)._metadata as Record<string, unknown>)
                : {}),
              success: false,
              status,
              responseTime,
              timestamp: new Date().toISOString(),
            },
          };
          return {
            statusCode: status,
            headers: this.generateHeaders("application/json"),
            body: JSON.stringify(errorPayload),
          };
        }
        const transformedData = await this.applyTransformations(
          responseData,
          config.dataSource.transformation,
          params,
        );
        const cacheStatus = "bypass";

        // Build response
        const endNow =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        const responseTime = Math.max(1, Math.round(endNow - startTime));

        // Determine format
        const format = this.determineResponseFormat(params, request);

        // Build response based on format
        logger.debug("formatResponse cache status", {
          lastComputedCacheStatus: this.lastComputedCacheStatus,
          dataCacheStatus,
          final: this.lastComputedCacheStatus || dataCacheStatus,
        });

        const { body, headers } = this.formatResponse(
          transformedData,
          format,
          {
            responseTime: Math.max(
              responseTime,
              typeof (request as unknown as { __cacheDecodeMs?: number })
                .__cacheDecodeMs === "number"
                ? (request as unknown as { __cacheDecodeMs?: number })
                    .__cacheDecodeMs!
                : responseTime,
            ),
            dataCacheStatus:
              computedCacheStatus ||
              this.lastComputedCacheStatus ||
              dataCacheStatus,
            success: true,
            status: 200,
            traceId,
            endpointName: config.name,
            xrayTrace: this.cachedZipFetcher?.getTrace?.(),
          },
          params,
        );

        // Complete monitoring - fixed
        // Record performance metrics
        performanceMonitor.recordMetrics({
          endpoint: config.name,
          method: request.method || "GET",
          responseTime,
          statusCode: 200,
          contentSize: body.length,
          cacheHit: false,
          compressed: false,
        });

        // Disable DCS tracing
        if (config.dataSource.type === "dcs-api") {
          this.dcsClient.disableTracing();
        }

        return {
          statusCode: 200,
          headers,
          body,
        };
      } catch (error) {
        const endNowErr =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        const responseTime = Math.max(1, Math.round(endNowErr - startTime));

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

        logger.error(`Error in generated route`, {
          endpoint: config.name,
          error: String(error),
        });

        // If the thrown error already carries a status, surface it as-is
        const status = (error as any)?.status as number | undefined;
        if (status && status >= 400 && status < 600) {
          return this.generateErrorResponse(
            status,
            error instanceof Error ? error.message : String(error),
            { endpoint: config.name, traceId },
            responseTime,
          );
        }
        return this.generateErrorResponse(
          500,
          "Internal server error",
          {
            message: error instanceof Error ? error.message : "Unknown error",
            endpoint: config.name,
            traceId,
          },
          responseTime,
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
      throw new RouteGenerationError(
        "Endpoint name is required",
        "unknown",
        "name",
      );
    }

    if (!config.path) {
      throw new RouteGenerationError(
        "Endpoint path is required",
        config.name,
        "path",
      );
    }

    if (!config.dataSource) {
      throw new RouteGenerationError(
        "Data source configuration is required",
        config.name,
        "dataSource",
      );
    }

    if (
      config.dataSource.type === "dcs-api" &&
      !config.dataSource.dcsEndpoint
    ) {
      throw new RouteGenerationError(
        "DCS endpoint is required for dcs-api data sources",
        config.name,
        "dataSource.dcsEndpoint",
      );
    }
    // zip-cached requires zipConfig
    if (
      config.dataSource.type === "zip-cached" &&
      !config.dataSource.zipConfig
    ) {
      throw new RouteGenerationError(
        "zipConfig is required for zip-cached data sources",
        config.name,
        "dataSource.zipConfig",
      );
    }
  }

  /**
   * Parse request parameters according to configuration
   */
  private parseParameters(
    request: PlatformRequest,
    paramConfigs: Record<string, ParamConfig>,
  ): ParsedParams {
    const params: ParsedParams = {};

    // Handle both GET query parameters and POST body parameters
    let sourceParams: Record<string, string | undefined> =
      request.queryStringParameters;

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

        case "number": {
          const numValue = Number(rawValue);
          params[paramName] = isNaN(numValue) ? undefined : numValue;
          break;
        }

        case "array": {
          const delimiter = paramConfig.arrayDelimiter || ",";
          params[paramName] = rawValue.split(delimiter).map((v) => v.trim());
          break;
        }

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
    paramConfigs: Record<string, ParamConfig>,
  ): string[] {
    const errors: string[] = [];

    for (const [paramName, paramConfig] of Object.entries(paramConfigs)) {
      let value = params[paramName];

      // If missing but default exists, apply default here as well for safety
      if (
        (value === undefined || value === null || value === "") &&
        paramConfig.default !== undefined
      ) {
        params[paramName] = paramConfig.default as unknown as string;
        value = params[paramName];
      }

      // Check required parameters
      if (
        paramConfig.required &&
        (value === undefined || value === null || value === "")
      ) {
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
            if (
              paramConfig.pattern &&
              !new RegExp(paramConfig.pattern).test(value)
            ) {
              errors.push(
                `Parameter ${paramName} does not match required pattern`,
              );
            }

            // Length validation
            if (
              paramConfig.min !== undefined &&
              value.length < paramConfig.min
            ) {
              errors.push(
                `Parameter ${paramName} must be at least ${paramConfig.min} characters`,
              );
            }
            if (
              paramConfig.max !== undefined &&
              value.length > paramConfig.max
            ) {
              errors.push(
                `Parameter ${paramName} must be at most ${paramConfig.max} characters`,
              );
            }

            // Options validation
            if (paramConfig.options && !paramConfig.options.includes(value)) {
              errors.push(
                `Parameter ${paramName} must be one of: ${paramConfig.options.join(", ")}`,
              );
            }
          }
          break;

        case "number":
          if (typeof value !== "number" || isNaN(value)) {
            errors.push(`Parameter ${paramName} must be a valid number`);
          } else {
            if (paramConfig.min !== undefined && value < paramConfig.min) {
              errors.push(
                `Parameter ${paramName} must be at least ${paramConfig.min}`,
              );
            }
            if (paramConfig.max !== undefined && value > paramConfig.max) {
              errors.push(
                `Parameter ${paramName} must be at most ${paramConfig.max}`,
              );
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
    request?: PlatformRequest,
  ): Promise<{ data: unknown; cacheStatus: string }> {
    switch (config.dataSource.type) {
      case "dcs-api": {
        const data = await this.fetchFromDCS(config.dataSource, params);
        return { data, cacheStatus: "miss" };
      }

      case "computed": {
        return this.computeData(config, params, null, request); // Pass null for dcsData
      }

      case "hybrid": {
        // For hybrid, we might fetch from DCS and then do additional computation
        const dcsData = config.dataSource.dcsEndpoint
          ? await this.fetchFromDCS(config.dataSource, params)
          : null;
        return this.computeData(config, params, dcsData, request);
      }

      case "zip-cached": {
        // Route to computeData for ZIP-cached endpoints
        return this.computeData(config, params, null, request);
      }

      default: {
        throw new Error(
          `Unsupported data source type: ${config.dataSource.type}`,
        );
      }
    }
  }

  /**
   * Fetch data from DCS API
   */
  private async fetchFromDCS(
    dataSource: DataSourceConfig,
    params: ParsedParams,
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
        const bookCode =
          BOOK_CODE_MAP[parsed.book] || parsed.book.toUpperCase();
        expandedParams.book = bookCode;
        expandedParams.bookNumber = BOOK_NUMBER_MAP[bookCode] || "01";
        expandedParams.chapter = parsed.chapter.toString();
      }
    }

    // Handle multiple resources
    const resourceParam = expandedParams.resource as string;
    if (resourceParam === "all" || resourceParam?.includes(",")) {
      const resources =
        resourceParam === "all"
          ? ["ult", "ust"]
          : resourceParam.split(",").map((r) => r.trim());

      const results = [];
      for (const resource of resources) {
        const resourceParams = { ...expandedParams, resource };
        let resourceEndpoint = dataSource.dcsEndpoint;

        for (const [key, value] of Object.entries(resourceParams)) {
          if (value !== undefined) {
            resourceEndpoint = resourceEndpoint.replace(
              `{${key}}`,
              String(value),
            );
          }
        }

        try {
          const resourceResponse =
            await this.dcsClient.fetchResource(resourceEndpoint);
          results.push({
            resource,
            ...resourceResponse,
          });
        } catch (error) {
          // Continue with other resources if one fails
          results.push({
            resource,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const trace = this.dcsClient.getTrace();
      return {
        data: {
          success: true,
          resources: results,
          total: results.length,
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
    params: ParsedParams,
    dcsData?: unknown,
    request?: PlatformRequest,
  ): Promise<{ data: unknown; cacheStatus: string }> {
    // Handle hybrid endpoints that have DCS data
    if (dcsData && config.dataSource.type === "hybrid") {
      // For now, just return the DCS data
      // In the future, we can add custom transformations here
      return { data: dcsData, cacheStatus: "miss" };
    }

    // Import the functional data fetcher dynamically to avoid circular dependencies
    const { createDataFetcher } = await import("./functionalDataFetchers.js");
    const { ZipResourceFetcher2 } = await import(
      "../services/ZipResourceFetcher2.js"
    );
    const { EdgeXRayTracer } = await import("../functions/edge-xray.js");
    const { DCSApiClient } = await import("../services/DCSApiClient.js");

    // Create dependencies
    const dcsClient = new DCSApiClient();
    const tracer = new EdgeXRayTracer(config.name, "computed");

    // Use cached ZIP fetcher instance, but update its tracer and headers
    if (!this.cachedZipFetcher) {
      this.cachedZipFetcher = new ZipResourceFetcher2(tracer);
    } else {
      // Update tracer for this request
      this.cachedZipFetcher?.setTracer(tracer);
    }
    // Pass client headers to the fetcher for bot detection bypass
    if (request) {
      this.cachedZipFetcher?.setRequestHeaders(request.headers);
    }
    const getZipFetcher = () => this.cachedZipFetcher as any;

    // Create the data fetcher
    const fetcher = createDataFetcher({ dcsClient, getZipFetcher });

    // Create context
    const context: import("./functionalDataFetchers.js").FetchContext = {
      traceId: `${config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: undefined,
      cache: new Map<string, unknown>(),
    };

    // Use the fetcher with the endpoint's data source config
    const dataSourceConfig = config.dataSource || {
      type: "computed",
      cacheTtl: 3600,
    };

    // For endpoints that should use ZIP caching
    const zipEnabledEndpoints = [
      "fetch-scripture",
      "fetch-translation-notes",
      "fetch-translation-questions",
      "get-translation-word",
    ];

    if (zipEnabledEndpoints.includes(config.name)) {
      logger.debug(`[RouteGenerator] computeData (ZIP)`, {
        endpoint: config.name,
        params,
      });

      // Choose correct ZIP method per endpoint
      const fetchMethod =
        config.name === "fetch-scripture"
          ? ("getScripture" as const)
          : config.name === "get-translation-word"
            ? ("getMarkdownContent" as const)
            : ("getTSVData" as const);

      // Map endpoint to resourceType expected by ZipResourceFetcher2
      const resourceType =
        config.name === "fetch-scripture"
          ? (params.resource as string) || "all"
          : config.name === "fetch-translation-notes"
            ? "tn"
            : config.name === "fetch-translation-questions"
              ? "tq"
              : "tw"; // get-translation-word

      const zipConfig = {
        ...dataSourceConfig,
        type: "zip-cached" as const,
        zipConfig: {
          fetchMethod,
          resourceType,
          useIngredients: fetchMethod !== "getScripture",
          zipCacheTtl: 2592000, // 30 days for immutable Git releases
        },
      };

      logger.debug("[RouteGenerator] zipConfig", zipConfig);
      logger.debug("[RouteGenerator] params being passed", {
        ...params,
        resourceFromParams: params.resource,
        resourceFromZipConfig: zipConfig.zipConfig.resourceType,
        fetchMethod,
      });

      logger.info("[RouteGenerator] Calling fetcher with zipConfig", {
        endpointName: config.name,
        zipConfigType: zipConfig.type,
        resourceType: zipConfig.zipConfig.resourceType,
        paramsResource: params.resource,
      });
      const result = (await fetcher(zipConfig, params, context)) as unknown;
      logger.debug("[RouteGenerator] fetcher result keys", {
        keys: Object.keys(result || {}),
      });

      // Attach X-Ray trace from ZIP path into metadata for UI/UX
      try {
        const xray = this.cachedZipFetcher?.getTrace?.();
        if (xray && result && typeof result === "object" && (result as any)) {
          // Don't add xrayTrace to response body - it will be handled by formatter
          // Compute cache status from tracer
          const calls =
            (
              xray as unknown as {
                apiCalls?: Array<{ url: string; cached: boolean }>;
              }
            ).apiCalls || [];
          // If no apiCalls or all are internal, it's a cache hit
          const hasExternalCalls =
            Array.isArray(calls) &&
            calls.some((c) => !c.url.startsWith("internal://"));
          const hasInternalHits =
            Array.isArray(calls) &&
            calls.some(
              (c) =>
                c.cached &&
                (c.url.startsWith("internal://kv/") ||
                  c.url.startsWith("internal://memory/")),
            );
          // Calculate rich cache status
          const totalCalls = calls.length;
          const cachedCalls = calls.filter((c) => c.cached).length;
          const catalogCalls = calls.filter(
            (c) => c.url.includes("catalog:") || c.url.includes("/catalog"),
          );
          const catalogHits = catalogCalls.filter((c) => c.cached).length;
          const zipCalls = calls.filter(
            (c) => c.url.includes("zipfile:") || c.url.includes(".zip"),
          );
          const zipHits = zipCalls.filter((c) => c.cached).length;
          const fileCalls = calls.filter(
            (c) => c.url.includes("/file") || c.url.includes("zipfile:"),
          );
          const fileHits = fileCalls.filter((c) => c.cached).length;

          // Determine cache status with nuance
          let dataCacheStatus: string;
          if (cachedCalls === 0) {
            dataCacheStatus = "miss";
          } else if (cachedCalls === totalCalls) {
            dataCacheStatus = "hit";
          } else {
            dataCacheStatus = `partial (${cachedCalls}/${totalCalls})`;
          }

          // Debug logging
          logger.debug("Cache status calculation", {
            totalCalls,
            cachedCalls,
            dataCacheStatus,
            hasExternalCalls,
            catalogHits,
            zipHits,
            fileHits,
          });

          // Store for use in formatResponse
          this.lastComputedCacheStatus = dataCacheStatus;
          computedCacheStatus = dataCacheStatus;

          const hit = cachedCalls > 0 && !hasExternalCalls;

          // Always update the outer dataCacheStatus for passing to formatResponse
          // This ensures headers get the correct cache status even for clean array responses

          if ("metadata" in result) {
            (result as { metadata: Record<string, unknown> }).metadata.cached =
              hit;
          }
          if ("_metadata" in result) {
            const metadata = (result as { _metadata: Record<string, unknown> })
              ._metadata;
            // Be explicit about what was cached - data sources, NOT responses
            metadata.dataCacheStatus = dataCacheStatus;
            metadata.dataSourcesCached = {
              catalog:
                catalogHits > 0
                  ? `${catalogHits}/${catalogCalls.length}`
                  : false,
              zip: zipHits > 0 ? `${zipHits}/${zipCalls.length}` : false,
              files: fileHits > 0 ? `${fileHits}/${fileCalls.length}` : false,
              summary: `${cachedCalls}/${totalCalls} cached`,
            };
            // CRITICAL: Responses are NEVER cached
            metadata.responseCached = false;
            metadata.cacheNote =
              "Only data sources (catalog/ZIP) are cached, never responses";
          }
        }
      } catch {
        // ignore xray enrichment
      }

      return { data: result, cacheStatus: this.lastComputedCacheStatus };
    }

    // For other endpoints that use the functional data fetcher
    // (including zip-cached), just pass through to the fetcher
    const result = await fetcher(dataSourceConfig, params, context);

    // Default cache status for non-ZIP endpoints
    let computedCacheStatus = "miss";

    // Attach X-Ray trace for all endpoints that use ZIP
    if (dataSourceConfig.type === "zip-cached") {
      try {
        const xray = this.cachedZipFetcher?.getTrace?.();
        if (xray && result && typeof result === "object" && (result as any)) {
          // Don't add xrayTrace to response body - it will be handled by formatter
          // Compute cache status from tracer
          const calls =
            (
              xray as unknown as {
                apiCalls?: Array<{ url: string; cached: boolean }>;
              }
            ).apiCalls || [];
          const hasExternalCalls =
            Array.isArray(calls) &&
            calls.some((c) => !c.url.startsWith("internal://"));
          const hasInternalHits =
            Array.isArray(calls) &&
            calls.some(
              (c) =>
                c.cached &&
                (c.url.startsWith("internal://kv/") ||
                  c.url.startsWith("internal://memory/")),
            );
          // Calculate rich cache status
          const totalCalls = calls.length;
          const cachedCalls = calls.filter((c) => c.cached).length;
          const catalogCalls = calls.filter(
            (c) => c.url.includes("catalog:") || c.url.includes("/catalog"),
          );
          const catalogHits = catalogCalls.filter((c) => c.cached).length;
          const zipCalls = calls.filter(
            (c) => c.url.includes("zipfile:") || c.url.includes(".zip"),
          );
          const zipHits = zipCalls.filter((c) => c.cached).length;
          const fileCalls = calls.filter(
            (c) => c.url.includes("/file") || c.url.includes("zipfile:"),
          );
          const fileHits = fileCalls.filter((c) => c.cached).length;

          // Determine cache status with nuance
          let dataCacheStatus: string;
          if (cachedCalls === 0) {
            dataCacheStatus = "miss";
          } else if (cachedCalls === totalCalls) {
            dataCacheStatus = "hit";
          } else {
            dataCacheStatus = `partial (${cachedCalls}/${totalCalls})`;
          }

          // Debug logging
          logger.debug("Cache status calculation", {
            totalCalls,
            cachedCalls,
            dataCacheStatus,
            hasExternalCalls,
            catalogHits,
            zipHits,
            fileHits,
          });

          // Store for use in formatResponse
          this.lastComputedCacheStatus = dataCacheStatus;
          computedCacheStatus = dataCacheStatus;

          const hit = cachedCalls > 0 && !hasExternalCalls;

          if ("metadata" in result) {
            (result as { metadata: Record<string, unknown> }).metadata.cached =
              hit;
          }
          if ("_metadata" in result) {
            const metadata = (result as { _metadata: Record<string, unknown> })
              ._metadata;
            // Be explicit about what was cached - data sources, NOT responses
            metadata.dataCacheStatus = dataCacheStatus;
            metadata.dataSourcesCached = {
              catalog:
                catalogHits > 0
                  ? `${catalogHits}/${catalogCalls.length}`
                  : false,
              zip: zipHits > 0 ? `${zipHits}/${zipCalls.length}` : false,
              files: fileHits > 0 ? `${fileHits}/${fileCalls.length}` : false,
              summary: `${cachedCalls}/${totalCalls} cached`,
            };
            // CRITICAL: Responses are NEVER cached
            metadata.responseCached = false;
            metadata.cacheNote =
              "Only data sources (catalog/ZIP) are cached, never responses";
          }
        }
      } catch {
        // ignore xray enrichment
      }
    }

    return result;
  }

  /**
   * Apply data transformations
   */
  private async applyTransformations(
    data: unknown,
    transformation: TransformationType | undefined,
    params: ParsedParams,
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
        logger.warn(`Unknown transformation type`, { transformation });
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
    void _params; // satisfy eslint
    return data;
  }

  /**
   * Parse TSV data
   */
  private parseTSV(data: unknown): unknown {
    if (typeof data !== "string") {
      return data;
    }

    // Preserve header and column count exactly; ignore trailing extra columns
    const lines = data.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split("\t");
    const result: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      let values = lines[i].split("\t");

      // Heuristic: Some TN intro rows omit one column, causing a shift.
      // If headers include TN columns and Reference is an intro row, insert an empty Quote.
      const referenceIdx = headers.indexOf("Reference");
      const quoteIdx = headers.indexOf("Quote");
      const occurrenceIdx = headers.indexOf("Occurrence");
      const noteIdx = headers.indexOf("Note");
      const isTNShape =
        referenceIdx === 0 &&
        quoteIdx >= 0 &&
        occurrenceIdx >= 0 &&
        noteIdx >= 0;
      const looksShort = values.length === headers.length - 1;
      const refVal = values[referenceIdx] || "";
      if (isTNShape && looksShort && /intro/.test(refVal)) {
        const adjusted = values.slice();
        adjusted.splice(quoteIdx, 0, "");
        values = adjusted;
      }
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] !== undefined ? values[j] : "";
      }

      // Compatibility normalization for TN rows:
      // - Intro rows sometimes set Quote to "0"; normalize to empty string
      // - Some TN rows place Note text in Occurrence when Note is missing; swap when detected
      if (isTNShape) {
        const refCell = row["Reference"] || "";
        if (/intro/.test(refCell) && row["Quote"] === "0") {
          row["Quote"] = "";
        }
        const occ = row["Occurrence"] || "";
        const note = row["Note"] || "";
        if (!note && occ && !/^\d+$/.test(occ)) {
          row["Note"] = occ;
          row["Occurrence"] = "";
        }
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
      dataCacheStatus: "hit" | "miss" | "bypass";
      success: boolean;
      status: number;
      traceId: string;
      endpointName: string;
    },
  ): unknown {
    const base: Record<string, unknown> = {};
    if (data && typeof data === "object") {
      Object.assign(base, data as Record<string, unknown>);
    }
    return {
      ...base,
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
      headers: this.generateHeaders("application/json"),
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
    responseTime?: number,
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
      headers: this.generateHeaders("application/json"),
      body: JSON.stringify(response),
    };
  }

  /**
   * Generate standard headers
   */
  private generateHeaders(
    contentType: string = "application/json",
  ): Record<string, string> {
    // Add charset=utf-8 if not already present
    const finalContentType = contentType.includes("charset")
      ? contentType
      : `${contentType}; charset=utf-8`;

    return {
      "Content-Type": finalContentType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh, Accept",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Expose-Headers":
        "X-Available-Formats, X-Recommended-Format-LLM, X-Resource, X-Language, X-Organization, X-Cache-Status, X-Response-Time, X-Trace-Id, X-Xray-Trace",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      // Always include available formats
      "X-Available-Formats": "json,text,md",
      "X-Recommended-Format-LLM": "text",
    };
  }

  /**
   * Determine response format based on request
   */
  private determineResponseFormat(
    params: ParsedParams,
    request: PlatformRequest,
  ): string {
    // Priority 1: Explicit format parameter (overrides everything)
    if (
      params.format &&
      ["json", "text", "md", "markdown", "usfm"].includes(
        params.format as string,
      )
    ) {
      return params.format === "markdown" ? "md" : (params.format as string);
    }

    // Priority 2: Accept header only when it explicitly asks for JSON
    const accept = (
      request.headers?.accept ||
      request.headers?.Accept ||
      ""
    ).toLowerCase();
    if (accept.includes("application/json")) return "json";
    if (accept.includes("text/markdown")) return "md";
    if (accept.includes("text/plain")) {
      // Do NOT switch to text implicitly for generic clients; prefer JSON by default.
      // Clients that want text must set ?format=text.
      return "json";
    }

    // Default: JSON for safety and compatibility
    return "json";
  }

  /**
   * Format response based on requested format
   */
  private formatResponse(
    data: unknown,
    format: string,
    metadata: {
      responseTime: number;
      dataCacheStatus: string;
      success: boolean;
      status: number;
      traceId: string;
      endpointName: string;
      xrayTrace?: unknown;
    },
    params: ParsedParams,
  ): { body: string; headers: Record<string, string> } {
    // Delegate to ResponseFormatter service
    const formatMetadata: FormatMetadata = {
      cached: metadata.dataCacheStatus === "hit",
      cacheStatus: metadata.dataCacheStatus,
      responseTime: metadata.responseTime,
      traceId: metadata.traceId,
      xrayTrace: metadata.xrayTrace,
      endpoint: metadata.endpointName,
    };

    const formatted = this.responseFormatter.format(
      data,
      format,
      params,
      formatMetadata,
    );

    // Merge with any additional headers we need
    const headers = this.generateHeaders(
      format === "json"
        ? "application/json"
        : format === "md"
          ? "text/markdown"
          : "text/plain",
    );

    // Merge formatted headers
    Object.assign(headers, formatted.headers);

    return { body: formatted.body, headers };
  }

  // Temporarily keeping old methods to ensure nothing breaks
  // These will be removed after confirming everything works

  /**
   * DEPRECATED: Format plain text response
   */
  private formatTextResponse(
    data: unknown,
    headers: Record<string, string>,
    params: ParsedParams,
  ): { body: string; headers: Record<string, string> } {
    // Delegating to ResponseFormatter - keeping method signature for compatibility
    const result = this.responseFormatter.format(data, "text", params, {});
    Object.assign(headers, result.headers);
    return { body: result.body, headers };
  }

  /**
   * DEPRECATED: Format markdown response
   */
  private formatMarkdownResponse(
    data: unknown,
    headers: Record<string, string>,
    params: ParsedParams,
  ): { body: string; headers: Record<string, string> } {
    // Delegating to ResponseFormatter - keeping method signature for compatibility
    const result = this.responseFormatter.format(data, "md", params, {});
    Object.assign(headers, result.headers);
    return { body: result.body, headers };
  }

  /**
   * OLD: Format plain text response - REMOVE AFTER TESTING
   */
  /*
  private formatTextResponseOld(
    data: unknown,
    headers: Record<string, string>,
    params: ParsedParams
  ): { body: string; headers: Record<string, string> } {
    let body = "";

    // Handle scripture endpoint specifically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((data as any).scripture && (data as any).resources) {
      // Return all translations/resources, not just the first one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const texts = (data as any).resources.map((res: any) => {
        const resourceName = res.shortName || res.name || res.id;
        const text = res.text || "";
        return `${resourceName}:\n${text}`;
      });
      body = texts.join("\n\n---\n\n");
    } else if (typeof data === "string") {
      body = data;
    } else {
      body = JSON.stringify(data, null, 2);
    }

    headers["Content-Type"] = "text/plain";
    return { body, headers };
  }
  */

  /**
   * OLD: Format markdown response - REMOVE AFTER TESTING
   */
  /*
  private formatMarkdownResponseOld(
    data: any,
    headers: Record<string, string>,
    params: ParsedParams
  ): { body: string; headers: Record<string, string> } {
    let body = "";

    // Handle scripture endpoint with multiple resources
    if (data.scripture && data.resources) {
      // Use the original reference from params for the header
      const displayReference = params.reference || data.scripture.reference;
      body = `# ${displayReference}\n\n`;

      // Get version info from the xrayTrace if available
      const xrayTrace = data.metadata?.xrayTrace;
      const versionMap: Record<string, string> = {};

      if (xrayTrace?.apiCalls) {
        // Extract version info from ZIP URLs or cache keys
        xrayTrace.apiCalls.forEach((call: any) => {
          // Try to extract from actual ZIP URLs
          if (call.url?.includes("/archive/")) {
            const match = call.url.match(/\/(en_\w+)\/archive\/(v\d+)\.zip/);
            if (match) {
              const [, resourceName, version] = match;
              const shortName = resourceName.split("_")[1].toUpperCase();
              versionMap[shortName] = version;
            }
          }
          // Try to extract from internal cache keys
          else if (call.url?.includes("internal://kv/zip/")) {
            const match = call.url.match(/en_(\w+):(v\d+)/);
            if (match) {
              const [, resourceType, version] = match;
              const shortName = resourceType.toUpperCase();
              versionMap[shortName] = version;
            }
          }
        });
      }

      // Add each translation as a section with citation
      for (const res of data.resources) {
        const resource = res.resource || res.translation;
        const version = versionMap[resource] || "";

        // Check if we have multiple verses (contains verse numbers)
        const hasVerseNumbers = res.text.includes("\n") && res.text.match(/^\d+\.\s/m);

        // Check if this is a chapter or larger passage
        const isLongPassage = res.text.includes("## Chapter") || res.text.length > 500;

        if (isLongPassage) {
          // For long passages, add resource section header and citation upfront
          body += `## ${resource} ${version}\n\n`;
          body += `*${displayReference} · ${params.organization || "unfoldingWord"}*\n\n`;
          body += `${res.text}\n\n`;
        } else if (hasVerseNumbers) {
          // For multi-verse, use regular text with verse numbers
          body += `${res.text}\n\n`;
        } else {
          // For single verse, use blockquote
          body += `> ${res.text}\n\n`;
        }

        body += `— **${displayReference} (${resource})** · ${params.organization || "unfoldingWord"}${version ? " " + version : ""}\n\n`;
      }

      // List all resources in header
      const resourceList = data.resources.map((r: any) => r.resource || r.translation).join(",");
      headers["X-Resources"] = resourceList;
      headers["X-Language"] = data.scripture.language || params.language || "";
      headers["X-Organization"] = params.organization || "unfoldingWord";
    }
    // Single scripture fallback
    else if (data.scripture) {
      const scripture = data.scripture;
      body = `## ${scripture.reference}\n\n`;
      body += `### ${scripture.resource || scripture.translation}\n\n`;
      body += `${scripture.text}\n\n`;
      body += `---\n\n`;
      body += `_Source: ${params.organization || "unfoldingWord"} ${scripture.resource || scripture.translation}_`;

      headers["X-Resource"] = scripture.resource || scripture.translation || "";
      headers["X-Language"] = scripture.language || params.language || "";
      headers["X-Organization"] = params.organization || "unfoldingWord";
    }
    // Handle translation helps
    else if (data.content) {
      if (data.title) {
        body = `# ${data.title}\n\n`;
      }
      body += data.content;

      if (data.resource) {
        body += `\n\n---\n\n`;
        body += `_Source: ${params.organization || "unfoldingWord"} ${data.resource}_`;
        headers["X-Resource"] = data.resource;
      }
    }
    // Fallback
    else {
      body = "```json\n" + JSON.stringify(data, null, 2) + "\n```";
    }

    return { body, headers };
  }
  */
}

// Export singleton instance
export const routeGenerator = new RouteGenerator();

// Export utility functions
export const generateHandler = (config: EndpointConfig) =>
  routeGenerator.generateHandler(config);

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
