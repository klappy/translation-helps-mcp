/**
 * Comprehensive Endpoint Validation Tests
 *
 * These tests validate ACTUAL CONTENT from endpoints, not just status codes.
 * Every test verifies that the data returned matches what's in DCS.
 *
 * NO MORE BOGUS DATA!
 */

import { afterAll, describe, expect, it } from "vitest";

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8176";
const TIMEOUT = 30000;

// Known good data from DCS - these are the expected values
const KNOWN_GOOD_DATA = {
  scripture: {
    "John 3:16": {
      ult: "For God so loved the world that he gave his only Son, so that everyone who believes in him will not perish but have eternal life.",
      ust: "God loved all the people in the world in this way: He gave his only Son to die for them in order that everyone who trusts in him would not perish. Instead, they would have eternal life.",
    },
    "Titus 1:1": {
      ult: "Paul, a servant of God and an apostle of Jesus Christ, for the faith of the chosen people of God and the knowledge of the truth that agrees with godliness,",
      ust: "I, Paul, write this letter to you, Titus. I serve God and I am an apostle of Jesus Christ. God sent me to strengthen the faith of those whom he has chosen and to teach them the truth about godly living.",
    },
  },
  translationNotes: {
    "John 3:16": {
      expectedPhrases: ["loved the world", "only Son", "eternal life", "believes in him"],
      minNoteCount: 4,
    },
  },
  translationWords: {
    love: {
      expectedInDefinition: ["agape", "affection", "care", "God"],
      expectedInExamples: ["John 3:16", "1 John 4:8"],
    },
    faith: {
      expectedInDefinition: ["trust", "believe", "confidence"],
      expectedInExamples: ["Hebrews 11:1", "Romans 1:17"],
    },
  },
};

