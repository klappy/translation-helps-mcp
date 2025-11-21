/**
 * Type definitions for Translation Helps MCP Client
 */

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPResponseMetadata {
  /**
   * Response time in milliseconds
   */
  responseTime?: number;

  /**
   * Cache status (hit/miss/bypass)
   */
  cacheStatus?: string;

  /**
   * Trace ID for debugging
   */
  traceId?: string;

  /**
   * X-Ray trace data (base64 decoded)
   */
  xrayTrace?: any;

  /**
   * HTTP status code
   */
  statusCode?: number;

  /**
   * All response headers (when metrics enabled)
   */
  headers?: Record<string, string>;
}

export interface MCPResponse {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  /**
   * Metadata available when enableMetrics is true
   */
  metadata?: MCPResponseMetadata;
  [key: string]: any;
}

export interface ClientOptions {
  /**
   * Server URL for remote HTTP servers
   * Default: 'https://translation-helps-mcp-945.pages.dev/api/mcp'
   */
  serverUrl?: string;

  /**
   * Timeout for HTTP requests in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>;

  /**
   * Enable metrics collection (response headers, timing, etc.)
   * Useful for development and debugging
   * Default: false
   */
  enableMetrics?: boolean;
}

export interface FetchScriptureOptions {
  reference: string;
  language?: string;
  organization?: string;
  format?: "text" | "usfm";
  includeVerseNumbers?: boolean;
}

export interface FetchTranslationNotesOptions {
  reference: string;
  language?: string;
  organization?: string;
  includeIntro?: boolean;
  includeContext?: boolean;
}

export interface FetchTranslationQuestionsOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface FetchTranslationWordOptions {
  reference?: string;
  term?: string;
  language?: string;
  organization?: string;
  category?: "kt" | "names" | "other";
}

export interface FetchTranslationWordLinksOptions {
  reference: string;
  language?: string;
  organization?: string;
}

export interface FetchTranslationAcademyOptions {
  reference?: string;
  rcLink?: string;
  moduleId?: string;
  path?: string;
  language?: string;
  organization?: string;
  format?: "json" | "markdown";
}

export interface GetLanguagesOptions {
  organization?: string;
}
