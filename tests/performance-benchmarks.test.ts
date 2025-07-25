/**
 * Performance Benchmark Tests
 *
 * Ensures all endpoints meet their performance targets
 */

import { beforeAll, describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:8788";

// Performance targets from config
const PERFORMANCE_TARGETS = {
  scripture: 300, // Single verse
  notes: 400, // Translation notes
  words: 300, // Single word lookup
  discovery: 500, // Language/resource discovery
  context: 800, // Aggregated context
  cached: 100, // Any cached response
};

describe("Performance Benchmarks", () => {
  beforeAll(async () => {
    console.log("🏃 Running performance benchmarks...");
    // Warm up the API with a simple request
    await fetch(`${BASE_URL}/health`);
  });

  describe("Scripture Performance", () => {
    it("single verse should respond within 300ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=John+3:16&language=en`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.scripture);
      console.log(`  ✓ Single verse: ${duration}ms`);
    });

    it("verse range should respond within 400ms", async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/fetch-scripture?reference=Romans+1:1-5&language=en`
      );
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(400);
      console.log(`  ✓ Verse range: ${duration}ms`);
    });

    it("full chapter should respond within 500ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=Psalm+23&language=en`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      console.log(`  ✓ Full chapter: ${duration}ms`);
    });
  });

  describe("Translation Helps Performance", () => {
    it("translation notes should respond within 400ms", async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/fetch-translation-notes?reference=Genesis+1:1&language=en`
      );
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.notes);
      console.log(`  ✓ Translation notes: ${duration}ms`);
    });

    it("translation word lookup should respond within 300ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/get-translation-word?word=faith&language=en`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.words);
      console.log(`  ✓ Word lookup: ${duration}ms`);
    });

    it("translation word links should respond within 300ms", async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/fetch-translation-word-links?reference=Genesis+1:1&language=en`
      );
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300);
      console.log(`  ✓ Word links: ${duration}ms`);
    });
  });

  describe("Discovery Performance", () => {
    it("language list should respond within 500ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/get-languages`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.discovery);
      console.log(`  ✓ Language discovery: ${duration}ms`);
    });

    it("available books should respond within 400ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/get-available-books?language=en&resource=ult`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(400);
      console.log(`  ✓ Book discovery: ${duration}ms`);
    });
  });

  describe("Aggregated Context Performance", () => {
    it("get-context should respond within 800ms", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/get-context?reference=John+3:16&language=en`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.context);
      console.log(`  ✓ Context aggregation: ${duration}ms`);
    });

    it("get-words-for-reference should respond within 600ms", async () => {
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/get-words-for-reference?reference=John+3:16&language=en`
      );
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(600);
      console.log(`  ✓ Words for reference: ${duration}ms`);
    });
  });

  describe("Cache Performance", () => {
    it("cached responses should be under 100ms", async () => {
      // First request to populate cache
      const reference = "Romans+8:28";
      await fetch(`${BASE_URL}/fetch-scripture?reference=${reference}&language=en`);

      // Wait a bit to ensure caching
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request should be cached
      const start = Date.now();
      const response = await fetch(
        `${BASE_URL}/fetch-scripture?reference=${reference}&language=en`
      );
      const data = await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.cached);
      console.log(`  ✓ Cached response: ${duration}ms`);
    });

    it("should handle cache headers properly", async () => {
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=John+1:1&language=en`);

      expect(response.headers.get("cache-control")).toBeDefined();
      const cacheControl = response.headers.get("cache-control");
      expect(cacheControl).toMatch(/max-age=\d+/);
    });
  });

  describe("Concurrent Request Performance", () => {
    it("should handle 10 concurrent requests efficiently", async () => {
      const requests = [
        "John+3:16",
        "Romans+8:28",
        "Genesis+1:1",
        "Psalm+23:1",
        "Matthew+5:1",
        "Luke+2:1",
        "Acts+1:1",
        "James+1:1",
        "Revelation+1:1",
        "Isaiah+53:1",
      ];

      const start = Date.now();
      const promises = requests.map((ref) =>
        fetch(`${BASE_URL}/fetch-scripture?reference=${ref}&language=en`).then((r) => r.json())
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All should succeed
      expect(results.every((r) => r.text)).toBe(true);

      // Should complete within reasonable time (not 10x single request)
      expect(duration).toBeLessThan(2000); // 2 seconds for 10 requests
      console.log(`  ✓ 10 concurrent requests: ${duration}ms total`);
    });
  });

  describe("Performance Under Load", () => {
    it("should maintain performance after multiple requests", async () => {
      const timings = [];

      // Make 20 requests and track timings
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        const response = await fetch(
          `${BASE_URL}/fetch-scripture?reference=John+${(i % 20) + 1}:1&language=en`
        );
        await response.json();
        const duration = Date.now() - start;
        timings.push(duration);
      }

      // Calculate average and check degradation
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const lastFiveAvg = timings.slice(-5).reduce((a, b) => a + b, 0) / 5;

      expect(avgTime).toBeLessThan(400);
      // Performance shouldn't degrade significantly
      expect(lastFiveAvg).toBeLessThan(avgTime * 1.5);

      console.log(`  ✓ Average over 20 requests: ${Math.round(avgTime)}ms`);
      console.log(`  ✓ Last 5 average: ${Math.round(lastFiveAvg)}ms`);
    });
  });

  describe("Response Size Performance", () => {
    it("should handle large responses efficiently", async () => {
      // Request a large chapter
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=Psalm+119&language=en`);
      const data = await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(data.text.length).toBeGreaterThan(10000); // Psalm 119 is very long
      expect(duration).toBeLessThan(1000); // Still under 1 second

      console.log(`  ✓ Large response (${data.text.length} chars): ${duration}ms`);
    });
  });
});
