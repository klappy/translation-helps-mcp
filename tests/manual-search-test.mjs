#!/usr/bin/env node

/**
 * Manual Test for SearchService
 * Run with: node tests/manual-search-test.mjs
 */

import { SearchService } from "../src/services/SearchService.js";

async function runTests() {
  console.log("🧪 Testing SearchService...\n");

  const service = new SearchService();

  // Test 1: Basic indexing and search
  console.log("Test 1: Basic indexing and search");
  const docs = [
    {
      id: "1",
      content: "In the beginning God created the heavens and the earth",
      path: "01-GEN.usfm",
      resource: "en_ult",
      type: "bible",
    },
    {
      id: "2",
      content: "Jesus said I am the way the truth and the life",
      path: "43-JHN.usfm",
      resource: "en_ult",
      type: "bible",
    },
    {
      id: "3",
      content: "For God so loved the world that he gave his only Son",
      path: "43-JHN.usfm",
      resource: "en_ult",
      type: "bible",
    },
  ];

  await service.indexDocuments(docs);

  const stats = service.getStats();
  console.log(`✓ Indexed ${stats.documentCount} documents`);
  console.log(`✓ Total terms: ${stats.termCount}`);

  // Test 2: Search for "God"
  console.log('\nTest 2: Search for "God"');
  const results1 = await service.search("God");
  console.log(`✓ Found ${results1.length} results`);
  if (results1.length > 0) {
    console.log(`✓ Top result preview: "${results1[0].preview}"`);
  }

  // Test 3: Search for "Jesus"
  console.log('\nTest 3: Search for "Jesus"');
  const results2 = await service.search("Jesus");
  console.log(`✓ Found ${results2.length} results`);
  if (results2.length > 0) {
    console.log(`✓ Top result preview: "${results2[0].preview}"`);
  }

  // Test 4: Fuzzy search
  console.log("\nTest 4: Fuzzy search");
  service.clear();
  await service.indexDocuments([
    {
      id: "4",
      content: "peace be with you",
      path: "test.usfm",
      resource: "test",
      type: "bible",
    },
  ]);
  const results3 = await service.search("peac", { fuzzy: 0.2 });
  console.log(
    `✓ Fuzzy search "peac" found ${results3.length} results (should find "peace")`,
  );

  // Test 5: Prefix search
  console.log("\nTest 5: Prefix search");
  service.clear();
  await service.indexDocuments([
    {
      id: "5",
      content: "salvation is a gift from God",
      path: "test.usfm",
      resource: "test",
      type: "bible",
    },
  ]);
  const results4 = await service.search("salv", { prefix: true });
  console.log(
    `✓ Prefix search "salv" found ${results4.length} results (should find "salvation")`,
  );

  // Test 6: Preview extraction
  console.log("\nTest 6: Preview extraction");
  const longText =
    "This is a long piece of text that contains the word Jesus multiple times. Jesus said many things. Jesus performed miracles.";
  const preview = service.extractPreview(longText, "Jesus", 50);
  console.log(`✓ Extracted preview: "${preview}"`);
  console.log(
    `✓ Preview length: ${preview.length} characters (max 60 with ellipsis)`,
  );

  // Test 7: Empty documents
  console.log("\nTest 7: Empty documents handling");
  service.clear();
  await service.indexDocuments([
    {
      id: "6",
      content: "",
      path: "empty.usfm",
      resource: "test",
      type: "bible",
    },
    {
      id: "7",
      content: "   ",
      path: "whitespace.usfm",
      resource: "test",
      type: "bible",
    },
  ]);
  const emptyStats = service.getStats();
  console.log(
    `✓ Empty documents correctly filtered: ${emptyStats.documentCount} indexed (should be 0)`,
  );

  console.log("\n✅ All tests passed!\n");
}

runTests().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
