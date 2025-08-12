/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ResponseFormatter Service
 *
 * Handles all response formatting logic for different content types (JSON, text, markdown)
 * Extracted from RouteGenerator to maintain single responsibility principle
 */

import type { ParsedParams } from "../config/RouteGenerator.js";
import { logger } from "../utils/logger.js";

export interface FormattedResponse {
  body: string;
  headers: Record<string, string>;
}

export interface FormatMetadata {
  cached?: boolean;
  responseTime?: number;
  traceId?: string;
  xrayTrace?: any;
  endpoint?: string;
  [key: string]: any;
}

export class ResponseFormatter {
  /**
   * Main entry point for formatting responses
   */
  public format(
    data: any,
    format: string,
    params: ParsedParams,
    metadata: FormatMetadata = {},
  ): FormattedResponse {
    logger.info("Formatting response", { format, endpoint: metadata.endpoint });

    // Generate base headers
    const headers = this.generateHeaders(format);

    // Add metadata headers
    this.addMetadataHeaders(headers, metadata, format);

    // Format-specific handling
    switch (format) {
      case "text":
        return this.formatTextResponse(data, headers, params);

      case "md":
      case "markdown":
        return this.formatMarkdownResponse(data, headers, params);

      default:
        return this.formatJsonResponse(data, headers, metadata);
    }
  }

  /**
   * Generate base headers based on content type
   */
  private generateHeaders(format: string): Record<string, string> {
    const contentTypeMap: Record<string, string> = {
      json: "application/json",
      text: "text/plain",
      md: "text/markdown",
      markdown: "text/markdown",
    };

    const contentType = contentTypeMap[format] || "application/json";
    const finalContentType = contentType.includes("charset")
      ? contentType
      : `${contentType}; charset=utf-8`;

    return {
      "Content-Type": finalContentType,
      "X-Available-Formats": "json,text,md",
      "X-Recommended-Format-LLM": "text",
    };
  }

  /**
   * Add metadata to headers (for non-JSON formats)
   */
  private addMetadataHeaders(
    headers: Record<string, string>,
    metadata: FormatMetadata,
    _format: string,
  ): void {
    // Always include key diagnostics in headers for consistency across formats
    // Use _format to satisfy linter and provide minimal diagnostic
    if (_format) headers["X-Format"] = String(_format);
    const cacheStatus = (metadata as unknown as { cacheStatus?: unknown })
      .cacheStatus;
    console.log("[ResponseFormatter] Cache status metadata:", {
      cacheStatus,
      cached: metadata.cached,
    });
    if (cacheStatus !== undefined)
      headers["X-Cache-Status"] = String(cacheStatus);
    else if (metadata.cached !== undefined)
      headers["X-Cache-Status"] = String(metadata.cached ? "hit" : "miss");

    if (metadata.responseTime !== undefined) {
      // Ensure non-zero response time to avoid 0ms for cache hits
      const safeMs = Math.max(1, Number(metadata.responseTime) || 0);
      headers["X-Response-Time"] = String(safeMs);
    }
    if (metadata.traceId) headers["X-Trace-Id"] = String(metadata.traceId);

    if (metadata.xrayTrace) {
      logger.debug("Adding X-Ray trace headers", {
        hasXrayTrace: true,
        xrayKeys: Object.keys(metadata.xrayTrace || {}),
      });
      // Create human-readable summary
      const summary = this.createXraySummary(metadata.xrayTrace);
      headers["X-Xray-Summary"] = summary;
      // Also include full trace (base64-encoded JSON) for tools/diagnostics
      try {
        const raw = JSON.stringify(metadata.xrayTrace);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const b64 =
          typeof Buffer !== "undefined"
            ? Buffer.from(raw).toString("base64")
            : globalThis.btoa
              ? globalThis.btoa(raw)
              : undefined;
        if (b64) headers["X-Xray-Trace"] = String(b64);
      } catch {
        // ignore xray header enrichment failures
      }

      // Add detailed trace info
      const xray: any = (metadata as unknown as { xrayTrace?: unknown })
        .xrayTrace;
      if (xray?.totalDuration !== undefined)
        headers["X-Xray-Total-Duration"] = String(`${xray.totalDuration}ms`);
      if (xray?.cacheStats) {
        headers["X-Cache-Hits"] = String(xray.cacheStats.hits || 0);
        headers["X-Cache-Misses"] = String(xray.cacheStats.misses || 0);
      }
    }
  }

  /**
   * Create human-readable X-Ray summary
   */
  private createXraySummary(xrayTrace: any): string {
    if (!xrayTrace.apiCalls || !Array.isArray(xrayTrace.apiCalls)) {
      return "No API calls";
    }

    return xrayTrace.apiCalls
      .map((call: any) => {
        const type = call.url?.includes("internal://") ? "cache" : "external";
        const cached = call.cached ? "cached" : "miss";
        const duration = call.duration || 0;

        if (call.url?.includes("internal://kv/")) {
          const match = call.url.match(/internal:\/\/kv\/(catalog|zip)\/(.+)/);
          if (match) {
            return `kv/${match[1]}/${match[2].split("/")[0]}:${cached}:${duration}ms`;
          }
        }

        return `${type}:${cached}:${duration}ms`;
      })
      .join("; ");
  }

