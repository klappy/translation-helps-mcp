/**
 * Test script to verify SDK tools work with Spanish (es-419) language and es-419_gl organization
 * Testing passage: Est 1:1 (Esther 1:1)
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";

async function testES419Parameters() {
  console.log("🧪 Testing SDK with Spanish (es-419) Parameters\n");
  console.log("Parameters:");
  console.log('  - language: "es-419"');
  console.log('  - organization: "es-419_gl"');
  console.log('  - passage: "Est 1:1"\n');

  const client = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    await client.connect();
    console.log("✅ Connected to MCP server\n");

    // Test 1: Fetch Scripture
    console.log("Test 1: fetchScripture with es-419 parameters");
    try {
      const result1 = await client.fetchScripture({
        reference: "Est 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchScripture test passed");
      console.log(`   Response length: ${result1.length} chars`);
      console.log(`   First 200 chars: ${result1.substring(0, 200)}...\n`);
    } catch (error) {
      console.log("❌ fetchScripture test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    // Test 2: Fetch Translation Notes
    console.log("Test 2: fetchTranslationNotes with es-419 parameters");
    try {
      const result2 = await client.fetchTranslationNotes({
        reference: "Est 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchTranslationNotes test passed");
      console.log(`   Response type: ${typeof result2}`);
      if (typeof result2 === "object") {
        console.log(`   Keys: ${Object.keys(result2).join(", ")}`);
        if (result2.notes && Array.isArray(result2.notes)) {
          console.log(`   Notes count: ${result2.notes.length}`);
        }
      }
      console.log("");
    } catch (error) {
      console.log("❌ fetchTranslationNotes test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    // Test 3: Fetch Translation Questions
    console.log("Test 3: fetchTranslationQuestions with es-419 parameters");
    try {
      const result3 = await client.fetchTranslationQuestions({
        reference: "Est 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchTranslationQuestions test passed");
      console.log(`   Response type: ${typeof result3}`);
      if (typeof result3 === "object") {
        console.log(`   Keys: ${Object.keys(result3).join(", ")}`);
        if (result3.questions && Array.isArray(result3.questions)) {
          console.log(`   Questions count: ${result3.questions.length}`);
        }
      }
      console.log("");
    } catch (error) {
      console.log("❌ fetchTranslationQuestions test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    // Test 4: Fetch Translation Word Links
    console.log("Test 4: fetchTranslationWordLinks with es-419 parameters");
    try {
      const result4 = await client.fetchTranslationWordLinks({
        reference: "Est 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchTranslationWordLinks test passed");
      console.log(`   Response type: ${typeof result4}`);
      if (typeof result4 === "object") {
        console.log(`   Keys: ${Object.keys(result4).join(", ")}`);
        if (result4.links && Array.isArray(result4.links)) {
          console.log(`   Links count: ${result4.links.length}`);
        }
      }
      console.log("");
    } catch (error) {
      console.log("❌ fetchTranslationWordLinks test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    // Test 5: Fetch Translation Word (by term)
    console.log(
      'Test 5: fetchTranslationWord with es-419 parameters (term: "rey")',
    );
    try {
      const result5 = await client.fetchTranslationWord({
        term: "rey",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchTranslationWord test passed");
      console.log(`   Response type: ${typeof result5}`);
      if (typeof result5 === "object") {
        console.log(`   Keys: ${Object.keys(result5).join(", ")}`);
        if (result5.articles && Array.isArray(result5.articles)) {
          console.log(`   Articles count: ${result5.articles.length}`);
        }
      }
      console.log("");
    } catch (error) {
      console.log("❌ fetchTranslationWord test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    // Test 6: Fetch Translation Academy
    console.log("Test 6: fetchTranslationAcademy with es-419 parameters");
    try {
      const result6 = await client.fetchTranslationAcademy({
        moduleId: "figs-metaphor",
        language: "es-419",
        organization: "es-419_gl",
      });
      console.log("✅ fetchTranslationAcademy test passed");
      console.log(`   Response type: ${typeof result6}`);
      if (typeof result6 === "object") {
        console.log(`   Keys: ${Object.keys(result6).join(", ")}`);
      }
      console.log("");
    } catch (error) {
      console.log("❌ fetchTranslationAcademy test failed:", error.message);
      console.log(`   Error details: ${error.stack}\n`);
    }

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test setup failed:", error);
    process.exit(1);
  }
}

testES419Parameters();