// Helper to make API calls
async function callEndpoint(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${BASE_URL}/api/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  console.log(`📡 Calling: ${url.toString()}`);
  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

describe("Scripture Endpoint Validation", () => {
  it("should return ACTUAL John 3:16 text from ULT", async () => {
    const result = await callEndpoint("fetch-scripture", {
      reference: "John 3:16",
      language: "en",
      version: "ult",
    });

    // Validate structure
    expect(result).toHaveProperty("data");
    expect(result.data).toHaveProperty("text");

    // VALIDATE ACTUAL CONTENT
    const actualText = result.data.text;
    const expectedText = KNOWN_GOOD_DATA.scripture["John 3:16"].ult;

    // Check if it's the real verse
    expect(actualText).toContain("God");
    expect(actualText).toContain("loved");
    expect(actualText).toContain("world");
    expect(actualText).toContain("only Son");
    expect(actualText).toContain("eternal life");

    // Make sure it's not placeholder
    expect(actualText).not.toContain("Lorem ipsum");
    expect(actualText).not.toContain("TODO");
    expect(actualText).not.toContain("placeholder");
    expect(actualText).not.toBe("");

    // Similarity check - should be at least 80% similar
    const similarity = calculateSimilarity(actualText, expectedText);
    expect(similarity).toBeGreaterThan(0.8);

    console.log(`✅ Scripture validation passed: ${similarity * 100}% match`);
  });

  it("should return ACTUAL Titus 1:1 text from UST", async () => {
    const result = await callEndpoint("fetch-ust-scripture", {
      reference: "Titus 1:1",
      language: "en",
    });

    const actualText = result.data?.text || "";

    // Check for key UST phrases
    expect(actualText).toContain("Paul");
    expect(actualText).toContain("Titus");
    expect(actualText).toContain("serve God");
    expect(actualText).toContain("apostle");

    // Not empty or placeholder
    expect(actualText.length).toBeGreaterThan(50);
  });

  it("should handle verse ranges correctly", async () => {
    const result = await callEndpoint("fetch-scripture", {
      reference: "John 3:16-17",
      language: "en",
      version: "ult",
    });

    const text = result.data?.text || "";

    // Should contain both verses
    expect(text).toContain("God so loved");
    expect(text).toContain("condemn the world"); // from v17

    // Should be longer than single verse
    expect(text.length).toBeGreaterThan(KNOWN_GOOD_DATA.scripture["John 3:16"].ult.length);
  });
});

describe("Translation Notes Validation", () => {
  it("should return REAL translation notes for John 3:16", async () => {
    const result = await callEndpoint("fetch-translation-notes", {
      reference: "John 3:16",
      language: "en",
    });

    expect(result).toHaveProperty("data");
    const notes = result.data?.notes || result.data || [];

    // Should have multiple notes
    expect(Array.isArray(notes)).toBe(true);
    expect(notes.length).toBeGreaterThan(
      KNOWN_GOOD_DATA.translationNotes["John 3:16"].minNoteCount
    );

    // Each note should have real content
    notes.forEach((note: any) => {
      expect(note).toHaveProperty("phrase");
      expect(note).toHaveProperty("note");
      expect(note.note).not.toBe("");
      expect(note.note).not.toContain("TODO");
      expect(note.note).not.toContain("placeholder");
    });

    // Check for expected phrases
    const phrases = notes.map((n: any) => n.phrase);
    const expectedPhrases = KNOWN_GOOD_DATA.translationNotes["John 3:16"].expectedPhrases;

    const foundPhrases = expectedPhrases.filter((ep) =>
      phrases.some((p: string) => p.includes(ep))
    );

    expect(foundPhrases.length).toBeGreaterThan(2); // At least 3 of 4 expected phrases

    console.log(`✅ Found ${notes.length} real translation notes`);
  });
});

describe("Translation Words Validation", () => {
  it('should return REAL definition for "love"', async () => {
    const result = await callEndpoint("get-translation-word", {
      word: "love",
      language: "en",
    });

    const definition = result.data?.definition || "";
    const examples = result.data?.examples || [];

    // Check definition contains expected terms
    KNOWN_GOOD_DATA.translationWords.love.expectedInDefinition.forEach((term) => {
      expect(definition.toLowerCase()).toContain(term.toLowerCase());
    });

    // Check examples
    expect(Array.isArray(examples)).toBe(true);
    expect(examples.length).toBeGreaterThan(0);

    // Verify not placeholder
    expect(definition).not.toContain("Lorem ipsum");
    expect(definition.length).toBeGreaterThan(50);
  });

  it("should browse translation words correctly", async () => {
    const result = await callEndpoint("browse-translation-words", {
      language: "en",
      category: "kt",
    });

    const words = result.data?.words || result.data || [];

    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(10); // Should have many key terms

    // Check structure
    words.forEach((word: any) => {
      expect(word).toHaveProperty("word");
      expect(word).toHaveProperty("category");
      expect(word).toHaveProperty("path");
    });

    // Check for common key terms
    const wordList = words.map((w: any) => w.word);
    expect(wordList).toContain("faith");
    expect(wordList).toContain("love");
    expect(wordList).toContain("grace");
  });
});

describe("Context Aggregation Validation", () => {
  it("should aggregate ALL resources for a verse", async () => {
    const result = await callEndpoint("get-context", {
      reference: "John 3:16",
      language: "en",
    });

    expect(result).toHaveProperty("data");
    const context = result.data;

    // Should have all resource types
    expect(context).toHaveProperty("scripture");
    expect(context).toHaveProperty("notes");
    expect(context).toHaveProperty("words");
    expect(context).toHaveProperty("questions");

    // Each should have real content
    expect(context.scripture?.ult).toContain("God so loved");
    expect(context.scripture?.ust).toContain("God loved");
    expect(context.notes?.length).toBeGreaterThan(0);
    expect(context.words?.length).toBeGreaterThan(0);

    // No empty aggregations
    expect(context.scripture).not.toEqual({});
    expect(context.notes).not.toEqual([]);

    console.log(`✅ Context aggregated ${Object.keys(context).length} resource types`);
  });
});

describe("Error Handling Validation", () => {
  it("should handle invalid references gracefully", async () => {
    try {
      await callEndpoint("fetch-scripture", {
        reference: "NotABook 99:99",
        language: "en",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("400");
      expect(error.message).not.toContain("Internal Server Error");
    }
  });

  it("should handle missing parameters properly", async () => {
    try {
      await callEndpoint("fetch-scripture", {
        // Missing reference
        language: "en",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("400");
      expect(error.message).toContain("reference");
    }
  });
});

// Helper function to calculate text similarity
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const intersection = words1.filter((word) => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];

  return intersection.length / union.length;
}

// Summary report
afterAll(() => {
  console.log(`
📊 VALIDATION SUMMARY
====================
✅ Tests validate ACTUAL content, not just status codes
✅ Checks against known good DCS data
✅ Verifies no placeholder/mock data
✅ Ensures proper error handling
  `);
});
