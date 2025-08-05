/**
 * Advanced Filter Test Suite
 *
 * Tests the sophisticated filtering capabilities for UW resources.
 * Created for Task 9 validation
 */

import { describe, expect, test } from "vitest";
import { ResourceType } from "../src/constants/terminology";
import {
  createFilterPreset,
  filterResources,
  type FilterCriteria,
} from "../src/functions/advanced-filter";
import type { Resource } from "../src/types/dcs";

const createMockResource = (overrides: Partial<Resource> = {}): Resource => ({
  id: 1,
  name: "test_resource",
  full_name: "Test Resource",
  description: "Test description",
  language: "en",
  size: 1000000,
  updated_at: "2024-01-01T00:00:00Z",
  owner: {
    id: 1,
    username: "unfoldingWord",
    login: "unfoldingWord",
    full_name: "unfoldingWord",
    email: "test@example.com",
    avatar_url: "",
    language: "en",
    is_admin: false,
    last_login: "2024-01-01T00:00:00Z",
    created: "2024-01-01T00:00:00Z",
    restricted: false,
    active: true,
    prohibit_login: false,
    location: "",
    website: "",
    description: "",
    visibility: "public",
    followers_count: 0,
    following_count: 0,
    starred_repos_count: 0,
  },
  empty: false,
  private: false,
  fork: false,
  template: false,
  mirror: false,
  languages_url: "",
  html_url: "",
  ssh_url: "",
  clone_url: "",
  original_url: "",
  website: "",
  stars_count: 0,
  forks_count: 0,
  watchers_count: 0,
  open_issues_count: 0,
  open_pr_counter: 0,
  release_counter: 0,
  default_branch: "main",
  archived: false,
  created_at: "2024-01-01T00:00:00Z",
  permissions: { admin: false, push: false, pull: true },
  has_issues: false,
  internal_tracker: {
    enable_time_tracker: false,
    allow_only_contributors_to_track_time: false,
    enable_issue_dependencies: false,
  },
  has_wiki: false,
  has_pull_requests: false,
  has_projects: false,
  ...overrides,
});

const mockResources: Resource[] = [
  createMockResource({
    name: "en_ult",
    description: "English unfoldingWord Literal Text with word alignment",
    language: "en",
    size: 5000000,
  }),
  createMockResource({
    name: "en_ust",
    description: "English unfoldingWord Simplified Text",
    language: "en",
    size: 4500000,
  }),
  createMockResource({
    name: "es_ult",
    description: "Spanish unfoldingWord Literal Text",
    language: "es",
    size: 4000000,
    updated_at: "2024-06-01T00:00:00Z",
  }),
  createMockResource({
    name: "en_tn",
    description: "English Translation Notes",
    language: "en",
    size: 2000000,
  }),
  createMockResource({
    name: "random_resource",
    description: "Some random resource",
    language: "xyz",
    size: 100000,
    owner: { ...createMockResource().owner, username: "randomuser" },
  }),
];

