/**
 * Door43 Content Service (DCS) API Client
 * Handles all interactions with the DCS API including catalog endpoints,
 * resource fetching, and file content retrieval.
 * 
 * Uses unfoldingWord-compliant terminology (Strategic Languages, not Gateway Languages).
 */

import { ResourceType, UserTypes } from "../constants/terminology";
import {
  DCSResponse,
  DCSError,
  DCSRequestOptions,
  Owner,
  Language,
  Resource,
  FileContent,
  SearchResponse,
  CatalogSearchParams,
  OwnerSearchParams,
} from "../types/dcs.js";
import { logger } from "../utils/logger.js";

export interface DCSClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  userAgent?: string;
}

export class DCSApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly userAgent: string;

  constructor(config: DCSClientConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      (typeof process !== "undefined" && process.env?.DCS_API_URL) ||
      "https://git.door43.org/api/v1";
    this.timeout = config.timeout || 30000; // 30 seconds
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second base delay
    this.userAgent = config.userAgent || "Translation-Helps-MCP/1.0";

    logger.debug("DCS API Client initialized", {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Makes an authenticated HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: DCSRequestOptions = {}
  ): Promise<DCSResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.timeout;
    const maxRetries = options.retries !== undefined ? options.retries : this.maxRetries;

    const headers = {
      "User-Agent": this.userAgent,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Making DCS API request (attempt ${attempt + 1})`, {
          url,
          headers,
          timeout,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await this.parseResponse<T>(response);

        if (responseData.success) {
          logger.debug("DCS API request successful", {
            url,
            status: response.status,
            attempt: attempt + 1,
          });
          return responseData;
        }

        // If it's a client error (4xx), don't retry
        if (response.status >= 400 && response.status < 500) {
          return responseData;
        }

        // For server errors (5xx), retry
        lastError = new Error(
          `HTTP ${response.status}: ${responseData.error?.message || "Unknown error"}`
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(`DCS API request failed (attempt ${attempt + 1})`, {
          url,
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries,
        });

        // If this was the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    // All retries failed
    const error: DCSError = {
      code: "REQUEST_FAILED",
      message: lastError?.message || "Request failed after all retries",
      details: { url, maxRetries },
    };

    logger.error("DCS API request failed after all retries", error);

    return {
      success: false,
      error,
    };
  }

  /**
   * Parses the response from the DCS API
   */
  private async parseResponse<T>(response: Response): Promise<DCSResponse<T>> {
    try {
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = (await response.json()) as any;

        if (response.ok) {
          return {
            success: true,
            data: data as T,
            statusCode: response.status,
            headers: this.getResponseHeaders(response),
          };
        } else {
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: data.message || `HTTP ${response.status}: ${response.statusText}`,
              details: data as Record<string, any>,
            },
            statusCode: response.status,
            headers: this.getResponseHeaders(response),
          };
        }
      } else {
        // Handle non-JSON responses (like raw file content)
        const text = await response.text();

        if (response.ok) {
          return {
            success: true,
            data: text as T,
            statusCode: response.status,
            headers: this.getResponseHeaders(response),
          };
        } else {
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: `HTTP ${response.status}: ${response.statusText}`,
              details: { responseText: text },
            },
            statusCode: response.status,
            headers: this.getResponseHeaders(response),
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: error instanceof Error ? error.message : "Failed to parse response",
          details: { error },
        },
        statusCode: response.status,
      };
    }
  }

  /**
   * Extracts relevant headers from the response
   */
  private getResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};

    // Extract useful headers
    const relevantHeaders = [
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
      "etag",
      "last-modified",
      "cache-control",
    ];

    relevantHeaders.forEach((headerName) => {
      const value = response.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    return headers;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all organizations/owners from DCS
   */
  public async getOwners(params: OwnerSearchParams = {}): Promise<DCSResponse<Owner[]>> {
    const queryParams = new URLSearchParams();

    if (params.q) queryParams.append("q", params.q);
    if (params.uid) queryParams.append("uid", params.uid.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const endpoint = `/user/search?${queryParams.toString()}`;
    return this.makeRequest<Owner[]>(endpoint);
  }

  /**
   * Get languages from DCS catalog using the dedicated languages endpoint
   */
  public async getLanguages(): Promise<DCSResponse<Language[]>> {
    // Use the dedicated languages endpoint - much faster!
    const endpoint = "/catalog/list/languages?stage=prod";
    const response = await this.makeRequest<any>(endpoint);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
        statusCode: response.statusCode,
        headers: response.headers,
      };
    }

    // Parse the dedicated languages endpoint response
    const languages: Language[] = [];

    // Handle the response structure from /catalog/list/languages
    const languageData = response.data?.data || response.data || [];

    languageData.forEach((lang: any) => {
      if (lang.lc) {
        // lc = language code
        languages.push({
          id: lang.lc,
          code: lang.lc,
          name: lang.ln || lang.ang || lang.lc, // ln = local name, ang = anglicized name
          romanizedName: lang.ang, // ang = anglicized/romanized name
          direction: lang.ld || "ltr", // ld = language direction
          region: lang.lr, // lr = language region
          homeCountry: lang.hc, // hc = home country
          countryCodes: lang.cc, // cc = country codes array
          alternativeNames: lang.alt, // alt = alternative names array
          isStrategicLanguage: lang.gw, // gw = strategic language boolean
        });
      }
    });

    // Sort languages by name for consistent ordering
    languages.sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      data: languages,
      statusCode: response.statusCode,
      headers: response.headers,
    };
  }

  /**
   * Search for resources in the DCS catalog
   */
  public async getResources(params: CatalogSearchParams = {}): Promise<DCSResponse<Resource[]>> {
    const queryParams = new URLSearchParams();

    // Set defaults
    queryParams.append("stage", params.stage || "prod");
    if (params.limit) queryParams.append("limit", params.limit.toString());
    else queryParams.append("limit", "100");

    // Add optional parameters
    if (params.lang) queryParams.append("lang", params.lang);
    if (params.owner) queryParams.append("owner", params.owner);
    if (params.subject) queryParams.append("subject", params.subject);
    if (params.resource) queryParams.append("resource", params.resource);
    if (params.format) queryParams.append("format", params.format);
    if (params.q) queryParams.append("q", params.q);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.order) queryParams.append("order", params.order);
    if (params.page) queryParams.append("page", params.page.toString());

    const endpoint = `/catalog/search?${queryParams.toString()}`;
    const response = await this.makeRequest<any>(endpoint);

    // CRITICAL FIX: Handle catalog API response structure
    if (response.success && response.data) {
      // Catalog API returns { ok: true, data: [...], last_updated: "..." }
      const catalogData = response.data.data || response.data;
      return {
        ...response,
        data: Array.isArray(catalogData) ? catalogData : [],
      };
    }

    return response;
  }

  /**
   * Get resource metadata with ingredients array - THE CRITICAL METHOD!
   * This is what the documentation says we MUST use instead of hardcoded paths
   */
  public async getResourceMetadata(
    language: string,
    organization: string,
    subject?: string
  ): Promise<DCSResponse<Resource[]>> {
    const queryParams = new URLSearchParams();

    // CRITICAL: Must include metadataType=rc to get ingredients array
    queryParams.append("metadataType", "rc");
    queryParams.append("lang", language);
    // DON'T filter by subject - get ALL resources so we can find translation helps
    // Translation resources have subjects like "TSV Translation Notes" not "Bible"
    queryParams.append("owner", organization);
    queryParams.append("stage", "prod");
    queryParams.append("limit", "100");

    const endpoint = `/catalog/search?${queryParams.toString()}`;

    logger.debug("Fetching resource metadata with ingredients", {
      language,
      organization,
      subject,
      endpoint,
    });

    const response = await this.makeRequest<any>(endpoint);

    // CRITICAL FIX: Handle catalog API response structure
    if (response.success && response.data) {
      // Catalog API returns { ok: true, data: [...], last_updated: "..." }
      const catalogData = response.data.data || response.data;
      return {
        ...response,
        data: Array.isArray(catalogData) ? catalogData : [],
      };
    }

    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
      headers: response.headers,
    };
  }

  /**
   * Get specific resource metadata by resource type (tn, tq, tw, etc.)
   */
  public async getSpecificResourceMetadata(
    language: string,
    organization: string,
    resourceType: string
  ): Promise<DCSResponse<Resource | null>> {
    const response = await this.getResourceMetadata(language, organization);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
        statusCode: response.statusCode,
        headers: response.headers,
      };
    }

    // Find the specific resource type in the catalog results
    const resource = response.data.find(
      (r: any) =>
        r.name?.endsWith(`_${resourceType}`) ||
        r.subject?.toLowerCase().includes(resourceType.toLowerCase())
    );

    return {
      success: true,
      data: resource || null,
      statusCode: response.statusCode,
      headers: response.headers,
    };
  }

  /**
   * Get organizations/owners using the optimized endpoint
   */
  public async getOrganizations(): Promise<DCSResponse<Owner[]>> {
    const endpoint = "/catalog/list/owners";

    logger.debug("Fetching organizations from catalog");

    const response = await this.makeRequest<any>(endpoint);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
        statusCode: response.statusCode,
        headers: response.headers,
      };
    }

    // Parse the response structure
    const organizations: Owner[] = [];
    const orgData = response.data?.data || response.data || [];

    orgData.forEach((org: any) => {
      if (org.login) {
        organizations.push({
          id: org.id || 0,
          login: org.login,
          full_name: org.full_name || org.login,
          email: org.email || "",
          avatar_url: org.avatar_url || "",
          language: org.language || "en",
          is_admin: org.is_admin || false,
          last_login: org.last_login || "",
          created: org.created || new Date().toISOString(),
          restricted: org.restricted || false,
          active: org.active !== false,
          prohibit_login: org.prohibit_login || false,
          location: org.location || "",
          website: org.website || "",
          description: org.description || "",
          visibility: org.visibility || "public",
          followers_count: org.followers_count || 0,
          following_count: org.following_count || 0,
          starred_repos_count: org.starred_repos_count || 0,
          username: org.username || org.login,
        });
      }
    });

    return {
      success: true,
      data: organizations,
      statusCode: response.statusCode,
      headers: response.headers,
    };
  }

  /**
   * Get file content from a repository
   */
  public async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<DCSResponse<FileContent>> {
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${refParam}`;
    return this.makeRequest<FileContent>(endpoint);
  }

  /**
   * Get raw file content from a repository
   */
  public async getRawFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<DCSResponse<string>> {
    const branch = ref || "master";
    const endpoint = `/repos/${owner}/${repo}/raw/${branch}/${encodeURIComponent(path)}`;
    return this.makeRequest<string>(endpoint);
  }

  /**
   * Get repository information
   */
  public async getRepository(owner: string, repo: string): Promise<DCSResponse<Resource>> {
    const endpoint = `/repos/${owner}/${repo}`;
    return this.makeRequest<Resource>(endpoint);
  }

  /**
   * Get repository contents (file or directory listing)
   */
  public async getRepositoryContents(
    owner: string,
    repo: string,
    path: string = "",
    ref?: string
  ): Promise<DCSResponse<FileContent[]>> {
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const endpoint = `/repos/${owner}/${repo}/contents/${path ? encodeURIComponent(path) : ""}${refParam}`;
    return this.makeRequest<FileContent[]>(endpoint);
  }

  /**
   * List repositories for an owner
   */
  public async getOwnerRepositories(
    owner: string,
    type: "all" | "public" | "private" = "all",
    sort: "created" | "updated" | "pushed" | "full_name" = "updated"
  ): Promise<DCSResponse<Resource[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append("type", type);
    queryParams.append("sort", sort);
    queryParams.append("limit", "100");

    const endpoint = `/users/${owner}/repos?${queryParams.toString()}`;
    return this.makeRequest<Resource[]>(endpoint);
  }
}
