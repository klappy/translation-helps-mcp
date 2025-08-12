/**
 * Response Validator Middleware
 *
 * Ensures API responses never contain diagnostic data in their bodies.
 * This is our safety net to prevent future contamination.
 *
 * KISS principle: Simple validation, clear errors, no magic.
 */

import { logger } from "../utils/logger.js";

// Diagnostic keys that should NEVER appear in response bodies
const FORBIDDEN_BODY_KEYS = [
  "xrayTrace",
  "traceId",
  "debug",
  "internal",
  "__cache",
  "__timing",
];

// Keys that are diagnostic but allowed in specific contexts
const DIAGNOSTIC_METADATA_KEYS = [
  "responseTime",
  "cacheStatus",
  "cached",
  "timestamp",
];

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validate that a response body doesn't contain forbidden diagnostic data
 */
export function validateResponseBody(
  body: unknown,
  path = "",
): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: true, violations, warnings };
  }

  // Check each key in the object
  for (const [key, value] of Object.entries(body)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check for forbidden keys
    if (FORBIDDEN_BODY_KEYS.includes(key)) {
      violations.push(
        `Forbidden diagnostic key '${key}' found at ${currentPath}`,
      );
    }

    // Check for diagnostic metadata in wrong places
    if (
      DIAGNOSTIC_METADATA_KEYS.includes(key) &&
      !path.includes("metadata") &&
      !path.includes("_metadata")
    ) {
      warnings.push(
        `Diagnostic key '${key}' found outside metadata at ${currentPath}`,
      );
    }

    // Recursively check nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = validateResponseBody(value, currentPath);
      violations.push(...nested.violations);
      warnings.push(...nested.warnings);
    }

    // Check arrays of objects
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") {
          const nested = validateResponseBody(item, `${currentPath}[${index}]`);
          violations.push(...nested.violations);
          warnings.push(...nested.warnings);
        }
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Strip forbidden keys from response body (for automatic cleanup)
 */
export function cleanResponseBody(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map((item) => cleanResponseBody(item));
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    // Skip forbidden keys
    if (FORBIDDEN_BODY_KEYS.includes(key)) {
      logger.warn(`Stripping forbidden key '${key}' from response`);
      continue;
    }

    // Recursively clean nested values
    cleaned[key] = cleanResponseBody(value);
  }

  return cleaned;
}

/**
 * Middleware factory for response validation
 */
export function createResponseValidator(options?: {
  strict?: boolean; // Throw errors on violations
  autoClean?: boolean; // Automatically clean responses
  logLevel?: "debug" | "warn" | "error";
}) {
  const {
    strict = false,
    autoClean = false,
    logLevel = "warn",
  } = options || {};

  return function validateResponse(response: unknown): unknown {
    const validation = validateResponseBody(response);

    // Log violations
    if (validation.violations.length > 0) {
      const message = `Response validation failed: ${validation.violations.length} violation(s)`;
      logger[logLevel](message, { violations: validation.violations });

      if (strict) {
        throw new Error(message);
      }
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      logger.debug("Response validation warnings", {
        warnings: validation.warnings,
      });
    }

    // Auto-clean if requested
    if (autoClean && !validation.valid) {
      logger.info("Auto-cleaning response body");
      return cleanResponseBody(response);
    }

    return response;
  };
}