describe("Advanced Resource Filtering", () => {
  describe("filterResources", () => {
    test("filters by language correctly", async () => {
      const criteria: FilterCriteria = {
        language: "en",
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.resources.length).toBeGreaterThan(0);
      result.resources.forEach((item) => {
        expect(item.resource.language).toBe("en");
      });
    });

    test("filters by multiple resource types", async () => {
      const criteria: FilterCriteria = {
        resourceTypes: [ResourceType.ULT, ResourceType.UST],
        language: "en",
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.resources.length).toBeGreaterThan(0);
      result.resources.forEach((item) => {
        expect([ResourceType.ULT, ResourceType.UST]).toContain(item.detection.type);
      });
    });

    test("filters by minimum size", async () => {
      const criteria: FilterCriteria = {
        minSize: 3000000,
      };

      const result = await filterResources(mockResources, criteria);

      result.resources.forEach((item) => {
        expect(item.resource.size).toBeGreaterThanOrEqual(3000000);
      });
    });

    test("searches by text in description", async () => {
      const criteria: FilterCriteria = {
        searchText: "alignment",
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.resources.length).toBeGreaterThan(0);
      result.resources.forEach((item) => {
        expect(
          item.resource.description?.toLowerCase().includes("alignment") ||
            item.resource.name?.toLowerCase().includes("alignment")
        ).toBe(true);
      });
    });

    test("applies multiple filters correctly", async () => {
      const criteria: FilterCriteria = {
        language: "en",
        minSize: 2000000,
        hasDescription: true,
      };

      const result = await filterResources(mockResources, criteria);

      result.resources.forEach((item) => {
        expect(item.resource.language).toBe("en");
        expect(item.resource.size).toBeGreaterThanOrEqual(2000000);
        expect(item.resource.description).toBeTruthy();
        expect(item.resource.description!.length).toBeGreaterThan(10);
      });
    });

    test("sorts by relevance score", async () => {
      const criteria: FilterCriteria = {
        language: "en",
        sortBy: "relevance",
        sortOrder: "desc",
      };

      const result = await filterResources(mockResources, criteria);

      // Check that results are sorted by relevance (descending)
      for (let i = 0; i < result.resources.length - 1; i++) {
        expect(result.resources[i].relevanceScore).toBeGreaterThanOrEqual(
          result.resources[i + 1].relevanceScore
        );
      }
    });

    test("provides performance metrics", async () => {
      const criteria: FilterCriteria = {
        language: "en",
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.performance).toBeDefined();
      expect(result.performance.processingTimeMs).toBeGreaterThan(0);
      expect(result.performance.resourcesProcessed).toBe(mockResources.length);
      expect(result.performance.filtersApplied).toContain("language");
    });

    test("generates suggestions for sparse results", async () => {
      const criteria: FilterCriteria = {
        language: "nonexistent",
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.alternativeLanguages).toBeInstanceOf(Array);
    });
  });

  describe("createFilterPreset", () => {
    test("creates complete translation kit preset", () => {
      const preset = createFilterPreset("complete-translation-kit", "en");

      expect(preset.language).toBe("en");
      expect(preset.resourceTypes).toEqual(["ult", "ust", "tn", "tw", "tq"]);
      expect(preset.onlyRecommended).toBe(true);
      expect(preset.minConfidence).toBe(0.8);
    });

    test("creates scripture texts preset", () => {
      const preset = createFilterPreset("scripture-texts", "es");

      expect(preset.language).toBe("es");
      expect(preset.resourceTypes).toEqual(["ult", "ust", "glt", "gst"]);
      expect(preset.hasWordAlignment).toBe(true);
      expect(preset.minSize).toBe(1000000);
    });

    test("creates strategic languages preset", () => {
      const preset = createFilterPreset("strategic-languages");

      expect(preset.strategicLanguageOnly).toBe(true);
      expect(preset.onlyRecommended).toBe(true);
      expect(preset.minConfidence).toBe(0.7);
      expect(preset.updatedAfter).toBeDefined();
    });

    test("creates default preset for unknown type", () => {
      const preset = createFilterPreset("unknown-preset");

      expect(preset.sortBy).toBe("relevance");
      expect(preset.limit).toBe(50);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty resource list", async () => {
      const criteria: FilterCriteria = {
        language: "en",
      };

      const result = await filterResources([], criteria);

      expect(result.resources).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.performance.resourcesProcessed).toBe(0);
    });

    test("handles empty filter criteria", async () => {
      const result = await filterResources(mockResources, {});

      expect(result.resources.length).toBe(mockResources.length);
      expect(result.totalFound).toBe(mockResources.length);
    });

    test("handles pagination correctly", async () => {
      const criteria: FilterCriteria = {
        limit: 2,
        offset: 1,
      };

      const result = await filterResources(mockResources, criteria);

      expect(result.resources.length).toBeLessThanOrEqual(2);
      expect(result.totalFound).toBeGreaterThan(result.resources.length);
    });
  });
});
