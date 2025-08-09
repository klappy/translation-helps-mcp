import { logger } from "./logger.js";

export type ErrorEnvelope = {
  code: string;
  message: string;
  hint?: string;
  howToFix?: string;
  examples?: string[];
  docs?: string;
  traceId?: string;
  type?: string; // for tests expecting classification
};

export function errorEnvelope(
  code: string,
  message: string,
  extras: Partial<ErrorEnvelope> = {}
): ErrorEnvelope {
  const env: ErrorEnvelope = {
    code,
    message,
    ...extras,
  };
  logger.warn(`Error: ${code} - ${message}`);
  return env;
}

export const Errors = {
  missingParameter(param: string, traceId?: string): ErrorEnvelope {
    return errorEnvelope("MISSING_PARAMETER", `Missing required parameter: ${param}`, {
      hint: `Provide a value for '${param}'.`,
      howToFix: `Add ?${param}=... to the query string.`,
      examples: [
        param === "reference" ? "/api/fetch-scripture?reference=John%203:16" : `?${param}=value`,
      ],
      docs: "/docs/ENDPOINT_BEHAVIOR_SPECIFICATION.md",
      traceId,
      type: "VALIDATION_ERROR",
    });
  },

  internal(traceId?: string): ErrorEnvelope {
    return errorEnvelope("INTERNAL_ERROR", "An unexpected error occurred", {
      hint: "Try again. If the issue persists, contact support.",
      traceId,
      type: "INTERNAL_ERROR",
    });
  },
};
