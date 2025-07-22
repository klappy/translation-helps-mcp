/**
 * Resource Detector Test Suite
 *
 * Tests the UW resource type detection system.
 * Created for Task 7 validation
 */

import { describe, expect, test } from "vitest";
import { ResourceType } from "../src/constants/terminology";
import { detectResourceType } from "../src/functions/resource-detector";
import type { Resource } from "../src/types/dcs";

const createMockResource = (name: string, description: string): Resource => ({
  id: 1,
  name,
  full_name: `Test ${name}`,
  description,
  owner: {
    id: 1,
    username: "test",
    login: "test",
    full_name: "Test User",
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
  size: 1000,
  language: "en",
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
  updated_at: "2024-01-01T00:00:00Z",
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
});

describe("Resource Type Detection", () => {
  test("detects ULT resources correctly", () => {
    const resource = createMockResource("en_ult", "unfoldingWord Literal Text");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.ULT);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("detects UST resources correctly", () => {
    const resource = createMockResource("en_ust", "unfoldingWord Simplified Text");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.UST);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("detects Translation Notes correctly", () => {
    const resource = createMockResource("en_tn", "Translation Notes for guidance");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.TN);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("detects Translation Words correctly", () => {
    const resource = createMockResource("en_tw", "Translation Words definitions");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.TW);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("detects Translation Questions correctly", () => {
    const resource = createMockResource("en_tq", "Translation Questions for checking");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.TQ);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("returns null for unrecognized resources", () => {
    const resource = createMockResource("unknown_thing", "Some random resource");
    const result = detectResourceType(resource);

    expect(result.type).toBe(null);
    expect(result.confidence).toBe(0);
  });

  test("handles case insensitive matching", () => {
    const resource = createMockResource("EN_ULT", "English ULT text");
    const result = detectResourceType(resource);

    expect(result.type).toBe(ResourceType.ULT);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("prioritizes identifier over description matches", () => {
    const resource = createMockResource("en_ult", "Contains translation notes");
    const result = detectResourceType(resource);

    // Should detect as ULT based on identifier, not TN based on description
    expect(result.type).toBe(ResourceType.ULT);
  });
});
