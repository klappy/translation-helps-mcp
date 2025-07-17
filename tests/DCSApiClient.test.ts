/**
 * Unit tests for DCS API Client
 * Tests all API methods with mocked responses
 */

import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { DCSApiClient } from "../src/services/DCSApiClient.js";
import type { Owner, Language, Resource } from "../src/types/dcs.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("DCSApiClient", () => {
  let client: DCSApiClient;
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = global.fetch as Mock;
    mockFetch.mockClear();
    client = new DCSApiClient({
      baseUrl: "https://test.door43.org/api/v1",
      timeout: 5000,
      maxRetries: 1,
    });
  });

  describe("Constructor", () => {
    it("should initialize with default config", () => {
      const defaultClient = new DCSApiClient();
      expect(defaultClient).toBeInstanceOf(DCSApiClient);
    });

    it("should initialize with custom config", () => {
      const customClient = new DCSApiClient({
        baseUrl: "https://custom.api",
        timeout: 10000,
        maxRetries: 5,
      });
      expect(customClient).toBeInstanceOf(DCSApiClient);
    });
  });

  describe("getOwners", () => {
    it("should fetch owners successfully", async () => {
      const mockOwners: Owner[] = [
        {
          id: 1,
          login: "unfoldingword",
          full_name: "unfoldingWord",
          email: "info@unfoldingword.org",
          avatar_url: "https://example.com/avatar.png",
          language: "en",
          is_admin: false,
          last_login: "2023-01-01T00:00:00Z",
          created: "2020-01-01T00:00:00Z",
          restricted: false,
          active: true,
          prohibit_login: false,
          location: "Global",
          website: "https://unfoldingword.org",
          description: "Bible translation organization",
          visibility: "public",
          followers_count: 100,
          following_count: 50,
          starred_repos_count: 25,
          username: "unfoldingword",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockOwners,
      });

      const result = await client.getOwners({ q: "unfoldingword" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOwners);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/user/search?q=unfoldingword",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "Translation-Helps-MCP/1.0",
            Accept: "application/json",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Not found" }),
      });

      const result = await client.getOwners({ q: "nonexistent" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("HTTP_404");
      expect(result.error?.message).toContain("Not found");
    });
  });

  describe("getLanguages", () => {
    it("should extract languages from catalog resources", async () => {
      const mockResources: Resource[] = [
        {
          id: 1,
          name: "en_ult",
          catalog: {
            lang_code: "en",
            lang_name: "English",
            stage: "prod",
            prod: true,
            res_type: "bible",
            res_name: "ULT",
            branch_or_tag_name: "master",
            released: "2023-01-01",
            zipball_url: "",
            tarball_url: "",
            catalog_url: "",
            metadata_url: "",
            metadata_json_url: "",
            metadata_api_url: "",
          },
        } as Resource,
        {
          id: 2,
          name: "es_ult",
          catalog: {
            lang_code: "es",
            lang_name: "Spanish",
            stage: "prod",
            prod: true,
            res_type: "bible",
            res_name: "ULT",
            branch_or_tag_name: "master",
            released: "2023-01-01",
            zipball_url: "",
            tarball_url: "",
            catalog_url: "",
            metadata_url: "",
            metadata_json_url: "",
            metadata_api_url: "",
          },
        } as Resource,
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResources,
      });

      const result = await client.getLanguages();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        id: "en",
        code: "en",
        name: "English",
        direction: "ltr",
      });
      expect(result.data![1]).toEqual({
        id: "es",
        code: "es",
        name: "Spanish",
        direction: "ltr",
      });
    });

    it("should handle empty catalog response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });

      const result = await client.getLanguages();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("getResources", () => {
    it("should fetch resources with default parameters", async () => {
      const mockResources: Resource[] = [
        {
          id: 1,
          name: "en_ult",
          full_name: "unfoldingword/en_ult",
          description: "English ULT",
        } as Resource,
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResources,
      });

      const result = await client.getResources();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResources);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/catalog/search?stage=prod&limit=100",
        expect.any(Object)
      );
    });

    it("should fetch resources with custom parameters", async () => {
      const mockResources: Resource[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockResources,
      });

      const result = await client.getResources({
        lang: "es",
        owner: "unfoldingword",
        subject: "Bible",
        stage: "prod",
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/catalog/search?stage=prod&limit=50&lang=es&owner=unfoldingword&subject=Bible",
        expect.any(Object)
      );
    });
  });

  describe("getFileContent", () => {
    it("should fetch file content successfully", async () => {
      const mockFileContent = {
        name: "README.md",
        path: "README.md",
        content: "VGhpcyBpcyBhIHRlc3Q=", // Base64 for "This is a test"
        encoding: "base64",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockFileContent,
      });

      const result = await client.getFileContent("owner", "repo", "README.md");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFileContent);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/repos/owner/repo/contents/README.md",
        expect.any(Object)
      );
    });

    it("should fetch file content with ref parameter", async () => {
      const mockFileContent = {
        name: "file.txt",
        path: "file.txt",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockFileContent,
      });

      await client.getFileContent("owner", "repo", "file.txt", "develop");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/repos/owner/repo/contents/file.txt?ref=develop",
        expect.any(Object)
      );
    });
  });

  describe("getRawFileContent", () => {
    it("should fetch raw file content", async () => {
      const mockRawContent = "This is raw file content";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => mockRawContent,
      });

      const result = await client.getRawFileContent("owner", "repo", "file.txt");

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockRawContent);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/repos/owner/repo/raw/master/file.txt",
        expect.any(Object)
      );
    });

    it("should fetch raw file content with custom branch", async () => {
      const mockRawContent = "Content from develop branch";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: async () => mockRawContent,
      });

      await client.getRawFileContent("owner", "repo", "file.txt", "develop");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/repos/owner/repo/raw/develop/file.txt",
        expect.any(Object)
      );
    });
  });

  describe("Error handling and retries", () => {
    it("should retry on network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => [],
      });

      const result = await client.getOwners();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Unauthorized" }),
      });

      const result = await client.getOwners();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("HTTP_401");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should retry on 5xx errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ message: "Server error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => [],
        });

      const result = await client.getOwners();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries exceeded", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error 1"))
        .mockRejectedValueOnce(new Error("Network error 2"));

      const result = await client.getOwners();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REQUEST_FAILED");
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry = 2 total
    });

    it.skip("should handle timeout correctly", async () => {
      // Create a client with very short timeout for testing
      const timeoutClient = new DCSApiClient({
        baseUrl: "https://test.door43.org/api/v1",
        timeout: 100,
        maxRetries: 0,
      });

      // Mock AbortController error that occurs on timeout
      mockFetch.mockImplementationOnce(() => {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await timeoutClient.getOwners();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REQUEST_FAILED");
    });
  });

  describe("getRepository", () => {
    it("should fetch repository information", async () => {
      const mockRepo: Resource = {
        id: 1,
        name: "en_ult",
        full_name: "unfoldingword/en_ult",
        description: "English ULT",
      } as Resource;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockRepo,
      });

      const result = await client.getRepository("unfoldingword", "en_ult");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRepo);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/repos/unfoldingword/en_ult",
        expect.any(Object)
      );
    });
  });

  describe("getOwnerRepositories", () => {
    it("should fetch owner repositories with default parameters", async () => {
      const mockRepos: Resource[] = [
        { id: 1, name: "repo1" } as Resource,
        { id: 2, name: "repo2" } as Resource,
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockRepos,
      });

      const result = await client.getOwnerRepositories("unfoldingword");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRepos);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/users/unfoldingword/repos?type=all&sort=updated&limit=100",
        expect.any(Object)
      );
    });

    it("should fetch owner repositories with custom parameters", async () => {
      const mockRepos: Resource[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockRepos,
      });

      const result = await client.getOwnerRepositories("owner", "public", "created");

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.door43.org/api/v1/users/owner/repos?type=public&sort=created&limit=100",
        expect.any(Object)
      );
    });
  });
});
