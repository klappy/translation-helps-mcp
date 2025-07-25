/**
 * Real Data Validation Tests
 *
 * These tests validate that endpoints return actual, accurate data
 * not just 200 OK responses. They check the content of responses
 * against known good values.
 */

import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:8788";

describe("Real Data Validation", () => {
  describe("Scripture Endpoints", () => {
    it("should return actual scripture text for John 3:16", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-scripture?reference=John+3:16&language=en&version=ult`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBeDefined();
      expect(data.text.length).toBeGreaterThan(50); // Real verse should be substantial
      expect(data.text).toContain("God");
      expect(data.text).toContain("loved");
      expect(data.text).toContain("world");
      expect(data.reference).toBe("John 3:16");
      expect(data.version).toBe("ult");
    });

    it("should handle verse ranges properly", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-scripture?reference=Genesis+1:1-3&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toContain("beginning");
      expect(data.text).toContain("God created");
      expect(data.text).toContain("light");
      expect(data.text.split(".").length).toBeGreaterThan(2); // Should have multiple sentences
    });

    it("should handle full chapters", async () => {
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=Psalm+23&language=en`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toContain("shepherd");
      expect(data.text).toContain("valley");
      expect(data.text.length).toBeGreaterThan(500); // Full chapter should be long
    });
  });

  describe("Translation Notes", () => {
    it("should return actual translation notes for Genesis 1:1", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-translation-notes?reference=Genesis+1:1&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBe(true);
      expect(data.notes.length).toBeGreaterThan(0);

      const firstNote = data.notes[0];
      expect(firstNote.title).toBeDefined();
      expect(firstNote.content).toBeDefined();
      expect(firstNote.content.length).toBeGreaterThan(10); // Real note should have content
    });

    it("should include links to tA articles", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-translation-notes?reference=Genesis+1:1&language=en`
      );
      const data = await response.json();

      const notesWithLinks = data.notes.filter((note) => note.links && note.links.length > 0);
      expect(notesWithLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Translation Words", () => {
    it('should return full article for "faith"', async () => {
      const response = await fetch(`${BASE_URL}/get-translation-word?word=faith&language=en`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.word).toBe("faith");
      expect(data.definition).toBeDefined();
      expect(data.definition).toContain("faith");
      expect(data.definition).toContain("Definition");
      expect(data.definition.length).toBeGreaterThan(100); // Full article should be substantial
    });

    it("should handle word variations", async () => {
      const response = await fetch(`${BASE_URL}/get-translation-word?word=love&language=en`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definition).toContain("love");
      // Should include related forms
      expect(data.definition.toLowerCase()).toMatch(/love|loved|loving|beloved/);
    });
  });

  describe("Translation Word Links", () => {
    it("should map verses to translation words", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-translation-word-links?reference=Genesis+1:1&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.links)).toBe(true);
      expect(data.links.length).toBeGreaterThan(0);

      const link = data.links[0];
      expect(link.reference).toBe("Genesis 1:1");
      expect(link.words).toBeDefined();
      expect(Array.isArray(link.words)).toBe(true);
      expect(link.words).toContain("god");
      expect(link.words).toContain("create");
    });

    it("should not be a browsable resource", async () => {
      // tWL should only work with specific references, not browsing
      const response = await fetch(`${BASE_URL}/browse-translation-word-links?language=en`);
      expect(response.status).toBe(404); // This endpoint should not exist
    });
  });

  describe("Translation Questions", () => {
    it("should return comprehension questions with answers", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-translation-questions?reference=Genesis+1:1&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);

      if (data.questions.length > 0) {
        const question = data.questions[0];
        expect(question.question).toBeDefined();
        expect(question.answer).toBeDefined();
        expect(question.question.endsWith("?")).toBe(true);
      }
    });
  });

  describe("Context Endpoints", () => {
    it("should aggregate multiple resources", async () => {
      const response = await fetch(`${BASE_URL}/get-context?reference=John+3:16&language=en`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scripture).toBeDefined();
      expect(data.notes).toBeDefined();
      expect(data.words).toBeDefined();

      // Verify each component has real data
      expect(data.scripture.text).toContain("God");
      expect(data.notes.length).toBeGreaterThan(0);
      expect(data.words.length).toBeGreaterThan(0);
    });

    it("should get all words for a reference", async () => {
      const response = await fetch(
        `${BASE_URL}/get-words-for-reference?reference=John+3:16&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.words).toBeDefined();
      expect(Array.isArray(data.words)).toBe(true);

      // Should have definitions for key words
      const godWord = data.words.find((w) => w.word.toLowerCase() === "god");
      expect(godWord).toBeDefined();
      expect(godWord.definition).toContain("God");
      expect(godWord.definition).toContain("Definition");
    });
  });

  describe("Discovery Endpoints", () => {
    it("should list available languages", async () => {
      const response = await fetch(`${BASE_URL}/get-languages`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);

      // Should have English
      const english = data.items.find((lang) => lang.code === "en");
      expect(english).toBeDefined();
      expect(english.name).toBe("English");
    });

    it("should list books per resource correctly", async () => {
      const response = await fetch(`${BASE_URL}/get-available-books?language=en&resource=ult`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(data.items.length).toBeGreaterThan(50); // Should have most Bible books

      // Check for key books
      const genesis = data.items.find((book) => book.id.toLowerCase() === "gen");
      const matthew = data.items.find((book) => book.id.toLowerCase() === "mat");
      expect(genesis).toBeDefined();
      expect(matthew).toBeDefined();
    });
  });

  describe("Performance Requirements", () => {
    it("should respond within target time for single verse", async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=John+3:16&language=en`);
      await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300); // Target: <300ms for single verse
    });

    it("should use cache for repeated requests", async () => {
      // First request - might be slow
      await fetch(`${BASE_URL}/fetch-scripture?reference=Romans+8:28&language=en`);

      // Second request - should be cached
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/fetch-scripture?reference=Romans+8:28&language=en`);
      const data = await response.json();
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // Cached response should be <100ms
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid references gracefully", async () => {
      const response = await fetch(
        `${BASE_URL}/fetch-scripture?reference=InvalidBook+99:99&language=en`
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
    });

    it("should handle missing parameters", async () => {
      const response = await fetch(`${BASE_URL}/fetch-scripture?language=en`); // Missing reference
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.message).toContain("reference");
    });
  });
});
