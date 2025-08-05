/**
 * Request Coalescing System Test Suite
 *
 * Tests the request coalescing functionality that combines multiple identical
 * requests into a single upstream call to improve system efficiency.
 *
 * Validates Task 11 from implementation plan.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  CoalescingUtils,
  createCoalescingMiddleware,
  defaultCoalescer,
  RequestCoalescer,
  withCoalescing,
} from "../src/functions/request-coalescer.js";

describe("Request Coalescing System", () => {
  let coalescer: RequestCoalescer;

  beforeEach(() => {
    coalescer = new RequestCoalescer({
      maxPendingTime: 5000,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    coalescer.destroy();
  });

  describe("Basic Coalescing", () => {
    test("coalesces identical requests", async () => {
      let callCount = 0;
      const mockFetcher = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `result-${callCount}`;
      });

      const promises = [
        coalescer.coalesce("test-key", mockFetcher),
        coalescer.coalesce("test-key", mockFetcher),
        coalescer.coalesce("test-key", mockFetcher),
      ];

      const results = await Promise.all(promises);

      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);

      expect(results[0].data).toBe("result-1");
      expect(results[1].data).toBe("result-1");
      expect(results[2].data).toBe("result-1");

      expect(results[0].wasCoalesced).toBe(false);
      expect(results[1].wasCoalesced).toBe(true);
      expect(results[2].wasCoalesced).toBe(true);

      expect(results[0].requestCount).toBe(3);
      expect(results[1].requestCount).toBe(3);
      expect(results[2].requestCount).toBe(3);
    });

    test("does not coalesce different keys", async () => {
      let callCount = 0;
      const mockFetcher = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      const [result1, result2] = await Promise.all([
        coalescer.coalesce("key-1", mockFetcher),
        coalescer.coalesce("key-2", mockFetcher),
      ]);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
      expect(result1.data).toBe("result-1");
      expect(result2.data).toBe("result-2");
      expect(result1.wasCoalesced).toBe(false);
      expect(result2.wasCoalesced).toBe(false);
    });

    test("handles errors in coalesced requests", async () => {
      const error = new Error("Test error");
      const mockFetcher = vi.fn().mockRejectedValue(error);

      const promises = [
        coalescer.coalesce("error-key", mockFetcher),
        coalescer.coalesce("error-key", mockFetcher),
        coalescer.coalesce("error-key", mockFetcher),
      ];

      for (const promise of promises) {
        await expect(promise).rejects.toThrow("Test error");
      }

      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    test("handles sequential requests after completion", async () => {
      let callCount = 0;
      const mockFetcher = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      const result1 = await coalescer.coalesce("sequential-key", mockFetcher);
      const result2 = await coalescer.coalesce("sequential-key", mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
      expect(result1.data).toBe("result-1");
      expect(result2.data).toBe("result-2");
      expect(result1.wasCoalesced).toBe(false);
      expect(result2.wasCoalesced).toBe(false);
    });
  });

  describe("Auto-Generated Keys", () => {
    test("coalesces using function name and arguments", async () => {
      let callCount = 0;
      const mockFunction = vi.fn(async (arg1: string, arg2: number) => {
        callCount++;
        return `${arg1}-${arg2}-${callCount}`;
      });

      const promises = [
        coalescer.coalesceCall(mockFunction, "test", 123),
        coalescer.coalesceCall(mockFunction, "test", 123),
        coalescer.coalesceCall(mockFunction, "test", 123),
      ];

      const results = await Promise.all(promises);

      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(results[0].data).toBe("test-123-1");
      expect(results[1].wasCoalesced).toBe(true);
      expect(results[2].wasCoalesced).toBe(true);
    });

    test("does not coalesce different function arguments", async () => {
      let callCount = 0;
      const mockFunction = vi.fn(async (arg1: string, arg2: number) => {
        callCount++;
        return `${arg1}-${arg2}-${callCount}`;
      });

      const [result1, result2] = await Promise.all([
        coalescer.coalesceCall(mockFunction, "test", 123),
        coalescer.coalesceCall(mockFunction, "test", 456),
      ]);

      expect(mockFunction).toHaveBeenCalledTimes(2);
      expect(result1.data).toBe("test-123-1");
      expect(result2.data).toBe("test-456-2");
    });
  });

  describe("Metrics Tracking", () => {
    test("tracks coalescing metrics correctly", async () => {
      const mockFetcher = vi.fn().mockResolvedValue("result");

      await Promise.all([
        coalescer.coalesce("metric-key-1", mockFetcher),
        coalescer.coalesce("metric-key-1", mockFetcher),
        coalescer.coalesce("metric-key-2", mockFetcher),
      ]);

      const metrics = coalescer.getMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.coalescedRequests).toBe(1);
      expect(metrics.uniqueRequests).toBe(2);
      expect(metrics.coalescingRate).toBeGreaterThan(0);
      expect(metrics.currentPendingRequests).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    test("tracks error rates", async () => {
      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce("success")
        .mockRejectedValueOnce(new Error("failure"));

      await coalescer.coalesce("success-key", mockFetcher);

      try {
        await coalescer.coalesce("error-key", mockFetcher);
      } catch {
        // Expected error
      }

      const metrics = coalescer.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.errorRate).toBe(0.5);
    });

    test("can reset metrics", async () => {
      const mockFetcher = vi.fn().mockResolvedValue("result");

      await coalescer.coalesce("reset-key", mockFetcher);
      expect(coalescer.getMetrics().totalRequests).toBe(1);

      coalescer.resetMetrics();
      expect(coalescer.getMetrics().totalRequests).toBe(0);
    });
  });

  describe("Status and Monitoring", () => {
    test("provides accurate status information", async () => {
      const status = coalescer.getStatus();

      expect(status).toHaveProperty("pendingRequests");
      expect(status).toHaveProperty("totalProcessed");
      expect(status).toHaveProperty("coalescingRate");
      expect(status).toHaveProperty("isEnabled");
      expect(status).toHaveProperty("uptime");

      expect(status.isEnabled).toBe(true);
      expect(status.pendingRequests).toBe(0);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    test("tracks pending requests correctly", async () => {
      const mockFetcher = vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve("result"), 200))
      );

      const promise = coalescer.coalesce("pending-key", mockFetcher);

      const status = coalescer.getStatus();
      expect(status.pendingRequests).toBe(1);

      await promise;

      const finalStatus = coalescer.getStatus();
      expect(finalStatus.pendingRequests).toBe(0);
    });
  });

  describe("Integration Helpers", () => {
    test("withCoalescing higher-order function", async () => {
      let callCount = 0;
      const originalFunction = async (input: string) => {
        callCount++;
        return `${input}-${callCount}`;
      };

      const coalescedFunction = withCoalescing(originalFunction, coalescer);

      const [result1, result2] = await Promise.all([
        coalescedFunction("test"),
        coalescedFunction("test"),
      ]);

      expect(callCount).toBe(1);
      expect(result1).toBe("test-1");
      expect(result2).toBe("test-1");
    });

    test("createCoalescingMiddleware", async () => {
      let callCount = 0;
      const handler = async (input: string) => {
        callCount++;
        return `handled-${input}-${callCount}`;
      };

      const middleware = createCoalescingMiddleware(coalescer);
      const coalescedHandler = middleware(handler);

      const [result1, result2] = await Promise.all([
        coalescedHandler("middleware-test"),
        coalescedHandler("middleware-test"),
      ]);

      expect(callCount).toBe(1);
      expect(result1).toBe("handled-middleware-test-1");
      expect(result2).toBe("handled-middleware-test-1");
    });
  });

  describe("Utility Functions", () => {
    test("CoalescingUtils.scriptureKey", () => {
      const key = CoalescingUtils.scriptureKey("John 3:16", "en", "ult");
      expect(key).toBe("scripture:en:ult:John 3:16");
    });

    test("CoalescingUtils.resourceKey", () => {
      const key1 = CoalescingUtils.resourceKey("notes", "en");
      expect(key1).toBe("resource:notes:en");

      const key2 = CoalescingUtils.resourceKey("notes", "en", "Romans 9");
      expect(key2).toBe("resource:notes:en:Romans 9");
    });

    test("CoalescingUtils.catalogKey", () => {
      const key = CoalescingUtils.catalogKey({
        language: "en",
        subject: "Bible",
        stage: "prod",
      });
      expect(key).toBe("catalog:language=en&stage=prod&subject=Bible");
    });
  });

  describe("Performance Requirements", () => {
    test("achieves >50% reduction in upstream requests", async () => {
      let callCount = 0;
      const mockFetcher = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          coalescer.coalesce(`key-${i}`, mockFetcher),
          coalescer.coalesce(`key-${i}`, mockFetcher)
        );
      }

      await Promise.all(promises);

      expect(mockFetcher).toHaveBeenCalledTimes(5);
      expect(callCount).toBe(5);

      const metrics = coalescer.getMetrics();
      expect(metrics.coalescingRate).toBe(50);
    });

    test("does not increase response time significantly", async () => {
      const baseResponseTime = 100;
      const mockFetcher = vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve("result"), baseResponseTime))
      );

      const singleStart = Date.now();
      await coalescer.coalesce("single-key", mockFetcher);
      const singleTime = Date.now() - singleStart;

      const coalescedStart = Date.now();
      await Promise.all([
        coalescer.coalesce("coalesced-key", mockFetcher),
        coalescer.coalesce("coalesced-key", mockFetcher),
        coalescer.coalesce("coalesced-key", mockFetcher),
      ]);
      const coalescedTime = Date.now() - coalescedStart;

      expect(coalescedTime).toBeLessThan(singleTime * 1.2);
    });
  });

  describe("Default Instance", () => {
    test("default coalescer is available and functional", async () => {
      const mockFetcher = vi.fn().mockResolvedValue("default-result");

      const [result1, result2] = await Promise.all([
        defaultCoalescer.coalesce("default-key", mockFetcher),
        defaultCoalescer.coalesce("default-key", mockFetcher),
      ]);

      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1.data).toBe("default-result");
      expect(result2.data).toBe("default-result");
      expect(result2.wasCoalesced).toBe(true);
    });
  });
});
