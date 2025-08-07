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
    metadata: FormatMetadata = {}
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
    format: string
  ): void {
    // For JSON, metadata goes in body. For others, in headers.
    if (format !== "json") {
      if (metadata.cached !== undefined) {
        headers["X-Cache-Status"] = metadata.cached ? "hit" : "miss";
      }
      if (metadata.responseTime !== undefined) {
        headers["X-Response-Time"] = String(metadata.responseTime);
      }
      if (metadata.traceId) {
        headers["X-Trace-Id"] = metadata.traceId;
      }
      if (metadata.xrayTrace) {
        // Create human-readable summary
        const summary = this.createXraySummary(metadata.xrayTrace);
        headers["X-Xray-Summary"] = summary;
        
        // Add detailed trace info
        if (metadata.xrayTrace.totalDuration) {
          headers["X-Xray-Total-Duration"] = `${metadata.xrayTrace.totalDuration}ms`;
        }
        if (metadata.xrayTrace.cacheStats) {
          headers["X-Cache-Hits"] = String(metadata.xrayTrace.cacheStats.hits || 0);
          headers["X-Cache-Misses"] = String(metadata.xrayTrace.cacheStats.misses || 0);
        }
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
            return `kv/${match[1]}/${match[2].split('/')[0]}:${cached}:${duration}ms`;
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
    params: ParsedParams
  ): FormattedResponse {
    let body = "";

    // Handle scripture endpoint with multiple resources
    if (data.scripture && data.resources) {
      // Add all translations
      for (const res of data.resources) {
        const resource = res.resource || res.translation;
        body += `${res.text}\n`;
        body += `-${data.scripture.reference} (${resource})\n\n`;
      }

      // Add resources header
      const resourceList = data.resources.map((r: any) => 
        r.resource || r.translation
      ).join(",");
      headers["X-Resources"] = resourceList;
      headers["X-Language"] = data.scripture.language || params.language || "";
      headers["X-Organization"] = params.organization || "unfoldingWord";
    }
    // Single scripture fallback
    else if (data.scripture) {
      body = `${data.scripture.text}\n`;
      body += `-${data.scripture.reference} (${data.scripture.resource || data.scripture.translation})`;
      
      headers["X-Resource"] = data.scripture.resource || data.scripture.translation || "";
      headers["X-Language"] = data.scripture.language || params.language || "";
      headers["X-Organization"] = params.organization || "unfoldingWord";
    }
    // Generic text extraction
    else if (data.text) {
      body = data.text;
    }
    else {
      body = JSON.stringify(data, null, 2);
    }

    return { body, headers };
  }

  /**
   * Format markdown response
   */
  private formatMarkdownResponse(
    data: any,
    headers: Record<string, string>,
    params: ParsedParams
  ): FormattedResponse {
    let body = "";

    // Handle scripture endpoint with multiple resources
    if (data.scripture && data.resources) {
      const displayReference = params.reference || data.scripture.reference;
      body = `# ${displayReference}\n\n`;

      // Get version info from metadata if available
      const versionMap = this.extractVersionMap(data.metadata?.xrayTrace);

      // Add each translation
      for (const res of data.resources) {
        const resource = res.resource || res.translation;
        const version = versionMap[resource] || "";

        // Check if we have multiple verses or long passages
        const hasVerseNumbers = res.text.includes("\n") && res.text.match(/^\d+\.\s/m);
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

      // Add metadata headers
      const resourceList = data.resources.map((r: any) => 
        r.resource || r.translation
      ).join(",");
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
    // Generic content
    else {
      body = `# Response\n\n`;
      body += "```json\n";
      body += JSON.stringify(data, null, 2);
      body += "\n```";
    }

    return { body, headers };
  }

  /**
   * Format JSON response (default)
   */
  private formatJsonResponse(
    data: any,
    headers: Record<string, string>,
    metadata: FormatMetadata
  ): FormattedResponse {
    // Build the complete response with metadata
    const jsonData = {
      ...data,
      _metadata: {
        responseTime: metadata.responseTime || 0,
        cacheStatus: metadata.cached ? "hit" : "miss",
        success: true,
        status: 200,
        timestamp: new Date().toISOString(),
        traceId: metadata.traceId || "",
        endpoint: metadata.endpoint || "",
      },
    };

    // Add hint for LLMs
    if (!jsonData._hint) {
      jsonData._hint = "For LLM-optimized responses, add ?format=text or ?format=md to your request";
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
