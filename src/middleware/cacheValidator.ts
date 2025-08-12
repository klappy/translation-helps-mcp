/**
 * Cache Validator Middleware
 *
 * Prevents empty or invalid data from being cached.
 * This is our safety net against the "0 resources found" nightmare.
 *
 * KISS principle: Never cache bad data. Period.
 */

import { logger } from "../utils/logger.js";

// Types of data that should NEVER be cached
const UNCACHEABLE_PATTERNS = {
  // Empty arrays
  emptyArray: (data: unknown): boolean =>
    Array.isArray(data) && data.length === 0,

  // Empty objects
  emptyObject: (data: unknown): boolean => {
    return (
      data !== null &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Object.keys(data).length === 0
    );
  },

  // Error responses
  errorResponse: (data: unknown): boolean => {
    if (typeof data !== "object" || data === null) return false;
    const obj = data as Record<string, unknown>;
    return "error" in obj || "errorMessage" in obj || "errorCode" in obj;
  },

  // Specific empty patterns
  noResources: (data: unknown): boolean => {
    if (typeof data !== "object" || data === null) return false;
    const obj = data as Record<string, unknown>;

    // Check for resources: []
    if (
      "resources" in obj &&
      Array.isArray(obj.resources) &&
      obj.resources.length === 0
    ) {
      return true;
    }

    // Check for results: []
    if (
      "results" in obj &&
      Array.isArray(obj.results) &&
      obj.results.length === 0
    ) {
      return true;
    }

    // Check for data: []
    if ("data" in obj && Array.isArray(obj.data) && obj.data.length === 0) {
      return true;
    }

    // Check for items: []
    if ("items" in obj && Array.isArray(obj.items) && obj.items.length === 0) {
      return true;
    }

    return false;
  },

  // Null or undefined
  nullish: (data: unknown): boolean => data === null || data === undefined,
};

export interface CacheValidationResult {
  cacheable: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Validate if data should be cached
 */
export function validateCacheableData(
  data: unknown,
  _context?: string,
): CacheValidationResult {
  const warnings: string[] = [];

  // Check each pattern
  for (const [patternName, checker] of Object.entries(UNCACHEABLE_PATTERNS)) {
    if (checker(data)) {
      const reason = `Data matches uncacheable pattern: ${patternName}`;
      // Don't log here - let the middleware decide the log level
      return {
        cacheable: false,
        reason,
        warnings,
      };
    }
  }

  // Additional checks for specific data types
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Warn about small datasets (might be incomplete)
    if (
      "totalCount" in obj &&
      typeof obj.totalCount === "number" &&
      obj.totalCount === 0
    ) {
      warnings.push("Total count is 0 - might be incomplete data");
    }

    // Warn about metadata indicating problems
    if (
      "metadata" in obj &&
      typeof obj.metadata === "object" &&
      obj.metadata !== null
    ) {
      const metadata = obj.metadata as Record<string, unknown>;
      if ("incomplete" in metadata && metadata.incomplete === true) {
        warnings.push("Metadata indicates incomplete data");
      }
      if ("error" in metadata) {
        warnings.push("Metadata contains error information");
      }
    }
  }

  return {
    cacheable: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Create cache validation middleware
 */
export function createCacheValidator(options?: {
  strict?: boolean; // Throw errors on validation failure
  logLevel?: "debug" | "info" | "warn" | "error";
  customValidators?: Array<(data: unknown) => CacheValidationResult>;
}) {
  const {
    strict = false,
    logLevel = "warn",
    customValidators = [],
  } = options || {};

  return function validateForCache(data: unknown, context?: string): boolean {
    // Run built-in validation
    const result = validateCacheableData(data, context);

    // Run custom validators
    for (const validator of customValidators) {
      const customResult = validator(data);
      if (!customResult.cacheable) {
        logger[logLevel](
          `Custom cache validation failed${context ? ` for ${context}` : ""}`,
          {
            reason: customResult.reason,
          },
        );

        if (strict) {
          throw new Error(`Cache validation failed: ${customResult.reason}`);
        }

        return false;
      }
    }

    // Log warnings
    if (result.warnings && result.warnings.length > 0) {
      logger.debug(
        `Cache validation warnings${context ? ` for ${context}` : ""}`,
        {
          warnings: result.warnings,
        },
      );
    }

    // Handle validation failure
    if (!result.cacheable) {
      // Use the configured log level for built-in validation failures too
      logger[logLevel](
        `Cache validation failed${context ? ` for ${context}` : ""}`,
        {
          reason: result.reason,
        },
      );

      if (strict) {
        throw new Error(`Cache validation failed: ${result.reason}`);
      }
      return false;
    }

    return true;
  };
}

/**
 * Helper to wrap cache operations with validation
 */
export function withCacheValidation<T>(
  cacheOperation: () => Promise<T>,
  validateData: (data: T) => boolean,
  fallbackOperation: () => Promise<T>,
): Promise<T> {
  return cacheOperation()
    .then((data) => {
      if (validateData(data)) {
        return data;
      } else {
        logger.info("Cache returned invalid data, falling back to source");
        return fallbackOperation();
      }
    })
    .catch((error) => {
      logger.error("Cache operation failed, falling back to source", { error });
      return fallbackOperation();
    });
}
