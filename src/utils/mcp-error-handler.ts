/**
 * MCP Error Handler Utility
 * 
 * Provides consistent error handling and formatting for MCP tools.
 * Eliminates duplication of error handling logic across all tools.
 */

import { logger } from "./logger.js";
import { buildMetadata } from "./metadata-builder.js";

/**
 * Extract error message from unknown error type
 * Shared utility to avoid duplication of error instanceof Error checks
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Extract HTTP status code from error if present
 */
export function extractErrorStatus(error: unknown): number | undefined {
  if (error instanceof Error && "status" in error) {
    const status = (error as Error & { status?: number }).status;
    if (typeof status === "number" && status >= 400 && status < 600) {
      return status;
    }
  }
  return undefined;
}

export interface MCPErrorResponse {
  content?: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface ErrorContext {
  /** Name of the tool that failed */
  toolName: string;
  /** Arguments passed to the tool (for logging context) */
  args: Record<string, unknown>;
  /** Start time of the operation (from Date.now()) */
  startTime: number;
  /** The original error that occurred */
  originalError: unknown;
  /** Additional context for the error */
  additionalContext?: Record<string, unknown>;
}

/**
 * Handle errors consistently across all MCP tools
 * 
 * Provides:
 * - Consistent error logging with context
 * - MCP-compliant error response format
 * - Automatic response time calculation
 * - Structured error information
 * 
 * @param context - Error context information
 * @returns MCP-formatted error response
 * 
 * @example
 * ```typescript
 * try {
 *   // ... tool logic ...
 * } catch (error) {
 *   return handleMCPError({
 *     toolName: "fetch_scripture",
 *     args: { reference: args.reference },
 *     startTime,
 *     originalError: error,
 *   });
 * }
 * ```
 */
export function handleMCPError(context: ErrorContext): MCPErrorResponse {
  const {
    toolName,
    args,
    startTime,
    originalError,
    additionalContext = {},
  } = context;

  const errorMessage = originalError instanceof Error
    ? originalError.message
    : String(originalError);

  const responseTime = Date.now() - startTime;

  // Log error with full context
  logger.error(`Failed to execute ${toolName}`, {
    ...args,
    ...additionalContext,
    error: errorMessage,
    responseTime,
    timestamp: new Date().toISOString(),
    // Include stack trace if available
    ...(originalError instanceof Error && originalError.stack
      ? { stack: originalError.stack.split("\n").slice(0, 5) }
      : {}),
  });

  // Return MCP-compliant error response
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: errorMessage,
            tool: toolName,
            timestamp: new Date().toISOString(),
            responseTime,
            ...(Object.keys(args).length > 0 ? { args } : {}),
            ...additionalContext,
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

/**
 * Create a standardized error response for validation failures
 * 
 * @param toolName - Name of the tool
 * @param validationErrors - Array of validation error messages
 * @returns MCP-formatted error response
 */
export function createValidationErrorResponse(
  toolName: string,
  validationErrors: string[],
): MCPErrorResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: "Validation failed",
            tool: toolName,
            validationErrors,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