  /**
   * Format plain text response
   */
  private formatTextResponse(
    data: any,
    headers: Record<string, string>,
    params: ParsedParams,
  ): FormattedResponse {
    // Build the markdown body first, then strip MD markers for a nearly identical text output
    const md = this.formatMarkdownResponse(data, { ...headers }, params).body;
    const body = this.stripMarkdown(md);

    return { body, headers };
  }

  /**
   * Format markdown response
   */
  private formatMarkdownResponse(
    data: any,
    headers: Record<string, string>,
    params: ParsedParams,
  ): FormattedResponse {
    let body = "";

    // Handle clean array of scripture objects
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      data[0].text &&
      data[0].resource
    ) {
      const displayReference = params.reference || data[0].reference;
      body = `# ${displayReference}\n\n\n`;

      // Add each scripture
      for (let i = 0; i < data.length; i++) {
        const scripture = data[i];
        const resource = scripture.resource;

        // Check if we have multiple verses or long passages
        const hasVerseNumbers =
          scripture.text.includes("\n") && scripture.text.match(/^\d+\.\s/m);
        const isLongPassage =
          scripture.text.includes("## Chapter") || scripture.text.length > 500;

        if (isLongPassage) {
          body += `## ${resource}\n\n`;
          body += `*${displayReference} · ${scripture.organization}*\n\n`;
          const displayText = String(scripture.text || "").replace(
            /^(\d+)\.\s/gm,
            "$1 ",
          );
          body += `${displayText}\n\n`;
        } else if (hasVerseNumbers) {
          body += `${scripture.text}\n\n`;
        } else {
          const displayText2 = String(scripture.text || "").replace(
            /^(\d+)\.\s/gm,
            "$1 ",
          );
          body += `> ${displayText2}\n\n`;
        }

        body += `— **${displayReference} (${resource})** · ${scripture.organization}\n\n`;

        if (i < data.length - 1) {
          body += `---\n\n\n\n\n`;
        }
      }

      // Add metadata headers
      const resourceList = data.map((s: any) => s.resource).join(",");
      headers["X-Resources"] = resourceList;
      headers["X-Language"] = data[0].language || params.language || "";
      headers["X-Organization"] =
        data[0].organization || params.organization || "unfoldingWord";
    }
    // Handle scripture endpoint with multiple resources (legacy format)
    else if (data.scripture && data.resources) {
      const displayReference = params.reference || data.scripture.reference;
      // Add an extra blank line after the top header so the first resource header is visually separated
      body = `# ${displayReference}\n\n\n`;

      // Get version info from metadata if available
      const versionMap = this.extractVersionMap(data.metadata?.xrayTrace);

      // Add each translation
      for (let i = 0; i < data.resources.length; i++) {
        const res = data.resources[i];
        const resource = res.resource || res.translation;
        // If translation already includes version suffix, prefer that
        const inlineVersionMatch = String(res.translation || "").match(
          /\b(v\d+)\b/i,
        );
        const version = inlineVersionMatch?.[1] || versionMap[resource] || "";

        // Check if we have multiple verses or long passages
        const hasVerseNumbers =
          res.text.includes("\n") && res.text.match(/^\d+\.\s/m);
        const isLongPassage =
          res.text.includes("## Chapter") || res.text.length > 500;

        if (isLongPassage) {
          // For long passages, add resource section header and citation upfront
          body += `## ${resource} ${version}\n\n`;
          body += `*${displayReference} · ${params.organization || "unfoldingWord"}*\n\n`;
          const displayText = String(res.text || "").replace(
            /^(\d+)\.\s/gm,
            "$1 ",
          );
          body += `${displayText}\n\n`;
        } else if (hasVerseNumbers) {
          // For multi-verse, use regular text with verse numbers
          body += `${res.text}\n\n`;
        } else {
          // For single verse, use blockquote
          const displayText2 = String(res.text || "").replace(
            /^(\d+)\.\s/gm,
            "$1 ",
          );
          body += `> ${displayText2}\n\n`;
        }

        body += `— **${displayReference} (${resource})** · ${params.organization || "unfoldingWord"}${version ? " " + version : ""}\n\n`;

        // Add a stronger separator between resources to improve visual clarity
        if (i < data.resources.length - 1) {
          // Horizontal rule plus four blank lines before next resource heading
          body += `---\n\n\n\n\n`;
        }
      }

      // Add metadata headers
      const resourceList = data.resources
        .map((r: any) => r.resource || r.translation)
        .join(",");
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
    // Generic content or cache warming state
    else {
      const ref = (params.reference as string) || "";
      const org = (params.organization as string) || "unfoldingWord";
      const lang = (params.language as string) || "en";

      const cacheWarm = Boolean(data?.metadata?.cacheWarm);
      const notFoundReason = (data?.metadata?.notFoundReason as string) || "";

      // If scripture is expected but empty resources
      if (ref && !data?.scripture && (data?.resources?.length ?? 0) === 0) {
        if (cacheWarm && notFoundReason === "chapter_not_found") {
          // Cache is warm and book exists; likely invalid chapter
          body = `# Invalid reference\n\n`;
          body += `Requested: \`${ref}\`\n\n`;
          body += `The caches are warm and the book exists, but that chapter could not be found. Please check the chapter number.\n`;
        } else if (!cacheWarm) {
          // Cold start warming
          body = `# Preparing resources\n\n`;
          body += `Requested: \`${ref}\`\n\n`;
          body += `The resources are being prepared for \`${lang}\` (${org}). This usually takes a few seconds the first time.\n\n`;
          body += `Try again shortly; once warmed, responses are instant and offline-capable.\n`;
        } else {
          // Unknown state fallback
          body = `# Response\n\n`;
          body += "```json\n";
          body += JSON.stringify(data, null, 2);
          body += "\n```";
        }
      } else if (ref && Array.isArray(data) && data.length === 0) {
        // Generic empty result for non-scripture endpoints with reference (e.g., TN/TQ/TWL)
        body = `# Invalid reference\n\n`;
        body += `Requested: \`${ref}\`\n\n`;
        body += `The resource is available, but the requested chapter/verse was not found. Please verify the reference and try again.\n`;
      } else {
        body = `# Response\n\n`;
        body += "```json\n";
        body += JSON.stringify(data, null, 2);
        body += "\n```";
      }
    }

    return { body, headers };
  }

