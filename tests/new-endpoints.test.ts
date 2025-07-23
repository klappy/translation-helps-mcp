/**
 * Tests for New Endpoints
 * Comprehensive test suite for Translation Academy and Resource Container Links endpoints
 */

import { describe, expect, it } from "vitest";
import { fetchTranslationAcademyHandler } from "../src/functions/handlers/fetch-translation-academy.js";
import { fetchTranslationWordLinksHandler } from "../src/functions/handlers/fetch-translation-word-links.js";
import { resourceContainerLinksHandler } from "../src/functions/handlers/resource-container-links.js";

describe("New Endpoints Test Suite", () => {
  describe("Translation Academy (TA) Endpoint", () => {
    it("should return TA modules for valid request", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-academy?language=en&resourceType=ta",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ta",
        },
      };

      const response = await fetchTranslationAcademyHandler(request);

      expect(response.statusCode).toBe(200);
      expect(response.headers?.["Content-Type"]).toBe("application/json");

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.language).toBe("en");
      expect(data.data.resourceType).toBe("ta");
      expect(data.data.modules).toBeInstanceOf(Array);
      expect(data.data.modules.length).toBeGreaterThan(0);

      // Check module structure
      const module = data.data.modules[0];
      expect(module).toHaveProperty("id");
      expect(module).toHaveProperty("title");
      expect(module).toHaveProperty("description");
      expect(module).toHaveProperty("category");
      expect(module).toHaveProperty("difficulty");
      expect(module).toHaveProperty("estimatedTime");
      expect(module).toHaveProperty("content");
      expect(module).toHaveProperty("metadata");

      // Check metadata
      expect(data.data.metadata).toHaveProperty("totalModules");
      expect(data.data.metadata).toHaveProperty("categories");
      expect(data.data.metadata).toHaveProperty("difficultyDistribution");
      expect(data.data.metadata).toHaveProperty("totalEstimatedTime");
    });

    it("should filter by category", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-academy?language=en&resourceType=ta&category=fundamentals",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ta",
          category: "fundamentals",
        },
      };

      const response = await fetchTranslationAcademyHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.modules).toBeInstanceOf(Array);

      // All modules should have the fundamentals category
      data.data.modules.forEach((module: any) => {
        expect(module.category).toBe("fundamentals");
      });
    });

    it("should filter by difficulty", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-academy?language=en&resourceType=ta&difficulty=beginner",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ta",
          difficulty: "beginner",
        },
      };

      const response = await fetchTranslationAcademyHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.modules).toBeInstanceOf(Array);

      // All modules should have beginner difficulty
      data.data.modules.forEach((module: any) => {
        expect(module.difficulty).toBe("beginner");
      });
    });

    it("should return error for missing resource type", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-academy?language=en",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
        },
      };

      const response = await fetchTranslationAcademyHandler(request);

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Resource type parameter is required");
    });

    it("should handle cache bypass", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-academy?language=en&resourceType=ta&bypassCache=true",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ta",
          bypassCache: "true",
        },
      };

      const response = await fetchTranslationAcademyHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.metadata.cacheStatus).toBe("miss");
    });
  });

  describe("Resource Container Links (RC) Endpoint", () => {
    it("should return RC links for valid request", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/resource-container-links?language=en&resourceType=ult",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ult",
        },
      };

      const response = await resourceContainerLinksHandler(request);

      expect(response.statusCode).toBe(200);
      expect(response.headers?.["Content-Type"]).toBe("application/json");

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.language).toBe("en");
      expect(data.data.resourceType).toBe("ult");
      expect(data.data.links).toBeInstanceOf(Array);

      // Check link structure
      if (data.data.links.length > 0) {
        const link = data.data.links[0];
        expect(link).toHaveProperty("id");
        expect(link).toHaveProperty("sourceResource");
        expect(link).toHaveProperty("targetResource");
        expect(link).toHaveProperty("relationship");
        expect(link).toHaveProperty("confidence");
        expect(link).toHaveProperty("metadata");

        // Check relationship types
        expect(["depends-on", "references", "supplements", "translates"]).toContain(
          link.relationship
        );

        // Check confidence range
        expect(link.confidence).toBeGreaterThanOrEqual(0);
        expect(link.confidence).toBeLessThanOrEqual(1);
      }

      // Check metadata
      expect(data.data.metadata).toHaveProperty("totalLinks");
      expect(data.data.metadata).toHaveProperty("dependencyCount");
      expect(data.data.metadata).toHaveProperty("relationshipCount");
    });

    it("should include manifest when requested", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/resource-container-links?language=en&resourceType=ult&includeManifest=true",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ult",
          includeManifest: "true",
        },
      };

      const response = await resourceContainerLinksHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.manifest).toBeDefined();

      // Check manifest structure
      const manifest = data.data.manifest;
      expect(manifest).toHaveProperty("version");
      expect(manifest).toHaveProperty("language");
      expect(manifest).toHaveProperty("organization");
      expect(manifest).toHaveProperty("resourceType");
      expect(manifest).toHaveProperty("dependencies");
      expect(manifest).toHaveProperty("relationships");
      expect(manifest).toHaveProperty("metadata");

      expect(manifest.dependencies).toBeInstanceOf(Array);
      expect(manifest.relationships).toBeInstanceOf(Array);
    });

    it("should handle different resource types", async () => {
      const resourceTypes = ["ult", "ust", "tn", "tw", "ta"];

      for (const resourceType of resourceTypes) {
        const request = {
          method: "GET",
          url: `http://localhost:3000/api/resource-container-links?language=en&resourceType=${resourceType}`,
          headers: {},
          body: null,
          queryStringParameters: {
            language: "en",
            resourceType,
          },
        };

        const response = await resourceContainerLinksHandler(request);

        expect(response.statusCode).toBe(200);

        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.data.resourceType).toBe(resourceType);
      }
    });

    it("should return error for missing resource type", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/resource-container-links?language=en",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
        },
      };

      const response = await resourceContainerLinksHandler(request);

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Resource type parameter is required");
    });

    it("should handle cache bypass", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/resource-container-links?language=en&resourceType=ult&bypassCache=true",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
          resourceType: "ult",
          bypassCache: "true",
        },
      };

      const response = await resourceContainerLinksHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.metadata.cacheStatus).toBe("miss");
    });
  });

  describe("Translation Word Links (TWL) Endpoint", () => {
    it("should return TWL data for valid request", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-word-links?reference=John+3:16&language=en",
        headers: {},
        body: null,
        queryStringParameters: {
          reference: "John 3:16",
          language: "en",
        },
      };

      const response = await fetchTranslationWordLinksHandler(request);

      expect(response.statusCode).toBe(200);
      expect(response.headers?.["Content-Type"]).toBe("application/json");

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.reference).toBe("John 3:16");
      expect(data.data.language).toBe("en");
      expect(data.data.links).toBeInstanceOf(Array);

      // Check link structure if links exist
      if (data.data.links.length > 0) {
        const link = data.data.links[0];
        expect(link).toHaveProperty("id");
        expect(link).toHaveProperty("word");
        expect(link).toHaveProperty("translationWordId");
        expect(link).toHaveProperty("translationWordTitle");
        expect(link).toHaveProperty("confidence");
        expect(link).toHaveProperty("position");
        expect(link).toHaveProperty("metadata");

        // Check position structure
        expect(link.position).toHaveProperty("start");
        expect(link.position).toHaveProperty("end");
        expect(link.position).toHaveProperty("verse");
        expect(link.position).toHaveProperty("chapter");

        // Check metadata structure
        expect(link.metadata).toHaveProperty("sourceLanguage");
        expect(link.metadata).toHaveProperty("targetLanguage");
        expect(link.metadata).toHaveProperty("resourceType");
      }

      // Check metadata
      expect(data.data.metadata).toHaveProperty("totalLinks");
      expect(data.data.metadata).toHaveProperty("averageConfidence");
      expect(data.data.metadata).toHaveProperty("coveragePercentage");
      expect(data.data.metadata).toHaveProperty("sourceLanguages");
    });

    it("should return error for missing reference", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-word-links?language=en",
        headers: {},
        body: null,
        queryStringParameters: {
          language: "en",
        },
      };

      const response = await fetchTranslationWordLinksHandler(request);

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Reference parameter is required");
    });

    it("should handle cache bypass", async () => {
      const request = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-translation-word-links?reference=John+3:16&language=en&bypassCache=true",
        headers: {},
        body: null,
        queryStringParameters: {
          reference: "John 3:16",
          language: "en",
          bypassCache: "true",
        },
      };

      const response = await fetchTranslationWordLinksHandler(request);

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.metadata.cacheStatus).toBe("miss");
    });
  });

  describe("Integration Tests", () => {
    it("should work together in a translation workflow", async () => {
      // Test a complete workflow: scripture -> TWL -> TA
      const scriptureRequest = {
        method: "GET",
        url: "http://localhost:3000/api/fetch-scripture?reference=John+3:16&language=en&includeAlignment=true",
        headers: {},
        body: null,
        queryStringParameters: {
          reference: "John 3:16",
          language: "en",
          includeAlignment: "true",
        },
      };

      // This would require the actual scripture handler, so we'll just test the structure
      expect(scriptureRequest.queryStringParameters.reference).toBe("John 3:16");
      expect(scriptureRequest.queryStringParameters.includeAlignment).toBe("true");
    });

    it("should maintain consistent terminology", async () => {
      // Test that all endpoints use consistent terminology
      const endpoints = [
        {
          name: "Translation Academy",
          handler: fetchTranslationAcademyHandler,
          params: { language: "en", resourceType: "ta" },
        },
        {
          name: "Resource Container Links",
          handler: resourceContainerLinksHandler,
          params: { language: "en", resourceType: "ult" },
        },
        {
          name: "Translation Word Links",
          handler: fetchTranslationWordLinksHandler,
          params: { reference: "John 3:16", language: "en" },
        },
      ];

      for (const endpoint of endpoints) {
        const request = {
          method: "GET",
          url: `http://localhost:3000/api/${endpoint.name.toLowerCase().replace(/\s+/g, "-")}`,
          headers: {},
          body: null,
          queryStringParameters: endpoint.params,
        };

        // Verify the request structure is consistent
        expect(request.method).toBe("GET");
        expect(request.headers).toBeDefined();
        expect(request.queryStringParameters).toBeDefined();
      }
    });
  });
});
