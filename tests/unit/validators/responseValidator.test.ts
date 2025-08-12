import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateResponseBody,
  cleanResponseBody,
  createResponseValidator,
} from "../../src/middleware/responseValidator";
import { logger } from "../../src/utils/logger";

// Mock the logger
vi.mock("../../src/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Response Validator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateResponseBody", () => {
    it("validates clean responses", () => {
      const response = {
        scripture: [
          {
            text: "For God so loved...",
            reference: "John 3:16",
          },
        ],
        metadata: {
          sourceCount: 2,
          resources: ["ult", "ust"],
        },
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("detects forbidden keys in root", () => {
      const response = {
        scripture: [],
        xrayTrace: { traceId: "123" },
        debug: { internal: "data" },
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        "Forbidden diagnostic key 'xrayTrace' found at xrayTrace",
      );
      expect(result.violations).toContain(
        "Forbidden diagnostic key 'debug' found at debug",
      );
    });

    it("detects forbidden keys in nested objects", () => {
      const response = {
        data: {
          result: "ok",
          internal: { secret: "data" },
        },
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        "Forbidden diagnostic key 'internal' found at data.internal",
      );
    });

    it("detects forbidden keys in arrays", () => {
      const response = {
        items: [
          { name: "item1", xrayTrace: "trace1" },
          { name: "item2", traceId: "trace2" },
        ],
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain(
        "Forbidden diagnostic key 'xrayTrace' found at items[0].xrayTrace",
      );
      expect(result.violations).toContain(
        "Forbidden diagnostic key 'traceId' found at items[1].traceId",
      );
    });

    it("allows diagnostic keys in metadata", () => {
      const response = {
        data: "result",
        metadata: {
          responseTime: 123,
          cacheStatus: "hit",
          cached: true,
          timestamp: "2024-01-01",
        },
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("warns about diagnostic keys outside metadata", () => {
      const response = {
        data: "result",
        responseTime: 123,
        cacheStatus: "hit",
      };

      const result = validateResponseBody(response);
      expect(result.valid).toBe(true); // Warnings don't invalidate
      expect(result.warnings).toContain(
        "Diagnostic key 'responseTime' found outside metadata at responseTime",
      );
      expect(result.warnings).toContain(
        "Diagnostic key 'cacheStatus' found outside metadata at cacheStatus",
      );
    });
  });

  describe("cleanResponseBody", () => {
    it("removes forbidden keys", () => {
      const response = {
        data: "result",
        xrayTrace: { id: "123" },
        debug: "info",
        metadata: { count: 1 },
      };

      const cleaned = cleanResponseBody(response);
      expect(cleaned).toEqual({
        data: "result",
        metadata: { count: 1 },
      });
    });

    it("cleans nested objects", () => {
      const response = {
        data: {
          result: "ok",
          internal: "secret",
          nested: {
            xrayTrace: "trace",
            value: "keep",
          },
        },
      };

      const cleaned = cleanResponseBody(response);
      expect(cleaned).toEqual({
        data: {
          result: "ok",
          nested: {
            value: "keep",
          },
        },
      });
    });

    it("cleans arrays", () => {
      const response = {
        items: [
          { name: "item1", xrayTrace: "remove" },
          { name: "item2", debug: "remove" },
        ],
      };

      const cleaned = cleanResponseBody(response);
      expect(cleaned).toEqual({
        items: [{ name: "item1" }, { name: "item2" }],
      });
    });

    it("handles non-object values", () => {
      expect(cleanResponseBody("string")).toBe("string");
      expect(cleanResponseBody(123)).toBe(123);
      expect(cleanResponseBody(null)).toBe(null);
      expect(cleanResponseBody(undefined)).toBe(undefined);
    });
  });

  describe("createResponseValidator middleware", () => {
    it("validates and passes clean responses", () => {
      const validator = createResponseValidator();
      const response = { data: "clean" };

      const result = validator(response);
      expect(result).toBe(response);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("logs violations with default settings", () => {
      const validator = createResponseValidator();
      const response = { data: "result", xrayTrace: "bad" };

      const result = validator(response);
      expect(result).toBe(response); // Returns original
      expect(logger.warn).toHaveBeenCalledWith(
        "Response validation failed: 1 violation(s)",
        {
          violations: [
            "Forbidden diagnostic key 'xrayTrace' found at xrayTrace",
          ],
        },
      );
    });

    it("throws in strict mode", () => {
      const validator = createResponseValidator({ strict: true });
      const response = { data: "result", xrayTrace: "bad" };

      expect(() => validator(response)).toThrow(
        "Response validation failed: 1 violation(s)",
      );
    });

    it("auto-cleans when enabled", () => {
      const validator = createResponseValidator({ autoClean: true });
      const response = { data: "result", xrayTrace: "bad" };

      const result = validator(response);
      expect(result).toEqual({ data: "result" });
      expect(logger.info).toHaveBeenCalledWith("Auto-cleaning response body");
    });

    it("respects custom log level", () => {
      const validator = createResponseValidator({ logLevel: "error" });
      const response = { data: "result", debug: "bad" };

      validator(response);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
