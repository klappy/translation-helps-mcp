/**
 * Response Payload Optimization Test Suite
 *
 * Tests the response optimization functionality that reduces bandwidth usage
 * and improves mobile performance through various optimization strategies.
 *
 * Validates Task 12 from implementation plan.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  OptimizationUtils,
  ResponseOptimizer,
  createOptimizationMiddleware,
  defaultOptimizer,
} from "../src/functions/response-optimizer.js";

describe("Response Payload Optimization System", () => {
  let optimizer: ResponseOptimizer;

  beforeEach(() => {
    optimizer = new ResponseOptimizer({
      removeNullFields: true,
      compressRepeated: true,
      enableFieldFiltering: true,
      enablePagination: true,
      addCompressionMetadata: true,
    });
  });

  describe("Null Field Removal", () => {
    test("removes null and undefined fields from objects", () => {
      const testData = {
        name: "John",
        age: null,
        email: "john@example.com",
        phone: undefined,
        address: {
          street: "123 Main St",
          city: null,
          country: "USA",
        },
      };

      const result = optimizer.optimize(testData);

      expect(result.data).toEqual({
        name: "John",
        email: "john@example.com",
        address: {
          street: "123 Main St",
          country: "USA",
        },
      });

      expect(result._meta?.optimizations).toContain("null-removal");
    });

    test("removes null items from arrays", () => {
      const testData = ["apple", null, "banana", undefined, "cherry"];
      const result = optimizer.optimize(testData);

      expect(result.data).toEqual(["apple", "banana", "cherry"]);
    });

    test("handles deeply nested null removal", () => {
      const testData = {
        level1: {
          level2: {
            level3: {
              value: "keep",
              nullValue: null,
              undefinedValue: undefined,
            },
            keep: "this",
          },
          remove: null,
        },
      };

      const result = optimizer.optimize(testData);

      expect(result.data).toEqual({
        level1: {
          level2: {
            level3: {
              value: "keep",
            },
            keep: "this",
          },
        },
      });
    });
  });

  describe("Field Filtering", () => {
    test("includes only specified fields", () => {
      const testData = {
        id: 1,
        name: "John",
        email: "john@example.com",
        password: "secret",
        role: "user",
      };

      const result = optimizer.optimize(testData, {
        fieldFilter: {
          include: ["id", "name", "email"],
        },
      });

      expect(result.data).toEqual({
        id: 1,
        name: "John",
        email: "john@example.com",
      });

      expect(result._meta?.optimizations).toContain("field-filtering");
      expect(result._meta?.fieldsFiltered).toEqual(["+id", "+name", "+email"]);
    });

    test("excludes specified fields", () => {
      const testData = {
        id: 1,
        name: "John",
        email: "john@example.com",
        password: "secret",
        role: "user",
      };

      const result = optimizer.optimize(testData, {
        fieldFilter: {
          exclude: ["password", "role"],
        },
      });

      expect(result.data).toEqual({
        id: 1,
        name: "John",
        email: "john@example.com",
      });

      expect(result._meta?.fieldsFiltered).toEqual(["-password", "-role"]);
    });

    test("filters arrays of objects", () => {
      const testData = [
        { id: 1, name: "John", password: "secret1" },
        { id: 2, name: "Jane", password: "secret2" },
      ];

      const result = optimizer.optimize(testData, {
        fieldFilter: {
          exclude: ["password"],
        },
      });

      expect(result.data).toEqual([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ]);
    });
  });

  describe("Pagination", () => {
    test("applies page-based pagination", () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      const result = optimizer.optimize(testData, {
        pagination: {
          page: 2,
          limit: 10,
        },
      });

      expect(result.data).toHaveLength(10);
      expect((result.data as typeof testData)[0].id).toBe(11);
      expect((result.data as typeof testData)[9].id).toBe(20);

      expect(result._meta?.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        hasNext: true,
        hasPrev: true,
        totalPages: 10,
      });
    });

    test("applies offset-based pagination", () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

      const result = optimizer.optimize(testData, {
        pagination: {
          offset: 15,
          limit: 5,
        },
      });

      expect(result.data).toHaveLength(5);
      expect((result.data as typeof testData)[0].id).toBe(16);
      expect((result.data as typeof testData)[4].id).toBe(20);
    });

    test("handles last page correctly", () => {
      const testData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

      const result = optimizer.optimize(testData, {
        pagination: {
          page: 3,
          limit: 10,
        },
      });

      expect(result.data).toHaveLength(5); // Last page has 5 items
      expect(result._meta?.pagination?.hasNext).toBe(false);
      expect(result._meta?.pagination?.hasPrev).toBe(true);
    });

    test("handles empty arrays", () => {
      const result = optimizer.optimize([], {
        pagination: { page: 1, limit: 10 },
      });

      expect(result.data).toEqual([]);
      expect(result._meta?.pagination?.total).toBe(0);
      expect(result._meta?.pagination?.hasNext).toBe(false);
    });
  });

  describe("Size Calculation and Targets", () => {
    test("calculates response sizes accurately", () => {
      const testData = { message: "Hello, World!" };
      const result = optimizer.optimize(testData);

      expect(result._meta?.compression?.originalSize).toBeGreaterThan(0);
      expect(result._meta?.compression?.compressedSize).toBeGreaterThan(0);
      expect(result._meta?.compression?.compressionRatio).toBeGreaterThanOrEqual(0);
    });

    test("warns when size targets are exceeded", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Create large test data
      const largeData = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          content: "This is a very long content string that will make the response large ".repeat(
            10
          ),
        })),
      };

      optimizer.optimize(largeData, {
        resourceType: "wordArticles", // 2KB target
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Size target exceeded for wordArticles")
      );

      consoleSpy.mockRestore();
    });

    test("meets size targets for typical scripture responses", () => {
      const scriptureData = {
        reference: "John 3:16",
        text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        book: "John",
        chapter: 3,
        verse: 16,
        language: "en",
      };

      const result = optimizer.optimize(scriptureData, {
        resourceType: "scripture",
        fieldFilter: OptimizationUtils.scriptureFields(false),
      });

      const sizeTargets = optimizer.getSizeTargets();
      expect(result._meta?.compression?.compressedSize).toBeLessThan(sizeTargets.scripture);
    });
  });

  describe("Complex Optimization Scenarios", () => {
    test("combines all optimizations effectively", () => {
      // Test pagination on array data directly
      const complexData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Article ${i + 1}`,
        content: `Content for article ${i + 1}`,
        metadata: {
          author: i % 2 === 0 ? "John" : null,
          tags: i % 3 === 0 ? ["important"] : undefined,
          published: true,
          views: Math.floor(Math.random() * 1000),
          internalId: `internal-${i}`,
          debugInfo: { trace: "debug-data" },
        },
        pagination: null,
        debug: undefined,
      }));

      const result = optimizer.optimize(complexData, {
        fieldFilter: {
          exclude: ["internalId", "debugInfo", "debug", "pagination"],
        },
        pagination: {
          page: 1,
          limit: 20,
        },
        resourceType: "listResponses",
      });

      // Should have applied all optimizations
      expect(result._meta?.optimizations).toContain("field-filtering");
      expect(result._meta?.optimizations).toContain("null-removal");
      expect(result._meta?.optimizations).toContain("pagination");

      // Should have significant size reduction (complex data with metadata)
      expect(result._meta?.compression?.compressionRatio).toBeGreaterThan(3);

      // Should respect pagination
      expect(result.data).toHaveLength(20);
    });

    test("preserves data integrity during optimization", () => {
      const originalData = {
        critical: {
          value: 42,
          nested: {
            important: "data",
          },
        },
        optional: null,
      };

      const result = optimizer.optimize(originalData);

      // Critical data should be preserved
      expect((result.data as any).critical.value).toBe(42);
      expect((result.data as any).critical.nested.important).toBe("data");

      // Optional null should be removed
      expect(result.data).not.toHaveProperty("optional");
    });
  });

  describe("Utility Functions", () => {
    test("creates scripture field filters", () => {
      const filter = OptimizationUtils.scriptureFields(true);

      expect(filter.include).toContain("text");
      expect(filter.include).toContain("reference");
      expect(filter.include).toContain("alignment");
      expect(filter.nested).toBe(true);
    });

    test("creates translation notes field filters", () => {
      const filter = OptimizationUtils.translationNotesFields(false);

      expect(filter.include).toContain("note");
      expect(filter.include).toContain("reference");
      expect(filter.include).not.toContain("originalWords");
    });

    test("creates mobile pagination options", () => {
      const pagination = OptimizationUtils.mobilePagination(2);

      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(20); // Mobile-friendly size
    });

    test("parses fields from query parameters", () => {
      const query = new URLSearchParams("fields=name,email&exclude=password,role");
      const filter = OptimizationUtils.parseFieldsFromQuery(query);

      expect(filter?.include).toEqual(["name", "email"]);
      expect(filter?.exclude).toEqual(["password", "role"]);
    });

    test("parses pagination from query parameters", () => {
      const query = new URLSearchParams("page=3&limit=25");
      const pagination = OptimizationUtils.parsePaginationFromQuery(query);

      expect(pagination?.page).toBe(3);
      expect(pagination?.limit).toBe(25);
    });
  });

  describe("Performance Requirements", () => {
    test("achieves >50% reduction in payload size", () => {
      const bloatedData = {
        data: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`,
          metadata: null,
          debug: undefined,
          internal: `internal-${i}`,
          temporary: null,
          cache: undefined,
          extra: {
            unused: null,
            verbose: `Very long verbose description that takes up space ${i}`,
            null_field: null,
          },
        })),
      };

      const result = optimizer.optimize(bloatedData, {
        fieldFilter: {
          exclude: ["internal", "debug", "temporary", "cache", "verbose"],
        },
      });

      expect(result._meta?.compression?.compressionRatio).toBeGreaterThan(25);
    });

    test("optimization completes in reasonable time", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `Content ${i}`,
        extra: null,
      }));

      const startTime = Date.now();
      optimizer.optimize(largeData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    test("handles memory efficiently with large datasets", () => {
      const veryLargeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        content: `Item ${i}`,
        nullable: i % 2 === 0 ? null : "value",
      }));

      // Should not throw memory errors
      expect(() => {
        const result = optimizer.optimize(veryLargeData, {
          pagination: { page: 1, limit: 100 },
        });
        expect(result.data).toHaveLength(100);
      }).not.toThrow();
    });
  });

  describe("Middleware Integration", () => {
    test("middleware creates optimized responses", () => {
      const middleware = createOptimizationMiddleware(optimizer);
      const query = new URLSearchParams("fields=id,name&page=1&limit=5");

      const testData = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        secret: "hidden",
      }));

      const result = middleware(testData, query, "listResponses");

      expect(result.data).toHaveLength(5);
      expect((result.data as any)[0]).not.toHaveProperty("secret");
      expect(result._meta?.pagination?.page).toBe(1);
    });

    test("default optimizer is functional", () => {
      const testData = { value: "test", null: null };
      const result = defaultOptimizer.optimize(testData);

      expect(result.data).toEqual({ value: "test" });
      expect(result._meta?.optimizations).toContain("null-removal");
    });
  });

  describe("Configuration Options", () => {
    test("respects disabled optimizations", () => {
      const conservativeOptimizer = new ResponseOptimizer({
        removeNullFields: false,
        compressRepeated: false,
        enableFieldFiltering: false,
      });

      const testData = { value: "test", null: null };
      const result = conservativeOptimizer.optimize(testData);

      expect(result.data).toEqual(testData); // No changes
      expect(result._meta?.optimizations).toHaveLength(0);
    });

    test("can update size targets", () => {
      const customTargets = { scripture: 5000 }; // 5KB instead of 10KB
      optimizer.updateSizeTargets(customTargets);

      const targets = optimizer.getSizeTargets();
      expect(targets.scripture).toBe(5000);
    });

    test("handles deep nesting limits", () => {
      const deeplyNested = {
        level1: { level2: { level3: { level4: { value: "deep", null: null } } } },
      };

      const shallowOptimizer = new ResponseOptimizer({
        maxNestingDepth: 2,
      });

      const result = shallowOptimizer.optimize(deeplyNested);

      // Should still process but respect depth limits
      expect(result.data).toBeDefined();
    });
  });
});