  /**
   * Strip basic markdown syntax while preserving content and line breaks
   */
  private stripMarkdown(input: string): string {
    let out = input;
    // Remove code fences
    out = out.replace(/^```.*$/gm, "");
    // Strip headings and blockquotes prefixes
    out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    out = out.replace(/^\s{0,3}>\s?/gm, "");
    // Bold/italic markers
    out = out.replace(/\*\*(.*?)\*\*/g, "$1");
    out = out.replace(/\*(.*?)\*/g, "$1");
    out = out.replace(/_(.*?)_/g, "$1");
    // Inline code
    out = out.replace(/`([^`]+)`/g, "$1");
    // Horizontal rules
    out = out.replace(/^---+$/gm, "");
    // Trim trailing spaces per line
    out = out.replace(/[ \t]+$/gm, "");
    // Preserve intentional extra whitespace between sections (no newline collapsing)
    return out.trim();
  }

  /**
   * Format JSON response (default)
   */
  private formatJsonResponse(
    data: any,
    headers: Record<string, string>,
    metadata: FormatMetadata,
  ): FormattedResponse {
    // If the data is already a clean array of scriptures, return it directly
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      data[0].text &&
      data[0].resource
    ) {
      return {
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };
    }

    // Otherwise, normalize scripture payload to always include an array shape for consumers
    let scriptures: Array<{
      text: string;
      translation?: string;
      resource?: string;
      [k: string]: any;
    }> = [];
    try {
      if (Array.isArray(data?.scriptures)) {
        scriptures = data.scriptures as typeof scriptures;
      } else if (Array.isArray(data?.resources)) {
        scriptures = data.resources as typeof scriptures;
      } else if (data?.scripture && typeof data.scripture === "object") {
        scriptures = [data.scripture as (typeof scriptures)[number]];
      }
    } catch {
      // leave scriptures empty on failure
    }

    // Build the complete response with metadata and normalized scriptures array
    const jsonData = {
      ...data,
      ...(scriptures.length > 0 ? { scriptures } : {}),
      _metadata: {
        responseTime: metadata.responseTime || 0,
        cacheStatus:
          metadata.dataCacheStatus || (metadata.cached ? "hit" : "miss"),
        success: true,
        status: 200,
        timestamp: new Date().toISOString(),
        traceId: metadata.traceId || "",
        endpoint: metadata.endpoint || "",
      },
    };

    // Add hint for LLMs
    if (!jsonData._hint) {
      jsonData._hint =
        "For LLM-optimized responses, add ?format=text or ?format=md to your request";
    }

    return {
      body: JSON.stringify(jsonData),
      headers,
    };
  }

  /**
   * Extract version map from xray trace
   */
  private extractVersionMap(xrayTrace: any): Record<string, string> {
    const versionMap: Record<string, string> = {};

    if (!xrayTrace?.apiCalls) return versionMap;

    xrayTrace.apiCalls.forEach((call: any) => {
      // Try to extract from actual ZIP URLs
      if (call.url?.includes("/archive/")) {
        const match = call.url.match(/\/(en_\w+)\/archive\/(v\d+)\.zip/);
        if (match) {
          const resourceCode = match[1].replace("en_", "").toUpperCase();
          versionMap[resourceCode] = match[2];
        }
      }
      // Also try to extract from cache keys
      if (call.url?.includes("internal://kv/zip/")) {
        const match = call.url.match(/internal:\/\/kv\/zip\/en_(\w+):(v\d+)/);
        if (match) {
          const resourceCode = match[1].toUpperCase();
          versionMap[resourceCode] = match[2];
        }
      }
    });

    return versionMap;
  }
}

// Export singleton instance for convenience
export const responseFormatter = new ResponseFormatter();
