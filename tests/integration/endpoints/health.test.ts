/**
 * Health Endpoint Tests
 *
 * Simple, focused tests following the 80/20 rule.
 * Test what matters, skip the edge cases.
 */

import { describe, expect, it } from "vitest";
import { makeRequest } from "../../test-utils";

describe("Health Endpoints", () => {
  describe("GET /api/health", () => {
    it("returns healthy status", async () => {
      const response = await makeRequest("/api/health");

      expect(response.status).toBe(200);
      expect(response.data.status).toBe("healthy");
      expect(response.data.version).toBeDefined();
      expect(response.data.timestamp).toBeDefined();
    });
  });

  describe("GET /api/health-dcs", () => {
    it("checks DCS connectivity", async () => {
      const response = await makeRequest("/api/health-dcs");

      expect(response.status).toBe(200);
      expect(response.data.status).toMatch(/healthy|degraded/);
      expect(response.data.dcsStatus).toBeDefined();
    });
  });
});

// That's it! Simple, clear, and tests what users care about.
