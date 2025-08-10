/**
 * Cache Performance Validation Tests
 *
 * Tests specifically for cache performance requirements:
 * - Cache hit response times < 50ms
 * - Cache miss to cache hit improvement
 * - Cache metadata validation
 * - Memory usage stability
 */

import { beforeAll, describe, expect, it } from "vitest";
import { apiGet } from "./helpers/http";
const TIMEOUT = 15000;

interface CacheResponse {
  _metadata?: {
    cacheStatus: "hit" | "miss" | "bypass";
    responseTime: number;
    success: boolean;
    status: number;
  };
  scripture?: {
    text: string;
  };
  language?: string;
  [key: string]: unknown;
}

async function makeRequestWithCache(
  endpoint: string,
  params: Record<string, string | undefined> = {},
): Promise<CacheResponse> {
  // Delegate URL resolution, readiness, and JSON parsing to shared helper
  return apiGet(endpoint, params);
}

describe("Cache Performance Validation", () => {
  beforeAll(() => {
    console.log("🏎️ Running cache performance validation tests...");
  });

  describe("Cache Hit Performance", () => {
    it(
      "should achieve <50ms response times for cache hits",
      async () => {
        const testParams = {
          reference: "John 3:16",
          language: "en",
          organization: "unfoldingWord",
        };

        // First request (cache miss)
        const missResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );
        expect(missResponse._metadata?.cacheStatus).toBe("miss");
        expect(missResponse._metadata?.responseTime).toBeDefined();

        // Second request (cache hit)
        const hitResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );
        expect(hitResponse._metadata?.cacheStatus).toBe("hit");
        expect(hitResponse._metadata?.responseTime).toBeDefined();
        expect(hitResponse._metadata?.responseTime).toBeLessThan(50);

        // Validate content is identical
        expect(hitResponse.scripture).toEqual(missResponse.scripture);
        expect(hitResponse.language).toEqual(missResponse.language);
      },
      TIMEOUT,
    );

    it(
      "should show significant performance improvement from cache miss to hit",
      async () => {
        const testParams = {
          reference: "Psalm 23:1",
          language: "en",
          organization: "unfoldingWord",
        };

        // Cache miss
        const missResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );
        const missTime = missResponse._metadata?.responseTime || 0;

        // Cache hit
        const hitResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );
        const hitTime = hitResponse._metadata?.responseTime || 0;

        console.log(`Cache miss: ${missTime}ms, Cache hit: ${hitTime}ms`);

        // Cache hit should be at least 3x faster than miss
        expect(hitTime).toBeLessThan(missTime / 3);
        expect(hitTime).toBeLessThan(50);
      },
      TIMEOUT,
    );
  });

  describe("Cache Metadata Validation", () => {
    it(
      "should include proper cache metadata in all responses",
      async () => {
        const response = await makeRequestWithCache("fetch-scripture", {
          reference: "Romans 8:28",
          language: "en",
        });

        expect(response._metadata).toBeDefined();
        expect(response._metadata?.cacheStatus).toMatch(/^(hit|miss|bypass)$/);
        expect(response._metadata?.responseTime).toBeGreaterThan(0);
        expect(response._metadata?.success).toBe(true);
        expect(response._metadata?.status).toBe(200);
      },
      TIMEOUT,
    );

    it(
      "should handle cache bypass correctly",
      async () => {
        const response = await makeRequestWithCache("fetch-scripture", {
          reference: "Genesis 1:1",
          language: "en",
          bypassCache: "true",
        });

        // Cache bypass should work if supported
        if (response._metadata?.cacheStatus) {
          expect(["miss", "bypass"]).toContain(response._metadata.cacheStatus);
        }
      },
      TIMEOUT,
    );
  });

  describe("Multi-Endpoint Cache Performance", () => {
    const endpoints = [
      {
        name: "fetch-translation-notes",
        params: { reference: "John 3:16", language: "en" },
      },
      {
        name: "fetch-translation-questions",
        params: { reference: "John 3:16", language: "en" },
      },
      {
        name: "get-translation-word",
        params: { word: "love", language: "en" },
      },
      {
        name: "get-languages",
        params: { organization: "unfoldingWord" },
      },
    ];

    endpoints.forEach(({ name, params }) => {
      it(
        `${name} should have fast cache hits`,
        async () => {
          // Prime cache
          await makeRequestWithCache(name, params);

          // Test cache hit
          const hitResponse = await makeRequestWithCache(name, params);

          if (hitResponse._metadata?.cacheStatus === "hit") {
            expect(hitResponse._metadata.responseTime).toBeLessThan(50);
            console.log(
              `✅ ${name} cache hit: ${hitResponse._metadata.responseTime}ms`,
            );
          } else {
            console.log(
              `⚠️ ${name} no cache hit detected (${hitResponse._metadata?.cacheStatus})`,
            );
          }
        },
        TIMEOUT,
      );
    });
  });

  describe("Cache Consistency", () => {
    it(
      "should return identical content for cache hits and misses",
      async () => {
        const testParams = {
          reference: "Ephesians 2:8-9",
          language: "en",
          organization: "unfoldingWord",
        };

        // Get miss response
        const missResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );

        // Get hit response
        const hitResponse = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );

        // Compare content without metadata
        expect(hitResponse.scripture?.text).toBe(missResponse.scripture?.text);
        expect(hitResponse.language).toBe(missResponse.language);
        expect(hitResponse.scripture?.text).toBeTruthy();
      },
      TIMEOUT,
    );

    it(
      "should handle verse ranges consistently in cache",
      async () => {
        const testParams = {
          reference: "Matthew 5:3-8",
          language: "en",
        };

        const response1 = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );
        const response2 = await makeRequestWithCache(
          "fetch-scripture",
          testParams,
        );

        expect(response1.scripture?.text).toBe(response2.scripture?.text);
        expect(response1.scripture?.text).toContain("3 ");
        expect(response1.scripture?.text).toContain("8 ");

        // At least one should be a cache hit
        const statuses = [
          response1._metadata?.cacheStatus,
          response2._metadata?.cacheStatus,
        ];
        expect(statuses).toContain("hit");
      },
      TIMEOUT,
    );
  });
});
