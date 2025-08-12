/**
 * Response Sanitizer
 *
 * Ensures that response bodies contain ONLY business data and never
 * diagnostic information like x-ray traces, internal debugging info, etc.
 *
 * Diagnostic data should ONLY appear in HTTP headers, never in response bodies.
 */

/**
 * Whitelist of allowed response body keys
 * These are the ONLY keys that should appear in response bodies
 */
const ALLOWED_RESPONSE_KEYS = new Set([
  // Business data
  "data",
  "scripture",
  "verseNotes",
  "contextNotes",
  "words",
  "questions",
  "resources",
  "languages",
  "books",
  "coverage",
  "recommendations",

  // Standard response metadata (business-relevant only)
  "metadata",
  "citation",
  "language",
  "organization",
  "reference",
  "resource",
  "text",
  "title",
  "version",

  // Error handling
  "error",
  "message",
  "code",
  "details",
]);

/**
 * Diagnostic keys that should NEVER appear in response bodies
 * These belong in headers only
 */
const FORBIDDEN_DIAGNOSTIC_KEYS = new Set([
  "xrayTrace",
  "xray",
  "trace",
  "traceId",
  "debug",
  "diagnostic",
  "_metadata",
  "_debug",
  "_trace",
  "_internal",
]);

/**
 * Recursively sanitize an object to remove diagnostic data
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip forbidden diagnostic keys
      if (FORBIDDEN_DIAGNOSTIC_KEYS.has(key)) {
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    }

    return sanitized;
  }

  return obj;
}

/**
 * Sanitize response body to ensure it contains only business data
 *
 * This function:
 * 1. Removes all diagnostic fields (xrayTrace, debug, etc.)
 * 2. Preserves all business data
 * 3. Handles nested objects and arrays
 *
 * @param responseBody - The response body to sanitize
 * @returns Clean response body with only business data
 */
export function sanitizeResponseBody(responseBody: unknown): unknown {
  if (responseBody === null || responseBody === undefined) {
    return responseBody;
  }

  // Sanitize the response body
  const sanitized = sanitizeObject(responseBody);

  return sanitized;
}

/**
 * Validate that a response body doesn't contain forbidden diagnostic data
 *
 * @param responseBody - The response body to validate
 * @returns Array of forbidden keys found (empty if clean)
 */
export function validateResponseBody(responseBody: unknown): string[] {
  const forbiddenKeys: string[] = [];

  function checkObject(obj: unknown, path = ""): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkObject(item, `${path}[${index}]`);
      });
      return;
    }

    if (typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (FORBIDDEN_DIAGNOSTIC_KEYS.has(key)) {
          forbiddenKeys.push(currentPath);
        }

        checkObject(value, currentPath);
      }
    }
  }

  checkObject(responseBody);
  return forbiddenKeys;
}

/**
 * Type guard to check if response body is properly sanitized
 */
export function isResponseBodyClean(responseBody: unknown): boolean {
  return validateResponseBody(responseBody).length === 0;
}
