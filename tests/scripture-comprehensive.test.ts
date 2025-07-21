import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8888";
const TIMEOUT = 30000;

async function fetchScripture(reference: string, language = "en", organization = "unfoldingWord") {
  const url = new URL(`${BASE_URL}/api/fetch-scripture`);
  url.searchParams.set("reference", reference);
  url.searchParams.set("language", language);
  url.searchParams.set("organization", organization);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchScriptureWithFallback(reference: string, language = "en") {
  // Try unfoldingWord first (has New Testament)
  try {
    return await fetchScripture(reference, language, "unfoldingWord");
  } catch (error) {
    // If unfoldingWord fails, try other organizations for Old Testament books
    const orgsToTry = ["Door43", "STR", "WA", "translate"];

    for (const org of orgsToTry) {
      try {
        return await fetchScripture(reference, language, org);
      } catch (fallbackError) {
        // Continue to next organization
        continue;
      }
    }

    // If all organizations fail, throw the original error
    throw error;
  }
}

describe("Comprehensive Scripture Fetching Tests", () => {
  describe("Single Verse Tests", () => {
    const singleVerseTests = [
      { ref: "John 3:16", desc: "Popular New Testament verse" },
      { ref: "Genesis 1:1", desc: "First verse of the Bible" },
      { ref: "Revelation 22:21", desc: "Last verse of the Bible" },
      { ref: "Exodus 20:3", desc: "Ten Commandments verse" },
      { ref: "Romans 8:28", desc: "Verse with complex formatting" },
      { ref: "1 Corinthians 13:4", desc: "Verse from numbered book" },
      { ref: "1 John 4:8", desc: "Short numbered book" },
      { ref: "Philemon 1:1", desc: "Single chapter book" },
      { ref: "Jude 1:3", desc: "Single chapter book (Jude)" },
      { ref: "Obadiah 1:1", desc: "Shortest Old Testament book" },
    ];

    singleVerseTests.forEach(({ ref, desc }) => {
      it(
        `should fetch single verse: ${ref} (${desc})`,
        async () => {
          const response = await fetchScriptureWithFallback(ref);

          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined();
          expect(response.scripture.text.length).toBeGreaterThan(0);
          expect(response.scripture.translation).toBeDefined();
          expect(response.language).toBe("en");
          expect(response.organization).toBeDefined();

          // Verify verse number is included in text
          const verseNumber = ref.split(":")[1];
          expect(response.scripture.text).toMatch(new RegExp(`^${verseNumber}\\s`));
        },
        TIMEOUT
      );
    });
  });

  describe("Verse Range Tests", () => {
    const verseRangeTests = [
      { ref: "John 3:16-17", desc: "Two verse range" },
      { ref: "Matthew 5:3-12", desc: "Beatitudes (10 verses)" },
      { ref: "1 Corinthians 13:1-3", desc: "Three verse range" },
      { ref: "Genesis 1:1-5", desc: "Creation days range" },
      { ref: "Exodus 20:1-6", desc: "Beginning of Ten Commandments" },
      { ref: "Romans 8:28-30", desc: "Theological passage range" },
      { ref: "Ephesians 2:8-10", desc: "Grace by faith passage" },
      { ref: "Exodus 20:1-12", desc: "Longer range (12 verses)" },
      { ref: "Galatians 5:22-23", desc: "Fruits of the Spirit" },
    ];

    verseRangeTests.forEach(({ ref, desc }) => {
      it(
        `should fetch verse range: ${ref} (${desc})`,
        async () => {
          const response = await fetchScriptureWithFallback(ref);

          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined();
          expect(response.scripture.text.length).toBeGreaterThan(0);

          // Parse the range to validate content
          const [, verseRange] = ref.split(":");
          const [startVerse, endVerse] = verseRange.split("-").map(Number);
          const verseCount = endVerse - startVerse + 1;

          // Text should be longer for more verses
          expect(response.scripture.text.length).toBeGreaterThan(20 * verseCount);

          // Should start with the starting verse number
          expect(response.scripture.text).toMatch(new RegExp(`^${startVerse}\\s`));
        },
        TIMEOUT
      );
    });
  });

  describe("Full Chapter Tests", () => {
    const fullChapterTests = [
      { ref: "John 1", desc: "Long chapter (51 verses)" },
      { ref: "Genesis 1", desc: "Creation chapter (31 verses)" },
      { ref: "Exodus 20", desc: "Ten Commandments chapter" },
      { ref: "1 Corinthians 15", desc: "Resurrection chapter (58 verses)" },
      { ref: "Matthew 5", desc: "Sermon on the Mount beginning" },
      { ref: "Romans 8", desc: "Theological chapter" },
      { ref: "Philemon 1", desc: "Single chapter book" },
      { ref: "Jude 1", desc: "Another single chapter book" },
      { ref: "Exodus 14", desc: "Red Sea crossing chapter" },
      { ref: "2 John 1", desc: "Very short chapter" },
    ];

    fullChapterTests.forEach(({ ref, desc }) => {
      it(
        `should fetch full chapter: ${ref} (${desc})`,
        async () => {
          const response = await fetchScriptureWithFallback(ref);

          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined();
          expect(response.scripture.text.length).toBeGreaterThan(100); // Chapters should be substantial

          // Should start with verse 1
          expect(response.scripture.text).toMatch(/^1\s/);

          // For known short chapters, verify reasonable length
          if (ref === "2 John 1" || ref === "3 John 1") {
            expect(response.scripture.text.length).toBeLessThan(2000);
          }

          // For known long chapters, verify substantial length
          if (ref === "Psalm 119") {
            expect(response.scripture.text.length).toBeGreaterThan(5000);
          }
        },
        TIMEOUT
      );
    });
  });

  describe("Chapter Range Tests", () => {
    const chapterRangeTests = [
      { ref: "John 1-2", desc: "Two chapter range" },
      { ref: "Genesis 1-3", desc: "Creation and fall (3 chapters)" },
      { ref: "Matthew 5-7", desc: "Sermon on the Mount (3 chapters)" },
      { ref: "1 Corinthians 12-14", desc: "Spiritual gifts chapters" },
      { ref: "Ephesians 4-6", desc: "Christian living chapters" },
    ];

    chapterRangeTests.forEach(({ ref, desc }) => {
      it(
        `should fetch chapter range: ${ref} (${desc})`,
        async () => {
          const response = await fetchScriptureWithFallback(ref);

          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined();
          expect(response.scripture.text.length).toBeGreaterThan(500); // Multi-chapter should be substantial

          // Should start with chapter 1, verse 1
          expect(response.scripture.text).toMatch(/^1\s/);

          // Parse range to validate content length scales with chapters
          const bookAndRange = ref.split(" ");
          if (bookAndRange.length >= 2 && bookAndRange[1].includes("-")) {
            const [startChapter, endChapter] = bookAndRange[1].split("-").map(Number);
            const chapterCount = endChapter - startChapter + 1;

            // More chapters should mean more text
            expect(response.scripture.text.length).toBeGreaterThan(200 * chapterCount);
          }
        },
        TIMEOUT
      );
    });
  });

  describe("Book Abbreviation Tests", () => {
    const abbreviationTests = [
      { ref: "Jn 3:16", standard: "John 3:16", desc: "Short John abbreviation" },
      { ref: "Gen 1:1", standard: "Genesis 1:1", desc: "Genesis abbreviation" },
      { ref: "Mt 5:3", standard: "Matthew 5:3", desc: "Matthew abbreviation" },
      { ref: "1Co 13:4", standard: "1 Corinthians 13:4", desc: "1 Corinthians abbreviation" },
      { ref: "Rev 22:21", standard: "Revelation 22:21", desc: "Revelation abbreviation" },
    ];

    abbreviationTests.forEach(({ ref, standard, desc }) => {
      it(
        `should handle abbreviation: ${ref} -> ${standard} (${desc})`,
        async () => {
          const [abbreviatedResponse, standardResponse] = await Promise.all([
            fetchScriptureWithFallback(ref),
            fetchScriptureWithFallback(standard),
          ]);

          expect(abbreviatedResponse.scripture).toBeDefined();
          expect(standardResponse.scripture).toBeDefined();

          // Both should return the same content
          expect(abbreviatedResponse.scripture.text).toBe(standardResponse.scripture.text);
        },
        TIMEOUT
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it(
      "should handle invalid book names gracefully",
      async () => {
        try {
          await fetchScriptureWithFallback("FakeBook 1:1");
          expect.fail("Should have thrown an error for invalid book");
        } catch (error) {
          expect(error.message).toMatch(/HTTP [45]\d\d/);
        }
      },
      TIMEOUT
    );

    it(
      "should handle invalid chapter numbers",
      async () => {
        try {
          await fetchScriptureWithFallback("John 999:1");
          expect.fail("Should have thrown an error for invalid chapter");
        } catch (error) {
          expect(error.message).toMatch(/HTTP [45]\d\d/);
        }
      },
      TIMEOUT
    );

    it(
      "should handle invalid verse numbers",
      async () => {
        try {
          await fetchScriptureWithFallback("John 3:999");
          expect.fail("Should have thrown an error for invalid verse");
        } catch (error) {
          expect(error.message).toMatch(/HTTP [45]\d\d/);
        }
      },
      TIMEOUT
    );

    it(
      "should handle malformed references",
      async () => {
        const malformedRefs = ["FakeBook 1:1", "John 999:1", "John 3:999", "John 3:16:17"];

        for (const ref of malformedRefs) {
          try {
            await fetchScriptureWithFallback(ref);
            expect.fail(`Should have thrown an error for malformed reference: ${ref}`);
          } catch (error) {
            expect(error.message).toMatch(/HTTP [45]\d\d/);
          }
        }
      },
      TIMEOUT
    );
  });

  describe("Performance and Optimization Tests", () => {
    it(
      "should return results quickly for single verses",
      async () => {
        const start = Date.now();
        const response = await fetchScriptureWithFallback("John 3:16");
        const duration = Date.now() - start;

        expect(response.scripture).toBeDefined();
        // Should complete within reasonable time (account for cold starts)
        expect(duration).toBeLessThan(10000); // 10 seconds max
      },
      TIMEOUT
    );

    it(
      "should handle concurrent requests efficiently",
      async () => {
        const references = [
          "John 3:16",
          "Genesis 1:1",
          "Matthew 5:3",
          "Romans 8:28",
          "1 Corinthians 13:4",
        ];

        const start = Date.now();
        const promises = references.map((ref) => fetchScriptureWithFallback(ref));
        const responses = await Promise.all(promises);
        const duration = Date.now() - start;

        // All should succeed
        responses.forEach((response) => {
          expect(response.scripture).toBeDefined();
          expect(response.scripture.text).toBeDefined();
        });

        // Concurrent execution should be faster than sequential
        expect(duration).toBeLessThan(15000); // 15 seconds for 5 concurrent requests
      },
      TIMEOUT
    );

    it(
      "should leverage caching for repeated requests",
      async () => {
        const reference = "John 3:16";

        // First request
        const start1 = Date.now();
        const response1 = await fetchScriptureWithFallback(reference);
        const duration1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        const response2 = await fetchScriptureWithFallback(reference);
        const duration2 = Date.now() - start2;

        // Both should return same content
        expect(response1.scripture.text).toBe(response2.scripture.text);

        // Second request should be faster (cached) or at least as fast
        expect(duration2).toBeLessThanOrEqual(duration1);

        // Check cache metadata if available
        if (response2.metadata?.cached) {
          expect(response2.metadata.cached).toBe(true);
        }
      },
      TIMEOUT
    );
  });

  describe("Different Translation Tests", () => {
    it(
      "should work with different organizations",
      async () => {
        // Test with unfoldingWord (default)
        const response = await fetchScriptureWithFallback("John 3:16", "en");

        expect(response.scripture).toBeDefined();
        expect(response.scripture.text).toBeDefined();
        expect(response.organization).toBe("unfoldingWord");
      },
      TIMEOUT
    );

    it(
      "should maintain consistency across similar references",
      async () => {
        const relatedVerses = ["John 3:16", "John 3:17", "John 3:18"];

        const responses = await Promise.all(relatedVerses.map((ref) => fetchScripture(ref)));

        responses.forEach((response, index) => {
          expect(response.scripture).toBeDefined();
          expect(response.scripture.translation).toBeDefined();

          // All should be from same translation
          if (index > 0) {
            expect(response.scripture.translation).toBe(responses[0].scripture.translation);
          }
        });
      },
      TIMEOUT
    );
  });

  describe("USFM Parsing Validation", () => {
    it(
      "should extract clean text without USFM markers",
      async () => {
        const response = await fetchScriptureWithFallback("John 3:16");

        expect(response.scripture.text).toBeDefined();

        // Should not contain USFM markers
        expect(response.scripture.text).not.toMatch(/\\[a-z]+/);
        expect(response.scripture.text).not.toMatch(/\\[A-Z]+/);

        // Should not contain alignment data
        expect(response.scripture.text).not.toMatch(/\|[^|]*\|/);

        // Should contain readable text
        expect(response.scripture.text).toMatch(/[a-zA-Z]/);
      },
      TIMEOUT
    );

    it(
      "should properly handle verse numbering in ranges",
      async () => {
        const response = await fetchScriptureWithFallback("John 3:16-17");

        expect(response.scripture.text).toBeDefined();

        // Should start with verse 16
        expect(response.scripture.text).toMatch(/^16\s/);

        // Should contain verse content
        expect(response.scripture.text.length).toBeGreaterThan(50);

        // Should be longer than single verse
        const singleVerseResponse = await fetchScriptureWithFallback("John 3:16");
        expect(response.scripture.text.length).toBeGreaterThan(
          singleVerseResponse.scripture.text.length
        );
      },
      TIMEOUT
    );

    it(
      "should handle chapter boundaries correctly",
      async () => {
        const response = await fetchScriptureWithFallback("John 1");

        expect(response.scripture.text).toBeDefined();

        // Should start with verse 1
        expect(response.scripture.text).toMatch(/^1\s/);

        // Should contain substantial content for a full chapter
        expect(response.scripture.text.length).toBeGreaterThan(1000);

        // Should not bleed into next chapter
        expect(response.scripture.text).not.toMatch(/\\c\s+2/);
      },
      TIMEOUT
    );
  });
});
