import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCacheValidator,
  validateCacheableData,
  withCacheValidation,
} from "../../src/middleware/cacheValidator";
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

describe("Cache Validator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateCacheableData", () => {
    it("allows valid data to be cached", () => {
      const validData = {
        scripture: [{ text: "For God so loved...", reference: "John 3:16" }],
        metadata: { sourceCount: 2 },
      };

      const result = validateCacheableData(validData);
      expect(result.cacheable).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("rejects empty arrays", () => {
      const result = validateCacheableData([]);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe(
        "Data matches uncacheable pattern: emptyArray",
      );
    });

    it("rejects empty objects", () => {
      const result = validateCacheableData({});
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe(
        "Data matches uncacheable pattern: emptyObject",
      );
    });

    it("rejects null and undefined", () => {
      let result = validateCacheableData(null);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe("Data matches uncacheable pattern: nullish");

      result = validateCacheableData(undefined);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe("Data matches uncacheable pattern: nullish");
    });

    it("rejects error responses", () => {
      const errorData = {
        error: "Something went wrong",
        status: 500,
      };

      const result = validateCacheableData(errorData);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe(
        "Data matches uncacheable pattern: errorResponse",
      );
    });

    it("rejects empty resources", () => {
      const emptyResources = {
        resources: [],
        metadata: { totalCount: 0 },
      };

      const result = validateCacheableData(emptyResources);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe(
        "Data matches uncacheable pattern: noResources",
      );
    });

    it("rejects empty results", () => {
      const emptyResults = {
        results: [],
        success: true,
      };

      const result = validateCacheableData(emptyResults);
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe(
        "Data matches uncacheable pattern: noResources",
      );
    });

    it("warns about zero totalCount", () => {
      const data = {
        items: [{ id: 1 }], // Has items but totalCount is 0
        totalCount: 0,
      };

      const result = validateCacheableData(data);
      expect(result.cacheable).toBe(true);
      expect(result.warnings).toContain(
        "Total count is 0 - might be incomplete data",
      );
    });

    it("warns about incomplete metadata", () => {
      const data = {
        results: [{ id: 1 }],
        metadata: { incomplete: true },
      };

      const result = validateCacheableData(data);
      expect(result.cacheable).toBe(true);
      expect(result.warnings).toContain("Metadata indicates incomplete data");
    });
  });

  describe("createCacheValidator", () => {
    it("validates and allows cacheable data", () => {
      const validator = createCacheValidator();
      const validData = { data: [1, 2, 3] };

      const result = validator(validData);
      expect(result).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("rejects uncacheable data with logging", () => {
      const validator = createCacheValidator();
      const emptyData: unknown[] = [];

      const result = validator(emptyData, "test-context");
      expect(result).toBe(false);
      // The middleware now handles logging
      expect(logger.warn).toHaveBeenCalledWith(
        "Cache validation failed for test-context",
        expect.objectContaining({
          reason: "Data matches uncacheable pattern: emptyArray",
        }),
      );
    });

    it("throws in strict mode", () => {
      const validator = createCacheValidator({ strict: true });
      const emptyData = {};

      expect(() => validator(emptyData)).toThrow(
        "Cache validation failed: Data matches uncacheable pattern: emptyObject",
      );
    });

    it("uses custom validators", () => {
      const customValidator = vi.fn().mockReturnValue({
        cacheable: false,
        reason: "Custom validation failed",
      });

      const validator = createCacheValidator({
        customValidators: [customValidator],
      });

      const data = { valid: true };
      const result = validator(data);

      expect(result).toBe(false);
      expect(customValidator).toHaveBeenCalledWith(data);
      expect(logger.warn).toHaveBeenCalledWith(
        "Custom cache validation failed",
        expect.objectContaining({
          reason: "Custom validation failed",
        }),
      );
    });

    it("respects custom log level", () => {
      const validator = createCacheValidator({ logLevel: "error" });
      const emptyData: unknown[] = [];

      validator(emptyData);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe("withCacheValidation", () => {
    it("returns cached data when valid", async () => {
      const cachedData = { results: [1, 2, 3] };
      const cacheOp = vi.fn().mockResolvedValue(cachedData);
      const validator = vi.fn().mockReturnValue(true);
      const fallback = vi.fn();

      const result = await withCacheValidation(cacheOp, validator, fallback);

      expect(result).toBe(cachedData);
      expect(validator).toHaveBeenCalledWith(cachedData);
      expect(fallback).not.toHaveBeenCalled();
    });

    it("falls back when cache returns invalid data", async () => {
      const cachedData: unknown[] = []; // Empty array
      const freshData = { results: [1, 2, 3] };
      const cacheOp = vi.fn().mockResolvedValue(cachedData);
      const validator = vi.fn().mockReturnValue(false);
      const fallback = vi.fn().mockResolvedValue(freshData);

      const result = await withCacheValidation(cacheOp, validator, fallback);

      expect(result).toBe(freshData);
      expect(validator).toHaveBeenCalledWith(cachedData);
      expect(fallback).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Cache returned invalid data, falling back to source",
      );
    });

    it("falls back when cache operation fails", async () => {
      const error = new Error("Cache error");
      const freshData = { results: [1, 2, 3] };
      const cacheOp = vi.fn().mockRejectedValue(error);
      const validator = vi.fn();
      const fallback = vi.fn().mockResolvedValue(freshData);

      const result = await withCacheValidation(cacheOp, validator, fallback);

      expect(result).toBe(freshData);
      expect(validator).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        "Cache operation failed, falling back to source",
        {
          error,
        },
      );
    });
  });
});
