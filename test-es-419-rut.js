/**
 * Test es-419 with a book that actually exists (Ruth)
 */

import { TranslationHelpsClient } from "@translation-helps/mcp-client";

async function testES419Ruth() {
  console.log("🧪 Testing es-419 with Ruth (book that exists)\n");
  console.log("Parameters:");
  console.log('  - language: "es-419"');
  console.log('  - organization: "es-419_gl"');
  console.log('  - reference: "Rut 1:1"\n');

  const client = new TranslationHelpsClient({
    serverUrl: "https://translation-helps-mcp-945.pages.dev/api/mcp",
  });

  try {
    await client.connect();
    console.log("✅ Connected to MCP server\n");

    // Test with Ruth
    console.log("Test: fetchScripture with Rut 1:1");
    try {
      const result = await client.fetchScripture({
        reference: "Rut 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });

      if (
        result &&
        result.length > 50 &&
        !result.includes("Tool endpoint failed") &&
        !result.includes("400") &&
        !result.includes("500")
      ) {
        console.log("  ✅ SUCCESS - Got scripture data");
        console.log(`     Length: ${result.length} chars`);
        console.log(`     Preview: ${result.substring(0, 300)}...`);
      } else {
        console.log("  ❌ FAILED");
        console.log(`     Response: ${result?.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR - ${error.message}`);
    }

    // Also test Translation Notes
    console.log("\nTest: fetchTranslationNotes with Rut 1:1");
    try {
      const result = await client.fetchTranslationNotes({
        reference: "Rut 1:1",
        language: "es-419",
        organization: "es-419_gl",
      });

      if (result && typeof result === "object" && !result.error) {
        const notesCount = result.notes?.length || 0;
        console.log(`  ✅ SUCCESS - Got ${notesCount} notes`);
        if (notesCount > 0) {
          console.log(
            `     First note: ${JSON.stringify(result.notes[0]).substring(0, 150)}...`,
          );
        }
      } else {
        console.log("  ❌ FAILED");
        console.log(
          `     Response: ${JSON.stringify(result).substring(0, 200)}...`,
        );
      }
    } catch (error) {
      console.log(`  ❌ ERROR - ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testES419Ruth();
