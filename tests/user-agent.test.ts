import { describe, test, expect, vi } from "vitest";
import { USER_AGENT, createProxyFetch } from "../src/utils/httpClient.js";

describe("User-Agent Configuration", () => {
  test("USER_AGENT has correct format", () => {
    expect(USER_AGENT).toMatch(/^Translation-Helps-MCP\/\d+\.\d+\.\d+/);
    expect(USER_AGENT).toContain(
      "Bible translation resource aggregator for LLM tools",
    );
    expect(USER_AGENT).toContain(
      "https://github.com/klappy/translation-helps-mcp",
    );
    expect(USER_AGENT).toContain("contact=klappy@github.com");
  });

  test("proxyFetch adds User-Agent header", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedFetch = createProxyFetch(mockFetch);

    await wrappedFetch("https://example.com");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers.get("User-Agent")).toBe(USER_AGENT);
  });

  test("proxyFetch preserves existing headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    const wrappedFetch = createProxyFetch(mockFetch);

    await wrappedFetch("https://example.com", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      },
    });

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers;

    expect(headers.get("User-Agent")).toBe(USER_AGENT);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token123");
  });

  test("DCS API calls include proper user-agent", async () => {
    // This test verifies the DCSApiClient uses our USER_AGENT
    const { DCSApiClient } = await import("../src/services/DCSApiClient.js");
    const client = new DCSApiClient();

    // Access the private userAgent property through type assertion
    const userAgent = (client as unknown as { userAgent: string }).userAgent;
    expect(userAgent).toBe(USER_AGENT);
  });
});
