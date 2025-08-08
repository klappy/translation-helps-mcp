#!/usr/bin/env node

/**
 * Quick endpoint status check
 * Tests all endpoints with simple requests to verify they return data
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5175";

const endpoints = [
  {
    name: "fetch-scripture",
    path: "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&format=json",
    check: (data) => data.resources?.length > 0 || data.scripture?.text,
    expected: "Array of scripture resources or scripture text",
  },
  {
    name: "fetch-translation-notes",
    path: "/api/fetch-translation-notes?reference=John+3:16&language=en&organization=unfoldingWord&format=json",
    check: (data) =>
      Array.isArray(data.notes)
        ? data.notes.length > 0
        : Array.isArray(data.verseNotes)
          ? data.verseNotes.length > 0
          : false,
    expected: "Array of translation notes",
  },
  {
    name: "fetch-translation-questions",
    path: "/api/fetch-translation-questions?reference=John+3:16&language=en&organization=unfoldingWord&format=json",
    check: (data) =>
      Array.isArray(data.translationQuestions) && data.translationQuestions.length > 0,
    expected: "Array of translation questions",
  },
  {
    name: "get-translation-word",
    path: "/api/get-translation-word?term=love&language=en&organization=unfoldingWord&format=json",
    check: (data) => Array.isArray(data.articles) && data.articles.length > 0,
    expected: "Translation word article content",
  },
  {
    name: "browse-translation-words",
    path: "/api/browse-translation-words?language=en&organization=unfoldingWord&format=json",
    check: (data) =>
      Array.isArray(data.words || data.terms) &&
      (data.words?.length || data.terms?.length || 0) > 0,
    expected: "Array of translation words",
  },
  {
    name: "get-context",
    path: "/api/get-context?reference=John+3:16&language=en&organization=unfoldingWord&format=json",
    check: (data) => !!(data.context || data.notes || data.questions || data.scripture),
    expected: "Aggregated context data",
  },
  {
    name: "fetch-translation-academy",
    path: "/api/fetch-translation-academy?language=en&organization=unfoldingWord&format=json",
    check: (data) => Array.isArray(data.modules) && data.modules.length > 0,
    expected: "Translation academy modules",
  },
  {
    name: "browse-translation-academy",
    path: "/api/browse-translation-academy?language=en&organization=unfoldingWord&format=json",
    check: (data) => Array.isArray(data.categories) && data.categories.length > 0,
    expected: "Translation academy table of contents",
  },
  {
    name: "get-words-for-reference",
    path: "/api/get-words-for-reference?reference=John+3:16&language=en&organization=unfoldingWord&format=json",
    check: (data) => Array.isArray(data.words) && data.words.length >= 0,
    expected: "Array of words for reference",
  },
];

async function checkEndpoints() {
  console.log(`\n🔍 Checking endpoints at ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`);
      const data = await response.json();

      if (response.ok && endpoint.check(data)) {
        console.log(`✅ ${endpoint.name}: Working (${endpoint.expected})`);
        passed++;
      } else {
        console.log(`❌ ${endpoint.name}: Failed`);
        console.log(`   Expected: ${endpoint.expected}`);
        console.log(`   Status: ${response.status}`);
        if (data.message || data.error) {
          console.log(`   Error: ${data.message || data.error}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

checkEndpoints().catch(console.error);
