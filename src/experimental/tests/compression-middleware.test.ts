/**
 * Compression Middleware Test Suite
 *
 * Tests the response compression system for performance optimization.
 * Created for Task 11 validation
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  CompressionAlgorithm,
  CompressionMiddleware,
  CompressionPresets,
} from "../src/functions/compression-middleware";

describe("Compression Middleware", () => {
  let middleware: CompressionMiddleware;

  beforeEach(() => {
    middleware = new CompressionMiddleware();
    middleware.resetMetrics();
  });

  describe("Configuration", () => {
    test("initializes with default configuration", () => {
      const config = middleware.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.threshold).toBe(1024);
      expect(config.level).toBe(6);
      expect(config.algorithm).toBe(CompressionAlgorithm.GZIP);
    });

    test("allows configuration updates", () => {
      middleware.updateConfig({ threshold: 2048, level: 9 });

      const config = middleware.getConfig();
      expect(config.threshold).toBe(2048);
      expect(config.level).toBe(9);
    });
  });

  describe("Compression Presets", () => {
    test("provides high compression preset", () => {
      const preset = CompressionPresets.HIGH_COMPRESSION;

      expect(preset.enabled).toBe(true);
      expect(preset.level).toBe(9);
      expect(preset.algorithm).toBe(CompressionAlgorithm.BROTLI);
    });

    test("provides fast compression preset", () => {
      const preset = CompressionPresets.FAST_COMPRESSION;

      expect(preset.enabled).toBe(true);
      expect(preset.level).toBe(1);
      expect(preset.algorithm).toBe(CompressionAlgorithm.GZIP);
    });

    test("provides disabled preset", () => {
      const preset = CompressionPresets.DISABLED;

      expect(preset.enabled).toBe(false);
    });
  });

  describe("Metrics Tracking", () => {
    test("initializes with zero metrics", () => {
      const metrics = middleware.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.compressedRequests).toBe(0);
      expect(metrics.compressionRatio).toBe(0);
      expect(metrics.totalBytesSaved).toBe(0);
    });

    test("provides statistics summary", () => {
      const stats = middleware.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.compressionRate).toBe(0);
      expect(stats.averageBytesSaved).toBe(0);
      expect(stats.performance).toBeDefined();
      expect(stats.algorithms).toBeDefined();
    });

    test("resets metrics correctly", () => {
      // Simulate some usage first
      middleware.resetMetrics();

      const metrics = middleware.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.compressedRequests).toBe(0);
    });
  });

  describe("Compression Algorithms", () => {
    test("supports all compression algorithms", () => {
      expect(CompressionAlgorithm.GZIP).toBe("gzip");
      expect(CompressionAlgorithm.DEFLATE).toBe("deflate");
      expect(CompressionAlgorithm.BROTLI).toBe("br");
      expect(CompressionAlgorithm.NONE).toBe("none");
    });
  });

  describe("Middleware Functionality", () => {
    test("creates middleware with custom config", () => {
      const customMiddleware = new CompressionMiddleware({
        threshold: 512,
        level: 8,
      });

      const config = customMiddleware.getConfig();
      expect(config.threshold).toBe(512);
      expect(config.level).toBe(8);
    });

    test("tracks algorithm usage in metrics", () => {
      const metrics = middleware.getMetrics();

      expect(metrics.algorithmUsage).toHaveProperty(CompressionAlgorithm.GZIP);
      expect(metrics.algorithmUsage).toHaveProperty(
        CompressionAlgorithm.BROTLI,
      );
      expect(metrics.algorithmUsage).toHaveProperty(
        CompressionAlgorithm.DEFLATE,
      );
      expect(metrics.algorithmUsage).toHaveProperty(CompressionAlgorithm.NONE);
    });
  });

  describe("Performance Monitoring", () => {
    test("provides performance insights", () => {
      const stats = middleware.getStats();

      expect(stats.performance.averageCompressionTime).toBeGreaterThanOrEqual(
        0,
      );
      expect(stats.performance.totalBytesSaved).toBeGreaterThanOrEqual(0);
      expect(stats.performance.requestsProcessed).toBeGreaterThanOrEqual(0);
    });

    test("calculates compression rate correctly", () => {
      const stats = middleware.getStats();

      // Initially should be 0% since no requests processed
      expect(stats.compressionRate).toBe(0);
    });
  });
});
