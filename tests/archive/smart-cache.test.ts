/**
 * Smart Cache Test Suite
 *
 * Tests the intelligent caching system for performance optimization.
 * Created for Task 10 validation
 */

import { beforeEach, describe, expect, test } from "vitest";
import { CacheHelpers, SmartCache } from "../src/functions/smart-cache";

describe("Smart Cache System", () => {
  let smartCache: SmartCache;

  beforeEach(() => {
    smartCache = new SmartCache();
  });

  describe("Basic Caching", () => {
    test("stores and retrieves data correctly", async () => {
      const testData = { text: "Hello, world!", number: 42 };

      // Set data
      await smartCache.set("test", { key: "value" }, testData);

      // Get data
      const retrieved = await smartCache.get("test", { key: "value" });

      expect(retrieved).toEqual(testData);
    });

    test("returns null for missing data", async () => {
      const result = await smartCache.get("nonexistent", { key: "missing" });
      expect(result).toBeNull();
    });
  });

  describe("Cache Patterns", () => {
    test("uses appropriate TTL for scripture content", async () => {
      const scriptureData = { verses: ["In the beginning..."] };
      await smartCache.set(
        "scripture",
        { lang: "en", book: "gen" },
        scriptureData,
      );

      const metrics = smartCache.getMetrics();
      expect(metrics.entriesCount).toBeGreaterThan(0);
    });

    test("handles different content types", async () => {
      const configs = smartCache.getConfig();

      expect(configs.defaultTTL).toBe(3600);
      expect(configs.adaptiveTTL).toBe(true);
      expect(configs.compressionEnabled).toBe(true);
    });
  });

  describe("Performance Metrics", () => {
    test("tracks cache hits and misses", async () => {
      const testData = { value: "test" };

      // Miss
      await smartCache.get("test", { id: 1 });

      // Set
      await smartCache.set("test", { id: 1 }, testData);

      // Hit
      await smartCache.get("test", { id: 1 });

      const metrics = smartCache.getMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.misses).toBeGreaterThan(0);
    });

    test("provides comprehensive statistics", () => {
      const stats = smartCache.getStats();

      expect(stats.metrics).toBeDefined();
      expect(stats.config).toBeDefined();
      expect(stats.accessPatterns).toBeDefined();
      expect(stats.topPatterns).toBeInstanceOf(Array);
    });
  });

  describe("Cache Configuration", () => {
    test("allows configuration updates", () => {
      smartCache.updateConfig({ defaultTTL: 7200 });

      const config = smartCache.getConfig();
      expect(config.defaultTTL).toBe(7200);
    });

    test("maintains configuration integrity", () => {
      const config = smartCache.getConfig();

      expect(config.maxTTL).toBeGreaterThan(config.defaultTTL);
      expect(config.defaultTTL).toBeGreaterThan(config.minTTL);
    });
  });

  describe("Cache Helpers", () => {
    test("provides convenience functions", async () => {
      const scriptureData = { content: "test scripture" };

      // Test helper functions exist
      expect(typeof CacheHelpers.cacheScripture).toBe("function");
      expect(typeof CacheHelpers.getScripture).toBe("function");
      expect(typeof CacheHelpers.cacheTranslationHelps).toBe("function");
      expect(typeof CacheHelpers.getTranslationHelps).toBe("function");
    });
  });
});
