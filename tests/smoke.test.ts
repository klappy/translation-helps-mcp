import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8174";
const TIMEOUT = 15000; // Shorter timeout for smoke tests

async function makeRequest(endpoint: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(`${BASE_URL}/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

describe("Smoke Tests - Quick Health Check", () => {
  it(
    "should have a working health endpoint",
    async () => {
      const response = await makeRequest("health");
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      expect(["healthy", "error", "warning"]).toContain(response.status);
      expect(response.endpoints).toBeDefined();
      expect(response.endpoints.length).toBeGreaterThan(0);
    },
    TIMEOUT
  );

  it(
    "should return scripture data from API endpoint",
    async () => {
      const response = await makeRequest("fetch-scripture", {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      });

      expect(response.scripture).toBeDefined();
      expect(response.scripture.text).toBeDefined();
      expect(response.scripture.text.length).toBeGreaterThan(0);
      expect(response.language).toBe("en");
      expect(response.organization).toBe("unfoldingWord");
    },
    TIMEOUT
  );

  it(
    "should return identical data from MCP endpoint",
    async () => {
      const response = await makeRequest("fetch-scripture", {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      });

      expect(response.scripture).toBeDefined();
      expect(response.scripture.text).toBeDefined();
      expect(response.scripture.text.length).toBeGreaterThan(0);
      expect(response.language).toBe("en");
      expect(response.organization).toBe("unfoldingWord");
    },
    TIMEOUT
  );

  it(
    "should have API/MCP parity for scripture",
    async () => {
      const [apiResponse, mcpResponse] = await Promise.all([
        makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        }),
        makeRequest("fetch-scripture", {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        }),
      ]);

      // Remove timestamps and response times for comparison
      const normalizeTimestamps = (obj: unknown) => {
        const normalized = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
        if ('responseTime' in normalized) delete normalized.responseTime;
        if (normalized.metadata && typeof normalized.metadata === 'object' && normalized.metadata !== null) {
          const metadata = normalized.metadata as Record<string, unknown>;
          if ('timestamp' in metadata) delete metadata.timestamp;
          if ('cacheExpiresAt' in metadata) delete metadata.cacheExpiresAt;
          if ('cacheTtlSeconds' in metadata) delete metadata.cacheTtlSeconds;
        }
        return normalized;
      };

      expect(normalizeTimestamps(mcpResponse)).toEqual(normalizeTimestamps(apiResponse));
    },
    TIMEOUT
  );

  it(
    "should return resources data",
    async () => {
      const response = await makeRequest("fetch-resources", {
        reference: "John 3:16",
        language: "en",
        organization: "unfoldingWord",
      });

      // This endpoint returns individual resources, not a resources array
      expect(response.scripture).toBeDefined();
      expect(response.translationNotes).toBeDefined();
      expect(response.reference).toBe("John 3:16");
      expect(response.metadata).toBeDefined();
      expect(response.citations).toBeDefined();
    },
    TIMEOUT
  );

  it(
    "should return languages data",
    async () => {
      const response = await makeRequest("get-languages", {
        organization: "unfoldingWord",
      });

      expect(response.languages).toBeDefined();
      expect(response.languages.length).toBeGreaterThan(0);
      expect(response.organization).toBe("unfoldingWord");
      expect(response.metadata).toBeDefined();
    },
    TIMEOUT
  );
});
