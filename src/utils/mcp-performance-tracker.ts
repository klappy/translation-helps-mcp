/**
 * MCP Performance Tracker
 * 
 * Utility to track performance metrics for MCP tools.
 * Provides consistent performance monitoring across all MCP tools.
 */

import { performanceMonitor } from "../functions/performance-monitor.js";
import { logger } from "./logger.js";

export interface MCPToolMetrics {
  toolName: string;
  responseTime: number;
  success: boolean;
  errorCode?: number;
  cacheHit?: boolean;
  dataSize?: number;
}

/**
 * Track performance metrics for an MCP tool execution
 * 
 * @param metrics - Performance metrics to record
 */
export function trackMCPToolPerformance(metrics: MCPToolMetrics): void {
  try {
    // Map MCP tool name to endpoint format
    const endpoint = `/mcp/${metrics.toolName}`;
    
    // Determine status code from success/error
    const statusCode = metrics.success
      ? 200
      : metrics.errorCode && metrics.errorCode >= 400 && metrics.errorCode < 600
        ? metrics.errorCode
        : 500;

    // Record metrics using the performance monitor
    performanceMonitor.recordMetrics({
      endpoint,
      method: "POST", // MCP tools are typically called via POST
      responseTime: metrics.responseTime,
      statusCode,
      contentSize: metrics.dataSize || 0,
      cacheHit: metrics.cacheHit || false,
      compressed: false, // MCP responses are typically not compressed
    });

    logger.debug("MCP tool performance tracked", {
      tool: metrics.toolName,
      responseTime: metrics.responseTime,
      statusCode,
      cacheHit: metrics.cacheHit,
    });
  } catch (error) {
    // Don't fail the tool if performance tracking fails
    logger.warn("Failed to track MCP tool performance", {
      tool: metrics.toolName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create a performance tracking wrapper for MCP tool handlers
 * 
 * This wrapper automatically tracks performance metrics for tool execution.
 * 
 * @example
 * ```typescript
 * export async function handleFetchScripture(args: FetchScriptureArgs) {
 *   return withPerformanceTracking("fetch_scripture", async () => {
 *     // ... tool logic ...
 *     return result;
 *   });
 * }
 * ```
 */
export async function withPerformanceTracking<T>(
  toolName: string,
  handler: () => Promise<T>,
  options?: {
    extractCacheHit?: (result: T) => boolean;
    extractDataSize?: (result: T) => number;
  },
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorCode: number | undefined;
  let result: T;

  try {
    result = await handler();
    success = true;

    // Extract cache hit status if available
    const cacheHit = options?.extractCacheHit
      ? options.extractCacheHit(result)
      : undefined;

    // Extract data size if available
    const dataSize = options?.extractDataSize
      ? options.extractDataSize(result)
      : undefined;

    // Track successful execution
    trackMCPToolPerformance({
      toolName,
      responseTime: Date.now() - startTime,
      success: true,
      cacheHit,
      dataSize,
    });

    return result;
  } catch (error) {
    success = false;

    // Extract error code if available
    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status?: number }).status;
      if (typeof status === "number") {
        errorCode = status;
      }
    }

    // Track failed execution
    trackMCPToolPerformance({
      toolName,
      responseTime: Date.now() - startTime,
      success: false,
      errorCode,
    });

    // Re-throw the error
    throw error;
  }
}

