/**
 * Comprehensive test to verify we actually get data for es-419 parameters
 * Tests the full flow: SDK -> API -> Data retrieval
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";

async function testES419DataRetrieval() {
  console.log("🧪 Testing Data Retrieval with es-419 Parameters\n");
  console.log("Parameters:");
  console.log('  - language: "es-419"');
  console.log('  - organization: "es-419_gl"');
  console.log('  - reference: "Est 1:1"\n');

  const client = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    await client.connect();
    console.log("✅ Connected to MCP server\n");

    const tests = [];

    // Test 1: Fetch Scripture
    tests.push({
      name: "fetchScripture",
      test: async () => {
        const result = await client.fetchScripture({
          reference: "Est 1:1",
          language: "es-419",
          organization: "es-419_gl",
        });
        return {
          success: result && result.length > 0,
          dataLength: result?.length || 0,
          preview: result?.substring(0, 200) || "",
          hasData:
            !result?.includes("Tool endpoint failed") &&
            !result?.includes("400"),
        };
      },
    });

    // Test 2: Fetch Translation Notes
    tests.push({
      name: "fetchTranslationNotes",
      test: async () => {
        const result = await client.fetchTranslationNotes({
          reference: "Est 1:1",
          language: "es-419",
          organization: "es-419_gl",
        });
        return {
          success: result && typeof result === "object",
          hasNotes:
            result?.notes &&
            Array.isArray(result.notes) &&
            result.notes.length > 0,
          notesCount: result?.notes?.length || 0,
          hasData: result && !result.error,
        };
      },
    });

    // Test 3: Fetch Translation Questions
    tests.push({
      name: "fetchTranslationQuestions",
      test: async () => {
        const result = await client.fetchTranslationQuestions({
          reference: "Est 1:1",
          language: "es-419",
          organization: "es-419_gl",
        });
        return {
          success: result && typeof result === "object",
          hasQuestions:
            result?.questions &&
            Array.isArray(result.questions) &&
            result.questions.length > 0,
          questionsCount: result?.questions?.length || 0,
          hasData: result && !result.error,
        };
      },
    });

    // Test 4: Fetch Translation Word Links
    tests.push({
      name: "fetchTranslationWordLinks",
      test: async () => {
        const result = await client.fetchTranslationWordLinks({
          reference: "Est 1:1",
          language: "es-419",
          organization: "es-419_gl",
        });
        return {
          success: result && typeof result === "object",
          hasLinks:
            result?.links &&
            Array.isArray(result.links) &&
            result.links.length > 0,
          linksCount: result?.links?.length || 0,
          hasData: result && !result.error,
        };
      },
    });

    // Test 5: Fetch Translation Word (by term)
    tests.push({
      name: 'fetchTranslationWord (term: "rey")',
      test: async () => {
        const result = await client.fetchTranslationWord({
          term: "rey",
          language: "es-419",
          organization: "es-419_gl",
        });
        return {
          success: result && typeof result === "object",
          hasArticles:
            result?.articles &&
            Array.isArray(result.articles) &&
            result.articles.length > 0,
          articlesCount: result?.articles?.length || 0,
          hasData: result && !result.error,
        };
      },
    });

    // Run all tests
    console.log("Running tests...\n");
    const results = [];

    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await test.test();
        results.push({ name: test.name, ...result });

        if (result.success && result.hasData) {
          console.log(`  ✅ ${test.name}: SUCCESS`);
          if (result.dataLength)
            console.log(`     Response length: ${result.dataLength} chars`);
          if (result.notesCount)
            console.log(`     Notes found: ${result.notesCount}`);
          if (result.questionsCount)
            console.log(`     Questions found: ${result.questionsCount}`);
          if (result.linksCount)
            console.log(`     Links found: ${result.linksCount}`);
          if (result.articlesCount)
            console.log(`     Articles found: ${result.articlesCount}`);
          if (result.preview)
            console.log(`     Preview: ${result.preview.substring(0, 100)}...`);
        } else if (result.success && !result.hasData) {
          console.log(`  ⚠️  ${test.name}: No data returned (empty result)`);
        } else {
          console.log(`  ❌ ${test.name}: FAILED`);
        }
        console.log("");
      } catch (error) {
        console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        results.push({ name: test.name, success: false, error: error.message });
        console.log("");
      }
    }

    // Summary
    console.log("\n📊 Test Summary\n");
    const successful = results.filter((r) => r.success && r.hasData).length;
    const withData = results.filter((r) => r.hasData).length;
    const total = results.length;

    console.log(`Total tests: ${total}`);
    console.log(`Successful with data: ${successful}`);
    console.log(`Returned data (may be empty): ${withData}`);
    console.log(`Failed: ${total - withData}`);

    // Detailed results
    console.log("\n📋 Detailed Results:\n");
    results.forEach((r) => {
      const status = r.success && r.hasData ? "✅" : r.success ? "⚠️" : "❌";
      console.log(`${status} ${r.name}`);
      if (r.error) console.log(`   Error: ${r.error}`);
      if (r.dataLength) console.log(`   Data length: ${r.dataLength} chars`);
      if (r.notesCount !== undefined) console.log(`   Notes: ${r.notesCount}`);
      if (r.questionsCount !== undefined)
        console.log(`   Questions: ${r.questionsCount}`);
      if (r.linksCount !== undefined) console.log(`   Links: ${r.linksCount}`);
      if (r.articlesCount !== undefined)
        console.log(`   Articles: ${r.articlesCount}`);
    });

    // Comparison with English
    console.log(
      "\n\n🔍 Comparison: Testing with English (en/unfoldingWord) for reference\n",
    );
    try {
      const enResult = await client.fetchScripture({
        reference: "Est 1:1",
        language: "en",
        organization: "unfoldingWord",
      });
      console.log(`✅ English test: SUCCESS`);
      console.log(`   Response length: ${enResult.length} chars`);
      console.log(`   Preview: ${enResult.substring(0, 200)}...`);
    } catch (error) {
      console.log(`❌ English test: FAILED - ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Test setup failed:", error);
    process.exit(1);
  }
}

testES419DataRetrieval();
